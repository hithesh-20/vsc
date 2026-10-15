export type Role = 'VENDOR' | 'CUSTOMER';

export interface AuthSession {
  token: string;
  role: Role;
  userId: string;
  vendorId?: string | null;
  customerId?: string | null;
  name: string;
  languagePref: string;
}

export interface VendorProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_name_kn?: string | null;
  business_category: string;
  operating_location: string;
  current_lat?: number | null;
  current_lon?: number | null;
  operating_radius_km: number;
  is_active: boolean;
  is_accepting_orders: boolean;
  rating_avg: number;
  rating_count: number;
  working_hours: string;
  upi_id?: string | null;
}

export interface DashboardSummary {
  today_sales_revenue: number;
  today_sales_count: number;
  today_net_profit: number;
  pending_orders_count: number;
  total_udhaar_outstanding: number;
  low_stock_items_count: number;
  ai_recommendation_short: string;
  weather_summary: string;
  weather_warning?: string | null;
}

export interface Category {
  id: string;
  name: string;
  name_kn?: string | null;
  icon_name: string;
  description?: string | null;
}

export type ProductUnit = 'kg' | 'g' | 'piece' | 'dozen' | 'packet' | 'liter' | 'bunch';

export interface Product {
  id: string;
  vendor_id: string;
  category_id?: string | null;
  name_en: string;
  name_kn: string;
  description?: string | null;
  unit: ProductUnit;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  low_stock_threshold: number;
  image_url?: string | null;
  is_available: boolean;
  is_perishable: boolean;
  category_name?: string | null;
  category_name_kn?: string | null;
}

export type PaymentMode = 'CASH' | 'UPI' | 'UDHAAR' | 'HYBRID';

export interface SaleItem {
  id: string;
  product_id?: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit: string;
  unit_cost_price: number;
  unit_selling_price: number;
  subtotal: number;
  profit: number;
}

export interface Sale {
  id: string;
  vendor_id: string;
  customer_name: string;
  customer_phone?: string | null;
  total_amount: number;
  total_cost: number;
  discount_amount: number;
  net_amount: number;
  net_profit: number;
  payment_mode: PaymentMode;
  cash_paid: number;
  upi_paid: number;
  udhaar_amount: number;
  is_synced: boolean;
  client_mutation_id?: string | null;
  created_at: string;
  items: SaleItem[];
}

export interface ProfitTrendPoint {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  orders_count: number;
}

export interface ProductProfitRank {
  product_name: string;
  total_qty_sold: number;
  unit: string;
  total_revenue: number;
  total_profit: number;
  profit_margin_pct: number;
}

export interface ProfitAnalytics {
  total_revenue: number;
  total_cost: number;
  total_net_profit: number;
  overall_profit_margin_pct: number;
  trends: ProfitTrendPoint[];
  top_selling_products: ProductProfitRank[];
  top_profitable_products: ProductProfitRank[];
}

export type UdhaarStatus = 'UNPAID' | 'PARTIAL' | 'SETTLED';

export interface UdhaarRecord {
  id: string;
  vendor_id: string;
  customer_name: string;
  customer_phone?: string | null;
  amount_due: number;
  amount_paid: number;
  remaining_balance: number;
  status: UdhaarStatus;
  notes?: string | null;
  due_date?: string | null;
  last_reminder_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UdhaarSummary {
  total_outstanding_udhaar: number;
  total_repaid_udhaar: number;
  total_debtors_count: number;
  unpaid_accounts_count: number;
  records: UdhaarRecord[];
}

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  product_id?: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  vendor_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_mode: string;
  total_amount: number;
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lon?: number | null;
  special_instructions?: string | null;
  estimated_delivery_time?: string | null;
  completed_at?: string | null;
  created_at: string;
  items: OrderItem[];
  customer_name?: string | null;
  customer_phone?: string | null;
}

export interface OtpRequestResult {
  request_id: string;
  phone: string;
  masked_phone: string;
  expires_in_seconds: number;
  resend_in_seconds: number;
  is_new_user: boolean;
  demo_code?: string | null;
}

export interface OtpVerifyResult {
  verified: boolean;
  access_token?: string | null;
  token_type?: string;
  role?: Role | null;
  user_id?: string | null;
  vendor_id?: string | null;
  customer_id?: string | null;
  name?: string | null;
  language_pref?: string | null;
}

export interface Weather {
  temperature_celsius: number;
  precipitation_mm: number;
  weather_condition: string;
  weather_condition_kn: string;
  advisory: string;
  advisory_kn: string;
  is_outdoor_favorable: boolean;
}

export interface MandiRate {
  commodity_name_en: string;
  commodity_name_kn: string;
  commodity_name_hi: string;
  category: string;
  market_name: string;
  market_name_kn: string;
  min_price_per_kg: number;
  max_price_per_kg: number;
  modal_price_per_kg: number;
  unit: string;
  trend: string;
  price_change_pct: number;
  recommended_retail_price: number;
  expected_profit_margin_pct: number;
}

export interface MandiSummary {
  market_name: string;
  market_location: string;
  reported_date: string;
  total_commodities_tracked: number;
  top_gainers: string[];
  top_losers: string[];
  commodities: MandiRate[];
  buyer_advisory_kn: string;
  buyer_advisory_en: string;
}

export interface CreditScorecard {
  vendor_id: string;
  business_name: string;
  credit_score: number;
  rating_category: string;
  repayment_reliability_pct: number;
  daily_revenue_consistency_pct: number;
  digital_transaction_ratio_pct: number;
  eligible_svanidhi_loan_tier: string;
  max_preapproved_loan_amount: number;
  interest_subsidy_eligible: boolean;
  scheme_name: string;
  key_strengths_kn: string[];
  improvement_tips_kn: string[];
}

export interface DailyForecast {
  date: string;
  day_name: string;
  predicted_demand_qty: number;
  recommended_morning_stock: number;
  unit: string;
  confidence_score: number;
  factors: Record<string, unknown>;
}

export interface DemandForecast {
  product_id: string;
  product_name_en: string;
  product_name_kn: string;
  current_stock: number;
  unit: string;
  is_perishable: boolean;
  daily_forecasts: DailyForecast[];
  stock_health: string;
}

export interface InventoryLedgerEntry {
  id: string;
  product_id: string;
  change_qty: number;
  transaction_type: string;
  balance_after: number;
  notes?: string | null;
  created_at: string;
}

export interface MobilityRecommendation {
  location_name: string;
  location_name_kn: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  score: number;
  demand_level: string;
  active_competitors_count: number;
  expected_customers_density: string;
  recommendation_reason: string;
  recommendation_reason_kn: string;
  weather_condition: string;
  estimated_turnover_inr: number;
  high_demand_products: string[];
  saturated_products: string[];
  cannibalization_risk_percent: number;
  route_strategy: string;
  google_maps_url: string;
}

export interface MobilityRecommendations {
  vendor_id: string;
  vendor_category: string;
  recommendations: MobilityRecommendation[];
  cluster_warning?: string | null;
  generated_at: string;
}
