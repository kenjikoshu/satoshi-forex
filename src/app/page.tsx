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

// CoinGecko API response type
interface CryptoData {
  id: string;
  current_price: number;
  market_cap: number;
}

// Enable debug logging based on environment variable
const DEBUG_LOGGING = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true';

// Helper function for debugging
function debugLog(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[CLIENT]', ...args);
  }
}

// Helper function for error logging
function clientError(...args: any[]) {
  console.error('[CLIENT ERROR]', ...args);
}

// Comprehensive country code to currency code mapping
function mapCountryCodeToCurrency(countryCode: string): string | null {
  const mapping: Record<string, string> = {
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
  
  return mapping[countryCode] || null;
}

// Hardcoded table of Euro-using countries with their ISO codes
const EUROZONE_COUNTRIES = [
  { name: "Austria", isoCode: "AUT" },
  { name: "Belgium", isoCode: "BEL" },
  { name: "Croatia", isoCode: "HRV" },
  { name: "Cyprus", isoCode: "CYP" },
  { name: "Estonia", isoCode: "EST" },
  { name: "Finland", isoCode: "FIN" },
  { name: "France", isoCode: "FRA" },
  { name: "Germany", isoCode: "DEU" },
  { name: "Greece", isoCode: "GRC" },
  { name: "Ireland", isoCode: "IRL" },
  { name: "Italy", isoCode: "ITA" },
  { name: "Latvia", isoCode: "LVA" },
  { name: "Lithuania", isoCode: "LTU" },
  { name: "Luxembourg", isoCode: "LUX" },
  { name: "Malta", isoCode: "MLT" },
  { name: "Netherlands", isoCode: "NLD" },
  { name: "Portugal", isoCode: "PRT" },
  { name: "Slovakia", isoCode: "SVK" },
  { name: "Slovenia", isoCode: "SVN" },
  { name: "Spain", isoCode: "ESP" }
];

// Helper function to check if a country is in the Eurozone
function isEurozoneCountry(countryCode: string): boolean {
  return EUROZONE_COUNTRIES.some(country => country.isoCode === countryCode);
}

export default function Home() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<{[key: string]: {error: string; source: string}}>({});
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Add state for Bitcoin-to-fiat prices
  const [bitcoinPrices, setBitcoinPrices] = useState<Record<string, number>>({});
  
  const [goldSilverPrices, setGoldSilverPrices] = useState<{gold: number | null; silver: number | null}>({
    gold: null,
    silver: null
  });
  
  // Add state for tracking if we're using cached data
  const [usingCachedCoinGeckoData, setUsingCachedCoinGeckoData] = useState(false);
  
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
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        setApiErrors({});
        
        // --- BITCOIN DATA ---
        let bitcoin;
        let bitcoinToFiatPrices: Record<string, number> = {}; // No fallbacks
        
        try {
          // Fetch Bitcoin data from our CoinGecko API route
          debugLog("Fetching Bitcoin data from CoinGecko API route...");
          
          const coinGeckoResponse = await fetch('/api/coingecko', { cache: 'no-store' });
          
          if (!coinGeckoResponse.ok) {
            const errorText = await coinGeckoResponse.text();
            debugLog('Error fetching CoinGecko data:', coinGeckoResponse.status, errorText);
            throw new Error(`Failed to fetch CoinGecko data: ${coinGeckoResponse.status} - ${errorText}`);
          }
          
          const coinGeckoResponseData = await coinGeckoResponse.json();
          debugLog('CoinGecko data response:', coinGeckoResponseData);
          
          // Check if we're using cached data
          if (coinGeckoResponseData.source === 'cache') {
            debugLog('⚠️ Using CACHED CoinGecko data from:', new Date(coinGeckoResponseData.timestamp).toLocaleString());
            setUsingCachedCoinGeckoData(true);
            setApiErrors(prev => ({
              ...prev, 
              bitcoin: {
                error: 'Could not fetch fresh data from CoinGecko API',
                source: 'Using cached Bitcoin prices from ' + new Date(coinGeckoResponseData.timestamp).toLocaleString()
              }
            }));
          } else {
            debugLog('✅ Using REAL-TIME CoinGecko data');
            setUsingCachedCoinGeckoData(false);
          }
          
          const btcData = coinGeckoResponseData.data;
          
          // Process the Bitcoin data
          if (btcData && btcData.bitcoin) {
            // Extract Bitcoin price in USD for market cap calculation
            const btcUsdPrice = btcData.bitcoin.usd;
            
            if (!btcUsdPrice) {
              throw new Error("Bitcoin price in USD not found in CoinGecko data");
            }
            
            // With simplified API response, we need to estimate market cap
            // Market cap = Price * Circulating Supply (approx. 19.5M BTC)
            const estimatedCirculatingSupply = 19500000;
            const btcUsdMarketCap = btcUsdPrice * estimatedCirculatingSupply;
            
            // Create Bitcoin object for consistency with rest of code
            bitcoin = {
              id: "bitcoin",
              name: "Bitcoin",
              current_price: btcUsdPrice,
              market_cap: btcUsdMarketCap,
            };
            
            // Extract all Bitcoin prices in different currencies
            // The response now only contains direct price values
            Object.keys(btcData.bitcoin).forEach(key => {
              bitcoinToFiatPrices[key] = btcData.bitcoin[key];
            });
            
            // Save Bitcoin prices to state
            debugLog(`Setting Bitcoin prices in state: ${JSON.stringify(bitcoinToFiatPrices, null, 2)}`);
            setBitcoinPrices(bitcoinToFiatPrices);
            
            // Log a sample of the Bitcoin prices for debugging
            const sampleCurrencies = ['usd', 'eur', 'jpy', 'gbp', 'cny'];
            debugLog("Sample Bitcoin prices:");
            sampleCurrencies.forEach(code => {
              if (bitcoinToFiatPrices[code]) {
                debugLog(`  ${code.toUpperCase()}: ${bitcoinToFiatPrices[code]} (1 SATS = ${bitcoinToFiatPrices[code] / 100000000} ${code.toUpperCase()}, ${100000000 / bitcoinToFiatPrices[code]} SATS per ${code.toUpperCase()})`);
              } else {
                debugLog(`  ${code.toUpperCase()}: Not available`);
              }
            });
            
            debugLog("Processed Bitcoin prices for", Object.keys(bitcoinToFiatPrices).length, "currencies");
          } else {
            throw new Error("Invalid Bitcoin data format from CoinGecko API");
          }
        } catch (error) {
          clientError("Error fetching Bitcoin data:", error);
          
          // Set error in API errors state
          setApiErrors(prev => ({
            ...prev, 
            bitcoin: {
              error: error instanceof Error ? error.message : String(error),
              source: 'Error fetching from CoinGecko API'
            }
          }));
          
          // Set main error state to show error message to user
          setError(`Failed to load Bitcoin price data: ${error instanceof Error ? error.message : String(error)}. Please try again later.`);
          setLoading(false);
          return; // Exit the fetchData function early
        }
        
        // --- CALCULATE GOLD & SILVER PRICES FROM BITCOIN PRICES ---
        // Hardcoded assumptions for gold and silver supply
        const GOLD_SUPPLY_METRIC_TONS = 215000; // 215,000 metric tons of surface gold
        const SILVER_SUPPLY_METRIC_TONS = 1800000; // 1,800,000 metric tons of surface silver

        // Conversion factors
        const METRIC_TON_TO_TROY_OUNCES = 32150.746; // 1 metric ton = 32,150.746 troy ounces

        // Get gold and silver prices from Bitcoin prices
        let goldPrice: number | null = null;
        let silverPrice: number | null = null;
        
        // If we have Bitcoin prices for XAU (gold) and XAG (silver), use them to calculate USD prices
        if (bitcoinToFiatPrices['xau'] && bitcoinToFiatPrices['usd']) {
          // Bitcoin price in USD / Bitcoin price in XAU = USD price per troy ounce of gold
          goldPrice = bitcoinToFiatPrices['usd'] / (bitcoinToFiatPrices['xau'] / 1);
          debugLog("Calculated Gold price from Bitcoin prices:", goldPrice, "USD per troy ounce");
        } else {
          debugLog("⚠️ Cannot calculate Gold price: missing Bitcoin price in XAU or USD");
          setApiErrors(prev => ({
            ...prev, 
            gold: {
              error: 'Missing Bitcoin price in XAU or USD',
              source: 'Cannot calculate Gold price from CoinGecko data'
            }
          }));
        }
        
        if (bitcoinToFiatPrices['xag'] && bitcoinToFiatPrices['usd']) {
          // Bitcoin price in USD / Bitcoin price in XAG = USD price per troy ounce of silver
          silverPrice = bitcoinToFiatPrices['usd'] / (bitcoinToFiatPrices['xag'] / 1);
          debugLog("Calculated Silver price from Bitcoin prices:", silverPrice, "USD per troy ounce");
        } else {
          debugLog("⚠️ Cannot calculate Silver price: missing Bitcoin price in XAG or USD");
          setApiErrors(prev => ({
            ...prev, 
            silver: {
              error: 'Missing Bitcoin price in XAG or USD',
              source: 'Cannot calculate Silver price from CoinGecko data'
            }
          }));
        }
        
        // Set gold and silver prices in state
        setGoldSilverPrices({
          gold: goldPrice,
          silver: silverPrice
        });
        
        // Calculate market caps based on supply and current prices
        const goldMarketCap = goldPrice !== null ? GOLD_SUPPLY_METRIC_TONS * METRIC_TON_TO_TROY_OUNCES * goldPrice : null;
        const silverMarketCap = silverPrice !== null ? SILVER_SUPPLY_METRIC_TONS * METRIC_TON_TO_TROY_OUNCES * silverPrice : null;

        if (goldPrice !== null) {
          debugLog("Gold price (USD per troy ounce):", goldPrice);
          debugLog("Gold market cap (USD):", goldMarketCap);
        }
        
        if (silverPrice !== null) {
          debugLog("Silver price (USD per troy ounce):", silverPrice);
          debugLog("Silver market cap (USD):", silverMarketCap);
        }
        
        // --- GDP DATA ---
        debugLog("Fetching GDP data via proxy...");
        let gdpData: Record<string, number> = {};
        let eurozoneGdpData: Record<string, number> = {};
        let totalEurozoneGdp = 0;
        
        try {
          const gdpResponse = await fetch('/api/imf');
          
          if (!gdpResponse.ok) {
            const errorText = await gdpResponse.text();
            debugLog('Error fetching GDP data:', gdpResponse.status, errorText);
            throw new Error(`Failed to fetch GDP data: ${gdpResponse.status} - ${errorText}`);
          }
          
          const imfResponse = await gdpResponse.json();
          debugLog('IMF data response:', imfResponse);
          
          // Check if we're using cached data
          if (imfResponse.source === 'cache') {
            debugLog('✅ Using CACHED IMF GDP data from year:', imfResponse.year);
          } else {
            debugLog('✅ Using REAL IMF GDP data from year:', imfResponse.year);
          }
          
          // Process the GDP data
          if (imfResponse.data) {
            debugLog("Processing GDP data");
            
            // Track Eurozone countries and their GDP
            let eurozoneCountriesFound = 0;
            
            // Loop through each country in the data object
            for (const [countryCode, countryData] of Object.entries(imfResponse.data)) {
              // Check if this is a Eurozone country
              if (isEurozoneCountry(countryCode) && typeof (countryData as any).gdp === 'number') {
                const gdpValue = (countryData as any).gdp * 1000000000; // Convert from billions to absolute values
                eurozoneGdpData[countryCode] = gdpValue;
                totalEurozoneGdp += gdpValue;
                eurozoneCountriesFound++;
                
                // Log Eurozone country GDP for debugging
                debugLog(`Eurozone country: ${countryCode} (${(countryData as any).label}) GDP: $${formatNumber(gdpValue)}`);
              }
              
              const currencyCode = mapCountryCodeToCurrency(countryCode);
              if (currencyCode && typeof (countryData as any).gdp === 'number') {
                // Convert from billions to absolute values (IMF data is in billions)
                gdpData[currencyCode] = (countryData as any).gdp * 1000000000;
                
                // Log country name for debugging
                debugLog(`Mapped ${countryCode} (${(countryData as any).label}) to currency ${currencyCode}`);
              }
            }
            
            debugLog(`Processed ${Object.keys(gdpData).length} GDP values from IMF API`);
            debugLog(`Found ${eurozoneCountriesFound} Eurozone countries with a total GDP of $${formatNumber(totalEurozoneGdp)}`);
            
            // Add the combined Eurozone GDP to the gdpData object
            gdpData["EUR"] = totalEurozoneGdp;
          } else {
            throw new Error('IMF API response does not contain data');
          }
        } catch (error) {
          clientError("Error fetching GDP data:", error);
          const errorText = error instanceof Error ? error.message : String(error);
          setApiErrors(prev => {
            return {
              ...prev, 
              gdp: {
                error: errorText, 
                source: 'Error fetching from IMF API'
              }
            };
          });
          
          // Set error state to show error message to user
          setError(`Failed to load GDP data: ${errorText}. Please try again later.`);
          setLoading(false);
          return; // Exit the fetchData function early
        }
        
        // Show the data we're using
        debugLog("Final GDP data used:", gdpData);
        debugLog("Eurozone GDP breakdown:", eurozoneGdpData);
        debugLog("Total Eurozone GDP:", totalEurozoneGdp);
        
        // Create helper functions that use bitcoinToFiatPrices directly
        const getBitcoinPriceDirectly = (code: string): number | null => {
          const lowerCode = code.toLowerCase();
          if (bitcoinToFiatPrices[lowerCode] !== undefined) {
            debugLog(`Direct BTC price for ${code}: ${bitcoinToFiatPrices[lowerCode]}`);
            return bitcoinToFiatPrices[lowerCode];
          }
          debugLog(`No direct BTC price for ${code}, returning null`);
          return null;
        };
        
        const calculateSatoshiValueDirectly = (currencyCode: string): number | null => {
          const btcPrice = getBitcoinPriceDirectly(currencyCode);
          if (btcPrice === null) return null;
          
          const result = btcPrice / 100000000;
          debugLog(`Direct SATS value for ${currencyCode}: ${result}`);
          return result;
        };
        
        const calculateSatsPerUnitDirectly = (currencyCode: string): number | null => {
          const btcPrice = getBitcoinPriceDirectly(currencyCode);
          if (btcPrice === null) return null;
          
          const result = 100000000 / btcPrice;
          debugLog(`Direct SATS per unit for ${currencyCode}: ${result}`);
          return result;
        };
        
        // Prepare the data
        const allCurrencies: Currency[] = [];
        const fiatCurrencies: Currency[] = [];
        
        // Add Bitcoin
        if (bitcoin) {
          allCurrencies.push({
            rank: 0, // Will be set after sorting
            code: "BTC",
            name: "Bitcoin",
            economicSize: bitcoin.market_cap,
            satsPerUnit: 100000000, // 1 BTC = 100,000,000 SATS
            valueOfOneSat: calculateSatoshiValueDirectly("usd") || 0, // Value of 1 sat in USD
            type: 'crypto'
          });
        }
        
        // Add Gold with real-time price
        if (goldMarketCap !== null && goldPrice !== null) {
          const goldSatsPerUnit = calculateSatsPerUnitDirectly("xau");
          const goldSatValue = calculateSatoshiValueDirectly("xau");
          
          if (goldSatsPerUnit !== null && goldSatValue !== null) {
            allCurrencies.push({
              rank: 0,
              code: "XAU",
              name: "Gold",
              economicSize: goldMarketCap,
              satsPerUnit: goldSatsPerUnit, // Sats per troy ounce of gold
              valueOfOneSat: goldSatValue, // Value of 1 sat in gold
              type: 'metal'
            });
          }
        }
        
        // Add Silver with real-time price
        if (silverMarketCap !== null && silverPrice !== null) {
          const silverSatsPerUnit = calculateSatsPerUnitDirectly("xag");
          const silverSatValue = calculateSatoshiValueDirectly("xag");
          
          if (silverSatsPerUnit !== null && silverSatValue !== null) {
            allCurrencies.push({
              rank: 0,
              code: "XAG",
              name: "Silver",
              economicSize: silverMarketCap,
              satsPerUnit: silverSatsPerUnit, // Sats per troy ounce of silver
              valueOfOneSat: silverSatValue, // Value of 1 sat in silver
              type: 'metal'
            });
          }
        }
        
        // Now add all the fiat currencies
        Object.keys(gdpData).forEach((currencyCode) => {
          if (currencyCode === "BTC" || currencyCode === "XAU" || currencyCode === "XAG") {
            return; // Skip non-fiat currencies
          }
          
          // Use GDP data directly - IMF data is already in USD
          const gdpInUSD = gdpData[currencyCode] || 0;
          
          // For Bitcoin calculations, try to use direct Bitcoin prices from CoinGecko
          // These don't require exchange rates and are more accurate
          const satsPerUnit = calculateSatsPerUnitDirectly(currencyCode);
          const satoshiValue = calculateSatoshiValueDirectly(currencyCode);
          
          // Skip currencies without Bitcoin prices
          if (satsPerUnit === null || satoshiValue === null) {
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
          
          debugLog(`Currency ${currencyCode}: GDP = ${gdpInUSD}, BTC price = ${getBitcoinPriceDirectly(currencyCode)}, satsPerUnit = ${satsPerUnit}, satoshiValue = ${satoshiValue}`);
          
          fiatCurrencies.push({
            rank: 0, // Will be set after sorting
            code: currencyCode,
            name: getCurrencyName(currencyCode) || currencyCode,
            economicSize: gdpInUSD,
            satsPerUnit: satsPerUnit,
            valueOfOneSat: satoshiValue,
            type: 'fiat'
          });
        });
        
        // Debug logging for currency counts
        debugLog("Total fiat currencies before filtering:", fiatCurrencies.length);
        
        // Sort fiat currencies by economic size and take only the top ones
        const topFiatCurrencies = fiatCurrencies
          .sort((a, b) => b.economicSize - a.economicSize)
          .slice(0, TOP_CURRENCIES_LIMIT);
        
        // More debug logging
        debugLog("Top fiat currencies after filtering:", topFiatCurrencies.length);
        debugLog("TOP_CURRENCIES_LIMIT value:", TOP_CURRENCIES_LIMIT);
        
        // Add the top fiat currencies to the main array
        allCurrencies.push(...topFiatCurrencies);
        
        // Final debug logging
        debugLog("Total currencies after adding top fiat currencies:", allCurrencies.length);
        
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
        
        debugLog("Final sorted currencies count:", sortedCurrencies.length);
        
        // Log the currency values for debugging
        console.log("CURRENCIES:", sortedCurrencies);
        
        setCurrencies(sortedCurrencies);
        setLoading(false);
      } catch (error) {
        clientError("Error in main fetchData function:", error);
        setError("Failed to load data. Please try again later.");
        setLoading(false);
      }
    }
    
    fetchData();
    
    // In a production environment, you'd set up a refresh interval
    // const interval = setInterval(fetchData, 3600000); // Refresh every hour
    // return () => clearInterval(interval);
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
        <span className="font-mono font-bold">{currency.code}</span>
        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
          {currency.type.toUpperCase()}
        </span>
      </div>
    );
  }
  
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
        
        {/* Loading, Error States */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading latest data...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8 text-red-500">
            <p className="text-lg font-semibold">Error</p>
            <p className="mt-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Ranking Table */}
        {!loading && !error && (
          <>
            {/* API Errors Notification */}
            {Object.keys(apiErrors).length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                <p className="font-medium">Some data sources are unavailable</p>
                <p className="text-sm">
                  There were issues connecting to some of our data sources. We&apos;re showing the data we could retrieve.
                </p>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer font-medium">View data source details</summary>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    {Object.entries(apiErrors).map(([key, info]) => (
                      <li key={key}>
                        <strong>{key.toUpperCase()}:</strong> {info.source}
                        {info.error && <span className="block ml-4 text-yellow-600">{info.error}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
            
            {/* Cached CoinGecko Data Notification */}
            {usingCachedCoinGeckoData && (
              <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700">
                <p className="font-medium">Using cached Bitcoin price data</p>
                <p className="text-sm">
                  We couldn&apos;t fetch the latest Bitcoin prices from our data provider. The prices shown may not reflect current market conditions.
                </p>
              </div>
            )}
            
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GDP/Market Cap (USD)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value of 1 SATS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SATS per Unit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currencies.map((currency) => (
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
                          ? `${formatSatValue(currency.valueOfOneSat)} oz`
                          : (currency.type === 'fiat' 
                            ? `${formatSatValue(currency.valueOfOneSat)} ${currency.code}`
                            : `1 SATS`)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {formatSatsPerUnit(currency.satsPerUnit)}
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
            The table shows Bitcoin, Gold, Silver, and the top {TOP_CURRENCIES_LIMIT} currencies by GDP.
            GDP data is sourced from the IMF&apos;s World Economic Outlook database.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Data Sources</h3>
            <ul className="text-sm text-blue-800 list-disc pl-5 space-y-1">
              <li><strong>Bitcoin:</strong> Real-time price and market cap from CoinGecko API</li>
              <li>
                <strong>Gold & Silver:</strong> Prices derived from Bitcoin-to-Gold and Bitcoin-to-Silver ratios via CoinGecko API, with market caps calculated using:
                <ul className="list-circle pl-5 mt-1 space-y-1">
                  <li>Gold: 215,000 metric tons of estimated above-ground supply</li>
                  <li>Silver: 1,800,000 metric tons of estimated above-ground supply</li>
                </ul>
              </li>
              <li><strong>GDP Data:</strong> IMF World Economic Outlook database (via proxy API)</li>
              <li>
                <strong>Eurozone:</strong> Combined GDP of all 20 Euro-using countries:
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-1 text-xs">
                  {EUROZONE_COUNTRIES.map(country => (
                    <div key={country.isoCode} className="px-1">
                      {country.name} ({country.isoCode})
                    </div>
                  ))}
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>Data sources: CoinGecko API for Bitcoin and metals pricing, IMF API for GDP data.</p>
          <p className="mt-1">© {new Date().getFullYear()} Satoshi Forex. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
