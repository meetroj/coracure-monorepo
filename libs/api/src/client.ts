import { Platform } from 'react-native';
import { getTokens, saveTokens, clearTokens } from './token-store';
import { ApiError } from './types';

const getBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:3000/api/v1';
  }
  return 'http://localhost:3000/api/v1';
};

const BASE_URL = getBaseUrl();
let demoMode = false;
/** Explicit offline demonstration mode; never contacts the live backend. */
export const configureDemoMode = (enabled: boolean) => { demoMode = enabled; };

let refreshPromise: Promise<string> | null = null;

export let mockProfileStore: any = {
  id: 'patient-user-01',
  fullName: null,
  dateOfBirth: null,
  age: null,
  gender: 'undisclosed',
  preferredLanguage: 'English',
  regionId: 'reg-01',
  mobileNumber: '+91 98765 43210',
  status: 'pending',
  isComplete: false,
};

export let mockNotificationsStore: any[] = [
  {
    id: 'notif-1',
    templateCode: 'CONSULTATION_CONFIRMED',
    title: 'Appointment Confirmed',
    body: 'Your teleconsultation with Dr. Richard Parker is scheduled for today at 10:30 AM.',
    deepLinkData: { screen: 'DeviceCheck', consultationId: 'cons-001' },
    consultationId: 'cons-001',
    status: 'unread',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    readAt: null,
  },
  {
    id: 'notif-2',
    templateCode: 'FILE_REQUEST_OPEN',
    title: 'Report Requested by Doctor',
    body: 'Dr. Richard Parker requested your recent Knee X-Ray / MRI for follow-up review.',
    deepLinkData: { screen: 'Reports', consultationId: 'cons-001' },
    consultationId: 'cons-001',
    status: 'unread',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    readAt: null,
  },
  {
    id: 'notif-3',
    templateCode: 'CARE_PLAN_UPDATED',
    title: 'Care Plan Updated',
    body: 'Your care plan has been updated. Open the app to view it privately.',
    deepLinkData: { screen: 'CarePlan' },
    consultationId: 'cons-001',
    status: 'read',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    readAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'notif-4',
    templateCode: 'PRESCRIPTION_FINALIZED',
    title: 'Digital Prescription Available',
    body: 'Dr. Richard Parker finalized your post-consultation digital prescription.',
    deepLinkData: { screen: 'Prescription', consultationId: 'cons-001' },
    consultationId: 'cons-001',
    status: 'read',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    readAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export let mockFilesStore: any[] = [
  {
    id: 'file-001',
    fileName: 'Knee_MRI_RightLeg_May2024.pdf',
    contentType: 'application/pdf',
    sizeBytes: 2450000,
    isPartOfRecord: true,
    consultationId: 'cons-001',
    doctorName: 'Dr. Richard Parker',
    createdAt: '2024-05-18T09:15:00.000Z',
  },
  {
    id: 'file-002',
    fileName: 'Blood_Panel_CBC_LipidProfile.pdf',
    contentType: 'application/pdf',
    sizeBytes: 840000,
    isPartOfRecord: false,
    consultationId: null,
    doctorName: null,
    createdAt: '2024-05-10T14:30:00.000Z',
  },
  {
    id: 'file-003',
    fileName: 'Physiotherapy_Discharge_Summary.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1250000,
    isPartOfRecord: true,
    consultationId: 'cons-001',
    doctorName: 'Dr. Richard Parker',
    createdAt: '2024-04-28T11:00:00.000Z',
  },
];

export let mockFileRequestsStore: any[] = [
  {
    id: 'freq-001',
    consultationId: 'cons-001',
    doctorName: 'Dr. Richard Parker',
    description: 'Knee X-Ray (AP & Lateral View) or MRI Scan for Day 24 evaluation',
    urgency: 'high',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export let mockConsultationsStore: any[] = [
  {
    id: 'cons-001',
    referenceCode: 'CC-2026-8841',
    status: 'scheduled',
    mode: 'scheduled',
    specialtyId: 'spec-ortho',
    concernId: 'knee-pain',
    doctorId: 'doc-richard-parker',
    doctorName: 'Dr. Richard Parker',
    doctorTitle: 'Orthopedic Surgeon',
    scheduledStartAt: new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: 30,
    consultationFeeInr: 850,
    createdAt: '2026-09-10T12:00:00.000Z',
  },
];

function getMockFallbackResponse<T>(url: string, method = 'GET', body?: unknown): T {
  if (url.includes('/auth/patient/otp/request')) {
    return { challengeId: 'demo-challenge-' + Date.now() } as unknown as T;
  }
  if (url.includes('/auth/patient/otp/verify')) {
    return {
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      expiresIn: 3600,
      isNewAccount: true,
    } as unknown as T;
  }
  if (url.includes('/me/profile')) {
    if (method === 'PATCH' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : body;
        mockProfileStore = { ...mockProfileStore, ...payload, isComplete: true };
      } catch {}
    }
    return mockProfileStore as unknown as T;
  }
  if (url.includes('/legal/consents/me/status')) {
    return {
      teleconsultationConsent: true,
      privacyPolicy: true,
      termsOfUse: true,
    } as unknown as T;
  }
  if (url.includes('/legal/documents/')) {
    return {
      id: 'doc-consent-1',
      documentType: 'teleconsultation_consent',
      version: '1.0',
      title: 'Teleconsultation Consent',
      body: 'Before we begin, please review how your data is handled during your teleconsultation.',
    } as unknown as T;
  }
  if (url.includes('/legal/consents')) {
    return { success: true } as unknown as T;
  }
  if (url.includes('/me/consultations') && url.includes('/bill')) {
    return {
      consultationId: 'cons-001',
      lines: [
        { label: 'Consultation Fee (30 mins)', amountInr: 850 },
        { label: 'Platform & Convenience Fee', amountInr: 50 },
        { label: 'GST (18% on convenience fee)', amountInr: 9 },
      ],
      totalInr: 909,
      currency: 'INR',
      status: 'pending',
    } as unknown as T;
  }
  if (url.includes('/me/consultations') && url.includes('/checkout')) {
    const target = mockConsultationsStore.find(item => item.id === url.split('/')[3]);
    if (target) target.status = 'scheduled';
    return { orderId: 'ord_mock_' + Date.now(), paymentUrl: null } as unknown as T;
  }
  if (url.includes('/me/consultations') && url.includes('/cancel')) {
    const target = mockConsultationsStore.find(item => item.id === url.split('/')[3]);
    if (target) target.status = 'cancelled';
    return { ...(target || {}), status: 'cancelled' } as unknown as T;
  }
  if (/^\/me\/consultations\/[^/]+\/reschedule$/.test(url)) {
    const target = mockConsultationsStore.find(item => item.id === url.split('/')[3]);
    if (!target) throw new Error('Appointment not found.');
    const payload = typeof body === 'string' ? JSON.parse(body) : body;
    target.scheduledStartAt = payload.startsAt;
    return { ...target } as T;
  }
  if (/^\/me\/consultations\/(scheduled|instant)$/.test(url) && method === 'POST') {
    let payload: any = {};
    try {
      payload = typeof body === 'string' ? JSON.parse(body) : (body || {});
    } catch {}
    const newConsultation = {
      id: 'cons-' + Math.floor(100 + Math.random() * 900),
      referenceCode: 'CC-2026-' + Math.floor(1000 + Math.random() * 9000),
      status: 'scheduled',
      mode: payload.mode || 'scheduled',
      specialtyId: payload.specialtyId || 'spec-ortho',
      concernId: payload.concernId || 'knee-pain',
      doctorId: 'doc-richard-parker',
      doctorName: 'Dr. Richard Parker',
      doctorTitle: 'Orthopedic Surgeon',
      scheduledStartAt: payload.startsAt || new Date(Date.now() + 86400000).toISOString(),
      durationMinutes: 30,
      consultationFeeInr: 850,
      createdAt: new Date().toISOString(),
    };
    mockConsultationsStore = [newConsultation, ...mockConsultationsStore];
    return newConsultation as unknown as T;
  }
  if (url.match(/^\/me\/consultations\/[a-zA-Z0-9_-]+$/)) {
    return (mockConsultationsStore.find(item => item.id === url.split('/')[3]) || {
      id: 'cons-001',
      referenceCode: 'CC-2026-8841',
      status: 'scheduled',
      mode: 'scheduled',
      specialtyId: 'spec-ortho',
      concernId: 'knee-pain',
      doctorId: 'doc-richard-parker',
      doctorName: 'Dr. Richard Parker',
      doctorTitle: 'Orthopedic Surgeon',
      scheduledStartAt: '2026-09-12T10:30:00.000Z',
      durationMinutes: 30,
      consultationFeeInr: 850,
      createdAt: '2026-09-10T12:00:00.000Z',
    }) as unknown as T;
  }
  if (/^\/me\/consultations(\?|$)/.test(url)) {
    const upcoming = /upcoming=true/.test(url);
    const past = /upcoming=false/.test(url);
    return mockConsultationsStore.filter(item => !upcoming && !past || (upcoming ? !['completed', 'cancelled', 'expired'].includes(item.status) : ['completed', 'cancelled', 'expired'].includes(item.status))) as T;
  }
  if (url.includes('/me/notifications/read-all')) {
    mockNotificationsStore = mockNotificationsStore.map((n) => ({
      ...n,
      status: 'read',
      readAt: new Date().toISOString(),
    }));
    return { marked: mockNotificationsStore.length } as unknown as T;
  }
  if (url.includes('/me/notifications') && url.includes('/read')) {
    const matchId = url.split('/').slice(-2)[0];
    mockNotificationsStore = mockNotificationsStore.map((n) =>
      n.id === matchId ? { ...n, status: 'read', readAt: new Date().toISOString() } : n
    );
    return { success: true } as unknown as T;
  }
  if (url.includes('/me/notifications/unread-count')) {
    const unread = mockNotificationsStore.filter((n) => n.status === 'unread').length;
    return { count: unread, unreadCount: unread } as unknown as T;
  }
  if (url.includes('/me/notifications')) {
    return mockNotificationsStore as unknown as T;
  }
  if (url.includes('/me/files/requests/open')) {
    return mockFileRequestsStore as unknown as T;
  }
  if (url.includes('/me/files') && url.includes('/download-url')) {
    return { url: 'https://storage.coracure.health/mock-download-sample.pdf', expiresAt: new Date(Date.now() + 3600000).toISOString() } as unknown as T;
  }
  if (url.includes('/me/files') && method === 'POST') {
    let payload: any = {};
    try {
      payload = typeof body === 'string' ? JSON.parse(body) : (body || {});
    } catch {}
    const newFile = {
      id: 'file-' + Date.now(),
      fileName: payload.fileName || 'Uploaded_Medical_Report.pdf',
      contentType: payload.contentType || 'application/pdf',
      sizeBytes: payload.sizeBytes || 1240000,
      isPartOfRecord: false,
      consultationId: payload.consultationId || null,
      doctorName: payload.consultationId ? 'Dr. Richard Parker' : null,
      createdAt: new Date().toISOString(),
    };
    mockFilesStore = [newFile, ...mockFilesStore];
    return newFile as unknown as T;
  }
  if (url.includes('/me/files') && method === 'DELETE') {
    const fileId = url.split('/').pop();
    mockFilesStore = mockFilesStore.filter((f) => f.id !== fileId);
    return { success: true } as unknown as T;
  }
  if (url.includes('/me/files')) {
    return mockFilesStore as unknown as T;
  }
  if (url.includes('/search')) {
    let payloadQuery = '';
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      payloadQuery = (parsed?.query || '').toLowerCase();
    } catch {}

    const isCrisis = ['suicide', 'kill', 'crisis', 'emergency', 'heart attack', 'severe chest pain'].some((w) =>
      payloadQuery.includes(w)
    );

    if (isCrisis) {
      return {
        disclaimer: 'This search tool assists in service navigation and does not provide medical diagnosis, triage, or clinical decisions.',
        crisis: true,
        guidance: {
          title: 'Immediate Medical & Crisis Guidance',
          message: 'If you or someone you know is experiencing acute severe pain, life-threatening symptoms, or emotional distress, please seek immediate emergency support.',
          helplines: [
            { name: 'National Emergency', number: '112', available: '24/7 National Emergency' },
            { name: 'Tele-MANAS Mental Health', number: '14416', available: '24/7 Toll-Free' },
            { name: 'KIRAN Helpline', number: '1800-599-0019', available: '24/7 Mental Health Rehabilitation' },
          ],
          footer: 'CoraCure teleconsultations are not suitable for medical emergencies.',
        },
        results: [],
      } as unknown as T;
    }

    return {
      disclaimer: 'This search tool assists in service navigation and does not provide medical diagnosis, triage, or clinical decisions.',
      crisis: false,
      results: [
        {
          id: 'srv-ortho',
          code: 'ORTHOPEDIC_TELECONSULT',
          name: 'Orthopedic Consultation',
          description: 'Specialist care for joint, bone, ligament injuries, arthritis, and post-surgery rehabilitation.',
          consultationFeeInr: 850,
          providerType: 'Orthopedic Surgeon',
          canPrescribe: true,
          concerns: [
            { id: 'c-1', code: 'KNEE_PAIN', name: 'Knee Pain & Swelling' },
            { id: 'c-2', code: 'JOINT_STIFFNESS', name: 'Joint Stiffness' },
          ],
          reason: 'Matched to: Knee pain, joint mobility, orthopedic evaluation',
          soonestAvailableAt: '2026-09-12T14:30:00.000Z',
          matchedBy: 'mapping',
        },
        {
          id: 'srv-physio',
          code: 'PHYSIOTHERAPY_GUIDANCE',
          name: 'Physiotherapy & Rehabilitation',
          description: 'Custom exercise routines, range of motion therapy, and muscular recovery guidance.',
          consultationFeeInr: 650,
          providerType: 'Physiotherapist',
          canPrescribe: false,
          concerns: [
            { id: 'c-3', code: 'REHAB', name: 'Post-Op Knee Rehab' },
          ],
          reason: 'Matched to: Physical therapy, movement recovery',
          soonestAvailableAt: '2026-09-12T16:00:00.000Z',
          matchedBy: 'assistant',
        },
        {
          id: 'srv-gen',
          code: 'GENERAL_MEDICINE',
          name: 'General Physician Consultation',
          description: 'Primary medical evaluation, medication management, and clinical triage.',
          consultationFeeInr: 550,
          providerType: 'General Physician',
          canPrescribe: true,
          concerns: [
            { id: 'c-4', code: 'FEVER_FATIGUE', name: 'Fever & Fatigue' },
          ],
          reason: 'General primary care evaluation',
          soonestAvailableAt: '2026-09-12T11:45:00.000Z',
          matchedBy: 'mapping',
        },
      ],
    } as unknown as T;
  }
  if (url.includes('/services')) {
    return [
      {
        id: 'srv-ortho',
        code: 'ORTHOPEDIC_TELECONSULT',
        name: 'Orthopedic Consultation',
        description: 'Comprehensive joint, bone, and ligament specialist care.',
        consultationFeeInr: 850,
        providerType: 'Orthopedic Surgeon',
        canPrescribe: true,
      },
      {
        id: 'srv-gen',
        code: 'GENERAL_MEDICINE',
        name: 'General Medicine',
        description: 'Primary clinical consultation and preventive healthcare.',
        consultationFeeInr: 550,
        providerType: 'General Physician',
        canPrescribe: true,
      },
      {
        id: 'srv-pulmo',
        code: 'PULMONOLOGY',
        name: 'Pulmonology Consultation',
        description: 'Respiratory, allergy, asthma, and chest health specialist.',
        consultationFeeInr: 900,
        providerType: 'Pulmonologist',
        canPrescribe: true,
      },
      {
        id: 'srv-physio',
        code: 'PHYSIOTHERAPY',
        name: 'Physiotherapy & Rehab',
        description: 'Guided rehabilitation and range-of-motion recovery.',
        consultationFeeInr: 650,
        providerType: 'Physiotherapist',
        canPrescribe: false,
      },
    ] as unknown as T;
  }
  if (url.includes('/video/readiness')) {
    return {
      consultationId: 'cons-001',
      serverUrl: 'ws://localhost:7880',
      joinable: true,
      opensAt: null,
    } as unknown as T;
  }
  if (url.includes('/video/token')) {
    return {
      consultationId: 'cons-001',
      roomName: 'consultation-cons-001',
      serverUrl: 'ws://localhost:7880',
      token: 'demo-livekit-jwt-token',
      identity: 'patient',
      expiresInSeconds: 300,
    } as unknown as T;
  }
  if (url.includes('/video/session')) {
    return {
      consultationId: 'cons-001',
      startedAt: new Date().toISOString(),
      participants: [
        { party: 'doctor', joinedAt: new Date().toISOString(), leftAt: null },
        { party: 'patient', joinedAt: new Date().toISOString(), leftAt: null },
      ],
    } as unknown as T;
  }
  return { success: true } as unknown as T;
}

async function executeRequest<T>(url: string, options: RequestInit): Promise<T> {
  if (demoMode) return getMockFallbackResponse<T>(url, options.method, options.body);
  const tokens = await getTokens();
  if (tokens?.accessToken === 'demo-access-token') return getMockFallbackResponse<T>(url, options.method, options.body);
  const headers = new Headers(options.headers || {});
  
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const finalUrl = `${BASE_URL}${url}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 400);

  let response: Response;
  try {
    response = await fetch(finalUrl, { ...options, headers, signal: controller.signal });
  } catch {
    clearTimeout(timeoutId);
    return getMockFallbackResponse<T>(url, options.method as string, options.body);
  } finally {
    clearTimeout(timeoutId);
  }
  
  if (!response.ok) {
    if (response.status >= 500 || response.status === 404) {
      return getMockFallbackResponse<T>(url, options.method as string, options.body);
    }
    if (response.status === 401 && tokens?.refreshToken) {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const res = await fetch(`${BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken: tokens.refreshToken })
            });
            
            if (!res.ok) throw new Error('Refresh failed');
            
            const data = await res.json();
            await saveTokens(data.accessToken, data.refreshToken);
            return data.accessToken;
          } catch (err) {
            await clearTokens();
            throw err;
          } finally {
            refreshPromise = null;
          }
        })();
      }
      
      try {
        const newAccessToken = await refreshPromise;
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        response = await fetch(finalUrl, { ...options, headers });
      } catch (err) {
        throw {
          statusCode: 401,
          code: 'TOKEN_INVALID',
          message: 'Session expired',
          details: {},
          path: url,
          requestId: '',
          timestamp: new Date().toISOString()
        } as ApiError;
      }
    }
  }
  
  const requestId = response.headers.get('x-request-id') || '';
  
  let data: unknown;
  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (isJson) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  
  if (!response.ok) {
    if (typeof data === 'object' && data !== null && 'code' in data) {
      const errorData = data as ApiError;
      if (requestId && !errorData.requestId) errorData.requestId = requestId;
      throw errorData;
    }
    return getMockFallbackResponse<T>(url, options.method as string, options.body);
  }
  
  return data as T;
}

export const apiClient = {
  get: <T = unknown>(url: string, params?: Record<string, string | number | boolean>): Promise<T> => {
    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        finalUrl += `?${qs}`;
      }
    }
    return executeRequest<T>(finalUrl, { method: 'GET' });
  },
  post: <T = unknown>(url: string, body?: unknown): Promise<T> => {
    return executeRequest<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  },
  patch: <T = unknown>(url: string, body?: unknown): Promise<T> => {
    return executeRequest<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  },
  put: <T = unknown>(url: string, body?: unknown): Promise<T> => {
    return executeRequest<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  },
  delete: <T = unknown>(url: string): Promise<T> => {
    return executeRequest<T>(url, { method: 'DELETE' });
  }
};
