export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  flag: string;
  exchangeRateToInr: number;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', locale: 'en-IN', flag: '🇮🇳', exchangeRateToInr: 1.0 },
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', locale: 'en-US', flag: '🇺🇸', exchangeRateToInr: 0.012 },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', locale: 'de-DE', flag: '🇪🇺', exchangeRateToInr: 0.011 },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', locale: 'en-GB', flag: '🇬🇧', exchangeRateToInr: 0.0095 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling (KES)', locale: 'en-KE', flag: '🇰🇪', exchangeRateToInr: 1.55 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira (NGN)', locale: 'en-NG', flag: '🇳🇬', exchangeRateToInr: 18.2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real (BRL)', locale: 'pt-BR', flag: '🇧🇷', exchangeRateToInr: 0.068 },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso (MXN)', locale: 'es-MX', flag: '🇲🇽', exchangeRateToInr: 0.22 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah (IDR)', locale: 'id-ID', flag: '🇮🇩', exchangeRateToInr: 195.0 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso (PHP)', locale: 'en-PH', flag: '🇵🇭', exchangeRateToInr: 0.68 },
];

const CURRENCY_STORAGE_KEY = 'vs_active_currency';

export function getStoredCurrency(): string {
  try {
    return localStorage.getItem(CURRENCY_STORAGE_KEY) || 'INR';
  } catch (_) {
    return 'INR';
  }
}

export function setStoredCurrency(code: string): void {
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, code);
  } catch (_) {}
}

export function getCurrencyConfig(code?: string): CurrencyConfig {
  const targetCode = code || getStoredCurrency();
  return SUPPORTED_CURRENCIES.find(c => c.code === targetCode) || SUPPORTED_CURRENCIES[0];
}

export function formatCurrency(
  amount: number,
  currencyCode?: string
): string {
  const config = getCurrencyConfig(currencyCode);
  
  try {
    const formatted = Math.round(amount).toLocaleString(config.locale);
    return `${config.symbol}${formatted}`;
  } catch (_) {
    return `${config.symbol}${Math.round(amount)}`;
  }
}
