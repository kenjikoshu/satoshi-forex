"use client";

import { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";

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

// Enable debug logging based on environment variable
const DEBUG_LOGGING = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true';

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

// Define API URL for CoinGecko
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,jpy,gbp,cny,inr,cad,aud,brl,rub,krw,sgd,chf,hkd,sek,mxn,zar,nok,nzd,thb,try,pln,dkk,idr,php,myr,czk,clp,ars,ils,cop,sar,aed,twd,ron,huf,vnd,pkr,ngn,xau,xag';

// Define the return type for fetchData
interface FetchDataResult {
  bitcoinData: CoinGeckoResponse;
  gdpData: {
    year: number;
    data: Record<string, number>;
  };
  btcPriceUSD: number;
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
      
      // Set the year from the file if available, otherwise use current year
      if (imfResponseData.year) {
        gdpYear = imfResponseData.year;
      }
      
      // Process the GDP data - assumes the file has a data property with country codes as keys
      if (imfResponseData.data && typeof imfResponseData.data === 'object') {
        gdpData = imfResponseData.data;
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

// Function to map country code to currency code
function mapCountryCodeToCurrency(countryCode: string): string | null {
  return CountryCodeToCurrencyCode[countryCode] || null;
}

// Check if a country is in the Eurozone
function isEurozoneCountry(countryCode: string): boolean {
  return EUROZONE_COUNTRIES.includes(countryCode);
}

export default function Home() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, {error: string, source: string}>>({});
  const tableRef = useRef<HTMLDivElement>(null);
  
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
  
  // Calculate value of 1 SATS in a currency
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
          valueOfOneSat: btcPriceUSD / 100000000, // Value of 1 sat in USD
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
  
  // Function to handle sharing the table as an image
  const handleShare = async () => {
    if (!tableRef.current) return;
    
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2, // Higher scale for better quality
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create a download link
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'satoshi-forex-rankings.png';
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        } else {
          clientError("Failed to create blob");
        }
      }, 'image/png');
    } catch (error) {
      clientError("Error generating image:", error);
      alert("Failed to generate sharing image. Please try again later.");
    }
  };
  
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
  
  // New function specifically for formatting the Value of 1 SATS column with standard decimal places
  function formatSatValue(num: number | null): string {
    if (num === null || num === 0) return 'N/A';
    return num.toFixed(10);
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
    let badgeColor = '';
    let displayText = currency.code;
    
    switch(currency.type) {
      case 'crypto':
        badgeColor = 'bg-orange-100 text-orange-800';
        break;
      case 'metal':
        badgeColor = 'bg-yellow-100 text-yellow-800';
        break;
      case 'fiat':
        badgeColor = 'bg-blue-100 text-blue-800';
        break;
    }
    
    return (
      <div className="flex items-center">
        <span className="font-mono font-bold">{displayText}</span>
        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
          {currency.type.toUpperCase()}
        </span>
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
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' 
      ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )
      : (
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">
            Satoshi Forex
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Ranking Bitcoin, Metals, and Top {TOP_CURRENCIES_LIMIT} Currencies
          </p>
          <p className="text-md md:text-lg text-gray-500 mt-2">
            See how Satoshis stack up against Gold, Silver, and the world&apos;s top economies!
          </p>
          <div className="mt-4 text-sm text-gray-600 max-w-3xl mx-auto">
            <p>
              We use GDP (from {gdpYear}) to compare with market cap because it&apos;s within an order of magnitude of money supply, 
              while reliable and consistent money supply data is difficult to obtain across all countries.
            </p>
          </div>
        </header>
        
        {/* Share Button */}
        <div className="mb-6 flex justify-center">
          <button
            onClick={handleShare}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full flex items-center shadow-lg transform transition duration-200 hover:scale-105"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            Share This Ranking
          </button>
        </div>
        
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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading latest data...</p>
          </div>
        )}
        
        {/* Ranking Table */}
        {!loading && !error && (
          <>
            <div 
              ref={tableRef} 
              className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-200"
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset/Currency
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('economicSize')}
                    >
                      <div className="flex items-center">
                        GDP/Market Cap (USD)
                        {renderSortIndicator('economicSize')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('valueOfOneSat')}
                    >
                      <div className="flex items-center">
                        Value of 1 SATS
                        <span className="ml-1 text-xs font-normal normal-case text-gray-400">(Metals in troy oz)</span>
                        {renderSortIndicator('valueOfOneSat')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('satsPerUnit')}
                    >
                      <div className="flex items-center">
                        SATS per Unit
                        <span className="ml-1 text-xs font-normal normal-case text-gray-400">(Metals per troy oz)</span>
                        {renderSortIndicator('satsPerUnit')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedCurrencies().map((currency) => (
                    <tr 
                      key={currency.code} 
                      className={currency.code === "BTC" ? "bg-orange-50" : "hover:bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {currency.rank}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {formatCurrencyDisplay(currency)}
                          <span className="ml-3 text-sm text-gray-500">{currency.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${formatNumber(currency.economicSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {currency.type === 'metal' 
                          ? `${formatSatValue(currency.valueOfOneSat)} oz (troy)`
                          : (currency.type === 'fiat' 
                            ? `${formatSatValue(currency.valueOfOneSat)} ${currency.code}`
                            : `1 SATS`)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {currency.type === 'metal'
                          ? `${formatSatsPerUnit(currency.satsPerUnit)} (per oz)`
                          : formatSatsPerUnit(currency.satsPerUnit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {/* Explanation Section */}
        <div className="mt-8 p-6 bg-white rounded-xl shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">About the Rankings</h2>
          <p className="text-gray-700 mb-4">
            Why GDP and Market Cap? We rank fiat by GDP and Bitcoin, Gold, and Silver by market cap for a fair comparison. 
            GDP is used because it&apos;s within an order of magnitude of money supply, while reliable and consistent money supply data is difficult to obtain across all countries.
            The table shows Bitcoin, Gold, Silver, and the top {TOP_CURRENCIES_LIMIT} currencies by GDP.
            GDP data is sourced from the IMF&apos;s World Economic Outlook database ({gdpYear}).
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Data Sources</h3>
            <ul className="text-sm text-blue-800 list-disc pl-5 space-y-1">
              <li><strong>Bitcoin:</strong> Real-time price and market cap from CoinGecko API</li>
              <li>
                <strong>Gold & Silver:</strong> Prices derived from Bitcoin-to-Gold and Bitcoin-to-Silver ratios via CoinGecko API, with market caps calculated using:
                <ul className="list-circle pl-5 mt-1 space-y-1">
                  <li>Gold: 215,000 metric tons of estimated above-ground supply (all prices in troy ounces)</li>
                  <li>Silver: 1,800,000 metric tons of estimated above-ground supply (all prices in troy ounces)</li>
                </ul>
              </li>
              <li><strong>GDP Data:</strong> Static GDP data from IMF World Economic Outlook database ({gdpYear})</li>
              <li>
                <strong>Eurozone:</strong> Combined GDP of all 20 Euro-using countries:
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-1 text-xs">
                  {EUROZONE_COUNTRIES.map(country => (
                    <div key={country} className="px-1">
                      {country}
                    </div>
                  ))}
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>Data sources: CoinGecko API for Bitcoin and metals pricing, static GDP data from IMF.</p>
          <p className="mt-1">© {new Date().getFullYear()} Satoshi Forex. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
