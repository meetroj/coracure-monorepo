/**
 * The shapes the panel reads.
 *
 * Kept separate from the data source so fixtures and a real HTTP client can
 * both satisfy them without importing each other.
 */

export type VerificationStatus =
  | 'pending'
  | 'under_review'
  | 'changes_required'
  | 'verified'
  | 'rejected'
  | 'suspended';

export type Doctor = {
  id: string;
  fullName: string;
  mobileNumber?: string;
  email?: string | null;
  specialtyId?: string | null;
  specialtyName?: string | null;
  qualification?: string | null;
  registrationNumber?: string | null;
  yearsOfExperience?: number | null;
  languages?: string[];
  regionIds?: string[];
  verificationStatus: VerificationStatus;
  isListed?: boolean;
  seniority?: 'standard' | 'expert';
  payoutFeeInr?: number | null;
  consultationDurationMinutes?: number | null;
  bufferMinutes?: number | null;
  rejectionReason?: string | null;
  suspensionReason?: string | null;
  createdAt?: string;
  /** What the doctor stated in the sign-up / KYC form. Private to admins. */
  registration?: DoctorRegistration | null;

  /* Provider-management fields (requirements §5, §8, §9, §17, §18, §21). */
  category?: ProviderCategory;
  providerCode?: string;
  superSpecialtyName?: string | null;
  superSpecialtyId?: string | null;
  bio?: string | null;
  registrationCouncil?: string | null;
  rating?: number | null;
  totalConsultations?: number;
  availabilityStatus?: 'available' | 'unavailable';
  consultationFeeInr?: number | null;
  /** One or more time windows per consultation day (§18). */
  schedule?: { day: string; windows: string[] }[];
  signatureStatus?: 'not_submitted' | 'submitted' | 'approved' | 'replacement_requested';
  /** The signature file, for the preview link (live only). */
  signatureDocumentId?: string | null;
  /** A short-lived signed link to the APPROVED profile photo. Null until an admin approves one. */
  photoUrl?: string | null;
  /** What a reviewer asked the provider to fix, shown to the provider. */
  changesRequiredNote?: string | null;
};

export type ProviderCategory = 'doctor' | 'paramedical' | 'veterinary';

export type DoctorRegistration = {
  /** True when the registration facts came from the backend; false or absent, they were not readable. */
  loaded?: boolean;
  dateOfBirth?: string | null;
  gender?: string | null;
  /** Only the last four characters are ever held in the admin view. */
  idType?: string | null;
  idNumberLast4?: string | null;
  abhaId?: string | null;
  basicQualification?: string | null;
  pgSpecialisation?: string | null;
  superSpecialisation?: string | null;
  fellowship?: string | null;
  experience?: { designation: string; institution: string; years: number }[];
  hasSignature?: boolean;
  /** Optional single profile photo. */
  hasPhoto?: boolean;
  /** Mobile is OTP-verified at sign-up; email is verified by link. */
  mobileVerified?: boolean;
  emailVerified?: boolean;
};

export type DoctorDocument = {
  id: string;
  documentType: string;
  status: 'pending' | 'approved' | 'rejected';
  fileId?: string | null;
  rejectionReason?: string | null;
  uploadedAt?: string;
  reviewedAt?: string | null;
};

export type CredentialQueueRow = {
  doctorId: string;
  fullName: string;
  specialtyName?: string | null;
  category?: ProviderCategory;
  verificationStatus: VerificationStatus;
  pendingDocuments: number;
  submittedAt?: string | null;
  photoUrl?: string | null;
};

export type Reliability = {
  acceptanceRate?: number | null;
  noShowRate?: number | null;
  caseSummaryCompletion?: number | null;
  consultationsCompleted?: number | null;
};

export type AvailabilityRule = {
  id: string;
  ruleType: 'weekly' | 'blocked' | 'custom_hours';
  dayOfWeek?: number | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

export type Slot = { startsAt: string; endsAt: string; available?: boolean };

export type AssignableProvider = {
  doctorId: string;
  fullName: string;
  remainingMinutes?: number | null;
  /** Live only: the consultation plus its buffer, what a booking would occupy. */
  requiredMinutes?: number;
  languages?: string[];
  regionIds?: string[];
  assignable?: boolean;
  reason?: string | null;
};

export type ConsultationStatus =
  | 'pending_payment'
  | 'scheduled'
  | 'awaiting_doctor'
  | 'in_progress'
  | 'awaiting_documentation'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired';

export type Consultation = {
  id: string;
  referenceCode?: string | null;
  status: ConsultationStatus;
  mode?: 'scheduled' | 'instant';
  startsAt?: string | null;
  endsAt?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  language?: string | null;
  regionId?: string | null;
  regionName?: string | null;
  /** Initials and city only - the admin sees logistics, not identity. */
  patientName?: string;
  /** The patient record this case belongs to, so the page can open it. */
  patientId?: string | null;
  channel?: 'video' | 'audio';
  paymentStatus?: 'paid' | 'pending' | 'failed' | 'refunded' | 'not_applicable';
  /** Live only: the backend's own word for the booking. The fixtures derive theirs. */
  displayStatus?: string;
  /** Live only: whole minutes the call actually ran. Null until it has started and ended. */
  actualDurationMinutes?: number | null;
  createdAt?: string;
};

export type SafetyAlert = {
  id: string;
  alertType: 'red_flag' | 'amber' | 'missed_checkin' | 'medication_side_effect' | 'followup_due';
  consultationId?: string | null;
  patientRef?: string | null;
  raisedAt?: string;
  acknowledgedAt?: string | null;
  acknowledgedByAdminId?: string | null;
  closedAt?: string | null;
  summary?: string | null;
};

export type PendingSummary = {
  consultationId: string;
  doctorId?: string | null;
  doctorName?: string | null;
  completedAt?: string | null;
  ageHours?: number | null;
  status?: string;
};

export type ClarificationCase = {
  id: string;
  specialtyName?: string | null;
  status?: string;
  postedAt?: string | null;
  assignedExpertId?: string | null;
  assignedExpertName?: string | null;
  question?: string | null;
  /** Live only. */
  title?: string | null;
  urgency?: string;
  messagesTotal?: number;
  closedAt?: string | null;
};

export type Expert = {
  doctorId: string;
  fullName: string;
  specialtyName?: string | null;
  /** Live only: how much they already hold, so the queue can be spread. */
  openCases?: number;
};

export type AllocationDecision = {
  consultationId: string;
  doctorId?: string | null;
  doctorName?: string | null;
  decidedAt?: string | null;
  basis?: string | null;
  overriddenByAdminId?: string | null;
  reason?: string | null;
};

export type PendingPayout = {
  consultationId: string;
  doctorId?: string | null;
  doctorName?: string | null;
  amountInr?: number | null;
  completedAt?: string | null;
};

/** A patient's charge for one consultation. Initials only - no identity. */
export type PatientPayment = {
  consultationId: string;
  referenceCode: string;
  patientName: string;
  at: string | null;
  amountInr: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
};

export type Bill = {
  consultationFee?: number | null;
  convenienceFeePct?: number | null;
  convenienceFee?: number | null;
  gstPct?: number | null;
  gstAmount?: number | null;
  total?: number | null;
  status?: string;
  refundAmount?: number | null;
  paidAt?: string | null;
};

export type Complaint = {
  id: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'rejected';
  subject?: string | null;
  consultationId?: string | null;
  raisedAt?: string | null;
  assignedAdminId?: string | null;
  messages?: ComplaintMessage[];
  /** Live only: what the patient wrote, the TK-style reference, and how it ended. */
  referenceCode?: string | null;
  description?: string | null;
  resolutionNote?: string | null;
  patientId?: string | null;
};

export type ComplaintMessage = {
  id: string;
  body: string;
  authorType?: string;
  visibleToPatient?: boolean;
  createdAt?: string;
};

export type Feedback = {
  id: string;
  consultationId?: string | null;
  rating?: number | null;
  comment?: string | null;
  submittedAt?: string | null;
};

export type Specialty = {
  id: string;
  name: string;
  isActive?: boolean;
  providerType?: 'doctor' | 'non_doctor';
  mayPrescribe?: boolean;
  intakeForm?: unknown;
  prescriptionTemplate?: unknown;
  /** Live only. */
  code?: string;
  category?: 'medical' | 'super_specialty' | 'paramedical' | 'veterinary';
  consultationFeeInr?: number;
  parentSpecialtyId?: string | null;
};

export type Concern = {
  id: string;
  name: string;
  specialtyId?: string | null;
  matchPhrases?: string[];
  weight?: number | null;
  isActive?: boolean;
};

export type Region = { id: string; name: string; isActive?: boolean; code?: string | null };

export type AllocationPolicy = {
  mayRelaxRegion?: boolean;
  maxDeclines?: number | null;
  [key: string]: unknown;
};

export type ContentItem = {
  id: string;
  slug?: string | null;
  title: string;
  status: 'draft' | 'in_review' | 'published' | 'archived';
  category?: string | null;
  updatedAt?: string | null;
  body?: string | null;
  reviewTrail?: { at?: string; action?: string; note?: string | null }[];
};

export type NotificationTemplate = {
  code: string;
  channel?: string | null;
  title?: string | null;
  body?: string | null;
  isCustomised?: boolean;
  /** Live only: who it goes to, what it may mention, and what it is for. */
  audience?: string[];
  placeholders?: string[];
  description?: string | null;
};

export type SearchConfigShape = {
  crisisKeywords?: string[];
  emergencyGuidance?: unknown;
  synonyms?: unknown;
  popularSearches?: string[];
  disclaimer?: string | null;
};

export type Pathway = {
  code: string;
  version?: number | null;
  publishedAt?: string | null;
  questions?: unknown;
  redFlagRules?: unknown;
  /** Live only. */
  name?: string;
  durationDays?: number;
  isCurrent?: boolean;
};

export type LegalDocument = {
  documentType: string;
  version?: string | number | null;
  publishedAt?: string | null;
  body?: string | null;
  /** Live only: the title it was published under, and whether it is the version in force. */
  title?: string;
  isCurrent?: boolean;
};

export type ConfigValue = {
  key: string;
  value: unknown;
  description?: string | null;
  editable: boolean;
  managedBy?: string | null;
  shape?: string | null;
};

export type AuditEntry = {
  id?: string;
  at?: string;
  createdAt?: string;
  actorType?: string;
  actorId?: string | null;
  action?: string;
  entityType?: string;
  entityId?: string | null;
  consultationId?: string | null;
  metadata?: unknown;
};

export type DeletionRequest = {
  id: string;
  patientId?: string | null;
  status: 'requested' | 'in_review' | 'approved' | 'rejected' | 'executed' | 'failed';
  requestedAt?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
};

export type RetentionInfo = {
  retentionDays?: number | null;
  inScope?: number | null;
  description?: string | null;
};

export type GovernanceDashboard = {
  completedCases?: number | null;
  pendingSummaries?: number | null;
  redFlags?: number | null;
  followUpAlerts?: number | null;
  complaints?: number | null;
  doctorReliability?: Reliability | null;
  [key: string]: unknown;
};

export type AdminNotification = {
  id: string;
  title?: string | null;
  body?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
};

