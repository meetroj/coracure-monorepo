import type { Dictionary } from './en';

/**
 * Every branch optional, and string leaves WIDENED.
 *
 * `en` is `as const`, so its leaves are literal types like `'Continue'`. A
 * naive `DeepPartial` would demand the Hindi entry be the literal string
 * `'Continue'` — widening to `string` is what lets a translation differ from
 * the English it replaces, while the key structure stays checked.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string
    ? string
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

/**
 * Hindi.
 *
 * *** PARTIAL BY DESIGN, AND THAT IS SAFE. *** `t()` falls back to the English
 * string key by key, so an untranslated entry renders in English rather than
 * rendering a key name or an empty string. That is what makes it possible to
 * ship translations as they are reviewed instead of holding the locale back
 * until every string is done.
 *
 * *** NEEDS NATIVE REVIEW BEFORE LAUNCH. *** These are working translations of
 * interface copy, not clinically reviewed text. SRS section 8 requires a
 * qualified reviewer for anything clinical, and the same care should be applied
 * here before this locale is offered to patients — a mistranslated instruction
 * on a health app is a safety problem, not a polish problem.
 *
 * Note what is absent and must stay absent: consent text, the search
 * disclaimer, crisis guidance and notification copy are all served by the
 * backend, already localisable there, and are the versions recorded against the
 * patient. Translating them here would mean showing one text and recording
 * another.
 */
export const hi: DeepPartial<Dictionary> = {
  common: {
    continue: 'जारी रखें',
    back: 'वापस',
    goBack: 'वापस जाएँ',
    cancel: 'रद्द करें',
    close: 'बंद करें',
    skip: 'छोड़ें',
    retry: 'दोबारा कोशिश करें',
    save: 'सहेजें',
    loading: 'लोड हो रहा है…',
    dismiss: 'हटाएँ',
    optional: 'वैकल्पिक',
    seeAll: 'सभी देखें',
    viewAll: 'सभी देखें',
    somethingWentWrong: 'कुछ गड़बड़ हो गई',
    genericErrorBody: 'अभी यह लोड नहीं हो सका। कृपया दोबारा कोशिश करें।',
    offline: 'आप ऑफ़लाइन हैं। कुछ जानकारी पुरानी हो सकती है।',
  },

  splash: {
    checkingSession: 'आपका सत्र जाँचा जा रहा है…',
    preparing: 'आपकी देखभाल तैयार की जा रही है…',
    private: 'निजी',
    secure: 'सुरक्षित',
    verified: 'सत्यापित',
  },

  welcome: {
    titleLine1: 'विशेषज्ञ देखभाल,',
    titleLine2: 'कभी भी, कहीं भी।',
    getStarted: 'शुरू करें',
    trustedProfessionals: 'भरोसेमंद विशेषज्ञ',
    easyAppointments: 'आसान अपॉइंटमेंट',
    statPatientsLabel: 'मरीज़ों का भरोसा',
    statSpecialtiesLabel: 'विशेषज्ञताएँ',
    professional: 'पेशेवर',
    secure: 'सुरक्षित',
    easy: 'आसान',
  },

  login: {
    title: 'फिर से स्वागत है',
    subtitle: 'अपने खाते में जारी रखने के लिए साइन इन करें।',
    mobileNumber: 'मोबाइल नंबर',
    enterNumber: 'अपना मोबाइल नंबर दर्ज करें।',
    numberInvalid: 'यह मोबाइल नंबर सही नहीं लगता।',
    termsOfUse: 'उपयोग की शर्तें',
    privacyPolicy: 'गोपनीयता नीति',
    secureVerification: 'सुरक्षित सत्यापन',
    selectCountry: 'देश चुनें',
  },

  otp: {
    title: 'OTP से सत्यापित करें',
    verifyContinue: 'सत्यापित करें और जारी रखें',
    resend: 'कोड दोबारा भेजें',
    resending: 'भेजा जा रहा है…',
    edit: 'बदलें',
    invalidCode: 'यह कोड सही नहीं है, या इसकी अवधि समाप्त हो गई है। जाँचकर दोबारा कोशिश करें।',
    neverShare: 'यह कोड कभी साझा न करें',
  },

  profile: {
    title: 'आइए आपकी प्रोफ़ाइल बनाएँ',
    fullName: 'पूरा नाम',
    dateOfBirth: 'जन्म तिथि',
    gender: 'लिंग',
    male: 'पुरुष',
    female: 'महिला',
    other: 'अन्य',
    undisclosed: 'बताना नहीं चाहते',
    preferredLanguage: 'पसंदीदा भाषा',
    saveContinue: 'सहेजें और जारी रखें',
  },

  consent: {
    acceptContinue: 'स्वीकार करें और जारी रखें',
    decline: 'अस्वीकार करें',
    notRecorded: 'रिकॉर्ड नहीं होता',
    encrypted: 'एन्क्रिप्टेड',
  },

  dashboard: {
    goodMorning: 'सुप्रभात',
    goodAfternoon: 'नमस्कार',
    goodEvening: 'शुभ संध्या',
    welcome: 'स्वागत है',
    consultNow: 'अभी परामर्श',
    book: 'बुक करें',
    reports: 'रिपोर्ट',
    support: 'सहायता',
    exploreServices: 'सेवाएँ देखें',
    yourCare: 'आपकी देखभाल',
    upcoming: 'आगामी',
    completed: 'पूर्ण',
    nextConsultation: 'आपका अगला परामर्श',
    bookConsultation: 'परामर्श बुक करें',
    quickActions: 'त्वरित क्रियाएँ',
  },

  findCare: {
    title: 'सही देखभाल खोजें',
    subtitle: 'अपनी तकलीफ़ अपने शब्दों में बताएँ। हम सही सेवा सुझाएँगे।',
    searchAction: 'देखभाल खोजें',
    chooseTime: 'समय चुनें',
    disclaimerLabel: 'कृपया ध्यान दें',
  },

  booking: {
    title: 'परामर्श बुक करें',
    whenSuits: 'आपको कौन सा समय ठीक रहेगा?',
    today: 'आज',
    chooseATime: 'समय चुनें',
  },

  services: {
    chooseTitle: 'सेवा चुनें',
    searchPlaceholder: 'सेवाएँ खोजें',
    free: 'निःशुल्क',
  },

  consultation: {
    reschedule: 'समय बदलें',
    joinNow: 'अभी जुड़ें',
    payNow: 'अभी भुगतान करें',
    viewDetails: 'विवरण देखें',
    title: 'परामर्श',
  },

  provider: {
    sectionTitle: 'आपके पेशेवर',
    notAssignedYet: 'अभी नियुक्त नहीं',
  },

  appointments: {
    title: 'अपॉइंटमेंट',
    upcoming: 'आगामी',
    past: 'पिछले',
  },

  reports: {
    title: 'रिपोर्ट और फ़ाइलें',
    yourFiles: 'आपकी फ़ाइलें',
  },

  account: {
    signOut: 'साइन आउट',
    age: 'आयु',
    gender: 'लिंग',
    language: 'भाषा',
  },

  notifications: {
    title: 'सूचनाएँ',
    markAllRead: 'सभी पढ़ी हुई चिह्नित करें',
  },

  settings: {
    title: 'सेटिंग्स',
    helpSupport: 'सहायता',
    legal: 'कानूनी',
    about: 'ऐप के बारे में',
  },

  emergency: {
    action: 'आपातकालीन सहायता',
    title: 'अभी सहायता लें',
    understood: 'मैं समझ गया',
    notEmergencyService: 'CoraCure आपातकालीन सेवा नहीं है।',
  },

  tabs: {
    home: 'होम',
    appointments: 'अपॉइंटमेंट',
    reports: 'रिपोर्ट',
    profile: 'प्रोफ़ाइल',
  },

assistant: {
    heading: 'हम कैसे मदद कर सकते हैं?',
    submit: 'देखभाल खोजें',
    submitting: 'खोजा जा रहा है…',
    voice: 'बोलकर बताएँ',
    recent: 'हाल की खोज',
    clearRecent: 'हटाएँ',
    popular: 'आम समस्याएँ',
    disclaimerLabel: 'कृपया ध्यान दें',
    browseServices: 'सेवाएँ देखें',
  },

  careMatch: {
    title: 'कुछ छोटे सवाल',
    continue: 'जारी रखें',
    back: 'वापस',
    skip: 'छोड़ें',
  },

  chooseTime: {
    title: 'आप कब बात करना चाहेंगे?',
    rescheduleConfirm: 'इस समय पर बदलें',
    morning: 'सुबह',
    afternoon: 'दोपहर',
    evening: 'शाम',
    confirm: 'जारी रखें',
    pickAnother: 'दूसरा समय चुनें',
  },

  intake: {
    title: 'परामर्श से पहले',
    required: 'कृपया इस सवाल का जवाब दें।',
    continue: 'भुगतान पर जाएँ',
  },

  checkout: {
    title: 'भुगतान',
    upi: 'UPI',
    card: 'कार्ड',
    netbanking: 'नेटबैंकिंग',
    wallet: 'वॉलेट',
    retry: 'दोबारा कोशिश करें',
    confirming: 'आपके भुगतान की पुष्टि हो रही है',
  },

  instant: {
    title: 'अभी परामर्श',
    finding: 'उपलब्ध विशेषज्ञ खोजा जा रहा है…',
    cancel: 'अनुरोध रद्द करें',
    keepWaiting: 'प्रतीक्षा जारी रखें',
  },

  paid: {
    title: 'भुगतान सफल',
    viewAppointment: 'अपॉइंटमेंट देखें',
  },

  deviceCheck: {
    title: 'अपनी सेटिंग जाँचें',
    camera: 'कैमरा',
    microphone: 'माइक्रोफ़ोन',
    ready: 'तैयार',
    recheck: 'दोबारा जाँचें',
  },

  emergencyScreen: {
    title: 'अभी सहायता लें',
    dismiss: 'मैं समझ गया',
  },

  status: {
    scheduled: 'पुष्ट',
    in_progress: 'चल रहा है',
    completed: 'पूर्ण',
    cancelled: 'रद्द',
  },
};
