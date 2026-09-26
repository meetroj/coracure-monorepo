export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OtpRequestResponse {
  challengeId: string;
}

export interface OtpVerifyResponse extends TokenPair {
  isNewAccount: boolean;
}

export interface OwnProfile {
  id: string;
  fullName: string | null;
  dateOfBirth: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | 'undisclosed';
  preferredLanguage: string;
  regionId: string | null;
  mobileNumber: string;
  status: 'pending' | 'active' | 'suspended' | 'deleted';
  isComplete: boolean;
}

export interface UpdateProfileInput {
  fullName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'undisclosed';
  preferredLanguage?: string;
  regionId?: string;
}

export interface ConsentStatus {
  teleconsultationConsent: boolean;
  privacyPolicy: boolean;
  termsOfUse: boolean;
}

export interface LegalDocument {
  id: string;
  documentType: string;
  version: string;
  title: string;
  body: string;
}

export interface ServiceListing {
  id: string;
  code: string;
  name: string;
  description: string | null;
  consultationFeeInr: number;
  providerType: string;
  canPrescribe: boolean;
}

export interface ConsultationRecord {
  id: string;
  referenceCode: string;
  status: 'pending_payment' | 'scheduled' | 'awaiting_doctor' | 'in_progress' | 'awaiting_documentation' | 'completed' | 'cancelled' | 'no_show' | 'expired';
  mode: 'scheduled' | 'instant';
  specialtyId: string;
  concernId: string | null;
  doctorId: string | null;
  scheduledStartAt: string | null;
  durationMinutes: number;
  holdExpiresAt: string | null;
  consultationFeeInr: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  templateCode: string;
  title: string;
  body: string;
  deepLinkData: unknown;
  consultationId: string | null;
  status: string;
  createdAt: string;
  readAt: string | null;
}

export interface Region {
  id: string;
  name: string;
  code: string;
}

export interface Concern {
  id: string;
  name: string;
  specialtyId: string;
}

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  details: Record<string, unknown>;
  path: string;
  requestId: string;
  timestamp: string;
}

export type Consultation = ConsultationRecord;
export type Service = ServiceListing;
export type PatientProfile = OwnProfile;
export type Gender = 'male' | 'female' | 'other' | 'undisclosed';
export type Language = 'en' | 'hi';
export type LegalDocumentType = 'teleconsultation_consent' | 'privacy_policy' | 'terms_of_use';

export interface ConsultationFeedback {
  rating: number;
  tags?: string[];
  comment?: string;
  audioQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  videoQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  recommend?: boolean;
}

export interface PrescriptionMedicine {
  name: string;
  form: string; // 'Tablet' | 'Capsule' | 'Syrup'
  category?: string; // 'Antibiotic' | 'Pain Relief'
  dosage: string; // '1 tablet'
  frequency: string; // 'Twice daily'
  timing: string; // 'After food' | 'Before food'
  durationDays: number;
}

export interface CareRecord {
  consultationId: string;
  referenceCode: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorRegNo?: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientLocation?: string;
  date: string;
  time: string;
  mode: string;
  diagnosis?: string;
  notes?: string;
  medicines: PrescriptionMedicine[];
  tests: string[];
  advice: string[];
  followUpText?: string;
  prescriptionId?: string;
  pdfUrl?: string;
}

export interface CarePlanTask {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  time?: string;
}

export interface CarePlanRecord {
  id: string;
  consultationId: string;
  title: string;
  doctorName: string;
  guidanceText: string;
  startDate: string;
  targetDate: string;
  tag: string;
  progressPercent: number;
  completedTasksCount: number;
  totalTasksCount: number;
  tasks: CarePlanTask[];
  medicines: PrescriptionMedicine[];
  nextFollowUpDate?: string;
  nextFollowUpDoctor?: string;
  warningSigns: string[];
  emergencyContact?: string;
}

export interface BillRecord {
  consultationId: string;
  amountInr: number;
  refundAmountInr: number;
  refundPercentage: number;
  eligibleForRefund: boolean;
  cancellationCutoffHours: number;
  status: string;
}

export interface VideoSessionInfo {
  token: string;
  roomName: string;
  wsUrl: string;
  consultationId: string;
}

