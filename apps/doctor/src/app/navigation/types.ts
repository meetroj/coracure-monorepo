import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Every destination and the ids it needs.
 *
 * A detail route carries the id of the record it shows — an appointment, an
 * alert, a document — and resolves it on arrival. There is no "current
 * patient" held anywhere else, so a screen cannot show one patient's record
 * under another's name, and a missing id is a "could not open" screen rather
 * than a blank one.
 */
export type DashboardStackParams = {
  Dashboard: undefined;
  PendingTasks: undefined;
  FollowUpAlerts: { category?: string } | undefined;
};

export type TabParams = {
  DashboardTab: NavigatorScreenParams<DashboardStackParams> | undefined;
  AppointmentsTab: undefined;
  CasesTab: undefined;
  ClarificationsTab: undefined;
  ProfileTab: undefined;
};

export type RootParams = {
  Tabs: NavigatorScreenParams<TabParams> | undefined;

  /* consultation */
  AppointmentDetails: { appointmentId: string };
  ConsultationRoom: { appointmentId: string };
  ClinicalNotes: { appointmentId: string };
  Prescription: { appointmentId: string };
  PrescriptionPreview: { appointmentId: string };
  Templates: { appointmentId: string };
  CaseSummary: { appointmentId: string };
  CaseDetail: { appointmentId: string };
  CareHub: { appointmentId: string };
  AssignPlan: { appointmentId: string };

  /* follow-up and documents */
  AlertDetail: { alertId: string };
  RequestReport: { appointmentId: string };
  PatientDocuments: { patientId: string; appointmentId?: string };
  DocumentViewer: { docId: string };

  /* messaging */
  Notifications: undefined;
  ChatList: undefined;
  ChatThread: { threadId: string };

  /* clarifications */
  CreateClarification: { appointmentId?: string; clarificationId?: string } | undefined;
  Clarification: { clarificationId: string };
  ExpertResponse: { clarificationId: string };

  /* instant consultation */
  InstantRequest: undefined;
  InstantAccepted: undefined;
  InstantDeclined: { expired?: boolean } | undefined;

  /* profile */
  AccountStatus: undefined;
  Resubmit: undefined;
  ProfileDetails: undefined;
  ConsultationFee: undefined;
  ConsultationDuration: undefined;
  BankDetails: undefined;
  Privacy: undefined;
  RequestChanges: { field?: string } | undefined;
  Availability: undefined;
  Earnings: undefined;
  PayoutHistory: undefined;
  Reviews: undefined;
  HelpSupport: { raise?: string } | undefined;
  SupportIssue: { issueId: string };
  FaqList: undefined;
};

export type RootRoute = keyof RootParams;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootParams {}
  }
}
