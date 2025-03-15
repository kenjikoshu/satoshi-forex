import { NextResponse } from 'next/server';

// Set the runtime to Node.js for file system access
export const runtime = 'nodejs';
export const maxDuration = 60;

// Helper functions for consistent server-side logging
function serverLog(...args: any[]) {
  console.log('[SERVER]', ...args);
}

function serverError(...args: any[]) {
  console.error('[SERVER]', ...args);
}

function serverWarn(...args: any[]) {
  console.warn('[SERVER]', ...args);
}

interface GDPCacheData {
  year: number;
  timestamp: number;
  data: Record<string, number>;
}

// No more file-based caching
export async function GET(request: Request) {
  try {
    serverLog('IMF API Request URL:', request.url);
    
    // We need to fetch fresh data every time in edge runtime
    // Use the current year for the IMF data
    const currentYear = new Date().getFullYear();
    try {
      const gdpData = await fetchGDPData(currentYear);
      
      serverLog('Returning', Object.keys(gdpData).length, 'countries with real GDP data for year', currentYear);
      
      return NextResponse.json({
        year: currentYear,
        timestamp: Date.now(),
        source: 'imf',
        data: gdpData
      });
    } catch (error) {
      serverError('Error fetching fresh GDP data:', error);
      
      // No cached data available, return error
      serverError('Failed to fetch from IMF API');
      return NextResponse.json({ error: 'Failed to fetch from IMF API and no cache available' }, { status: 500 });
    }
  } catch (error) {
    serverError('Unexpected error in IMF API route:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// Function to fetch GDP data from the IMF API for a specific year
async function fetchGDPData(year: number): Promise<Record<string, number>> {
  serverLog('Fetching GDP data from IMF API for year', year);
  
  // Try multiple proxy approaches to get around Cloudflare restrictions
  const proxyApproaches = [
    async () => {
      // Approach 1: Direct IMF API with custom headers
      const imfUrl = `https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=${year}`;
      serverLog('GDP API URL:', imfUrl);
      
      const response = await fetch(imfUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`IMF API responded with status: ${response.status}`);
      }
      
      return response.json();
    },
    async () => {
      // Approach 2: Use a service like AllOrigins as a proxy
      const imfUrl = `https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=${year}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imfUrl)}`;
      serverLog('Trying proxy URL:', proxyUrl);
      
      const response = await fetch(proxyUrl, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`Proxy API responded with status: ${response.status}`);
      }
      
      return response.json();
    },
    async () => {
      // Approach 3: Try a different proxy service
      const imfUrl = `https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=${year}`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imfUrl)}`;
      serverLog('Trying alternative proxy URL:', proxyUrl);
      
      const response = await fetch(proxyUrl, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`Alternative proxy API responded with status: ${response.status}`);
      }
      
      return response.json();
    }
  ];
  
  let lastError;
  
  // Try each approach in sequence until one works
  for (const approach of proxyApproaches) {
    try {
      const responseData = await approach();
      
      // Parse response and extract the dataset
      let gdpData: Record<string, number> = {};
      
      // Check if we have the expected data structure for datasets format
      if (responseData?.datasets?.NGDPD) {
        serverLog('Found NGDPD dataset in datasets format');
        
        // Process the GDP data from datasets format
        const ngdpdData = responseData.datasets.NGDPD;
        
        // Loop through all countries in the dataset
        for (const [countryCode, countryData] of Object.entries(ngdpdData)) {
          if (countryData && typeof countryData === 'object') {
            // Access year data with a type safe approach
            const countryYearData = countryData as Record<string, unknown>;
            if (typeof countryYearData[year] === 'number') {
              // Store the GDP value for this country (in billions of USD)
              gdpData[countryCode] = countryYearData[year] as number;
            }
          }
        }
      } 
      // Check alternative structure with values (IMF API sometimes returns different formats)
      else if (responseData?.values?.NGDPD) {
        serverLog('Found NGDPD dataset in values format');
        
        // Process the GDP data from values format
        const ngdpdData = responseData.values.NGDPD;
        
        // Loop through all countries in the dataset
        for (const [countryCode, countryData] of Object.entries(ngdpdData)) {
          if (countryData && typeof countryData === 'object') {
            // Access year data with a type safe approach
            const countryYearData = countryData as Record<string, unknown>;
            if (typeof countryYearData[year] === 'number') {
              // Store the GDP value for this country (in billions of USD)
              gdpData[countryCode] = countryYearData[year] as number;
            }
          }
        }
      } else {
        serverError('Unexpected response structure from IMF API');
        throw new Error('Unexpected response structure from IMF API');
      }
      
      // Check if we got enough data
      if (Object.keys(gdpData).length < 20) {
        serverWarn(`Found only ${Object.keys(gdpData).length} countries, which is fewer than expected`);
        throw new Error('Insufficient data returned from IMF API');
      }
      
      serverLog('Fetched GDP data for', Object.keys(gdpData).length, 'countries for year', year);
      return gdpData;
    } catch (error) {
      serverError(`Approach failed:`, error);
      lastError = error;
    }
  }
  
  // If we get here, all approaches failed
  throw lastError || new Error('All approaches to fetch IMF data failed');
} 