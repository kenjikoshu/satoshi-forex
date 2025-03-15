import { NextResponse } from 'next/server';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Set the runtime to the Edge runtime for better performance
export const runtime = 'edge';
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

// Cache file paths
const CACHE_DIR = 'cache';
const CACHE_FILE = `${CACHE_DIR}/imf_gdp_cache.json`;

// Cache expiry time (24 hours in milliseconds)
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    console.log('[SERVER] IMF API Request URL:', new URL(Request.prototype.url).toString());
    
    // Check if cached data exists and is still valid
    const cachedData = getCachedData();
    
    if (cachedData) {
      console.log('[SERVER] Read data from cache, timestamp:', new Date(cachedData.timestamp).toLocaleString());
      
      // Cached data is still valid, return it
      console.log('[SERVER] Using cached data from', new Date(cachedData.timestamp).toLocaleString());
      console.log('[SERVER] Returning', Object.keys(cachedData.data).length, 'countries from cache for year', cachedData.year);
      
      return NextResponse.json({
        year: cachedData.year,
        timestamp: cachedData.timestamp,
        source: 'cache',
        data: cachedData.data
      });
    }
    
    console.log('[SERVER] Cache invalid or not found, fetching fresh data');
    
    // We need to fetch fresh data
    // Use the current year for the IMF data
    const currentYear = new Date().getFullYear();
    try {
      const gdpData = await fetchGDPData(currentYear);
      
      // Cache the fetched data
      cacheData({
        year: currentYear,
        timestamp: Date.now(),
        data: gdpData
      });
      
      console.log('[SERVER] Returning', Object.keys(gdpData).length, 'countries with real GDP data for year', currentYear);
      
      return NextResponse.json({
        year: currentYear,
        timestamp: Date.now(),
        source: 'imf',
        data: gdpData
      });
    } catch (error) {
      console.error('[SERVER] Error fetching fresh GDP data:', error);
      
      // If we have cached data but it's expired, still return it but mark it as stale
      if (cachedData) {
        console.log('[SERVER] Returning stale cached data due to fetch error');
        return NextResponse.json({
          year: cachedData.year,
          timestamp: cachedData.timestamp,
          source: 'cache (error)',
          data: cachedData.data
        });
      }
      
      // No cached data and couldn't fetch fresh data, return error
      console.error('[SERVER] No cached data available and failed to fetch from IMF API');
      return NextResponse.json({ error: 'Failed to fetch from IMF API and no cache available' }, { status: 500 });
    }
  } catch (error) {
    console.error('[SERVER] Unexpected error in IMF API route:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// Function to fetch GDP data from the IMF API for a specific year
async function fetchGDPData(year: number): Promise<Record<string, number>> {
  console.log('[SERVER] Fetching GDP data from IMF API for year', year);
  
  // Try multiple proxy approaches to get around Cloudflare restrictions
  const proxyApproaches = [
    async () => {
      // Approach 1: Direct IMF API with custom headers
      const imfUrl = `https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=${year}`;
      console.log('[SERVER] GDP API URL:', imfUrl);
      
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
      console.log('[SERVER] Trying proxy URL:', proxyUrl);
      
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
      console.log('[SERVER] Trying alternative proxy URL:', proxyUrl);
      
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
      
      // Check if we have the expected data structure
      if (responseData?.datasets?.NGDPD) {
        console.log('[SERVER] Found NGDPD dataset in response');
        
        // Process the GDP data
        const gdpData: Record<string, number> = {};
        const ngdpdData = responseData.datasets.NGDPD;
        
        // Loop through all countries in the dataset
        for (const [countryCode, countryData] of Object.entries(ngdpdData)) {
          if (countryData && typeof countryData === 'object' && countryData[year] !== undefined) {
            // Store the GDP value for this country (in billions of USD)
            gdpData[countryCode] = countryData[year];
          }
        }
        
        console.log('[SERVER] Fetched GDP data for', Object.keys(gdpData).length, 'countries for year', year);
        return gdpData;
      } else {
        console.error('[SERVER] Unexpected response structure from IMF API');
        throw new Error('Unexpected response structure from IMF API');
      }
    } catch (error) {
      console.error(`[SERVER] Approach failed:`, error);
      lastError = error;
    }
  }
  
  // If we get here, all approaches failed
  throw lastError || new Error('All approaches to fetch IMF data failed');
}

// Function to get cached data if it exists and is still valid
function getCachedData(): GDPCacheData | null {
  try {
    // Check if the cache file exists
    if (!existsSync(CACHE_FILE)) {
      return null;
    }
    
    // Read the cache file
    const cacheContents = readFileSync(CACHE_FILE, 'utf8');
    const cachedData: GDPCacheData = JSON.parse(cacheContents);
    
    // Check if the cache is still valid (not expired)
    const now = Date.now();
    if (now - cachedData.timestamp <= CACHE_EXPIRY_MS) {
      return cachedData;
    }
    
    // Cache is expired
    return cachedData; // Still return it, but we'll note it's stale when used
  } catch (error) {
    console.error('[SERVER] Error reading cache:', error);
    return null;
  }
}

// Function to cache data
function cacheData(data: GDPCacheData): void {
  try {
    // Ensure the cache directory exists
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    
    // Write the data to the cache file
    writeFileSync(CACHE_FILE, JSON.stringify(data));
    console.log('[SERVER] Wrote data to cache, timestamp:', new Date(data.timestamp).toLocaleString());
    console.log('[SERVER] Cached', Object.keys(data.data).length, 'countries with GDP data for year', data.year);
  } catch (error) {
    console.error('[SERVER] Error writing to cache:', error);
  }
} 