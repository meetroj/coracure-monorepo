import { useEffect, useReducer, useState } from 'react';
import { ConnectionState, Room, RoomEvent, Track, type Participant } from 'livekit-client';
import { AudioSession, type VideoTrackProps } from '@livekit/react-native';
import { permissions } from '@livekit/react-native-webrtc';
import { doctorVideoApi } from '@coracure/api';
import { ApiError, messageFor } from '@coracure/api/errors';

import { UUID } from './clinicalRecord';

/**
 * The consultation call itself (API_CONTRACT §6.12): ask whether the room is
 * open, get a ticket, connect, publish, and follow what the room reports.
 *
 * *** THE SERVER DECIDES WHO MAY JOIN, AND WHEN. *** Readiness is asked first,
 * and its refusal — too early, not paid, consent missing, already over — is an
 * outcome the room shows, not a failure. The ticket is fetched only after the
 * microphone is granted: it lives for minutes, and a permission prompt can
 * outlast it.
 *
 * A demo appointment (an id that is not a consultation's UUID) never reaches
 * the network or the video SDK. Its phase stays `demo`.
 */

export type CallPhase =
  | 'demo'
  | 'checking'
  /** The server's answer is no. `message` says why; `opensAt` is set when it is only early. */
  | 'notJoinable'
  | 'micRefused'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  /** The ticket or the connection failed, or the room dropped. `message` says which. */
  | 'failed';

type TrackRef = VideoTrackProps['trackRef'];

type State = {
  phase: CallPhase;
  message?: string;
  opensAt?: string;
  /** When this device first got into the room. The call timer counts from here. */
  connectedAt?: number;
  room?: Room;
};

const COULD_NOT_CONNECT = 'Could not connect to the call. Check your internet connection and try again.';
const DROPPED = 'The call was disconnected. Check your internet connection and rejoin.';

/** Nobody waits in the room longer than this for it to open, and a timer cannot hold a longer delay safely. */
const RECHECK_WITHIN_MS = 60 * 60_000;

/** A participant's camera, when there is a picture to show: published, arrived, and not switched off. */
const cameraOf = (p: Participant | undefined): TrackRef => {
  const publication = p?.getTrackPublication(Track.Source.Camera);
  return p && publication?.track && !publication.isMuted ? { participant: p, publication, source: Track.Source.Camera } : undefined;
};

export const useVideoCall = (consultationId: string, video: boolean) => {
  const real = UUID.test(consultationId);
  const [state, setState] = useState<State>({ phase: real ? 'checking' : 'demo' });
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(!video);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [attempt, retry] = useReducer((n: number) => n + 1, 0);
  // the room is mutable; its events are what say "read it again"
  const [, sync] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!real) return;
    let alive = true;
    let room: Room | undefined;
    let audio = false;
    let recheck: ReturnType<typeof setTimeout> | undefined;
    const set = (next: Partial<State>) => alive && setState((s) => ({ ...s, ...next }));

    const hangUp = () => {
      // stops the local tracks too
      void room?.disconnect();
      room = undefined;
      if (audio) void AudioSession.stopAudioSession();
      audio = false;
    };

    const join = async () => {
      set({ phase: 'checking', message: undefined, opensAt: undefined, room: undefined });
      const ready = await doctorVideoApi.getCallReadiness(consultationId);
      if (!alive) return;
      if (!ready.joinable) {
        // the same shape the token call refuses with, so both are read in one place below
        throw new ApiError({
          statusCode: 409,
          code: ready.reason ?? 'NOT_JOINABLE',
          message: ready.message ?? '',
          details: { opensAt: ready.opensAt },
        });
      }

      if (!(await permissions.request({ name: 'microphone' }))) {
        set({ phase: 'micRefused' });
        return;
      }
      if (!alive) return;

      set({ phase: 'connecting' });
      const ticket = await doctorVideoApi.issueJoinToken(consultationId);
      if (!alive) return;

      // marked before it has started, so leaving while it is still starting stops it
      audio = true;
      await AudioSession.startAudioSession();
      if (!alive) return;
      // Use screen pixel density to handle screens with differing densities.
      room = new Room({ adaptiveStream: { pixelDensity: 'screen' } });
      await room.connect(ticket.serverUrl, ticket.token);
      if (!alive) return;

      room
        .on(RoomEvent.ParticipantConnected, sync)
        .on(RoomEvent.ParticipantDisconnected, sync)
        .on(RoomEvent.TrackSubscribed, sync)
        .on(RoomEvent.TrackUnsubscribed, sync)
        .on(RoomEvent.TrackMuted, sync)
        .on(RoomEvent.TrackUnmuted, sync)
        .on(RoomEvent.LocalTrackPublished, sync)
        .on(RoomEvent.LocalTrackUnpublished, sync)
        .on(RoomEvent.ConnectionStateChanged, (next) => {
          if (next === ConnectionState.Connected) set({ phase: 'connected' });
          else if (next !== ConnectionState.Disconnected) set({ phase: 'reconnecting' });
        })
        // LiveKit has given up reconnecting, or the server closed the room
        .on(RoomEvent.Disconnected, () => {
          hangUp();
          set({ phase: 'failed', message: DROPPED, room: undefined });
        });
      setState((s) => ({ ...s, phase: 'connected', room, connectedAt: s.connectedAt ?? Date.now() }));
    };

    join().catch((e) => {
      hangUp();
      if (!alive) return;
      // A 4xx is the server saying no; anything else never got an answer, or failed inside the video SDK.
      const refused = ApiError.is(e) && !e.isRetryable;
      // every scheduled consultation carries an opening time; it is only the answer when early is the reason
      const opensAt =
        (ApiError.is(e) && e.code === 'TOO_EARLY' && (e.details as { opensAt?: string | null } | null)?.opensAt) || undefined;
      set({ phase: refused ? 'notJoinable' : 'failed', message: messageFor(e, COULD_NOT_CONNECT), opensAt, room: undefined });
      // the room opens by itself at `opensAt`; ask again then rather than leave the doctor pressing a button
      const wait = opensAt ? new Date(opensAt).getTime() - Date.now() : 0;
      if (wait > 0 && wait < RECHECK_WITHIN_MS) recheck = setTimeout(retry, wait + 1000);
    });

    return () => {
      alive = false;
      clearTimeout(recheck);
      hangUp();
    };
  }, [real, consultationId, attempt]);

  const { room } = state;

  // The two controls are the source of truth; the room follows them once it exists.
  useEffect(() => {
    if (!room) return;
    let alive = true;
    // a microphone that would not open reads as muted, because that is what the patient hears
    room.localParticipant.setMicrophoneEnabled(!muted).catch(() => alive && setMuted(true));
    return () => {
      alive = false;
    };
  }, [room, muted]);

  useEffect(() => {
    if (!room || !video) return;
    let alive = true;
    (async () => {
      // asked for here, not at join: a doctor who keeps the camera off is never prompted for it
      if (!videoOff && !(await permissions.request({ name: 'camera' }))) throw new Error('camera refused');
      if (alive) await room.localParticipant.setCameraEnabled(!videoOff);
    })().catch(() => {
      if (!alive) return;
      setVideoOff(true);
      setCameraUnavailable(true);
    });
    return () => {
      alive = false;
    };
  }, [room, video, videoOff]);

  const patient = room ? [...room.remoteParticipants.values()][0] : undefined;

  return {
    phase: state.phase,
    message: state.message,
    opensAt: state.opensAt,
    connectedAt: state.connectedAt,
    patientJoined: !!patient,
    patientVideo: cameraOf(patient),
    selfVideo: cameraOf(room?.localParticipant),
    muted,
    videoOff,
    /** The camera was refused or would not start. Cleared when the doctor tries again. */
    cameraUnavailable,
    toggleMute: () => setMuted((v) => !v),
    toggleVideo: () => {
      setCameraUnavailable(false);
      setVideoOff((v) => !v);
    },
    retry,
  };
};

export type VideoCall = ReturnType<typeof useVideoCall>;
