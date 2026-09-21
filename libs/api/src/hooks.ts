import { useCallback } from 'react';

import * as careHub from './endpoints/careHub';
import * as catalogue from './endpoints/catalogue';
import * as doctors from './endpoints/doctors';
import * as instant from './endpoints/instant';
import * as intake from './endpoints/intake';
import * as slots from './endpoints/slots';
import * as consultations from './endpoints/consultations';
import * as files from './endpoints/files';
import * as legal from './endpoints/legal';
import * as notifications from './endpoints/notifications';
import * as payments from './endpoints/payments';
import * as video from './endpoints/video';
import * as profile from './endpoints/profile';
import * as search from './endpoints/search';
import { invalidate, useMutation, useQuery, type QueryKey } from './query';
import type {
  Consultation,
  Gender,
  Language,
  LegalDocumentType,
  PatientProfile,
} from './types';

/**
 * The typed hooks screens use. One place decides cache keys, stale windows and
 * what a write invalidates, so no screen has to know.
 */

export const queryKeys = {
  profile: ['profile'] as const satisfies QueryKey,
  consentStatus: ['consent', 'status'] as const satisfies QueryKey,
  legalDocument: (t: LegalDocumentType) => ['legal', 'document', t] as const satisfies QueryKey,
  services: ['services'] as const satisfies QueryKey,
  regions: ['regions'] as const satisfies QueryKey,
  concerns: (specialtyId?: string) => ['concerns', specialtyId ?? 'all'] as const satisfies QueryKey,
  consultations: (upcoming: boolean) =>
    ['consultations', upcoming ? 'upcoming' : 'past'] as const satisfies QueryKey,
  consultation: (id: string) => ['consultation', id] as const satisfies QueryKey,
  assignedProvider: (id: string) => ['provider', id] as const satisfies QueryKey,
  searchSuggestions: ['search', 'suggestions'] as const satisfies QueryKey,
  searchGuide: ['search', 'guide'] as const satisfies QueryKey,
  intakeForm: (id: string) => ['intake', id] as const satisfies QueryKey,
  instantStatus: (id: string) => ['instant', id] as const satisfies QueryKey,
  serviceSlots: (id: string, date: string) =>
    ['slots', id, date] as const satisfies QueryKey,
  emergencyGuidance: ['care-hub', 'emergency'] as const satisfies QueryKey,
  bill: (id: string) => ['bill', id] as const satisfies QueryKey,
  videoReadiness: (id: string) => ['video', 'readiness', id] as const satisfies QueryKey,
  files: ['files'] as const satisfies QueryKey,
  fileRequests: ['files', 'requests'] as const satisfies QueryKey,
  notifications: ['notifications'] as const satisfies QueryKey,
  unreadCount: ['notifications', 'unread'] as const satisfies QueryKey,
};

/* --------------------------------- profile -------------------------------- */

export const useProfile = (enabled = true) =>
  useQuery<PatientProfile>(queryKeys.profile, profile.getProfile, {
    enabled,
    // The profile changes rarely and gates routing, so it is worth holding.
    staleTime: 120_000,
  });

export const useUpdateProfile = () =>
  useMutation<
    {
      fullName?: string;
      dateOfBirth?: string;
      gender?: Gender;
      preferredLanguage?: Language;
      regionId?: string;
    },
    PatientProfile
  >(profile.updateProfile, { invalidates: [queryKeys.profile] });

/* ---------------------------------- legal --------------------------------- */

export const useConsentStatus = (enabled = true) =>
  useQuery(queryKeys.consentStatus, legal.getConsentStatus, { enabled, staleTime: 120_000 });

export const useLegalDocument = (documentType: LegalDocumentType, enabled = true) =>
  useQuery(
    queryKeys.legalDocument(documentType),
    useCallback(() => legal.getLegalDocument(documentType), [documentType]),
    // Legal copy is versioned and changes on publication, not on a timer.
    { enabled, staleTime: 10 * 60_000 },
  );

export const useAcceptConsent = () =>
  useMutation<LegalDocumentType, unknown>(legal.acceptConsent, {
    invalidates: [queryKeys.consentStatus],
  });

/* -------------------------------- catalogue ------------------------------- */

export const useServices = (enabled = true) =>
  useQuery(queryKeys.services, catalogue.listServices, { enabled, staleTime: 10 * 60_000 });

export const useRegions = (enabled = true) =>
  useQuery(queryKeys.regions, catalogue.listRegions, { enabled, staleTime: 10 * 60_000 });

export const useConcerns = (specialtyId?: string, enabled = true) =>
  useQuery(
    queryKeys.concerns(specialtyId),
    useCallback(() => catalogue.listConcerns(specialtyId), [specialtyId]),
    { enabled, staleTime: 10 * 60_000 },
  );

/* ------------------------------ consultations ----------------------------- */

export const useConsultations = (upcoming: boolean, enabled = true) =>
  useQuery<Consultation[]>(
    queryKeys.consultations(upcoming),
    useCallback(() => consultations.listConsultations({ upcoming }), [upcoming]),
    { enabled, staleTime: 20_000 },
  );

export const useConsultation = (id: string | null) =>
  useQuery<Consultation>(
    queryKeys.consultation(id ?? 'none'),
    useCallback(() => consultations.getConsultation(id!), [id]),
    { enabled: !!id, staleTime: 15_000 },
  );

export const useCancelConsultation = () =>
  useMutation<{ consultationId: string; reason?: string }, Consultation>(
    ({ consultationId, reason }) => consultations.cancelConsultation(consultationId, reason),
    // Cancelling moves the row from the upcoming list to the past one, so both
    // lists are stale, not just the one on screen.
    { invalidates: [['consultations'], ['consultation']] },
  );

/* ------------------------------ find the care ----------------------------- */

/**
 * Symptom search.
 *
 * A MUTATION, not a query, for two reasons: it is a POST (FR-5.11 keeps the
 * query out of access logs), and the result must never be cached — a crisis
 * response replayed from a cache after the user dismissed it would re-interrupt
 * them, and a cached `soonestAvailableAt` goes stale within minutes.
 */
export const useSearch = () => useMutation<string, search.SearchResponse>(search.search);

export const useSearchSuggestions = (enabled = true) =>
  useQuery(queryKeys.searchSuggestions, search.searchSuggestions, {
    enabled,
    staleTime: 10 * 60_000,
  });

/** FR-5.5's concern guide — every service with its concerns, nothing typed. */
export const useSearchGuide = (enabled = true) =>
  useQuery(queryKeys.searchGuide, search.searchGuide, { enabled, staleTime: 5 * 60_000 });

/**
 * Persistent emergency guidance (SRS 6.3).
 *
 * Held for a long time and never gated on anything: the one screen somebody in
 * crisis is looking at must not depend on a fresh network call.
 */
export const useEmergencyGuidance = (enabled = true) =>
  useQuery(queryKeys.emergencyGuidance, careHub.getEmergencyGuidance, {
    enabled,
    staleTime: 30 * 60_000,
  });

/* ------------------------------ the provider ------------------------------ */

/**
 * The provider ASSIGNED to one of the patient's own consultations (FR-4.3).
 *
 * `doctorId` is null until assignment has happened, and the hook stays disabled
 * until then — there is nothing to look up, and there is deliberately no way to
 * look up anyone else.
 */
export const useAssignedProvider = (doctorId: string | null) =>
  useQuery(
    queryKeys.assignedProvider(doctorId ?? 'none'),
    useCallback(() => doctors.getAssignedProvider(doctorId!), [doctorId]),
    { enabled: !!doctorId, staleTime: 5 * 60_000 },
  );

/**
 * FR-4.4. Asks for a different provider, with a required reason, up to the
 * configured limit. The backend reruns assignment — this is NOT a picker, and
 * the patient does not learn who they might get instead.
 */
export const useDeclineProvider = () =>
  useMutation<{ consultationId: string; reason: string }, Consultation>(
    ({ consultationId, reason }) => consultations.declineProvider(consultationId, reason),
    { invalidates: [['consultations'], ['consultation'], ['provider']] },
  );

/* ------------------------------ instant consult --------------------------- */

/**
 * The live routing state of a Consult Now request.
 *
 * `staleTime: 0` because the screen polls it — this is the one read where a
 * cached answer is worse than none. It carries no provider identity; see the
 * note in `endpoints/instant.ts`.
 */
export const useInstantStatus = (consultationId: string | null, enabled = true) =>
  useQuery(
    queryKeys.instantStatus(consultationId ?? 'none'),
    useCallback(() => instant.getInstantStatus(consultationId!), [consultationId]),
    { enabled: enabled && !!consultationId, staleTime: 0 },
  );

/* ------------------------------ time and intake --------------------------- */

/**
 * Coverable times for a service on one day.
 *
 * *** SEE GAP G-1 in `endpoints/slots.ts`. *** While that gap is open the
 * result is marked `isEstimated` and the times are candidates confirmed at
 * booking. The hook signature is already what a real endpoint would need, so
 * closing G-1 changes nothing here.
 *
 * `staleTime` is short: availability is the one thing on this screen that
 * genuinely moves minute to minute.
 */
export const useServiceSlots = (
  specialtyId: string | null,
  date: string,
  durationMinutes?: number,
) =>
  useQuery(
    queryKeys.serviceSlots(specialtyId ?? 'none', date),
    useCallback(
      () =>
        slots.fetchServiceSlots({
          specialtyId: specialtyId!,
          date,
          ...(durationMinutes ? { durationMinutes } : {}),
        }),
      [specialtyId, date, durationMinutes],
    ),
    { enabled: !!specialtyId, staleTime: 60_000 },
  );

/** The intake form. See gap G-4 in `endpoints/intake.ts`. */
export const useIntakeForm = (specialtyId: string | null) =>
  useQuery(
    queryKeys.intakeForm(specialtyId ?? 'none'),
    useCallback(() => intake.fetchIntakeForm(specialtyId!), [specialtyId]),
    { enabled: !!specialtyId, staleTime: 10 * 60_000 },
  );

/* --------------------------- payments and video --------------------------- */

export const useBill = (consultationId: string | null, enabled = true) =>
  useQuery(
    queryKeys.bill(consultationId ?? 'none'),
    useCallback(() => payments.getBill(consultationId!), [consultationId]),
    { enabled: enabled && !!consultationId, staleTime: 30_000 },
  );

/**
 * The pre-call check. Safe to poll — it issues nothing. `staleTime` is short
 * because `joinable` flips as the scheduled time arrives.
 */
export const useVideoReadiness = (consultationId: string | null, enabled = true) =>
  useQuery(
    queryKeys.videoReadiness(consultationId ?? 'none'),
    useCallback(() => video.getVideoReadiness(consultationId!), [consultationId]),
    { enabled: enabled && !!consultationId, staleTime: 10_000 },
  );

/* ---------------------------------- files --------------------------------- */

export const useFiles = (enabled = true) =>
  useQuery(queryKeys.files, files.listFiles, { enabled, staleTime: 30_000 });

export const useOpenFileRequests = (enabled = true) =>
  useQuery(queryKeys.fileRequests, files.listOpenFileRequests, { enabled, staleTime: 60_000 });

export const useDeleteFile = () =>
  useMutation<string, void>(files.deleteFile, { invalidates: [queryKeys.files] });

/* ------------------------------ notifications ----------------------------- */

export const useNotifications = (enabled = true) =>
  useQuery(queryKeys.notifications, useCallback(() => notifications.listNotifications({ limit: 30 }), []), {
    enabled,
    staleTime: 30_000,
  });

export const useUnreadCount = (enabled = true) =>
  useQuery(queryKeys.unreadCount, notifications.getUnreadCount, { enabled, staleTime: 30_000 });

export const useMarkNotificationRead = () =>
  useMutation<string, void>(notifications.markNotificationRead, {
    invalidates: [queryKeys.notifications, queryKeys.unreadCount],
  });

export const useMarkAllNotificationsRead = () =>
  useMutation<void, { marked: number }>(() => notifications.markAllNotificationsRead(), {
    invalidates: [queryKeys.notifications, queryKeys.unreadCount],
  });

/** Escape hatch for a screen that must force a reload of something it wrote. */
export { invalidate };
