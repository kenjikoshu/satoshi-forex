import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

// Define fonts - using Montserrat for the title
export const runtime = 'edge';

// Route segment config
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Helper function to retry API calls with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add a timeout using AbortController to prevent long-running requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          ...options.headers,
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      // If response is not ok but we got a response, throw with status code
      throw new Error(`API returned status ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      
      // If we've used all retries, throw the error
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt), 3000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // This should never happen due to the throw in the loop,
  // but TypeScript needs a return value
  throw lastError;
}

// Simple in-memory cache for the OG API
interface CacheData {
  satsPerUSD: number;
  satsPerCNY: number;
  satsPerEUR: number;
  satsPerJPY: number;
  timestamp: number;
}

let dataCache: CacheData | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute cache time

// Validate the data to ensure it's reasonable
function isValidForexData(satsPerUSD: number, satsPerCNY: number, satsPerEUR: number, satsPerJPY: number): boolean {
  // Ensure values are positive and within reasonable range
  // Typical ranges for satoshis per unit (as of 2023):
  // USD: ~1000-3000 sats per USD
  // CNY: ~150-450 sats per CNY
  // EUR: ~1200-3500 sats per EUR
  // JPY: ~7-25 sats per JPY
  return (
    satsPerUSD > 500 && satsPerUSD < 5000 &&
    satsPerCNY > 50 && satsPerCNY < 1000 &&
    satsPerEUR > 600 && satsPerEUR < 6000 &&
    satsPerJPY > 3 && satsPerJPY < 50
  );
}

// Image generation function
export async function GET(req: NextRequest) {
  try {
    // Define fallback values
    const fallbackValues = {
      USD: 1209,
      CNY: 167.3,
      EUR: 1320,
      JPY: 8.075
    };
    
    // Initialize with fallback values
    let satsPerUSD = fallbackValues.USD;
    let satsPerCNY = fallbackValues.CNY;
    let satsPerEUR = fallbackValues.EUR;
    let satsPerJPY = fallbackValues.JPY;

    // Check if we have valid cached data
    const now = Date.now();
    if (dataCache && (now - dataCache.timestamp < CACHE_TTL)) {
      console.log("Using cached forex data for OG image");
      satsPerUSD = dataCache.satsPerUSD;
      satsPerCNY = dataCache.satsPerCNY;
      satsPerEUR = dataCache.satsPerEUR;
      satsPerJPY = dataCache.satsPerJPY;
    } else {
      console.log("Fetching fresh forex data for OG image");
      try {
        // Try with retry mechanism
        const response = await fetchWithRetry(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,cny,eur,jpy',
          { next: { revalidate: 0 } }
        );
        
        const data = await response.json();
        
        // Calculate SATS per unit (100,000,000 / BTC price in currency)
        if (data.bitcoin && data.bitcoin.usd) {
          const calculatedSatsPerUSD = 100000000 / data.bitcoin.usd;
          const calculatedSatsPerCNY = 100000000 / data.bitcoin.cny;
          const calculatedSatsPerEUR = 100000000 / data.bitcoin.eur;
          const calculatedSatsPerJPY = 100000000 / data.bitcoin.jpy;
          
          // Verify data validity before using it
          if (isValidForexData(
            calculatedSatsPerUSD, 
            calculatedSatsPerCNY, 
            calculatedSatsPerEUR, 
            calculatedSatsPerJPY
          )) {
            // Use the calculated values
            satsPerUSD = calculatedSatsPerUSD;
            satsPerCNY = calculatedSatsPerCNY;
            satsPerEUR = calculatedSatsPerEUR;
            satsPerJPY = calculatedSatsPerJPY;
            
            // Cache the data
            dataCache = {
              satsPerUSD,
              satsPerCNY,
              satsPerEUR,
              satsPerJPY,
              timestamp: now
            };
            console.log("Cached new forex data for OG image");
          } else {
            console.error("Received invalid forex data, using fallback values");
          }
        }
      } catch (error) {
        console.error("Error fetching data, using fallback values:", error);
        // Continue with fallback values
      }
    }

    // Format values with appropriate precision
    const formatSatsPerUnit = (value: number): string => {
      if (value >= 10000) {
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
      } else if (value >= 1000) {
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
      } else if (value >= 100) {
        return value.toFixed(1);
      } else if (value >= 10) {
        return value.toFixed(2);
      } else if (value >= 1) {
        return value.toFixed(3);
      } else {
        let decimalPlaces = 4;
        let tempNum = value;
        while (tempNum < 0.1 && decimalPlaces < 10) {
          tempNum *= 10;
          decimalPlaces += 1;
        }
        return value.toFixed(decimalPlaces);
      }
    };

    // Load the subsetted Montserrat fonts (for title)
    const montserratMedium = await fetch(
      new URL('../../../../public/fonts/subset/Montserrat-Medium.subset.ttf', import.meta.url)
    ).then((res) => res.arrayBuffer());
    
    const montserratLight = await fetch(
      new URL('../../../../public/fonts/subset/Montserrat-Light.subset.ttf', import.meta.url)
    ).then((res) => res.arrayBuffer());

    // Load the subsetted Open Sans fonts (for everything else)
    const openSansRegular = await fetch(
      new URL('../../../../public/fonts/subset/OpenSans-Regular.subset.ttf', import.meta.url)
    ).then((res) => res.arrayBuffer());
    
    const openSansSemiBold = await fetch(
      new URL('../../../../public/fonts/subset/OpenSans-SemiBold.subset.ttf', import.meta.url)
    ).then((res) => res.arrayBuffer());

    // The currencies to display with their full names
    const currencies = [
      { code: 'USD', name: 'US Dollar', satsPerUnit: satsPerUSD, oneUnitInDollars: 1 / satsPerUSD },
      { code: 'CNY', name: 'Chinese Yuan', satsPerUnit: satsPerCNY, oneUnitInDollars: 1 / satsPerCNY },
      { code: 'EUR', name: 'Euro', satsPerUnit: satsPerEUR, oneUnitInDollars: 1 / satsPerEUR },
      { code: 'JPY', name: 'Japanese Yen', satsPerUnit: satsPerJPY, oneUnitInDollars: 1 / satsPerJPY },
    ];

    // Function to format the "1 Sat =" value
    const formatOneSatValue = (value: number): string => {
      if (value < 0.001) {
        return value.toFixed(8);
      } else if (value < 0.01) {
        return value.toFixed(6);
      } else {
        return value.toFixed(4);
      }
    };

    // Generate the image response
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb', // light gray background
            padding: '20px', // Reduced padding to increase box size
            fontFamily: 'Open Sans',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              width: '95%', // Increased width to make box larger
              height: '95%', // Added height to make box larger
            }}
          >
            {/* Title - using Montserrat font */}
            <div 
              style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                fontFamily: 'Montserrat',
                lineHeight: 1.2,
                color: '#1f2937',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 500, fontSize: '50px', color: '#f97316' }}>satoshis</span>
                <span style={{ fontWeight: 300, fontSize: '50px', color: '#1f2937' }}>.forex</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 500, fontSize: '24px', color: '#4b5563' }}>Satoshis - Bitcoin&apos;s Native Currency Unit</span>
              </div>
            </div>

            {/* Table - using Open Sans font */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '850px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              {/* Table Header */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e5e7eb',
                  height: '45px',
                }}
              >
                {/* Currency header */}
                <div
                  style={{
                    flex: 1.8,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    borderRight: '1px solid #e5e7eb',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#64748b',
                  }}
                >
                  CURRENCY
                </div>

                {/* 1 Sat value header - swapped position */}
                <div
                  style={{
                    flex: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    borderRight: '1px solid #e5e7eb',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#64748b',
                  }}
                >
                  1 SAT VALUE
                </div>

                {/* Sats per unit header - swapped position */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#64748b',
                  }}
                >
                  SATS PER UNIT
                </div>
              </div>

              {/* Table Rows */}
              {currencies.map((currency, index) => (
                <div
                  key={currency.code}
                  style={{
                    display: 'flex',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f3f4f6',
                    borderBottom: index < currencies.length - 1 ? '1px solid #e5e7eb' : 'none',
                    height: '75px',
                  }}
                >
                  {/* Currency column */}
                  <div
                    style={{
                      flex: 1.8,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderRight: '1px solid #e5e7eb',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        marginRight: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={`https://satoshi-forex.vercel.app/icons/currencies/${currency.code}.svg`}
                        width={28}
                        height={28}
                        alt={currency.code}
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '24px', fontWeight: 500, color: '#1f2937' }}>
                        {currency.code}
                      </span>
                      <span style={{ fontSize: '18px', color: '#6b7280' }}>
                        {currency.name}
                      </span>
                    </div>
                  </div>

                  {/* 1 Sat value column - swapped position and made wider */}
                  <div
                    style={{
                      flex: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                      fontSize: '24px',
                      color: '#1f2937',
                      borderRight: '1px solid #e5e7eb',
                      fontFamily: 'Open Sans',
                    }}
                  >
                    {formatOneSatValue(currency.oneUnitInDollars)} {currency.code}
                  </div>

                  {/* Sats per unit column - swapped position */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                      fontSize: '24px',
                      color: '#1f2937',
                      fontFamily: 'Open Sans',
                    }}
                  >
                    {formatSatsPerUnit(currency.satsPerUnit)}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: '24px',
                fontSize: '16px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span>Data sourced from CoinGecko</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          // Montserrat fonts for the title
          {
            name: 'Montserrat',
            data: montserratMedium,
            weight: 500,
            style: 'normal',
          },
          {
            name: 'Montserrat',
            data: montserratLight,
            weight: 300,
            style: 'normal',
          },
          // Open Sans fonts for everything else
          {
            name: 'Open Sans',
            data: openSansRegular,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Open Sans',
            data: openSansSemiBold,
            weight: 600,
            style: 'normal',
          },
        ],
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    
    // Return a simple fallback image in case of error
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            fontFamily: 'sans-serif',
          }}
        >
          <p style={{ fontSize: '32px' }}>Satoshi - Bitcoin&apos;s Native Currency Unit</p>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
} 