// CoinGecko API service for Bitcoin price data
interface MarketChartResponse {
  prices: [number, number][]; // Array of [timestamp, price] pairs
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

interface CoinGeckoSimplePriceResponse {
  bitcoin: {
    [currency: string]: number;
  };
}

// List of supported fiat currencies
export const SUPPORTED_FIATS = [
  "usd","aed","ars","aud","bdt","bhd","bmd","brl","cad","chf","clp","cny","czk","dkk",
  "eur","gbp","gel","hkd","huf","idr","ils","inr","jpy","krw","kwd","lkr","mmk","mxn",
  "myr","ngn","nok","nzd","php","pkr","pln","rub","sar","sek","sgd","thb","try","twd",
  "uah","vef","vnd","zar","xdr","xag","xau"
];

/**
 * Fetch Bitcoin price history for the past year in a specified currency
 */
export async function fetchBitcoinPriceHistory(currency: string): Promise<MarketChartResponse> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency.toLowerCase()}&days=365&precision=full`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching Bitcoin price history:", error);
    throw error;
  }
}

/**
 * Fetch current Bitcoin prices in multiple currencies
 */
export async function fetchCurrentBitcoinPrices(currencies: string[]): Promise<CoinGeckoSimplePriceResponse> {
  try {
    const currenciesParam = currencies.map(c => c.toLowerCase()).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currenciesParam}`,
      { next: { revalidate: 60 } } // Cache for 1 minute
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching current Bitcoin prices:", error);
    throw error;
  }
}

/**
 * Check if a currency is supported
 */
export function isSupportedCurrency(currency: string): boolean {
  return SUPPORTED_FIATS.includes(currency.toLowerCase());
}

/**
 * Get the currency name from its code
 */
export function getCurrencyName(code: string): string {
  const currencyNames: Record<string, string> = {
    "USD": "US Dollar",
    "EUR": "Euro",
    "JPY": "Japanese Yen",
    "GBP": "British Pound",
    "CNY": "Chinese Yuan",
    "AUD": "Australian Dollar",
    "CAD": "Canadian Dollar",
    "CHF": "Swiss Franc",
    "HKD": "Hong Kong Dollar",
    "SGD": "Singapore Dollar",
    "SEK": "Swedish Krona",
    "KRW": "South Korean Won",
    "NOK": "Norwegian Krone",
    "NZD": "New Zealand Dollar",
    "INR": "Indian Rupee",
    "MXN": "Mexican Peso",
    "BRL": "Brazilian Real",
    "RUB": "Russian Ruble",
    "ZAR": "South African Rand",
    "TRY": "Turkish Lira",
    "AED": "UAE Dirham",
    "ARS": "Argentine Peso",
    "BDT": "Bangladeshi Taka",
    "BHD": "Bahraini Dinar",
    "BMD": "Bermudian Dollar",
    "CLP": "Chilean Peso",
    "CZK": "Czech Koruna",
    "DKK": "Danish Krone",
    "GEL": "Georgian Lari",
    "HUF": "Hungarian Forint",
    "IDR": "Indonesian Rupiah",
    "ILS": "Israeli New Shekel",
    "KWD": "Kuwaiti Dinar",
    "LKR": "Sri Lankan Rupee",
    "MMK": "Myanmar Kyat",
    "MYR": "Malaysian Ringgit",
    "NGN": "Nigerian Naira",
    "PHP": "Philippine Peso",
    "PKR": "Pakistani Rupee",
    "PLN": "Polish Złoty",
    "SAR": "Saudi Riyal",
    "THB": "Thai Baht",
    "TWD": "New Taiwan Dollar",
    "UAH": "Ukrainian Hryvnia",
    "VEF": "Venezuelan Bolívar",
    "VND": "Vietnamese Dong",
    "XAG": "Silver",
    "XAU": "Gold",
    "XDR": "Special Drawing Rights"
  };
  
  return currencyNames[code.toUpperCase()] || code.toUpperCase();
} 