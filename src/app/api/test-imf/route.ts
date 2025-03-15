// Test route to check if IMF API is directly accessible from Vercel
import { NextResponse } from 'next/server';

// Simple test route to check IMF API connectivity
export async function GET() {
  console.log('[SERVER] Test IMF API call starting');
  
  const imfUrl = 'https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=2024';
  console.log('[SERVER] Target IMF API URL:', imfUrl);
  
  // List of approaches to try
  const approaches = [
    {
      name: 'direct',
      fetch: async () => {
        console.log('[SERVER] Trying direct approach...');
        return fetch(imfUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json'
          },
          cache: 'no-store'
        });
      }
    },
    {
      name: 'allorigins',
      fetch: async () => {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imfUrl)}`;
        console.log('[SERVER] Trying AllOrigins proxy:', proxyUrl);
        return fetch(proxyUrl, { cache: 'no-store' });
      }
    },
    {
      name: 'corsproxy',
      fetch: async () => {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imfUrl)}`;
        console.log('[SERVER] Trying CORS Proxy:', proxyUrl);
        return fetch(proxyUrl, { cache: 'no-store' });
      }
    }
  ];
  
  // Try each approach and return the first successful one
  for (const approach of approaches) {
    try {
      console.log(`[SERVER] Testing ${approach.name} approach`);
      const response = await approach.fetch();
      
      // Log response status
      console.log(`[SERVER] ${approach.name} response status:`, response.status);
      
      if (!response.ok) {
        console.error(`[SERVER] ${approach.name} failed with status:`, response.status);
        continue; // Try next approach
      }
      
      // Try to parse JSON
      try {
        const data = await response.json();
        
        // Check if the response has the expected structure
        const hasDatasets = !!data?.datasets?.NGDPD;
        const hasValues = !!data?.values?.NGDPD;
        const structure = hasDatasets ? 'datasets' : hasValues ? 'values' : 'unknown';
        
        const countryCount = hasDatasets ? Object.keys(data.datasets.NGDPD).length : 
                           hasValues ? Object.keys(data.values.NGDPD).length : 0;
        
        return NextResponse.json({
          success: true,
          approach: approach.name,
          hasData: hasDatasets || hasValues,
          dataStructure: structure,
          countryCount: countryCount,
          timestamp: new Date().toISOString()
        });
      } catch (jsonError) {
        console.error(`[SERVER] ${approach.name} JSON parse error:`, jsonError);
      }
    } catch (error) {
      console.error(`[SERVER] ${approach.name} request error:`, error);
    }
  }
  
  // If all approaches failed
  return NextResponse.json({
    success: false,
    error: "All approaches failed to fetch IMF data",
    timestamp: new Date().toISOString()
  }, { status: 500 });
} 