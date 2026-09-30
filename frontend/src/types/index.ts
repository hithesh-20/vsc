export interface Vendor {
  vendor_id: string;
  business_name: string;
  business_name_kn?: string;
  business_category: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  rating_avg: number;
  is_accepting_orders: boolean;
  working_hours: string;
  product_count: number;
}

export interface Product {
  id: string;
  vendor_id: string;
  name_en: string;
  name_kn: string;
  description?: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  low_stock_threshold: number;
  image_url?: string;
  is_available: boolean;
  category_name?: string | null;
  category_name_kn?: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: 'PENDING' | 'ACCEPTED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'CANCELLED';
  payment_status: string;
  payment_mode: string;
  total_amount: number;
  delivery_address?: string;
  created_at: string;
}

export interface LoyaltyData {
  points: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  next_tier?: string;
  points_to_next_tier: number;
  discount_per_100_points: number;
  perks: string[];
}
