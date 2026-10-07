import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AudioSession } from '@livekit/react-native';
import { permissions } from '@livekit/react-native-webrtc';
import { doctorVideoApi } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';

import { useVideoCall } from './videoCall';

/**
 * LiveKit's native modules do not exist under Jest, so the room is a stand-in
 * the spec can drive: it records what it was asked to do, and `emit` replays
 * the events LiveKit would raise.
 */
type MockRoom = {
  connect: jest.Mock;
  disconnect: jest.Mock;
  handlers: Record<string, (...args: unknown[]) => void>;
  remoteParticipants: Map<string, unknown>;
  localParticipant: { setMicrophoneEnabled: jest.Mock; setCameraEnabled: jest.Mock };
  emit: (event: string, ...args: unknown[]) => void;
};
const mockRooms: MockRoom[] = [];
/** What the next room's `connect` does. A spec that needs it to hang or fail swaps this. */
let mockConnect: () => Promise<void> = () => Promise.resolve();

jest.mock('livekit-client', () => ({
  Room: class {
    handlers: Record<string, (...args: unknown[]) => void> = {};
    remoteParticipants = new Map();
    localParticipant = {
      setMicrophoneEnabled: jest.fn(() => Promise.resolve()),
      setCameraEnabled: jest.fn(() => Promise.resolve()),
      getTrackPublication: () => undefined,
    };
    connect = jest.fn(() => mockConnect());
    disconnect = jest.fn(() => Promise.resolve());
    constructor() {
      mockRooms.push(this as never);
    }
    on(event: string, handler: (...args: unknown[]) => void) {
      this.handlers[event] = handler;
      return this;
    }
    emit(event: string, ...args: unknown[]) {
      this.handlers[event]?.(...args);
    }
  },
  // every event is its own name, so `emit('participantConnected')` reads like LiveKit's
  RoomEvent: new Proxy({}, { get: (_target, name: string) => name.charAt(0).toLowerCase() + name.slice(1) }),
  ConnectionState: { Connected: 'connected', Disconnected: 'disconnected', Reconnecting: 'reconnecting' },
  Track: { Source: { Camera: 'camera' } },
}));
jest.mock('@livekit/react-native', () => ({ AudioSession: { startAudioSession: jest.fn(), stopAudioSession: jest.fn() } }));
jest.mock('@livekit/react-native-webrtc', () => ({ permissions: { request: jest.fn() } }));

const ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const URL = 'wss://livekit.test';

const readiness = (over: object = {}) => ({ consultationId: ID, serverUrl: URL, joinable: true, opensAt: null, ...over });
const ticket = { consultationId: ID, roomName: `consultation-${ID}`, serverUrl: URL, token: 'jwt', identity: 'doctor', expiresInSeconds: 300, canPublish: true, canSubscribe: true };
const refusal = (code: string, message: string, statusCode = 409) => new ApiError({ statusCode, code, message });

let ready: jest.SpyInstance;
let token: jest.SpyInstance;

beforeEach(() => {
  mockRooms.length = 0;
  mockConnect = () => Promise.resolve();
  (permissions.request as jest.Mock).mockReset().mockResolvedValue(true);
  (AudioSession.startAudioSession as jest.Mock).mockReset().mockResolvedValue(undefined);
  (AudioSession.stopAudioSession as jest.Mock).mockReset().mockResolvedValue(undefined);
  ready = jest.spyOn(doctorVideoApi, 'getCallReadiness').mockResolvedValue(readiness());
  token = jest.spyOn(doctorVideoApi, 'issueJoinToken').mockResolvedValue(ticket);
});

const join = async (video = true) => {
  const hook = renderHook(() => useVideoCall(ID, video));
  await waitFor(() => expect(hook.result.current.phase).toBe('connected'));
  return { ...hook, room: mockRooms[0]! };
};

test('a demo appointment never asks the server and never opens a room', () => {
  const { result } = renderHook(() => useVideoCall('a1', true));
  expect(result.current.phase).toBe('demo');
  act(() => result.current.toggleMute());
  expect(result.current.muted).toBe(true);
  expect(ready).not.toHaveBeenCalled();
  expect(mockRooms).toHaveLength(0);
});

test('a joinable consultation connects with the ticket, publishes, and hangs up on leaving', async () => {
  const { result, room, unmount } = await join();
  expect(room.connect).toHaveBeenCalledWith(URL, 'jwt');
  expect(result.current.connectedAt).toEqual(expect.any(Number));
  await waitFor(() => expect(room.localParticipant.setCameraEnabled).toHaveBeenCalledWith(true));
  expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);

  // nobody is shown as present until LiveKit says the patient is in the room
  expect(result.current.patientJoined).toBe(false);
  act(() => {
    room.remoteParticipants.set('patient', { getTrackPublication: () => undefined });
    room.emit('participantConnected');
  });
  expect(result.current.patientJoined).toBe(true);
  expect(result.current.patientVideo).toBeUndefined();

  act(() => result.current.toggleMute());
  expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenLastCalledWith(false);

  unmount();
  expect(room.disconnect).toHaveBeenCalled();
  expect(AudioSession.stopAudioSession).toHaveBeenCalled();
});

test('an audio consultation never asks for the camera', async () => {
  const { result, room } = await join(false);
  expect(result.current.videoOff).toBe(true);
  expect(permissions.request).toHaveBeenCalledTimes(1);
  expect(permissions.request).toHaveBeenCalledWith({ name: 'microphone' });
  expect(room.localParticipant.setCameraEnabled).not.toHaveBeenCalled();
});

test('too early is the server’s answer, shown with when the room opens — and no ticket is asked for', async () => {
  const opensAt = new Date(Date.now() + 30 * 60_000).toISOString();
  ready.mockResolvedValue(readiness({ joinable: false, reason: 'TOO_EARLY', message: 'This consultation is not open to join yet.', opensAt }));
  const { result } = renderHook(() => useVideoCall(ID, true));
  await waitFor(() => expect(result.current.phase).toBe('notJoinable'));
  expect(result.current.message).toBe('This consultation is not open to join yet.');
  expect(result.current.opensAt).toBe(opensAt);
  expect(token).not.toHaveBeenCalled();
  expect(mockRooms).toHaveLength(0);
});

test('the room is asked again by itself once the opening time has passed', async () => {
  jest.useFakeTimers();
  ready.mockResolvedValueOnce(
    readiness({ joinable: false, reason: 'TOO_EARLY', message: 'Not open yet.', opensAt: new Date(Date.now() + 2000).toISOString() })
  );
  const { result } = renderHook(() => useVideoCall(ID, true));
  await waitFor(() => expect(result.current.phase).toBe('notJoinable'));
  await act(async () => {
    jest.advanceTimersByTime(3500);
  });
  await waitFor(() => expect(result.current.phase).toBe('connected'));
  expect(ready).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});

test('an unpaid or cancelled consultation keeps its own reason, without an opening time', async () => {
  ready.mockResolvedValue(
    readiness({ joinable: false, reason: 'NOT_PAID', message: 'This consultation has not been paid for yet.', opensAt: new Date(Date.now() + 60_000).toISOString() })
  );
  const { result } = renderHook(() => useVideoCall(ID, true));
  await waitFor(() => expect(result.current.phase).toBe('notJoinable'));
  expect(result.current.message).toBe('This consultation has not been paid for yet.');
  expect(result.current.opensAt).toBeUndefined();
});

test('a refused microphone stops before a ticket is spent, and can be tried again', async () => {
  (permissions.request as jest.Mock).mockResolvedValueOnce(false);
  const { result } = renderHook(() => useVideoCall(ID, true));
  await waitFor(() => expect(result.current.phase).toBe('micRefused'));
  expect(token).not.toHaveBeenCalled();

  act(() => result.current.retry());
  await waitFor(() => expect(result.current.phase).toBe('connected'));
});

test('a refused camera joins with the camera off and says so', async () => {
  (permissions.request as jest.Mock).mockImplementation(({ name }: { name: string }) => Promise.resolve(name === 'microphone'));
  const { result, room } = await join();
  await waitFor(() => expect(result.current.cameraUnavailable).toBe(true));
  expect(result.current.videoOff).toBe(true);
  expect(room.localParticipant.setCameraEnabled).not.toHaveBeenCalledWith(true);
});

test('a refused ticket is the server’s answer; a lost connection is a failure to retry', async () => {
  token.mockRejectedValueOnce(refusal('CONSENT_REQUIRED', 'Please accept the teleconsultation consent before starting a consultation.', 403));
  const { result } = renderHook(() => useVideoCall(ID, true));
  await waitFor(() => expect(result.current.phase).toBe('notJoinable'));
  expect(result.current.message).toMatch(/teleconsultation consent/);

  token.mockRejectedValueOnce(refusal('NETWORK_UNAVAILABLE', 'offline', 0));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.phase).toBe('failed'));
  expect(result.current.message).toMatch(/No internet connection/);
});

test('a room that will not connect fails plainly and releases the audio session', async () => {
  mockConnect = () => Promise.reject(new Error('could not establish signal connection'));
  const { result } = renderHook(() => useVideoCall(ID, true));
  await waitFor(() => expect(result.current.phase).toBe('failed'));
  expect(result.current.message).toMatch(/Could not connect to the call/);
  expect(result.current.connectedAt).toBeUndefined();
  expect(AudioSession.stopAudioSession).toHaveBeenCalled();
});

test('a dropped signal reads as reconnecting, and a closed room as disconnected', async () => {
  const { result, room } = await join();
  act(() => room.emit('connectionStateChanged', 'reconnecting'));
  expect(result.current.phase).toBe('reconnecting');
  act(() => room.emit('connectionStateChanged', 'connected'));
  expect(result.current.phase).toBe('connected');

  act(() => room.emit('disconnected'));
  expect(result.current.phase).toBe('failed');
  expect(result.current.message).toMatch(/disconnected/);
  expect(AudioSession.stopAudioSession).toHaveBeenCalled();
});

test('leaving while still connecting hangs up and wires nothing', async () => {
  let connected: () => void = () => undefined;
  mockConnect = () => new Promise<void>((resolve) => (connected = resolve));
  const { unmount } = renderHook(() => useVideoCall(ID, true));
  await waitFor(() => expect(mockRooms).toHaveLength(1));
  await waitFor(() => expect(mockRooms[0]!.connect).toHaveBeenCalled());

  unmount();
  expect(mockRooms[0]!.disconnect).toHaveBeenCalled();
  await act(async () => connected());
  expect(mockRooms[0]!.handlers).toEqual({});
});
