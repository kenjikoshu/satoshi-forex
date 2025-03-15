import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

// Define the cache file path - use /tmp in production (Vercel serverless environment)
const CACHE_DIR = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'cache')
  : path.join(process.cwd(), 'cache');
const IMF_CACHE_FILE = path.join(CACHE_DIR, 'imf_gdp_cache.json');

// Define the cache interface
interface IMFCacheData {
  year: number;
  timestamp: number;
  data: Record<string, number>; // Country code to GDP value mapping
}

// Ensure cache directory exists
function ensureCacheDirectory() {
  if (!fs.existsSync(CACHE_DIR)) {
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      serverLog('Created cache directory:', CACHE_DIR);
    } catch (error) {
      serverError('Failed to create cache directory:', error);
    }
  }
}

// Read data from cache
function readFromCache(): IMFCacheData | null {
  try {
    if (fs.existsSync(IMF_CACHE_FILE)) {
      const cacheData = JSON.parse(fs.readFileSync(IMF_CACHE_FILE, 'utf-8'));
      serverLog('Read IMF data from cache, timestamp:', new Date(cacheData.timestamp).toLocaleString());
      return cacheData;
    }
  } catch (error) {
    serverError('Failed to read from IMF cache:', error);
  }
  return null;
}

// Write data to cache
function writeToCache(year: number, data: Record<string, number>) {
  try {
    ensureCacheDirectory();
    const cacheData: IMFCacheData = {
      year,
      timestamp: Date.now(),
      data
    };
    fs.writeFileSync(IMF_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    serverLog('Wrote IMF data to cache');
  } catch (error) {
    serverError('Failed to write to IMF cache:', error);
  }
}

// Get GDP data from IMF API
export async function GET(request: Request) {
  try {
    serverLog('IMF API Request URL:', request.url);
    
    // Current year for data fetching
    const currentYear = new Date().getFullYear();
    
    // Try to fetch fresh data from IMF API
    try {
      // Try multiple proxy approaches to get GDP data
      let gdpData = await fetchGDPWithProxies(currentYear);
      
      // Cache the successful response
      writeToCache(currentYear, gdpData);
      
      // Return the fresh data
      return NextResponse.json({
        source: 'imf',
        year: currentYear,
        timestamp: Date.now(),
        data: gdpData
      }, {
        headers: {
          // Strong cache for 1 day at the edge, with stale-while-revalidate for 30 days
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=2592000',
          // Allow public caching, important for Vercel's CDN
          'Surrogate-Control': 'public, max-age=86400, stale-while-revalidate=2592000',
          // Additional Vercel-specific caching directive
          'Vercel-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=2592000',
        }
      });
    } catch (error) {
      serverError('Failed to fetch from IMF API:', error);
      
      // Try to get data from cache
      const cachedData = readFromCache();
      
      if (cachedData) {
        serverLog('Using cached IMF data from:', new Date(cachedData.timestamp).toLocaleString());
        
        return NextResponse.json({
          source: 'cache',
          year: cachedData.year,
          timestamp: cachedData.timestamp,
          data: cachedData.data
        }, {
          headers: {
            // Strong cache for 1 day at the edge, with stale-while-revalidate for 30 days
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=2592000',
            // Allow public caching, important for Vercel's CDN
            'Surrogate-Control': 'public, max-age=86400, stale-while-revalidate=2592000',
            // Additional Vercel-specific caching directive
            'Vercel-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=2592000',
          }
        });
      } else {
        throw new Error('Failed to fetch from IMF API and no cache available');
      }
    }
  } catch (error) {
    serverError('Error in IMF API route:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Function to fetch GDP data using multiple proxy approaches
async function fetchGDPWithProxies(year: number): Promise<Record<string, number>> {
  // List of proxy approaches to try
  const approaches = [
    // Approach 1: Try direct IMF API with specific headers
    async () => {
      const url = `https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=${year}`;
      serverLog('Trying direct IMF API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`IMF API responded with status: ${response.status}`);
      }
      
      return response;
    },
    
    // Approach 2: Use AllOrigins as proxy
    async () => {
      const imfUrl = `https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=${year}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imfUrl)}`;
      serverLog('Trying AllOrigins proxy URL:', proxyUrl);
      
      const response = await fetch(proxyUrl, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`AllOrigins proxy responded with status: ${response.status}`);
      }
      
      return response;
    },
    
    // Approach 3: Use corsproxy.io
    async () => {
      const imfUrl = `https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=${year}`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imfUrl)}`;
      serverLog('Trying corsproxy.io URL:', proxyUrl);
      
      const response = await fetch(proxyUrl, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`corsproxy.io responded with status: ${response.status}`);
      }
      
      return response;
    }
  ];
  
  // Try each approach until one works
  let lastError;
  for (const approach of approaches) {
    try {
      // Get response from the current approach
      const response = await approach();
      const responseData = await response.json();
      
      // Process the response data
      return processIMFResponse(responseData, year);
    } catch (error) {
      serverError('Approach failed:', error);
      lastError = error;
    }
  }
  
  // If all approaches failed, throw the last error
  throw lastError || new Error('All approaches to fetch IMF data failed');
}

// Process the IMF API response to extract GDP data
function processIMFResponse(responseData: any, year: number): Record<string, number> {
  const gdpData: Record<string, number> = {};
  
  // Check for datasets format
  if (responseData?.datasets?.NGDPD) {
    serverLog('Found NGDPD in datasets format');
    
    const countriesData = responseData.datasets.NGDPD;
    for (const [countryCode, countryData] of Object.entries(countriesData)) {
      if (countryData && typeof countryData === 'object') {
        const data = countryData as Record<string, any>;
        if (data[year] !== undefined) {
          gdpData[countryCode] = Number(data[year]);
        }
      }
    }
  } 
  // Check for values format
  else if (responseData?.values?.NGDPD) {
    serverLog('Found NGDPD in values format');
    
    const countriesData = responseData.values.NGDPD;
    for (const [countryCode, countryData] of Object.entries(countriesData)) {
      if (countryData && typeof countryData === 'object') {
        const data = countryData as Record<string, any>;
        if (data[year] !== undefined) {
          gdpData[countryCode] = Number(data[year]);
        }
      }
    }
  } else {
    throw new Error('IMF API response does not contain expected data structure');
  }
  
  // Validate that we have enough data
  if (Object.keys(gdpData).length < 20) {
    serverWarn(`Retrieved only ${Object.keys(gdpData).length} countries, which is fewer than expected`);
    throw new Error('Insufficient data from IMF API');
  }
  
  serverLog(`Processed GDP data for ${Object.keys(gdpData).length} countries`);
  return gdpData;
} 