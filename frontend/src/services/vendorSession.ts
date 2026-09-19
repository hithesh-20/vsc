import { api, API_BASE } from './api';
import { AppSession } from './auth';

export interface VendorProfile {
  name: string;
  phone: string;
  business_name: string;
  business_name_kn?: string;
  category: string;
  vehicle_type?: string;
  upi_id: string;
  apmc_license?: string;
}

const TOKEN_KEY = 'vs_vendor_token';
const USER_KEY = 'vs_vendor_user';

export const vendorSession = {
  /**
   * Seed the vendor dashboard's expected localStorage state from the
   * OTP-authenticated app session, by fetching the real vendor profile.
   */
  async activate(session: AppSession): Promise<void> {
    if (session.access_token) {
      try {
        const res = await fetch(`${API_BASE}/vendors/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const body = await res.json();
          const v = body.data;
          if (v) {
            localStorage.setItem(TOKEN_KEY, session.access_token);
            localStorage.setItem(USER_KEY, JSON.stringify({
              name: v.business_name_kn || v.business_name,
              phone: session.phone,
              business_name: v.business_name_kn || v.business_name,
              business_name_en: v.business_name,
              category: v.business_category,
              vehicle_type: 'ನೂಕುಗಾಡಿ',
              upi_id: v.upi_id || `${session.phone}@upi`,
              apmc_license: 'VS-STREET-2026',
            } as VendorProfile));
            return;
          }
        }
      } catch { /* fall through to graceful default below */ }
    }

    // Graceful fallback: seed with session data so the dashboard still boots
    localStorage.setItem(TOKEN_KEY, session.access_token || 'demo_token');
    localStorage.setItem(USER_KEY, JSON.stringify({
      name: session.name,
      phone: session.phone,
      business_name: session.name || 'My Street Cart',
      category: 'General Store',
      vehicle_type: 'ನೂಕುಗಾಡಿ',
      upi_id: `${session.phone}@upi`,
      apmc_license: 'VS-STREET-2026',
    } as VendorProfile));
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getProfile(): VendorProfile | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** Fetch public catalog of a vendor (used for seed-time stock awareness). */
  async fetchCatalog(vendorId: string) {
    return api.getVendorCatalog(vendorId);
  },
};
