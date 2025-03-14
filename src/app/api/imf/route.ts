import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

// Define the cache file path
const CACHE_DIR = path.join(process.cwd(), 'cache');
const GDP_CACHE_FILE = path.join(CACHE_DIR, 'imf_gdp_cache.json');

// Define the cache interface
interface GDPCacheData {
  timestamp: number;
  data: {
    [countryCode: string]: {
      label: string;
      gdp: number;
    };
  };
  year: string;
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
function readFromCache(): GDPCacheData | null {
  try {
    if (fs.existsSync(GDP_CACHE_FILE)) {
      const cacheData = JSON.parse(fs.readFileSync(GDP_CACHE_FILE, 'utf-8'));
      serverLog('Read data from cache, timestamp:', new Date(cacheData.timestamp).toLocaleString());
      return cacheData;
    }
  } catch (error) {
    serverError('Error reading from cache:', error);
  }
  return null;
}

// Write data to cache
function writeToCache(data: GDPCacheData) {
  try {
    ensureCacheDirectory();
    fs.writeFileSync(GDP_CACHE_FILE, JSON.stringify(data, null, 2));
    serverLog('Wrote data to cache, timestamp:', new Date(data.timestamp).toLocaleString());
    serverLog(`Cached ${Object.keys(data.data).length} countries with GDP data for year ${data.year}`);
  } catch (error) {
    serverError('Error writing to cache:', error);
  }
}

// Check if cache is valid (less than 7 days old)
function isCacheValid(cacheData: GDPCacheData): boolean {
  const now = Date.now();
  const cacheAge = now - cacheData.timestamp;
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  return cacheAge < sevenDaysInMs;
}

// Fetch country data from IMF API
async function fetchCountryData(): Promise<Record<string, string> | null> {
  try {
    serverLog('Fetching country data from IMF API');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://www.imf.org/external/datamapper/api/v1/countries', {
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      serverError(`IMF API countries response not OK: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.countries) {
      serverError('IMF API countries response does not contain countries key');
      return null;
    }
    
    // Create a mapping of country codes to country names
    const countryMap: Record<string, string> = {};
    for (const [code, details] of Object.entries(data.countries)) {
      if (typeof details === 'object' && details !== null && 'label' in details) {
        countryMap[code] = (details as any).label;
      }
    }
    
    serverLog(`Fetched ${Object.keys(countryMap).length} countries from IMF API`);
    return countryMap;
  } catch (error) {
    serverError('Error fetching country data:', error);
    return null;
  }
}

// Fetch GDP data from IMF API
async function fetchGdpData(year: string): Promise<Record<string, number> | null> {
  try {
    serverLog(`Fetching GDP data from IMF API for year ${year}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const url = `https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=${year}`;
    serverLog('GDP API URL:', url);
    
    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      serverError(`IMF API GDP response not OK: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.values) {
      serverError('IMF API GDP response does not contain values key');
      return null;
    }
    
    // Extract GDP values for the specified year
    // The structure is: data.values.NGDPD[countryCode][year]
    const gdpValues: Record<string, number> = {};
    
    // Check if the NGDPD dataset exists in the values
    if (data.values.NGDPD) {
      serverLog('Found NGDPD dataset in response');
      
      // Loop through each country in the NGDPD dataset
      for (const [countryCode, yearData] of Object.entries(data.values.NGDPD)) {
        if (typeof yearData === 'object' && yearData !== null && year in yearData) {
          gdpValues[countryCode] = (yearData as any)[year];
        }
      }
    } else {
      // If NGDPD is not directly under values, try to find it elsewhere
      serverLog('NGDPD dataset not found directly under values, checking alternative structure');
      
      // Try the direct structure where country codes are directly under values
      for (const [countryCode, yearData] of Object.entries(data.values)) {
        if (typeof yearData === 'object' && yearData !== null && year in yearData) {
          gdpValues[countryCode] = (yearData as any)[year];
        }
      }
    }
    
    const countryCount = Object.keys(gdpValues).length;
    serverLog(`Fetched GDP data for ${countryCount} countries for year ${year}`);
    
    return gdpValues;
  } catch (error) {
    serverError('Error fetching GDP data:', error);
    return null;
  }
}

// Main API handler
export async function GET(request: Request) {
  try {
    serverLog('IMF API Request URL:', request.url);
    
    // Determine the current year and previous year
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const targetYear = previousYear.toString();
    
    // Check if we have valid cached data
    const cachedData = readFromCache();
    if (cachedData && isCacheValid(cachedData)) {
      serverLog('Using cached data from', new Date(cachedData.timestamp).toLocaleString());
      serverLog(`Returning ${Object.keys(cachedData.data).length} countries from cache for year ${cachedData.year}`);
      return NextResponse.json({
        data: cachedData.data,
        year: cachedData.year,
        timestamp: cachedData.timestamp,
        source: 'cache'
      });
    }
    
    // If cache is invalid or doesn't exist, fetch fresh data
    serverLog('Cache invalid or not found, fetching fresh data');
    
    // Use Promise.race to implement a global timeout
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('API request timed out')), 8000); // 8 second global timeout
    });
    
    // Fetch country data and GDP data in parallel with a timeout
    const dataPromise = Promise.all([
      fetchCountryData(),
      fetchGdpData(targetYear)
    ]);
    
    // Race between the data fetch and the timeout
    const [countryData, gdpData] = await Promise.race([
      dataPromise,
      timeoutPromise.then(() => [null, null])
    ]) as [Record<string, string> | null, Record<string, number> | null];
    
    // If either request failed, check for cached data
    if (!countryData || !gdpData) {
      serverWarn('Failed to fetch data from IMF API, checking for cached data');
      
      // Try to get data from cache
      const cachedData = readFromCache();
      
      if (cachedData) {
        serverLog('Using cached IMF data from:', new Date(cachedData.timestamp).toLocaleString());
        
        return NextResponse.json({
          data: cachedData.data,
          year: cachedData.year,
          timestamp: cachedData.timestamp,
          source: 'cache'
        });
      } else {
        // No cache available, return error
        throw new Error('Failed to fetch from IMF API and no cache available');
      }
    }
    
    // Combine country and GDP data
    const combinedData: GDPCacheData = {
      timestamp: Date.now(),
      year: targetYear,
      data: {}
    };
    
    // Process each country with GDP data
    for (const [countryCode, gdpValue] of Object.entries(gdpData)) {
      const countryName = countryData[countryCode] || countryCode;
      combinedData.data[countryCode] = {
        label: countryName,
        gdp: gdpValue
      };
    }
    
    // Check if we have a reasonable number of countries
    const countryCount = Object.keys(combinedData.data).length;
    if (countryCount < 20) {
      serverWarn(`Low country count (${countryCount}), checking for cached data`);
      
      // Try to get data from cache
      const cachedData = readFromCache();
      
      if (cachedData) {
        serverLog('Using cached IMF data from:', new Date(cachedData.timestamp).toLocaleString());
        
        return NextResponse.json({
          data: cachedData.data,
          year: cachedData.year,
          timestamp: cachedData.timestamp,
          source: 'cache'
        });
      } else {
        // No cache available, return error with the insufficient data
        return NextResponse.json({
          data: combinedData.data,
          year: combinedData.year,
          timestamp: combinedData.timestamp,
          source: 'IMF API (insufficient data)',
          error: `Only found ${countryCount} countries, which is less than the expected minimum of 20`
        }, { status: 500 });
      }
    }
    
    // Cache the combined data
    writeToCache(combinedData);
    
    // Return the combined data
    serverLog(`Returning ${countryCount} countries with real GDP data for year ${targetYear}`);
    return NextResponse.json({
      data: combinedData.data,
      year: combinedData.year,
      timestamp: combinedData.timestamp,
      source: 'IMF API'
    });
    
  } catch (error) {
    serverError('Error in IMF API route:', error);
    
    // Check for cached data in case of any error
    const cachedData = readFromCache();
    
    if (cachedData) {
      serverLog('Using cached IMF data due to error:', error);
      
      return NextResponse.json({
        data: cachedData.data,
        year: cachedData.year,
        timestamp: cachedData.timestamp,
        source: 'cache (error)',
        error: error instanceof Error ? error.message : String(error)
      });
    } else {
      // No cache available, return error
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
} 