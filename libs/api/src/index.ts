/**
 * `@coracure/api` — the only way this workspace talks to the backend.
 *
 * Screens import hooks from here; nothing imports `fetch` directly. That is
 * what makes the base URL, the bearer header, the single-flight refresh, the
 * error envelope and the secure token store single-sourced.
 */

export { configureApi, getApiConfig, apiUrl, type ApiConfig } from './config';

export {
  ApiError,
  ClientCode,
  DomainCode,
  PlatformCode,
  messageFor,
  retryAfterSeconds,
  type ApiErrorBody,
  type ErrorCode,
} from './errors';

export {
  api,
  request,
  hydrateSession,
  getSession,
  isSignedIn,
  setSession,
  clearSession,
  onSignedOut,
  type RequestOptions,
} from './http';

export { secureStorageAvailable, type SessionTokens } from './tokenStore';

export {
  useQuery,
  useMutation,
  invalidate,
  clearQueryCache,
  keyOf,
  type QueryKey,
  type QueryResult,
  type MutationResult,
} from './query';

export * from './types';

/**
 * Endpoint namespaces.
 *
 * Written as an import plus a re-export rather than `export * as ns from`,
 * which the React Native Babel preset does not transform — it fails the bundle
 * with "Export namespace should be first transformed by
 * @babel/plugin-transform-export-namespace-from". This form needs no plugin.
 */
import * as authApi from './endpoints/auth';
import * as profileApi from './endpoints/profile';
import * as legalApi from './endpoints/legal';
import * as catalogueApi from './endpoints/catalogue';
import * as consultationsApi from './endpoints/consultations';
import * as notificationsApi from './endpoints/notifications';
import * as filesApi from './endpoints/files';
import * as paymentsApi from './endpoints/payments';
import * as videoApi from './endpoints/video';
import * as searchApi from './endpoints/search';
import * as careHubApi from './endpoints/careHub';
import * as doctorsApi from './endpoints/doctors';
import * as slotsApi from './endpoints/slots';
import * as intakeApi from './endpoints/intake';
import * as instantApi from './endpoints/instant';

export {
  authApi,
  profileApi,
  legalApi,
  catalogueApi,
  consultationsApi,
  notificationsApi,
  filesApi,
  paymentsApi,
  videoApi,
  searchApi,
  careHubApi,
  doctorsApi,
  slotsApi,
  intakeApi,
  instantApi,
};

export type { Bill, BillLine } from './endpoints/payments';
export type { JoinReadiness, JoinToken } from './endpoints/video';
export type {
  SearchResponse,
  ServiceMatch,
  GuideEntry,
  ConcernBrief,
  EmergencyGuidance,
  Helpline,
} from './endpoints/search';
export type { CareHubItem } from './endpoints/careHub';
export type { AssignedProvider } from './endpoints/doctors';
export type { Slot, SlotSource, ServiceSlots, ServiceSlotQuery } from './endpoints/slots';
export { toLocalDateKey } from './endpoints/slots';
export type {
  IntakeForm,
  IntakeQuestion,
  IntakeQuestionType,
} from './endpoints/intake';
export type { InstantStatus } from './endpoints/instant';
export { PAYMENT_METHODS } from './endpoints/payments';
export type { PaymentMethod, CheckoutSession, SettlementState } from './endpoints/payments';
export type { PatientFile, FileRequest } from './endpoints/files';

export {
  queryKeys,
  useProfile,
  useUpdateProfile,
  useConsentStatus,
  useLegalDocument,
  useAcceptConsent,
  useServices,
  useRegions,
  useConcerns,
  useConsultations,
  useConsultation,
  useCancelConsultation,
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useFiles,
  useOpenFileRequests,
  useDeleteFile,
  useBill,
  useVideoReadiness,
  useSearch,
  useSearchSuggestions,
  useSearchGuide,
  useEmergencyGuidance,
  useAssignedProvider,
  useDeclineProvider,
  useServiceSlots,
  useIntakeForm,
  useInstantStatus,
} from './hooks';
