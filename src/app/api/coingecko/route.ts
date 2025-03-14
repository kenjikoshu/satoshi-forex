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

// Define the cache file path - use /tmp in production (Vercel serverless environment)
const CACHE_DIR = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'cache')
  : path.join(process.cwd(), 'cache');
const COINGECKO_CACHE_FILE = path.join(CACHE_DIR, 'coingecko_btc_cache.json');

// Define the cache interface
interface CoinGeckoCacheData {
  timestamp: number;
  data: any; // The raw CoinGecko API response
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
function readFromCache(): CoinGeckoCacheData | null {
  try {
    if (fs.existsSync(COINGECKO_CACHE_FILE)) {
      const cacheData = JSON.parse(fs.readFileSync(COINGECKO_CACHE_FILE, 'utf-8'));
      serverLog('Read CoinGecko data from cache, timestamp:', new Date(cacheData.timestamp).toLocaleString());
      return cacheData;
    }
  } catch (error) {
    serverError('Failed to read from CoinGecko cache:', error);
  }
  return null;
}

// Write data to cache
function writeToCache(data: any) {
  try {
    ensureCacheDirectory();
    const cacheData: CoinGeckoCacheData = {
      timestamp: Date.now(),
      data
    };
    fs.writeFileSync(COINGECKO_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    serverLog('Wrote CoinGecko data to cache');
  } catch (error) {
    serverError('Failed to write to CoinGecko cache:', error);
  }
}

// Function to get all the currency codes we need
function getAllCurrencyCodes(): string[] {
  return [
    "usd", "eur", "jpy", "gbp", "cny", "inr", "cad", "aud", "brl", "rub", 
    "krw", "sgd", "chf", "hkd", "sek", "mxn", "zar", "nok", "nzd", "thb", 
    "try", "pln", "dkk", "idr", "php", "myr", "czk", "clp", "ars", "ils", 
    "cop", "sar", "aed", "twd", "ron", "huf", "vnd", "pkr", "ngn",
    "xau", "xag" // Gold and Silver (if supported)
  ];
}

// Get Bitcoin prices in multiple currencies from CoinGecko API
export async function GET(request: Request) {
  try {
    // Get all the currency codes we need
    const currencyCodes = getAllCurrencyCodes().join(',');
    
    // Set up API URL - only request price data without extra fields
    let coinGeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currencyCodes}`;
    const headers: HeadersInit = {};
    
    // Add API key if available
    if (process.env.NEXT_PUBLIC_COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
      coinGeckoUrl = `https://pro-api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currencyCodes}`;
    }
    
    serverLog('Fetching CoinGecko data from URL:', coinGeckoUrl);
    
    // Try to fetch fresh data from CoinGecko API
    try {
      const response = await fetch(coinGeckoUrl, { 
        cache: 'no-store',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate the response
      if (!data || !data.bitcoin) {
        throw new Error('Invalid response format from CoinGecko API');
      }
      
      // Cache the successful response
      writeToCache(data);
      
      // Return the fresh data
      return NextResponse.json({
        source: 'api',
        timestamp: Date.now(),
        data
      });
    } catch (error) {
      serverError('Failed to fetch from CoinGecko API:', error);
      
      // Try to get data from cache
      const cachedData = readFromCache();
      
      if (cachedData) {
        serverLog('Using cached CoinGecko data from:', new Date(cachedData.timestamp).toLocaleString());
        
        return NextResponse.json({
          source: 'cache',
          timestamp: cachedData.timestamp,
          data: cachedData.data
        });
      } else {
        throw new Error('Failed to fetch from CoinGecko API and no cache available');
      }
    }
  } catch (error) {
    serverError('Error in CoinGecko API route:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 