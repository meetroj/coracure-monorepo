export * from './types';
export * from './token-store';
export * from './client';
export type { JoinReadiness, JoinToken } from './endpoints/video';
export type { PatientFile, FileRequest } from './endpoints/files';
export type { SearchResponse, ServiceMatch, EmergencyGuidance } from './endpoints/search';

import * as authApi from './endpoints/auth';
export { authApi };
// Doctor sign-in runs on `http.ts` — the client with single-flight refresh and
// keychain-backed storage — not on the older `client.ts` the patient screens
// still use. Exported as a namespace so `signOut`/`requestOtp` cannot collide
// with the patient functions of the same name above.
import * as doctorAuthApi from './endpoints/doctorAuth';
export { doctorAuthApi };
export type {
  DoctorVerificationStatus,
  DoctorSignIn,
  OtpChallenge,
} from './endpoints/doctorAuth';
import * as doctorProfileApi from './endpoints/doctorProfile';
export { doctorProfileApi };
export type {
  DoctorSelfProfile,
  VerificationProgress,
  CredentialSummary,
  DoctorDocumentType,
  CredentialContentType,
  ApiLanguage,
  RegistrationView,
  SaveRegistration,
  RegistrationIdType,
} from './endpoints/doctorProfile';
import * as doctorConsultationsApi from './endpoints/doctorConsultations';
export { doctorConsultationsApi };
export type {
  DoctorConsultation,
  PatientCard,
  PendingDocumentation,
  SafetyAlert,
  ConsultationStatus,
} from './endpoints/doctorConsultations';
import * as doctorAvailabilityApi from './endpoints/doctorAvailability';
export { doctorAvailabilityApi };
export type { Diary, AvailabilityRule, WeeklyWindow, Slot } from './endpoints/doctorAvailability';
import * as doctorPresenceApi from './endpoints/doctorPresence';
export { doctorPresenceApi };
export type {
  DoctorPresence,
  SelfSettablePresence,
  PresenceRecord,
  InstantOffer,
} from './endpoints/doctorPresence';
import * as doctorFilesApi from './endpoints/doctorFiles';
export { doctorFilesApi };
export type {
  PatientFile as DoctorPatientFile,
  PatientFileCategory,
  ReportRequest as DoctorReportRequest,
  ReportRequestCategory,
} from './endpoints/doctorFiles';
export { configureApi, getApiConfig } from './config';
import * as profileApi from './endpoints/profile';
export { profileApi };
import * as legalApi from './endpoints/legal';
export { legalApi };
import * as consultationsApi from './endpoints/consultations';
export { consultationsApi };
import * as notificationsApi from './endpoints/notifications';
export { notificationsApi };
import * as catalogueApi from './endpoints/catalogue';
export { catalogueApi };
import * as checkinApi from './endpoints/checkin';
export { checkinApi };
import * as carehubApi from './endpoints/careHub';
export { carehubApi };
import * as videoApi from './endpoints/video';
export { videoApi };
import * as filesApi from './endpoints/files';
export { filesApi };
import * as searchApi from './endpoints/search';
export { searchApi };
import * as slotsApi from './endpoints/slots';
export { slotsApi };
import * as paymentsApi from './endpoints/payments';
export { paymentsApi };
import * as intakeApi from './endpoints/intake';
export { intakeApi };

