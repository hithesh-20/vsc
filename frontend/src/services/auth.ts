import { api, API_BASE } from './api';

export interface AppSession {
  access_token: string;
  user_id: string;
  role: string;
  name: string;
  phone: string;
  customer_id?: string | null;
  vendor_id?: string | null;
  language: string;
}

const SESSION_KEY = 'vs_app_session';
const PHONE_KEY = 'vs_app_last_phone';

export interface OtpRequestResult {
  request_id: string;
  masked_phone: string;
  expires_in_seconds: number;
  resend_in_seconds: number;
  is_new_user: boolean;
  demo_code?: string | null;
}

export interface AuthResult {
  token: string;
  name: string;
  userId: string;
  role: string;
  customerId?: string | null;
  vendorId?: string | null;
}

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function parse(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.detail || 'Something went wrong. Please try again.');
  }
  return body;
}

export const authService = {
  /** Step 1: ask the backend to send an OTP to this phone number. */
  async requestOtp(phone: string): Promise<OtpRequestResult> {
    const res = await fetch(`${API_BASE}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const body = await parse(res);
    return body.data;
  },

  /** Step 2: verify the 6-digit code. Existing users get a token right away. */
  async verifyOtp(requestId: string, code: string): Promise<{ verified: boolean; auth?: AuthResult }> {
    const res = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, code }),
    });
    const body = await parse(res);
    const d = body.data;
    if (d?.access_token) {
      return {
        verified: true,
        auth: {
          token: d.access_token,
          name: d.name || '',
          userId: d.user_id,
          role: d.role,
          customerId: d.customer_id,
          vendorId: d.vendor_id,
        },
      };
    }
    return { verified: !!d?.verified };
  },

  /** Step 3 (new users only): finish account creation after OTP verification. */
  async completeSignup(requestId: string, fullName: string, role: 'CUSTOMER' | 'VENDOR', language: string): Promise<AuthResult> {
    const res = await fetch(`${API_BASE}/auth/otp/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, full_name: fullName, role, language_pref: language }),
    });
    const body = await parse(res);
    const d = body.data;
    return {
      token: d.access_token,
      name: d.name,
      userId: d.user_id,
      role: d.role,
      customerId: d.customer_id,
      vendorId: d.vendor_id,
    };
  },

  saveSession(session: AppSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  getSession(): AppSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AppSession) : null;
    } catch {
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },

  setLastPhone(phone: string) {
    localStorage.setItem(PHONE_KEY, phone);
  },

  getLastPhone(): string {
    return localStorage.getItem(PHONE_KEY) || '';
  },
};

// ------------------------------------------------------------------
// Customer app data APIs (orders, payments, udhaar, profile)
// ------------------------------------------------------------------

export const customerAppApi = {
  async getMyOrders(token: string) {
    const res = await fetch(`${API_BASE}/app/orders/my`, {
      headers: authHeaders(token),
    });
    const body = await parse(res);
    return body.data || [];
  },

  async payOrder(token: string, orderId: string, mode: 'UPI' | 'CASH') {
    const res = await fetch(`${API_BASE}/app/orders/my/${orderId}/pay?mode=${mode}`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    const body = await parse(res);
    return body.data;
  },

  async getMyUdhaar(token: string) {
    const res = await fetch(`${API_BASE}/app/udhaar/my`, {
      headers: authHeaders(token),
    });
    const body = await parse(res);
    return body.data || [];
  },

  async repayUdhaar(token: string, recordId: string, mode: 'UPI' | 'CASH') {
    const res = await fetch(`${API_BASE}/app/udhaar/my/${recordId}/repay?mode=${mode}`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    const body = await parse(res);
    return body.data;
  },

  async placeUdhaarOrder(token: string, vendorId: string, items: { product_id: string; quantity: number }[], address: string) {
    const res = await fetch(`${API_BASE}/app/orders/udhaar`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        vendor_id: vendorId,
        items,
        delivery_address: address,
      }),
    });
    const body = await parse(res);
    return body.data;
  },

  async getProfile(token: string) {
    const res = await fetch(`${API_BASE}/app/profile`, {
      headers: authHeaders(token),
    });
    const body = await parse(res);
    return body.data;
  },

  async updateLanguage(token: string, lang: string) {
    const res = await fetch(`${API_BASE}/app/profile/language?lang=${lang}`, {
      method: 'PUT',
      headers: authHeaders(token),
    });
    const body = await parse(res);
    return body.data;
  },
};
