"use client";

import { useEffect, useState } from "react";
import Image from 'next/image';
import { useRouter } from "next/navigation";

// Types for our data
interface Currency {
  rank: number;
  code: string;
  name: string;
  economicSize: number; // GDP for fiat currencies, market cap for crypto/metals
  satsPerUnit: number;
  valueOfOneSat: number;
  type: 'crypto' | 'metal' | 'fiat';
}

// Direct CoinGecko API response type
interface CoinGeckoResponse {
  bitcoin: {
    usd: number;
    eur: number;
    jpy: number;
    gbp: number;
    cny: number;
    // And other currencies...
    [key: string]: number; 
  }
}

// Define the return type for fetchData
interface FetchDataResult {
  bitcoinData: CoinGeckoResponse;
  gdpData: {
    year: number;
    data: Record<string, number>;
  };
  btcPriceUSD: number;
}

// Enable debug logging based on environment variable
const DEBUG_LOGGING = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true';

// Define API URL for CoinGecko
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,jpy,gbp,cny,inr,cad,aud,brl,rub,krw,sgd,chf,hkd,sek,mxn,zar,nok,nzd,thb,try,pln,dkk,idr,php,myr,czk,clp,ars,ils,cop,sar,aed,twd,ron,huf,vnd,pkr,ngn,xau,xag';

// Comprehensive country code to currency code mapping
const CountryCodeToCurrencyCode: Record<string, string> = {
  // All economies with ISO and alternate codes
  "USA": "USD", // United States
  "US": "USD", // United States (alternate code)
  "EMU": "EUR", // Euro Area
  "XS": "EUR", // Euro Area (alternate code)
  "EA": "EUR", // Euro Area (alternate code)
  "JPN": "JPY", // Japan
  "JP": "JPY", // Japan (alternate code)
  "GBR": "GBP", // United Kingdom
  "GB": "GBP", // United Kingdom (alternate code)
  "CHN": "CNY", // China
  "CN": "CNY", // China (alternate code)
  "IND": "INR", // India
  "IN": "INR", // India (alternate code)
  "CAN": "CAD", // Canada
  "CA": "CAD", // Canada (alternate code)
  "AUS": "AUD", // Australia
  "AU": "AUD", // Australia (alternate code)
  "BRA": "BRL", // Brazil
  "BR": "BRL", // Brazil (alternate code)
  "RUS": "RUB", // Russia
  "RU": "RUB", // Russia (alternate code)
  "KOR": "KRW", // South Korea
  "KR": "KRW", // South Korea (alternate code)
  "SGP": "SGD", // Singapore
  "SG": "SGD", // Singapore (alternate code)
  "CHE": "CHF", // Switzerland
  "CH": "CHF", // Switzerland (alternate code)
  "HKG": "HKD", // Hong Kong
  "HK": "HKD", // Hong Kong (alternate code)
  "SWE": "SEK", // Sweden
  "SE": "SEK", // Sweden (alternate code)
  "MEX": "MXN", // Mexico
  "MX": "MXN", // Mexico (alternate code)
  "ZAF": "ZAR", // South Africa
  "ZA": "ZAR", // South Africa (alternate code)
  "NOR": "NOK", // Norway
  "NO": "NOK", // Norway (alternate code)
  "NZL": "NZD", // New Zealand
  "NZ": "NZD", // New Zealand (alternate code)
  "THA": "THB", // Thailand
  "TH": "THB", // Thailand (alternate code)
  "TUR": "TRY", // Turkey
  "TR": "TRY", // Turkey (alternate code)
  "POL": "PLN", // Poland
  "PL": "PLN", // Poland (alternate code)
  "DNK": "DKK", // Denmark
  "DK": "DKK", // Denmark (alternate code)
  "IDN": "IDR", // Indonesia
  "ID": "IDR", // Indonesia (alternate code)
  "PHL": "PHP", // Philippines
  "PH": "PHP", // Philippines (alternate code)
  "MYS": "MYR", // Malaysia
  "MY": "MYR", // Malaysia (alternate code)
  "CZE": "CZK", // Czech Republic
  "CZ": "CZK", // Czech Republic (alternate code)
  "CHL": "CLP", // Chile
  "CL": "CLP", // Chile (alternate code)
  "ARG": "ARS", // Argentina
  "AR": "ARS", // Argentina (alternate code)
  "ISR": "ILS", // Israel
  "IL": "ILS", // Israel (alternate code)
  "COL": "COP", // Colombia
  "CO": "COP", // Colombia (alternate code)
  "SAU": "SAR", // Saudi Arabia
  "SA": "SAR", // Saudi Arabia (alternate code)
  "ARE": "AED", // United Arab Emirates
  "AE": "AED", // United Arab Emirates (alternate code)
  "TWN": "TWD", // Taiwan
  "TW": "TWD", // Taiwan (alternate code)
  "ROU": "RON", // Romania
  "RO": "RON", // Romania (alternate code)
  "HUN": "HUF", // Hungary
  "HU": "HUF", // Hungary (alternate code)
  "VNM": "VND", // Vietnam
  "VN": "VND", // Vietnam (alternate code)
  "PAK": "PKR", // Pakistan
  "PK": "PKR", // Pakistan (alternate code)
  "NGA": "NGN", // Nigeria
  "NG": "NGN", // Nigeria (alternate code)
  
  // Euro-using countries (Eurozone)
  "AUT": "EUR", // Austria
  "BEL": "EUR", // Belgium
  "HRV": "EUR", // Croatia
  "CYP": "EUR", // Cyprus
  "EST": "EUR", // Estonia
  "FIN": "EUR", // Finland
  "FRA": "EUR", // France
  "DEU": "EUR", // Germany
  "GRC": "EUR", // Greece
  "IRL": "EUR", // Ireland
  "ITA": "EUR", // Italy
  "LVA": "EUR", // Latvia
  "LTU": "EUR", // Lithuania
  "LUX": "EUR", // Luxembourg
  "MLT": "EUR", // Malta
  "NLD": "EUR", // Netherlands
  "PRT": "EUR", // Portugal
  "SVK": "EUR", // Slovakia
  "SVN": "EUR", // Slovenia
  "ESP": "EUR", // Spain
};

// Eurozone country codes
const EUROZONE_COUNTRIES = [
  'AUT', 'BEL', 'CYP', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'IRL', 'ITA',
  'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'PRT', 'SVK', 'SVN', 'ESP', 'HRV'
];

// Helper function for debugging
function debugLog(...args: any[]) {
  if (DEBUG_LOGGING || process.env.NODE_ENV === 'development') {
    console.log('[CLIENT]', ...args);
  }
}

// Helper function for error logging
function clientError(...args: any[]) {
  console.error('[CLIENT ERROR]', ...args);
}

// Function to map country code to currency code
function mapCountryCodeToCurrency(countryCode: string): string | null {
  return CountryCodeToCurrencyCode[countryCode] || null;
}

// Check if a country is in the Eurozone
function isEurozoneCountry(countryCode: string): boolean {
  return EUROZONE_COUNTRIES.includes(countryCode);
}

// Function to fetch data from APIs and static files
async function fetchData(): Promise<FetchDataResult> {
  debugLog("Starting client-side data fetching...");
  
  try {
    // Fetch Bitcoin data directly from CoinGecko
    debugLog("Fetching Bitcoin data directly from CoinGecko API...");
    
    let bitcoinData: CoinGeckoResponse;
    try {
      const coinGeckoResponse = await fetch(COINGECKO_API_URL);
      
      if (!coinGeckoResponse.ok) {
        const errorText = await coinGeckoResponse.text();
        debugLog('Error fetching CoinGecko data:', coinGeckoResponse.status, errorText);
        throw new Error(`Failed to fetch CoinGecko data: ${coinGeckoResponse.status} - ${errorText}`);
      }
      
      bitcoinData = await coinGeckoResponse.json();
      debugLog("Bitcoin data fetched successfully", bitcoinData);
    } catch (error) {
      clientError("Failed to fetch Bitcoin data:", error);
      throw new Error(`Failed to fetch Bitcoin data: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Fetch GDP data from local static JSON file
    debugLog("Fetching GDP data from static JSON file...");
    
    let gdpData: Record<string, number> = {};
    let gdpYear = new Date().getFullYear();
    
    try {
      // From https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=2024
      const imfResponse = await fetch('/data/imf-gdp-data.json');
      
      if (!imfResponse.ok) {
        const errorText = await imfResponse.text();
        debugLog('Error fetching IMF data from file:', imfResponse.status, errorText);
        throw new Error(`Failed to fetch IMF data from file: ${imfResponse.status} - ${errorText}`);
      }
      
      const imfResponseData = await imfResponse.json();
      debugLog("GDP data fetched successfully from file", imfResponseData);
      
      // Process the IMF data based on its actual structure
      if (imfResponseData.values && imfResponseData.values.NGDPD) {
        // Extract the NGDPD dataset which contains GDP data
        const ngdpdData = imfResponseData.values.NGDPD;
        
        // Find the most recent year in the data
        // Most country entries will have the same year, so we just need to check one
        const sampleCountry = Object.keys(ngdpdData)[0];
        if (sampleCountry && ngdpdData[sampleCountry]) {
          const years = Object.keys(ngdpdData[sampleCountry]).map(Number);
          if (years.length > 0) {
            // Get the most recent year
            gdpYear = Math.max(...years);
            debugLog("Found GDP year in data:", gdpYear);
          }
        }
        
        // Process each country's GDP data for the most recent year
        for (const [countryCode, yearData] of Object.entries(ngdpdData)) {
          if (yearData && typeof yearData === 'object') {
            // Get the GDP value for the most recent year
            const yearDataRecord = yearData as Record<string, number>;
            const gdpValue = yearDataRecord[gdpYear.toString()];
            if (gdpValue !== undefined) {
              gdpData[countryCode] = Number(gdpValue);
            }
          }
        }
        
        debugLog(`Processed ${Object.keys(gdpData).length} GDP values from IMF data`);
      } else if (imfResponseData.data && typeof imfResponseData.data === 'object') {
        // Fallback to the simplified format if present
        gdpData = imfResponseData.data;
        if (imfResponseData.year) {
          gdpYear = imfResponseData.year;
        }
      } else {
        throw new Error("GDP data from file doesn't have the expected structure");
      }
    } catch (error) {
      clientError("Failed to fetch GDP data:", error);
      throw new Error(`Failed to fetch GDP data: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Extract Bitcoin price and return the data
    const btcPriceUSD = bitcoinData.bitcoin.usd;
    debugLog("BTC price in USD:", btcPriceUSD);
    
    return {
      bitcoinData,
      gdpData: {
        year: gdpYear,
        data: gdpData
      },
      btcPriceUSD
    };
  } catch (error) {
    clientError("Error in fetchData:", error);
    throw error;
  }
}

export default function Home() {
  const router = useRouter();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, {error: string, source: string}>>({});
  
  // Add state for sorting
  const [sortColumn, setSortColumn] = useState<'economicSize' | 'valueOfOneSat' | 'satsPerUnit'>('economicSize');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // State for Bitcoin data timestamp
  const [bitcoinPriceTimestamp, setBitcoinPriceTimestamp] = useState<string | null>(null);
  const [gdpDataTimestamp, setGdpDataTimestamp] = useState<string | null>(null);
  const [gdpYear, setGdpYear] = useState<number>(new Date().getFullYear());

  // State for Bitcoin prices in different currencies
  const [bitcoinPrices, setBitcoinPrices] = useState<Record<string, number>>({});
  
  // State for Gold and Silver prices
  const [goldSilverPrices, setGoldSilverPrices] = useState<{gold: number | null, silver: number | null}>({
    gold: null,
    silver: null
  });
  
  // Number of top currencies to display (excluding Bitcoin, Gold, and Silver)
  const TOP_CURRENCIES_LIMIT = 30;
  
  // Get Bitcoin price in a specific currency
  const getBitcoinPrice = (code: string): number | null => {
    // CoinGecko uses lowercase currency codes
    const lowerCode = code.toLowerCase();
    
    // If we have a Bitcoin price for this currency, use it
    if (bitcoinPrices[lowerCode] !== undefined) {
      debugLog(`Found Bitcoin price for ${code}: ${bitcoinPrices[lowerCode]}`);
      return bitcoinPrices[lowerCode];
    }
    
    // If we don't have a Bitcoin price for this currency, return null
    debugLog(`⚠️ No Bitcoin price found for ${code}, returning null`);
    return null;
  };
  
  // Calculate value of 1 SAT in a currency
  const calculateSatoshiValue = (currencyCode: string): number | null => {
    // Get the Bitcoin price in the specified currency
    const btcPrice = getBitcoinPrice(currencyCode.toLowerCase());
    
    if (btcPrice === null) return null;
    
    // 1 BTC = 100,000,000 Satoshis, so 1 SATS = BTC price / 100,000,000
    return btcPrice / 100000000;
  };
  
  // Calculate SATS per unit of currency
  const calculateSatsPerUnit = (currencyCode: string): number | null => {
    // Get the Bitcoin price in the specified currency
    const btcPrice = getBitcoinPrice(currencyCode.toLowerCase());
    
    if (btcPrice === null) return null;
    
    // SATS per unit = 100,000,000 / BTC price in the currency
    return 100000000 / btcPrice;
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        setApiErrors({});
        
        // Fetch data directly from external APIs
        const data: FetchDataResult = await fetchData();
        
        // Extract and process Bitcoin data
        const { bitcoinData, gdpData } = data;
        const btcPriceUSD = bitcoinData.bitcoin.usd;
        
        // Store Bitcoin prices for use in calculations
        setBitcoinPrices(bitcoinData.bitcoin);
        
        // Store GDP year
        setGdpYear(gdpData.year);
        
        // Process GDP data
        const processedGdpData: Record<string, number> = {};
        const eurozoneGdpData: Record<string, number> = {};
        let totalEurozoneGdp = 0;
        
        // Current timestamp for data freshness
        const currentTimestamp = new Date().toISOString();
        setBitcoinPriceTimestamp(currentTimestamp);
        setGdpDataTimestamp(currentTimestamp);
        
        // Process the GDP data from the JSON file
        for (const [countryCode, gdpValue] of Object.entries(gdpData.data)) {
          // Calculate Eurozone GDP
          if (isEurozoneCountry(countryCode)) {
            const gdpValueAbsolute = gdpValue * 1000000000; // Convert from billions to absolute
            eurozoneGdpData[countryCode] = gdpValueAbsolute;
            totalEurozoneGdp += gdpValueAbsolute;
            
            debugLog(`Eurozone country: ${countryCode} GDP: $${formatNumber(gdpValueAbsolute)}`);
          }
          
          // Map country codes to currency codes
          const currencyCode = mapCountryCodeToCurrency(countryCode);
          if (currencyCode && typeof gdpValue === 'number') {
            // Convert from billions to absolute values (IMF data is in billions)
            processedGdpData[currencyCode] = gdpValue * 1000000000;
            debugLog(`Mapped ${countryCode} to currency ${currencyCode}`);
          }
        }
        
        // Add the combined Eurozone GDP
        processedGdpData["EUR"] = totalEurozoneGdp;
        
        debugLog(`Processed ${Object.keys(processedGdpData).length} GDP values from JSON file`);
        debugLog(`Found ${Object.keys(eurozoneGdpData).length} Eurozone countries with total GDP: $${formatNumber(totalEurozoneGdp)}`);
        
        // Prepare the currencies array for the UI
        const allCurrencies: Currency[] = [];
        
        // Calculate Bitcoin market cap (price * circulating supply)
        const estimatedCirculatingSupply = 19500000; // ~19.5M BTC in circulation
        const btcMarketCap = btcPriceUSD * estimatedCirculatingSupply;
        
        // Add Bitcoin to the currencies array
        allCurrencies.push({
          rank: 0, // Will be set after sorting
          code: "BTC",
          name: "Bitcoin",
          economicSize: btcMarketCap,
          satsPerUnit: 100000000, // 1 BTC = 100,000,000 sats
          valueOfOneSat: 1, // For Bitcoin, 1 SATS = 1 SATS (not the USD value)
          type: 'crypto'
        });
        
        // Add Gold and Silver if prices are available
        if (bitcoinData.bitcoin.xau) {
          // Calculate Gold price in USD
          const goldPrice = btcPriceUSD / (bitcoinData.bitcoin.xau / 1);
          debugLog("Gold price in USD:", goldPrice);
          
          // Calculate Gold market cap
          const GOLD_SUPPLY_METRIC_TONS = 215000; // 215,000 metric tons of surface gold
          const METRIC_TON_TO_TROY_OUNCES = 32150.746; // 1 metric ton = 32,150.746 troy ounces
          const goldMarketCap = GOLD_SUPPLY_METRIC_TONS * METRIC_TON_TO_TROY_OUNCES * goldPrice;
          
          // Calculate sats per unit and value of one sat for Gold
          const goldSatsPerUnit = 100000000 / bitcoinData.bitcoin.xau;
          const goldSatValue = bitcoinData.bitcoin.xau / 100000000;
          
          allCurrencies.push({
            rank: 0,
            code: "XAU",
            name: "Gold",
            economicSize: goldMarketCap,
            satsPerUnit: goldSatsPerUnit,
            valueOfOneSat: goldSatValue,
            type: 'metal'
          });
          
          // Store gold price for reference
          setGoldSilverPrices(prev => ({
            ...prev,
            gold: goldPrice
          }));
        }
        
        if (bitcoinData.bitcoin.xag) {
          // Calculate Silver price in USD
          const silverPrice = btcPriceUSD / (bitcoinData.bitcoin.xag / 1);
          debugLog("Silver price in USD:", silverPrice);
          
          // Calculate Silver market cap
          const SILVER_SUPPLY_METRIC_TONS = 1800000; // 1,800,000 metric tons of surface silver
          const METRIC_TON_TO_TROY_OUNCES = 32150.746; // 1 metric ton = 32,150.746 troy ounces
          const silverMarketCap = SILVER_SUPPLY_METRIC_TONS * METRIC_TON_TO_TROY_OUNCES * silverPrice;
          
          // Calculate sats per unit and value of one sat for Silver
          const silverSatsPerUnit = 100000000 / bitcoinData.bitcoin.xag;
          const silverSatValue = bitcoinData.bitcoin.xag / 100000000;
          
          allCurrencies.push({
            rank: 0,
            code: "XAG",
            name: "Silver",
            economicSize: silverMarketCap,
            satsPerUnit: silverSatsPerUnit,
            valueOfOneSat: silverSatValue,
            type: 'metal'
          });
          
          // Store silver price for reference
          setGoldSilverPrices(prev => ({
            ...prev,
            silver: silverPrice
          }));
        }
        
        // Now add fiat currencies
        const fiatCurrencies: Currency[] = [];
        
        Object.keys(processedGdpData).forEach((currencyCode) => {
          if (currencyCode === "BTC" || currencyCode === "XAU" || currencyCode === "XAG") {
            return; // Skip non-fiat currencies
          }
          
          // Get GDP in USD
          const gdpInUSD = processedGdpData[currencyCode] || 0;
          
          // Try to get Bitcoin price for this currency
          const lowerCurrencyCode = currencyCode.toLowerCase();
          const btcPrice = bitcoinData.bitcoin[lowerCurrencyCode];
          
          // Skip currencies without Bitcoin prices
          if (!btcPrice) {
            debugLog(`Skipping currency ${currencyCode} due to missing Bitcoin price`);
            setApiErrors(prev => ({
              ...prev,
              [currencyCode]: {
                error: `No Bitcoin price available for ${currencyCode}`,
                source: 'Missing from CoinGecko data'
              }
            }));
            return;
          }
          
          // Calculate sats per unit and value of one sat
          const satsPerUnit = 100000000 / btcPrice;
          const satoshiValue = btcPrice / 100000000;
          
          fiatCurrencies.push({
            rank: 0,
            code: currencyCode,
            name: getCurrencyName(currencyCode) || currencyCode,
            economicSize: gdpInUSD,
            satsPerUnit: satsPerUnit,
            valueOfOneSat: satoshiValue,
            type: 'fiat'
          });
        });
        
        // Sort fiat currencies by economic size and take top ones
        const topFiatCurrencies = fiatCurrencies
          .sort((a, b) => b.economicSize - a.economicSize)
          .slice(0, TOP_CURRENCIES_LIMIT);
        
        // Add top fiat currencies to the main array
        allCurrencies.push(...topFiatCurrencies);
        
        // Check if we have any currencies to display
        if (allCurrencies.length === 0) {
          setError("No currency data available. Please try again later.");
          setLoading(false);
          return;
        }
        
        // Sort all currencies by economic size and assign ranks
        const sortedCurrencies = allCurrencies
          .sort((a, b) => b.economicSize - a.economicSize)
          .map((currency, index) => ({
            ...currency,
            rank: index + 1
          }));
        
        // Set the currencies in state
        setCurrencies(sortedCurrencies);
        setLoading(false);
      } catch (error) {
        clientError("Error in loadData function:", error);
        setLoading(false);
        setError(`Failed to load data: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    loadData();
  }, []);
  
  // Helper function to get currency names
  function getCurrencyName(code: string): string {
    const currencyNames: Record<string, string> = {
      "USD": "US Dollar",
      "EUR": "Euro",
      "JPY": "Japanese Yen",
      "GBP": "British Pound",
      "CNY": "Chinese Yuan",
      "INR": "Indian Rupee",
      "CAD": "Canadian Dollar",
      "AUD": "Australian Dollar",
      "BRL": "Brazilian Real",
      "RUB": "Russian Ruble",
      "KRW": "South Korean Won",
      "SGD": "Singapore Dollar",
      "CHF": "Swiss Franc",
      "HKD": "Hong Kong Dollar",
      "SEK": "Swedish Krona",
      "MXN": "Mexican Peso",
      "ZAR": "South African Rand",
      "NOK": "Norwegian Krone",
      "NZD": "New Zealand Dollar",
      "THB": "Thai Baht",
      "TRY": "Turkish Lira",
      "PLN": "Polish Złoty",
      "DKK": "Danish Krone",
      "IDR": "Indonesian Rupiah",
      "PHP": "Philippine Peso",
      "MYR": "Malaysian Ringgit",
      "CZK": "Czech Koruna",
      "CLP": "Chilean Peso",
      "ARS": "Argentine Peso",
      "ILS": "Israeli New Shekel",
      "COP": "Colombian Peso",
      "SAR": "Saudi Riyal",
      "AED": "UAE Dirham",
      "TWD": "Taiwan Dollar",
      "RON": "Romanian Leu",
      "HUF": "Hungarian Forint",
      "VND": "Vietnamese Dong",
      "PKR": "Pakistani Rupee",
      "NGN": "Nigerian Naira"
    };
    
    return currencyNames[code] || code;
  }
  
  // Helper function to format large numbers
  function formatNumber(num: number, decimals: number = 2): string {
    // Handle edge case where value is exactly zero
    if (num === 0) return '0';
    
    if (num >= 1e12) {
      return (num / 1e12).toFixed(decimals) + 'T';
    } else if (num >= 1e9) {
      return (num / 1e9).toFixed(decimals) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(decimals) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(decimals) + 'K';
    } else {
      return num.toFixed(decimals);
    }
  }
  
  // New function specifically for formatting the Value of 1 SAT column with standard decimal places
  function formatSatValue(num: number | null): string {
    if (num === null || num === 0) return 'N/A';
    return num.toFixed(8);
  }
  
  // New function to format satoshi amounts with at least 4 significant figures
  function formatSatsPerUnit(num: number | null): string {
    if (num === null || num === 0) return 'N/A';
    
    // For values >= 10000, just use comma formatting with no decimal places
    if (num >= 10000) {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
    }
    
    // For values between 1000 and 9999, use comma formatting with no decimal places
    if (num >= 1000) {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
    }
    
    // For values between 100 and 999, use 1 decimal place
    if (num >= 100) {
      return num.toFixed(1);
    }
    
    // For values between 10 and 99, use 2 decimal places
    if (num >= 10) {
      return num.toFixed(2);
    }
    
    // For values between 1 and 9.999, use 3 decimal places
    if (num >= 1) {
      return num.toFixed(3);
    }
    
    // For values less than 1, find the first non-zero digit and show 4 significant figures
    let decimalPlaces = 4;
    let tempNum = num;
    while (tempNum < 0.1 && decimalPlaces < 10) {
      tempNum *= 10;
      decimalPlaces += 1;
    }
    
    return num.toFixed(decimalPlaces);
  }
  
  // Helper function to format currency code display
  function formatCurrencyDisplay(currency: Currency): JSX.Element {
    // Function to get the appropriate icon path for a currency code
    const getCurrencyIconPath = (code: string): string => {
      // Use uppercase for the filename since the files are in uppercase
      const upperCode = code.toUpperCase();
      
      // Return the path to the corresponding SVG
      return `/icons/currencies/${upperCode}.svg`;
    };
    
    return (
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0" aria-hidden="true">
          <Image 
            src={getCurrencyIconPath(currency.code)} 
            alt={`${currency.code} icon`}
            width={26}
            height={26}
            quality={100}
            unoptimized={true} // For SVG files, unoptimized provides better rendering
            style={{ 
              width: '24px', 
              height: '24px',
              maxWidth: '100%',
              shapeRendering: 'geometricPrecision',
              textRendering: 'optimizeLegibility'
            }}
            className="md:w-6 md:h-6 w-7 h-7 dark:bg-gray-200 dark:rounded-full dark:p-0.5"
          />
        </div>
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-200 hidden md:block">{currency.name}</div>
          <div className="text-sm md:text-xs font-medium text-gray-900 dark:text-gray-200 md:text-gray-500 md:dark:text-gray-400 md:font-normal">{currency.code}</div>
        </div>
      </div>
    );
  }
  
  // Function to handle column sorting
  const handleSort = (column: 'economicSize' | 'valueOfOneSat' | 'satsPerUnit') => {
    if (sortColumn === column) {
      // If already sorting by this column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If sorting by a new column, set it and use default direction
      setSortColumn(column);
      // Default sort directions: desc for economicSize, asc for others
      setSortDirection(column === 'economicSize' ? 'desc' : 'asc');
    }
  };

  // Function to get sorted currencies
  const getSortedCurrencies = () => {
    if (!currencies.length) return [];
    
    return [...currencies].sort((a, b) => {
      const valueA = a[sortColumn];
      const valueB = b[sortColumn];
      
      // Handle null values
      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return 1;
      if (valueB === null) return -1;
      
      // Sort based on direction
      const compareResult = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      return sortDirection === 'asc' ? compareResult : -compareResult;
    });
  };

  // Function to render sort indicator
  const renderSortIndicator = (column: 'economicSize' | 'valueOfOneSat' | 'satsPerUnit') => {
    if (sortColumn !== column) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' 
      ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )
      : (
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
  };
  
  // Navigate to conversion page for selected currency
  const navigateToConversion = (currencyCode: string) => {
    if (currencyCode && currencyCode !== 'BTC') {
      router.push(`/convert/${currencyCode.toLowerCase()}`);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <header className="mb-10 text-center">
          <h1 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl mt-3 mb-3 font-heading tracking-wide">
            <span className="font-semibold text-gray-800 dark:text-gray-100">Satoshis</span>
            <span className="font-light text-gray-700 dark:text-gray-300"> - Bitcoin&apos;s Native Currency Unit</span>
          </h1>
          <p className="text-md md:text-xl font-bold text-gray-700 dark:text-gray-300 mt-6 mb-6">
            1 Bitcoin = 100,000,000 Satoshis
          </p>
          <div className="max-w-2xl mx-auto">
            <p className="text-sm md:text-md text-gray-500 dark:text-gray-400 mb-1">
              Satoshis to Bitcoin, is like Cents to the Dollar
            </p>
            <p className="text-sm md:text-md text-gray-500 dark:text-gray-400 mb-1">
              In fact, Bitcoin as a unit does not exist in the Bitcoin code, only Satoshis
            </p>
            <p className="text-sm md:text-md text-gray-500 dark:text-gray-400">
              Let&apos;s compare Bitcoin Satoshi to the world&apos;s top {TOP_CURRENCIES_LIMIT} currencies in Real Time!
            </p>
          </div>
        </header>
        
        {/* Notifications area */}
        <div className="mb-4 space-y-2">
          {/* Error message if any */}
          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded relative" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
          
          {/* API warnings only shown during development */}
          {process.env.NODE_ENV === 'development' && (
            <>
              {/* Any API errors */}
              {Object.keys(apiErrors).length > 0 && (
                <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded relative" role="alert">
                  <strong className="font-bold">API Warnings:</strong>
                  <ul className="mt-2 list-disc pl-5">
                    {Object.entries(apiErrors).map(([key, {error, source}]) => (
                      <li key={key}><strong>{key}:</strong> {error} ({source})</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Loading, Error States */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading latest data...</p>
          </div>
        )}
        
        {/* Ranking Table */}
        {!loading && !error && (
          <>
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 w-full">
              <div className="min-w-[420px]">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[60px] md:table-column hidden" />  {/* Rank - hidden on mobile */}
                    <col className="w-[120px] md:w-[180px]" />  {/* Asset/Currency - narrower on mobile */}
                    <col className="w-[140px] hidden sm:table-column" />  {/* GDP/Market Cap - hidden on mobile */}
                    <col className="w-[150px]" />  {/* Value of 1 SAT */}
                    <col className="w-[150px]" />  {/* SATS per Unit */}
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="px-2 md:px-4 py-3 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase font-heading hidden md:table-cell">
                        Rank
                      </th>
                      <th className="px-2 md:px-4 py-3 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase font-heading">
                        Currency
                      </th>
                      <th 
                        className="px-2 md:px-4 py-3 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer font-heading hidden sm:table-cell"
                        onClick={() => handleSort('economicSize')}
                      >
                        <div className="flex items-center">
                          GDP/Market Cap
                          {renderSortIndicator('economicSize')}
                        </div>
                      </th>
                      <th 
                        className="px-2 md:px-4 py-3 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer font-heading"
                        onClick={() => handleSort('valueOfOneSat')}
                      >
                        <div className="flex items-center whitespace-nowrap">
                          1 SAT Value
                          {renderSortIndicator('valueOfOneSat')}
                        </div>
                      </th>
                      <th 
                        className="px-2 md:px-4 py-3 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer font-heading"
                        onClick={() => handleSort('satsPerUnit')}
                      >
                        <div className="flex items-center whitespace-nowrap">
                          SATS per Unit
                          {renderSortIndicator('satsPerUnit')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedCurrencies().map((currency, index) => (
                      <tr 
                        key={currency.code} 
                        className={`${currency.code === "BTC" 
                          ? "bg-orange-100 dark:bg-amber-900" 
                          : (index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700')} ${
                          currency.code !== "BTC" ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" : ""
                        }`}
                        onClick={() => currency.code !== "BTC" && navigateToConversion(currency.code)}
                      >
                        <td className="px-2 md:px-4 py-3 md:py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 hidden md:table-cell">
                          {currency.rank}
                        </td>
                        <td className="px-2 md:px-4 py-3 md:py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            {formatCurrencyDisplay(currency)}
                          </div>
                        </td>
                        <td className="px-2 md:px-4 py-3 md:py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 hidden sm:table-cell">
                          ${formatNumber(currency.economicSize)}
                        </td>
                        <td className="px-2 md:px-4 py-3 md:py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-mono">
                          {currency.type === 'metal' 
                            ? `${formatSatValue(currency.valueOfOneSat)} oz`
                            : currency.type === 'fiat' 
                              ? (
                                <>
                                  {formatSatValue(currency.valueOfOneSat)}{' '}
                                  <span className={currency.code === "BTC" ? "" : "hidden sm:inline"}>
                                    {currency.code}
                                  </span>
                                </>
                              )
                              : '1 SAT'
                          }
                        </td>
                        <td className="px-2 md:px-4 py-3 md:py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-mono">
                          {currency.type === 'metal'
                            ? `${formatSatsPerUnit(currency.satsPerUnit)} (per oz)`
                            : (currency.code === 'BTC'
                              ? `${formatSatsPerUnit(currency.satsPerUnit)} (per BTC)`
                              : `${formatSatsPerUnit(currency.satsPerUnit)}`)
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
                
         {/* Explanation Section */}
         <div className="mt-8 p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">          
           <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2 font-heading">Why Compare GDP to Market Cap?</h3>
           <p className="text-gray-600 dark:text-gray-400 mb-4">
             We rank fiat currencies by GDP and Bitcoin/metals by market cap for a fair size comparison. GDP provides a consistent measure across countries and is within an order of magnitude of money supply values.
           </p>
           
           <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2 font-heading">Data Sources</h3>
           <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5 space-y-1 mb-4">
             <li><strong>Bitcoin:</strong> Real-time price from CoinGecko API with an estimated circulating supply of 19.5M BTC</li>
             <li><strong>Gold:</strong> Price via CoinGecko with market cap based on 215,000 metric tons of estimated above-ground supply</li>
             <li><strong>Silver:</strong> Price via CoinGecko with market cap based on 1,800,000 metric tons of estimated above-ground supply</li>
             <li><strong>GDP Data:</strong> IMF World Economic Outlook database ({gdpYear})</li>
           </ul>
           
           <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2 font-heading">Eurozone</h3>
           <p className="text-gray-600 dark:text-gray-400 mb-2">
             The Euro (EUR) represents the combined GDP of all 20 Euro-using countries.
           </p>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-gray-500 dark:text-gray-400">
             {EUROZONE_COUNTRIES.map(country => (
               <div key={country} className="px-1">
                 {country}
               </div>
             ))}
           </div>
         </div>
         
         {/* About Section */}
         {!loading && !error && (
           <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
             <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">About the Rankings</h2>
             <p className="text-gray-700 dark:text-gray-300 mb-4">
               Why GDP and Market Cap? We rank fiat by GDP and Bitcoin, Gold, and Silver by market cap for a fair comparison. 
               The table shows Bitcoin, Gold, Silver, and the top {TOP_CURRENCIES_LIMIT} currencies by GDP. 
               GDP data is sourced from the IMF&apos;s World Economic Outlook database.
             </p>
             
             <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
               <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300 mb-2">Data Sources</h3>
               <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc pl-5 space-y-1">
                 <li>
                   <strong>Bitcoin:</strong> Real-time price and market cap from CoinGecko API
                 </li>
                 <li>
                   <strong>Gold &amp; Silver:</strong> Prices derived from Bitcoin-to-Gold and Bitcoin-to-Silver ratios via CoinGecko API, with market caps calculated using:
                   <ul className="list-circle pl-5 mt-1 space-y-1">
                     <li>Gold: 215,000 metric tons of estimated above-ground supply</li>
                     <li>Silver: 1,800,000 metric tons of estimated above-ground supply</li>
                   </ul>
                 </li>
                 <li>
                   <strong>GDP Data:</strong> IMF World Economic Outlook database (via proxy API)
                 </li>
                 <li>
                   <strong>Eurozone:</strong> Combined GDP of all 20 Euro-using countries:
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-1 text-xs">
                     {EUROZONE_COUNTRIES.map(country => (
                       <div key={country} className="px-1">
                         {getCurrencyName(country)} ({country})
                       </div>
                     ))}
                   </div>
                 </li>
               </ul>
               <p className="text-sm text-blue-800 dark:text-blue-200 mt-3">
                 Note: When API connectivity issues occur, the application falls back to sample data for GDP values and metal prices.
               </p>
             </div>
           </div>
         )}
      </div>
    </main>
  );
}