import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type {
  AuthSession,
  Category,
  CreditScorecard,
  DashboardSummary,
  DemandForecast,
  InventoryLedgerEntry,
  MandiSummary,
  MobilityRecommendations,
  Order,
  OrderStatus,
  OtpRequestResult,
  OtpVerifyResult,
  PaymentMode,
  Product,
  ProductUnit,
  ProfitAnalytics,
  Sale,
  UdhaarRecord,
  UdhaarSummary,
  VendorProfile,
  Weather,
} from './types';

/**
 * Resolve the backend base URL.
 *
 * The correct host depends on where the app runs:
 *  - Web / iOS simulator: the app and backend share the machine → localhost.
 *  - Android emulator: `localhost` is the emulator itself; the host machine is
 *    reachable at 10.0.2.2.
 *  - Physical device: must use the dev machine's LAN IP.
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_URL, unless it is a loopback address while running on a
 *     native platform (where localhost can never reach the backend).
 *  2. Auto-derived from the Expo dev-server host (the dev machine's LAN IP).
 *  3. Android emulator host (10.0.2.2) or a localhost fallback.
 */
const API_PORT = 8002;
const API_PREFIX = '/api/v1';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function isLoopback(url: string): boolean {
  return /(^|[/:])(localhost|127\.0\.0\.1)([/:]|$)/.test(url);
}

function devServerHost(): string | null {
  const expoGo = Constants.expoGoConfig as { hostUri?: string } | null | undefined;
  const hostUri = Constants.expoConfig?.hostUri ?? expoGo?.hostUri ?? null;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }
  return null;
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();

  // Web runs on the same machine as the backend, so localhost is correct.
  if (Platform.OS === 'web') {
    return stripTrailingSlash(
      fromEnv && fromEnv.length > 0 ? fromEnv : `http://localhost:${API_PORT}${API_PREFIX}`,
    );
  }

  // Native: honour an explicit non-loopback override (e.g. a LAN IP).
  if (fromEnv && fromEnv.length > 0 && !isLoopback(fromEnv)) {
    return stripTrailingSlash(fromEnv);
  }

  // Otherwise derive the dev machine's address from the Expo dev server.
  const host = devServerHost();
  if (host) {
    return `http://${host}:${API_PORT}${API_PREFIX}`;
  }

  // Android emulator maps the host machine to 10.0.2.2.
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}${API_PREFIX}`;
  }

  return `http://localhost:${API_PORT}${API_PREFIX}`;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs = 15000 } = options;
  const url = `${getApiBaseUrl()}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    throw new ApiError(
      `Cannot reach the backend at ${getApiBaseUrl()}. Make sure the server is running and reachable from this device.`,
      0,
    );
  }
  clearTimeout(timer);

  const raw = await response.text();
  let json: any = null;
  if (raw) {
    try {
      json = JSON.parse(raw);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    let message = json?.error as string | undefined;
    const detail = json?.detail;
    if (!message) {
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail
          .map((d: any) => (typeof d?.msg === 'string' ? d.msg : JSON.stringify(d)))
          .join(', ');
      }
    }
    throw new ApiError(message || `Request failed with status ${response.status}`, response.status);
  }

  // Unwrap the standard { success, message, data } envelope when present.
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

function sessionFromVerify(result: OtpVerifyResult): AuthSession {
  return {
    token: result.access_token ?? '',
    role: (result.role ?? 'VENDOR') as AuthSession['role'],
    userId: result.user_id ?? '',
    vendorId: result.vendor_id ?? null,
    customerId: result.customer_id ?? null,
    name: result.name ?? '',
    languagePref: result.language_pref ?? 'en',
  };
}

export const api = {
  // ---- Authentication -----------------------------------------------------
  async login(phone: string, password: string): Promise<AuthSession> {
    const data = await request<{
      access_token: string;
      role: AuthSession['role'];
      user_id: string;
      vendor_id?: string | null;
      customer_id?: string | null;
      name: string;
      language_pref: string;
    }>('/auth/login', { method: 'POST', body: { phone, password } });
    return {
      token: data.access_token,
      role: data.role,
      userId: data.user_id,
      vendorId: data.vendor_id ?? null,
      customerId: data.customer_id ?? null,
      name: data.name,
      languagePref: data.language_pref,
    };
  },

  requestOtp(phone: string, roleHint?: 'VENDOR' | 'CUSTOMER'): Promise<OtpRequestResult> {
    return request<OtpRequestResult>('/auth/otp/request', {
      method: 'POST',
      body: { phone, role_hint: roleHint },
    });
  },

  async verifyOtp(requestId: string, code: string): Promise<OtpVerifyResult> {
    const data = await request<OtpVerifyResult>('/auth/otp/verify', {
      method: 'POST',
      body: { request_id: requestId, code },
    });
    return data;
  },

  async completeSignup(
    requestId: string,
    fullName: string,
    role: 'VENDOR' | 'CUSTOMER',
    languagePref: string,
  ): Promise<AuthSession> {
    const data = await request<OtpVerifyResult>('/auth/otp/complete', {
      method: 'POST',
      body: { request_id: requestId, full_name: fullName, role, language_pref: languagePref },
    });
    return sessionFromVerify(data);
  },

  sessionFromVerify,

  /**
   * Promote the signed-in account to a Vendor and create its vendor profile.
   * VendorSaathi is vendor-only, so a number registered as a Customer in the
   * customer portal gets converted here instead of needing a second number.
   */
  becomeVendor(businessName: string): Promise<VendorProfile> {
    return request<VendorProfile>('/vendors/become', {
      method: 'POST',
      body: { business_name: businessName },
    });
  },

  // ---- Vendor -------------------------------------------------------------
  getVendorProfile(): Promise<VendorProfile> {
    return request<VendorProfile>('/vendors/profile');
  },

  updateVendorProfile(patch: Partial<VendorProfile>): Promise<VendorProfile> {
    return request<VendorProfile>('/vendors/profile', { method: 'PUT', body: patch });
  },

  getDashboard(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/vendors/dashboard-summary');
  },

  // ---- Catalog ------------------------------------------------------------
  getCategories(): Promise<Category[]> {
    return request<Category[]>('/products/categories');
  },

  getProducts(): Promise<Product[]> {
    return request<Product[]>('/products');
  },

  createProduct(input: {
    name_en: string;
    name_kn: string;
    unit: ProductUnit;
    cost_price: number;
    selling_price: number;
    current_stock: number;
    low_stock_threshold: number;
    category_id?: string | null;
    description?: string | null;
    is_perishable?: boolean;
  }): Promise<Product> {
    return request<Product>('/products', { method: 'POST', body: input });
  },

  updateProduct(productId: string, patch: Partial<Product>): Promise<Product> {
    return request<Product>(`/products/${productId}`, { method: 'PUT', body: patch });
  },

  deleteProduct(productId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/products/${productId}`, { method: 'DELETE' });
  },

  // ---- Inventory ----------------------------------------------------------
  adjustStock(input: {
    product_id: string;
    change_qty: number;
    transaction_type: 'INITIAL' | 'PURCHASE_IN' | 'SALE_OUT' | 'WASTE_ADJUST' | 'RETURN' | 'CORRECTION';
    cost_price?: number;
    notes?: string;
  }): Promise<InventoryLedgerEntry> {
    return request<InventoryLedgerEntry>('/inventory/adjust', { method: 'POST', body: input });
  },

  // ---- Sales / POS --------------------------------------------------------
  recordSale(input: {
    customer_name?: string;
    customer_phone?: string | null;
    items: { product_id: string; quantity: number; unit_price?: number }[];
    payment_mode: PaymentMode;
    discount_amount?: number;
    cash_paid?: number;
    upi_paid?: number;
    udhaar_amount?: number;
    client_mutation_id?: string;
  }): Promise<Sale> {
    return request<Sale>('/sales/record', { method: 'POST', body: input });
  },

  getSalesHistory(limit = 50): Promise<Sale[]> {
    return request<Sale[]>(`/sales/history?limit=${limit}`);
  },

  getProfitAnalytics(days = 7): Promise<ProfitAnalytics> {
    return request<ProfitAnalytics>(`/sales/analytics/profit?days=${days}`);
  },

  // ---- Udhaar -------------------------------------------------------------
  getUdhaar(statusFilter?: string): Promise<UdhaarSummary> {
    const q = statusFilter ? `?status_filter=${statusFilter}` : '';
    return request<UdhaarSummary>(`/udhaar${q}`);
  },

  createUdhaar(input: {
    customer_name: string;
    customer_phone?: string | null;
    amount_due: number;
    notes?: string | null;
  }): Promise<UdhaarRecord> {
    return request<UdhaarRecord>('/udhaar', { method: 'POST', body: input });
  },

  repayUdhaar(udhaarId: string, amountPaid: number, paymentMode: 'CASH' | 'UPI' = 'CASH'): Promise<UdhaarRecord> {
    return request<UdhaarRecord>(`/udhaar/${udhaarId}/repay`, {
      method: 'POST',
      body: { amount_paid: amountPaid, payment_mode: paymentMode },
    });
  },

  sendUdhaarReminder(udhaarId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/udhaar/${udhaarId}/send-reminder`, { method: 'POST' });
  },

  // ---- Orders -------------------------------------------------------------
  getVendorOrders(): Promise<Order[]> {
    return request<Order[]>('/orders/vendor');
  },

  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return request<Order>(`/orders/${orderId}/status`, { method: 'PUT', body: { status } });
  },

  // ---- Weather & Demand ---------------------------------------------------
  getWeather(lat = 12.9716, lon = 77.5946): Promise<Weather> {
    return request<Weather>(`/weather/current?lat=${lat}&lon=${lon}`);
  },

  getDemandForecast(days = 7): Promise<DemandForecast[]> {
    return request<DemandForecast[]>(`/weather/demand-forecast?days=${days}`);
  },

  // ---- Mandi / Credit -----------------------------------------------------
  getMandiRates(market = 'Bengaluru'): Promise<MandiSummary> {
    return request<MandiSummary>(`/mandi/rates?market=${encodeURIComponent(market)}`);
  },

  getCreditScorecard(): Promise<CreditScorecard> {
    return request<CreditScorecard>('/mandi/credit-scorecard');
  },

  // ---- Mobility -----------------------------------------------------------
  getMobilityRecommendations(): Promise<MobilityRecommendations> {
    return request<MobilityRecommendations>('/mobility/recommendations');
  },

  broadcastLocation(input: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    battery_level?: number;
  }): Promise<{ message: string }> {
    return request<{ message: string }>('/mobility/broadcast', { method: 'POST', body: input });
  },

  // ---- System -------------------------------------------------------------
  async health(): Promise<{ status: string; db: boolean }> {
    const raw = await fetch(`${getApiBaseUrl().replace('/api/v1', '')}/api/v1/system/health`);
    const json = await raw.json();
    return json?.data ?? { status: 'db-down', db: false };
  },
};
