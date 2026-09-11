/**
 * English — the reference dictionary.
 *
 * *** THIS FILE DEFINES THE KEY SET. *** Every other locale is typed against
 * it (`Dictionary = typeof en`), so adding a key here and forgetting to
 * translate it is a compile error rather than a string that silently renders in
 * English for Hindi users.
 *
 * What is deliberately NOT here:
 *
 * - **Legal and consent copy.** It comes from `GET /legal/documents/:type`,
 *   versioned, and the version accepted is recorded. Translating it in the app
 *   would mean showing one text and recording another.
 * - **The search disclaimer and crisis guidance.** Both are returned by the
 *   backend on every search response, are clinically approved (SRS 8), and are
 *   edited without an app release. A local copy would go stale silently.
 * - **Notification titles and bodies.** They come from server-side templates
 *   that are refused if they name a diagnosis (FR-16.2).
 * - **Service and concern names.** Catalogue data, editable from the panel.
 *
 * `{name}` placeholders are filled by `t(key, { name })`.
 */
export const en = {
  common: {
    continue: 'Continue',
    back: 'Back',
    goBack: 'Go back',
    cancel: 'Cancel',
    close: 'Close',
    skip: 'Skip',
    retry: 'Try again',
    save: 'Save',
    loading: 'Loading…',
    working: 'Working',
    dismiss: 'Dismiss',
    optional: 'Optional',
    seeAll: 'See all',
    viewAll: 'View all',
    somethingWentWrong: 'Something went wrong',
    genericErrorBody: 'We could not load this just now. Please try again.',
    reference: 'Reference: {id}',
    offline: 'You are offline. Some things will not be up to date.',
  },

  splash: {
    checkingSession: 'Checking your session…',
    preparing: 'Getting your care ready…',
    justAMoment: 'Just a moment…',
    private: 'Private',
    secure: 'Secure',
    verified: 'Verified',
  },

  welcome: {
    titleLine1: 'Expert care,',
    titleLine2: 'anytime, anywhere.',
    lede: 'Consult verified doctors by video, get a prescription where it is appropriate, and keep your whole record in one place.',
    getStarted: 'Get Started',
    getStartedHint: 'Starts sign-in with your mobile number',
    skipHint: 'Skip the introduction and sign in',
    professional: 'Professional',
    professionalBody: 'Every clinician is verified before they can take a consultation.',
    secure: 'Secure',
    secureBody: 'Your record is encrypted and never shared without your consent.',
    easy: 'Easy',
    easyBody: 'Pick a service and a time — we match you to the right clinician.',
    accountsNote:
      'Patient accounts are created by you. Doctor accounts are created by our clinical team.',
    heroAlt: 'A clinician and a patient in consultation across a desk',
    trustedProfessionals: 'Trusted Professionals',
    easyAppointments: 'Easy Appointments',
    /**
     * MARKETING CLAIMS, not API data — see the note on `HeroStats`. Editable
     * here so they can change without a code change, and so the client owns
     * the numbers they are standing behind.
     */
    statPatientsValue: '200K+',
    statPatientsLabel: 'Patients Trust Us',
    statSpecialtiesValue: '50+',
    statSpecialtiesLabel: 'Specialties',
  },

  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to continue to your account.',
    mobileNumber: 'Mobile Number',
    continueHint: 'Sends a one-time code to this number',
    enterNumber: 'Enter your mobile number.',
    numberLength: 'A {country} number has {digits} digits.',
    numberInvalid: 'That does not look like a valid mobile number.',
    tooManyAttempts: 'Too many attempts. Try again in {minutes} minutes.',
    tooManyAttemptsOne: 'Too many attempts. Try again in 1 minute.',
    tooManyAttemptsNoWait: 'Too many attempts. Please wait a few minutes and try again.',
    accountNotActive: 'We cannot sign you in with that number. Please contact support.',
    sessionExpired: 'Your session expired for security. Please sign in again.',
    sessionRevoked: 'You were signed out on all devices. Please sign in again.',
    termsPrefix: 'By continuing, you agree to our ',
    termsOfUse: 'Terms of Use',
    and: ' and ',
    privacyPolicy: 'Privacy Policy',
    secureVerification: 'Secure verification',
    secureVerificationBody:
      'We send a one-time code to this number. We never ask for a password, and we never call you to ask for the code.',
    areYouADoctor: 'Are you a doctor?',
    areYouADoctorBody:
      'Clinician accounts are created by our team and sign in through the CoraCure for Doctors app.',
    selectCountry: 'Select country',
  },

  otp: {
    title: 'Verify with OTP',
    subtitle: 'Enter the {length}-digit code we sent to',
    edit: 'Edit',
    editHint: 'Edit the mobile number',
    verifyContinue: 'Verify & Continue',
    resend: 'Resend code',
    resending: 'Sending…',
    resendIn: 'Resend code in {time}',
    resent: 'A new code has been sent to {number}.',
    invalidCode: 'That code is not correct, or it has expired. Check it and try again.',
    neverShare: 'Never share this code',
    neverShareBody:
      'CoraCure staff will never call, text or email you to ask for it. The code expires shortly after it is sent.',
    devBuild: 'Development build',
    devBuildBody:
      'Secure storage is not linked in this build, so you will be signed out when the app restarts. A native rebuild enables it.',
  },

  profile: {
    title: "Let's set up your profile",
    subtitle: 'Tell us a bit about yourself so we can personalise your care.',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    enterFullName: 'Enter your full name.',
    nameTooLong: 'That name is too long.',
    dateOfBirth: 'Date of Birth',
    enterDob: 'Enter your date of birth.',
    dobInvalid: 'Enter a real date, as DD / MM / YYYY.',
    dobTooOld: 'Check the year — that date is too far in the past.',
    gender: 'Gender',
    genderHint: 'Used by clinicians when reviewing your case.',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    undisclosed: 'Prefer not to say',
    preferredLanguage: 'Preferred Language',
    languageHint: 'We only assign a clinician who speaks this language.',
    personalisation: 'Personalisation just for you',
    personalisationBody:
      'Your state helps us prefer a clinician licensed near you. If nobody in your state is free, we will still find you care — your language is never relaxed.',
    selectState: 'Select your state (optional)',
    selectStateTitle: 'Select your state',
    loadingStates: 'Loading states…',
    statesError:
      'We could not load the list of states. You can add this later from your profile.',
    saveContinue: 'Save & Continue',
    privacyNote: 'Your information is private and used only to arrange your care.',
    loadError: 'We could not load your profile',
    saveDobError: 'Enter a real date of birth in the past.',
    saveValidationError: 'Some of those details were not accepted. Check them and try again.',
  },

  consent: {
    subtitle:
      'Before we begin, please review how your information is used and stored during a teleconsultation.',
    version: 'Version {version}',
    acceptContinue: 'Accept & Continue',
    acceptHint: 'Records your acceptance of version {version}',
    decline: 'Decline',
    notRecorded: 'Not recorded',
    encrypted: 'Encrypted',
    yoursToDelete: 'Yours to delete',
    evidenceNote:
      "Accepting records the version, the date and time, and your device's IP address as evidence of consent. You can withdraw it later from your profile.",
    declineTitle: 'Decline consent?',
    declineBody:
      'You can keep your account and browse the app, but you will not be able to book a consultation until you accept this form. We will ask again when you try to book.',
    declineForNow: 'Decline for now',
    loadError: 'We could not load the consent form',
    loadErrorBody: 'The consent form could not be loaded just now.',
    recordError: 'We could not record your consent. Please try again.',
    summary: 'Summary',
  },

  dashboard: {
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    welcome: 'Welcome',
    searchPlaceholder: 'Describe how you are feeling',
    searchHint: 'Opens Find the Right Care',
    consentNeeded: 'Consent needed before booking',
    consentNeededBody:
      'You will be asked to accept the teleconsultation consent form before your first consultation.',
    reviewConsent: 'Review consent',
    nextConsultation: 'Your next consultation',
    nothingBooked: 'Nothing booked yet',
    nothingBookedBody:
      'Pick a service and a time that suits you. We will match you with the right clinician.',
    bookConsultation: 'Book a consultation',
    quickActions: 'Quick actions',
    consultNow: 'Consult Now',
    consultNowSub: 'Next available',
    book: 'Book',
    bookSub: 'Pick a time',
    reports: 'Reports',
    reportsSub: 'Your files',
    support: 'Support',
    supportSub: 'Get help',
    exploreServices: 'Explore services',
    servicesAvailable: '{count} available',
    servicesUnavailable: 'Services unavailable',
    noServices: 'No services are open right now',
    noServicesBody: 'Our catalogue is being updated. Please check back shortly.',
    yourCare: 'Your care',
    upcoming: 'Upcoming',
    completed: 'Completed',
    profileLabel: 'Profile',
    profileReady: 'Ready',
    profilePartial: 'Partial',
    latestRecord: 'View your latest care record',
    latestRecordHint: 'Open your most recent care record',
    afterFirst:
      'After your first consultation, your notes, prescription and care plan appear here.',
    consultationsError: 'We could not load your consultations',
    notifications: 'Notifications',
    yourProfile: 'Your profile',
  },

  findCare: {
    title: 'Find the Right Care',
    subtitle: 'Describe how you are feeling in your own words. We will suggest the right service.',
    placeholder: 'e.g. trouble sleeping and feeling anxious',
    searchAction: 'Find care',
    searching: 'Finding care…',
    popular: 'Common concerns',
    browseAll: 'Not sure? Browse all services',
    browseTitle: 'Browse by service',
    resultsTitle: 'Suggested for you',
    matchedTo: '{reason}',
    suggestedByAssistant: 'Suggested — not from our reviewed mapping',
    fromMapping: 'From our clinically reviewed mapping',
    soonest: 'Soonest: {when}',
    soonestUnknown: 'Availability confirmed when you book',
    chooseTime: 'Choose a time',
    noResults: 'We could not match that to a service',
    noResultsBody:
      'Try different words, or browse the full list of services and pick the closest one.',
    searchError: 'We could not run that search',
    /** Never a substitute for the server disclaimer — this labels it. */
    disclaimerLabel: 'Please note',
    neverPicksDoctor:
      'You choose the service and the time. We match you with an available professional — you are never shown a list of doctors to pick from.',
  },

  booking: {
    title: 'Book a consultation',
    whenSuits: 'When suits you?',
    whenSuitsSub: 'We confirm availability when you book.',
    languageMatch:
      "We'll match you with an available professional who speaks {language}.",
    durationNote: 'This consultation is about {minutes} minutes.',
    today: 'Today',
    noMoreTimes: 'No more times today',
    noMoreTimesBody:
      'Pick another day, or start a Consult Now request for the next available professional.',
    confirmAt: 'Confirm {time}',
    chooseATime: 'Choose a time',
    orConsultNow: 'Or consult now, next available',
    changeService: 'Choose a different service',
    feeNote:
      '{fee} for this consultation. Your slot is held while you pay, and released if payment is not completed.',
    noProviderTitle: 'No professional free at that time',
    noProviderBody: 'The soonest we can cover {service} is {when}.',
    bookSoonest: 'Book {when}',
    slotTaken:
      'That time was taken while you were choosing. Your service is still selected — pick another time.',
    bookingFailed: 'We could not complete that booking.',
    finishProfile: 'Finish your profile first',
    finishProfileBody:
      'We need your name and date of birth before a consultation can be booked.',
    completeProfile: 'Complete profile',
    consentNeeded: 'Consent needed',
    consentNeededBody: 'Please accept the teleconsultation consent form before booking.',
    servicesError: 'We could not load the services',
  },

  services: {
    chooseTitle: 'Choose a Service',
    chooseSubtitle: 'Pick what you need help with. We will match you to the right professional.',
    searchPlaceholder: 'Search services',
    noMatch: 'No services match that',
    noMatchBody: 'Try a different word, or browse the full list.',
    clearSearch: 'Clear search',
    canPrescribe: 'Can prescribe medicine',
    free: 'Free',
  },

  consultation: {
    title: 'Consultation',
    scheduled: 'Scheduled consultation',
    instant: 'Consult Now',
    when: 'When',
    time: 'Time',
    referenceLabel: 'Reference',
    fee: 'Fee',
    matchingClinician: 'Matching a professional',
    loadError: 'We could not load this consultation',
    holdTitle: 'Slot held for {time}',
    holdBody:
      'Your time is reserved while you pay. If payment is not completed, the slot is released and offered to someone else.',
    holdExpiredTitle: 'This hold expired',
    holdExpiredBody:
      'Nobody cancelled it — the payment window simply ran out and the slot was released. You can book a new time.',
    bookAgain: 'Book again',
    cancelledTitle: 'Cancelled',
    cancelledReason: 'Reason given: {reason}',
    cancelledPlain: 'This consultation was cancelled.',
    whatNext: 'What happens next',
    step1: 'Confirm your booking',
    step1Body:
      'Your slot is confirmed once payment settles. Free services are confirmed straight away.',
    step2: 'We assign a professional',
    step2Body:
      'We match on your service, your language and your state. You do not choose the professional — we find the right one.',
    step3: 'Join the video call',
    step3Body:
      'The consultation is not recorded. Join from this screen at your scheduled time.',
    privacyNote:
      'Consultations are never recorded. Your professional writes notes into your care record, which you can read here afterwards.',
    cancelAction: 'Cancel this consultation',
    cancelTitle: 'Cancel this consultation?',
    cancelHoldBody: 'This releases the slot you are holding. Nothing has been charged.',
    cancelPaidBody:
      'Refunds follow the refund policy for this service. If a refund is not available for this booking, we will tell you before anything is charged back.',
    cancelReason: 'Reason (optional)',
    cancelReasonPlaceholder: 'Helps us improve',
    notRefundable:
      'This booking is outside the refund window. Contact support if you need help.',
    keepIt: 'Keep it',
    reschedule: 'Move to another time',
    rescheduleTitle: 'Move this consultation?',
    /**
     * *** THE POLICY IS NOT STATED HERE. *** PT-11-05 requires the refund
     * consequence under the CURRENT policy, and the policy is backend and legal
     * configuration. This copy points at where the consequence is shown; it
     * never asserts what the consequence is.
     */
    rescheduleBody:
      'We book the new time and cancel this one. The new booking is linked to this one so your history stays together, but it gets a new reference number. A professional is assigned again for the new time — whoever was free on one day may not be free on another.',
    rescheduleConfirm: 'Choose a new time',
    refundHeading: 'Before you confirm',
    refundLoading: 'Checking the refund policy…',
    refundUnavailable:
      'We could not load the refund policy just now. Please try again, or contact support before cancelling.',
    refundNone: 'No refund is available for this booking under the current policy.',
    refundFull: '{amount} will be refunded under the current policy.',
    refundHold: 'Nothing has been charged, so there is nothing to refund.',
    readPolicy: 'Read the refund policy',
    yourBill: 'Your bill',
    yourBillSub: 'Every component, separately.',
    billFallback: 'We could not load the breakdown. The quoted fee is {fee}.',
    total: 'Total',
    paymentNote:
      'Payment opens in your chosen UPI or card app. Your slot is held until the countdown above runs out.',
    readyToJoin: 'Ready to join',
    readyToJoinBody: 'Your professional is expecting you. The call is not recorded.',
    notOpenYet: 'Not open yet',
    opensAt: 'The call opens {when}.',
    notOpenPlain: 'This call is not open yet.',
    checkJoin: 'Check I can join',
    checking: 'Checking…',
    checkJoinHint: 'Runs the pre-call check without starting the call',
    joinNow: 'Join now',
    payNow: 'Pay now',
    viewDetails: 'View details',
  },

  provider: {
    sectionTitle: 'Your assigned professional',
    assignedNote: 'Assigned by CoraCure based on your service, language and state.',
    assignedGeneric: 'A professional has been assigned',
    notAssignedYet: 'Not assigned yet',
    notAssignedBody:
      'We assign a professional once your booking is confirmed. You will see who it is here.',
    experience: '{years} years experience',
    speaks: 'Speaks {languages}',
    registration: 'Reg. {number}',
    canPrescribe: 'Can prescribe medicine',
    loadError: 'We could not load your professional yet',
    declineAction: 'Request a different professional',
    declineTitle: 'Request a different professional?',
    declineBody:
      'We will assign someone else and tell them nothing about why. This is not a way to pick a professional — you will not be shown a list.',
    declineRemaining: 'You can do this {count} more times for this booking.',
    declineRemainingOne: 'You can do this once more for this booking.',
    declineReasonLabel: 'Why? (required)',
    declineReasonPlaceholder: 'This is recorded and reviewed',
    declineReasonRequired: 'Please tell us why — a request with no reason tells nobody anything.',
    declineConfirm: 'Request a different professional',
    declineLimitTitle: 'No more changes for this booking',
    declineLimitBody:
      'You have used all your requests for this booking. Please continue with the professional assigned, or cancel.',
    declineFailed: 'We could not make that request.',
  },

  appointments: {
    title: 'Appointments',
    subtitle: 'Everything you have booked with us.',
    upcoming: 'Upcoming',
    past: 'Past',
    noUpcoming: 'No upcoming consultations',
    noUpcomingBody:
      'When you book, your consultation will appear here with the time and how to join.',
    noPast: 'Nothing here yet',
    noPastBody: 'Consultations you have completed or cancelled will be listed here.',
    bookAnother: 'Book another consultation',
    loadError: 'We could not load your appointments',
  },

  reports: {
    title: 'Reports & files',
    subtitle: 'Test results, prescriptions and anything you have shared with a professional.',
    requested: 'Requested from you',
    requestedSub: 'A professional has asked for these.',
    requestedOn: 'Requested {date}',
    yourFiles: 'Your files',
    stored: '{count} stored',
    noFiles: 'No files yet',
    noFilesBody:
      'Reports and prescriptions from your consultations will appear here, along with anything you upload.',
    inRecord: 'In record',
    loadError: 'We could not load your files',
    openError: 'We could not open that file just now.',
    partOfRecord: 'That file is part of a clinical record and cannot be removed.',
    encryptionNote:
      'Files are encrypted at rest. A file attached to a clinical record is kept for as long as the record is, and cannot be deleted.',
  },

  account: {
    yourProfile: 'Your profile',
    profileComplete: 'Profile complete',
    profileIncomplete: 'Profile incomplete',
    active: 'Active',
    age: 'Age',
    gender: 'Gender',
    language: 'Language',
    notSaid: 'Not said',
    finishProfile: 'Finish your profile',
    finishProfileBody:
      'We need your name and date of birth before you can book a consultation.',
    completeProfile: 'Complete profile',
    accountSection: 'Account',
    personalDetails: 'Personal details',
    personalDetailsSub: 'Name, date of birth, gender, language',
    yourState: 'Your state',
    yourStateSub: 'Used to prefer a professional licensed near you',
    notificationsSub: 'Reminders and updates about your care',
    privacyLegal: 'Privacy & legal',
    teleconsultationConsent: 'Teleconsultation consent',
    consentChecking: 'Checking…',
    consentAccepted: 'Accepted — tap to review',
    consentNotAccepted: 'Not yet accepted',
    required: 'Required',
    settingsSupport: 'Settings & support',
    settingsSupportSub: 'Data, help, and app information',
    signOut: 'Sign out',
    signOutNote:
      'Signing out ends your session on every device. Your mobile number is your sign-in identifier and cannot be changed here.',
    signOutTitle: 'Sign out?',
    signOutBody:
      'This signs you out of CoraCure on every device you have used. You will need your mobile number and a new code to sign back in.',
    staySignedIn: 'Stay signed in',
    loadError: 'We could not load your profile',
  },

  notifications: {
    title: 'Notifications',
    markAllRead: 'Mark all read',
    clearing: 'Clearing…',
    markAllHint: 'Mark all {count} as read',
    empty: 'Nothing to catch up on',
    emptyBody:
      'Reminders about your consultations and updates about your care will appear here.',
    loadError: 'We could not load your notifications',
    unread: 'Unread. ',
    opensConsultation: 'Opens the related consultation',
  },

  settings: {
    title: 'Settings',
    helpSupport: 'Help & support',
    contactSupport: 'Contact support',
    contactSupportSub: 'We reply within one working day',
    emergency: 'Medical emergency',
    emergencySub: 'CoraCure is not for emergencies — call your local emergency number',
    legal: 'Legal',
    yourData: 'Your data',
    requestDeletion: 'Request data deletion',
    requestDeletionSub: 'Files a request for our team to review',
    deletionFiled: 'Deletion request received',
    deletionFiledBody:
      'Our team will review it and contact you. You can keep using the app in the meantime.',
    deletionTitle: 'Request data deletion',
    deletionBody:
      'This files a request with our team. It does not delete anything immediately — some clinical records must be retained for a period set by law, and we will tell you what can and cannot be removed.',
    deletionReason: 'Reason (optional)',
    deletionReasonPlaceholder: 'In your own words',
    fileRequest: 'File the request',
    about: 'About',
    platform: 'Platform',
    api: 'API',
    secureStorage: 'Secure storage',
    keychain: 'Keychain',
    memoryOnly: 'Memory only (dev)',
    securityNote:
      'CoraCure never asks for your one-time code, and never shows a diagnosis in a notification.',
  },

  emergency: {
    /** The persistent entry point on every major screen. */
    action: 'Emergency help',
    actionHint: 'Opens emergency guidance and helpline numbers',
    title: 'Get help now',
    /**
     * Shown ONLY when the backend returns nothing. It carries no helpline
     * numbers, because an out-of-date number is worse than none — it points at
     * local emergency services instead, which does not go stale.
     */
    fallbackBody:
      'If you are in immediate danger, call your local emergency number or go to your nearest hospital right away. CoraCure cannot provide emergency care.',
    callNumber: 'Call {number}',
    available: 'Available {when}',
    notEmergencyService: 'CoraCure is not an emergency service.',
    understood: 'I understand',
    backToSearch: 'Back to search',
  },

  tabs: {
    home: 'Home',
    appointments: 'Appointments',
    reports: 'Reports',
    profile: 'Profile',
  },

  status: {
    pending_payment: 'Payment pending',
    scheduled: 'Confirmed',
    awaiting_doctor: 'Finding a professional',
    in_progress: 'In progress',
    awaiting_documentation: 'Awaiting notes',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'Missed',
    expired: 'Hold expired',
  },

  assistant: {
    /** The header subtitle. Deliberately not "AI doctor" or anything like it. */
    status: 'Here to point you to the right care',
    heading: 'How can we help?',
    lede: 'Describe what you are feeling in your own words — English, Hindi, or a mix of both. We will suggest the right service.',
    placeholder: 'e.g. I have not been sleeping and I feel anxious',
    inputLabel: 'Describe how you are feeling',
    submit: 'Find care',
    submitting: 'Finding care…',
    tooShort: 'Tell us a little more so we can help.',
    voice: 'Use voice',
    voiceHint: 'Dictate instead of typing, using your keyboard microphone',
    voiceUnavailable: 'Voice input',
    voiceUnavailableBody:
      'Tap the microphone on your keyboard to dictate. A built-in recorder is not enabled in this build.',
    examples: 'Try describing it like this',
    example1: 'I keep waking up at night and feel restless',
    example2: 'मुझे घबराहट होती है और नींद नहीं आती',
    example3: 'Constant headache for two weeks',
    popular: 'Common concerns',
    recent: 'Recent',
    clearRecent: 'Clear',
    clearRecentHint: 'Clears the searches stored on this device',
    recentPrivacy: 'Recent searches stay on this device and are never sent to us.',
    unsure: 'Not sure how to describe it?',
    browseServices: 'Browse services instead',
    /** FR-5.8 label. The sentence itself always comes from the backend. */
    disclaimerLabel: 'Please note',
  },

  careMatch: {
    title: 'A few quick questions',
    lede: 'These help us point you to the right service. They are not a diagnosis.',
    stepOf: 'Step {step} of {total}',
    continue: 'Continue',
    skip: 'Skip this',
    back: 'Back',
    seeRecommendation: 'See my recommendation',
    /** Shown because the questions are not yet backend-driven. See gap G-4. */
    genericNote:
      'These are general questions. Your professional will ask anything specific during the consultation.',
    q1: 'What is troubling you most?',
    q1Help: 'Pick the closest one — you can describe it fully in your own words next.',
    q2: 'How long has this been going on?',
    q3: 'What kind of support are you looking for?',
    a_body: 'Something physical',
    a_mind: 'Mood, stress or sleep',
    a_habit: 'A habit I want help with',
    a_followup: 'Following up on earlier care',
    a_days: 'A few days',
    a_weeks: 'A few weeks',
    a_months: 'Months or longer',
    a_unsure: 'I am not sure',
    a_talk: 'Someone to talk to',
    a_advice: 'Medical advice',
    a_medicine: 'A prescription if appropriate',
    a_open: 'I am open to anything',
  },

  chooseTime: {
    title: 'When would you like to talk?',
    reschedulingTitle: 'Moving your consultation',
    reschedulingBody:
      'Pick the new time. We book it and cancel the old one — the new booking is linked to the old one, but it gets a new reference number.',
    rescheduleConfirm: 'Move to this time',
    lede: 'Pick a date and time that suits you.',
    /** The core promise of the flow. */
    matchPromise:
      "We'll match you with an available professional who speaks {language}.",
    languageNeverRelaxed: 'Your language is never relaxed to fill a slot.',
    duration: 'About {minutes} minutes',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    /** Honest labelling while gap G-1 is open. */
    estimatedNote:
      'These times are confirmed when you book. If the pool cannot cover the one you pick, we will offer you the soonest it can.',
    soonestKnown: 'Soonest the pool can cover: {when}',
    noTimes: 'No more times on this day',
    noTimesBody: 'Try another day, or ask for the next available professional.',
    loadingTimes: 'Checking availability…',
    selected: 'Selected: {when}',
    confirm: 'Continue',
    consultNow: 'Or see the next available professional',
    noProviderTitle: "We couldn't cover that time",
    noProviderBody: 'No professional who speaks {language} is free then.',
    noProviderWithSoonest: 'The soonest we can cover this is {when}.',
    bookSoonest: 'Book {when} instead',
    pickAnother: 'Pick another time',
    slotTaken: 'That time was taken while you were choosing. Please pick another.',
  },

  intake: {
    title: 'Before your consultation',
    required: 'Please answer this question.',
    numberInvalid: 'Enter a number.',
    selectMany: 'Select all that apply.',
    progress: '{answered} of {total} answered',
    attachmentsUnavailable:
      'Attaching files is not available in this build yet. You can tell your professional about any reports during the call.',
    lede: 'Anything you share here goes straight to your professional, so the session is not spent on paperwork.',
    freeTextLabel: 'What would you like your professional to know?',
    freeTextPlaceholder: 'Symptoms, when they started, anything you have tried…',
    optionalNote: 'You can skip this and talk it through on the call.',
    /** Honest note while gap G-4 is open. */
    genericFormNote:
      'Your service may have its own questions. Those are not available in the app yet, so the free-text note above reaches your professional instead.',
    privacy: 'Only you and your assigned professional can see this.',
    continue: 'Continue to payment',
    skipAndContinue: 'Skip and continue',
    savedDraft: 'Saved on this device until you book.',
  },

  checkout: {
    title: 'Payment',
    lede: 'Your time is held while you pay.',
    holdRemaining: 'Time held: {time}',
    holdExplainer:
      'If payment is not completed in time, the slot is released and offered to someone else.',
    method: 'How would you like to pay?',
    upi: 'UPI',
    upiSub: 'GPay, PhonePe, Paytm and others',
    card: 'Card',
    cardSub: 'Credit or debit',
    netbanking: 'Netbanking',
    netbankingSub: 'All major banks',
    wallet: 'Wallet',
    walletSub: 'Prepaid balance',
    payNow: 'Pay {amount}',
    opening: 'Opening payment…',
    /** The client never claims success — see PT-12-01. */
    confirming: 'Confirming your payment',
    confirmingBody:
      'We are waiting for your bank to confirm. This usually takes a few seconds — please do not close the app.',
    stillConfirming: 'Still confirming. You can safely wait or check back shortly.',
    checkAgain: 'Check again',
    paidTitle: 'Payment confirmed',
    paidBody: 'Your consultation is booked. You can see who you will be speaking to below.',
    viewConsultation: 'View my consultation',
    failedTitle: 'That payment did not go through',
    failedBody: 'Nothing has been charged. Your slot is still held — you can try again.',
    retry: 'Try again',
    cancelledTitle: 'Payment cancelled',
    cancelledBody: 'Your slot is still held. Pay before the countdown ends to confirm it.',
    expiredTitle: 'Your slot was released',
    expiredBody:
      'The payment window ran out, so the time went back to other patients. Nobody cancelled your booking — you can choose a new time.',
    chooseNewTime: 'Choose a new time',
    alreadyPaid: 'This consultation is already paid for.',
    notPayable: 'This consultation cannot be paid for right now.',
    gatewayMissing: 'Payment is not available in this build',
    gatewayMissingBody:
      'The payment gateway is not connected yet, so checkout cannot be completed here. Your slot is still held and the booking is real.',
    securityNote: 'We never see or store your card or UPI details.',
  },

  instant: {
    title: 'Consult Now',
    requesting: 'Requesting your instant consult',
    /** The dominant state — never a person's name. */
    finding: 'Finding an available professional…',
    waitingFor: 'Waiting for {time}',
    attempts: "We've asked {count} professionals so far.",
    attemptsOne: "We've asked one professional so far.",
    languageFact: "We'll only match you with someone who speaks {language}.",
    autoReroute:
      "If a professional declines or does not answer, we move to the next one automatically — you don't need to do anything.",
    noChoiceFact:
      'We choose the professional for you based on your service, language and state.',
    noneAvailable: 'Nobody is free right now',
    noneAvailableBody:
      'We could not reach an available professional for this service. You can book a time instead and we will hold it for you.',
    statusUnavailable: 'We lost track of the request for a moment. Retrying.',
    cancel: 'Cancel request',
    cancelTitle: 'Cancel this request?',
    cancelBody:
      'We will stop looking for a professional. Nothing has been charged, and any hold on your payment is released.',
    cancelConfirm: 'Cancel request',
    keepWaiting: 'Keep waiting',
  },

  paid: {
    title: 'Payment successful',
    body: 'Your consultation is confirmed. Here is who you will be speaking to.',
    when: 'When',
    service: 'Service',
    paidAmount: 'Paid',
    viewAppointment: 'View appointment',
    viewDetails: 'View booking details',
    nextSteps: 'What happens next',
    step1: 'We will remind you before the call',
    step2: 'Check your camera and microphone beforehand',
    step3: 'Join from the appointment screen at your time',
    notRecorded: 'The consultation is not recorded.',
  },

  deviceCheck: {
    title: 'Check your setup',
    lede: 'A quick test so the consultation is not spent on troubleshooting.',
    camera: 'Camera',
    microphone: 'Microphone',
    connection: 'Connection',
    checking: 'Checking…',
    ready: 'Ready',
    blocked: 'Permission needed',
    notReady: 'Not ready',
    permissionTitle: 'We need permission',
    permissionAndroid:
      'Open Settings › Apps › CoraCure › Permissions and allow Camera and Microphone.',
    permissionIos: 'Open Settings › CoraCure and turn on Camera and Microphone.',
    openSettings: 'Open settings',
    recheck: 'Check again',
    notRecorded: 'The consultation is not recorded.',
    joinWhenReady: 'Join consultation',
    callNotOpen: 'The call opens {when}.',
    callNotOpenPlain: 'This call is not open yet.',
    videoUnavailable: 'Video is not available in this build',
    videoUnavailableBody:
      'The pre-call check runs against the real backend, but the video client is not installed yet, so the call cannot be joined from here.',
  },

  emergencyScreen: {
    title: 'Get immediate help',
    lede: 'If you are in danger right now, please contact emergency services or someone you trust.',
    callAction: 'Call {name}',
    urgentHelp: 'Talk to someone right now',
    dismiss: 'I understand',
    dismissHint: 'Returns you to where you were',
    backToSearch: 'Back to search',
    /** Never lets the app imply it can handle an emergency itself. */
    notAnEmergencyService:
      'CoraCure is not an emergency service and cannot provide urgent care.',
    stillBook: 'You can still book a consultation, and we will prioritise it.',
  },
} as const;

export type Dictionary = typeof en;
