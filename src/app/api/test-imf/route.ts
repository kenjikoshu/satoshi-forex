// Test route to check if IMF API is directly accessible from Vercel
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  console.log('[SERVER] Test IMF API call starting');
  try {
    // Direct fetch to IMF API
    const imfUrl = 'https://www.imf.org/external/datamapper/api/v1/NGDPD?periods=2024';
    console.log('[SERVER] Test IMF API URL:', imfUrl);
    
    // First try with a basic fetch
    console.log('[SERVER] Attempting fetch with default settings');
    let imfResponse;
    
    try {
      // Use proxy to avoid Cloudflare issues
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imfUrl)}`;
      console.log('[SERVER] Using proxy URL:', proxyUrl);
      
      imfResponse = await fetch(proxyUrl, {
        cache: 'no-store'
      });
      
      // Log the response status and headers
      console.log('[SERVER] IMF API response status:', imfResponse.status);
      console.log('[SERVER] IMF API response headers:', Object.fromEntries(imfResponse.headers.entries()));
      
      if (!imfResponse.ok) {
        console.error('[SERVER] Proxy API fetch failed with status code:', imfResponse.status);
        
        // Get response body for error details
        let errorBody;
        try {
          errorBody = await imfResponse.text();
          console.error('[SERVER] Proxy API error response body:', errorBody);
        } catch (bodyError) {
          console.error('[SERVER] Failed to read error response body:', bodyError);
          errorBody = 'Failed to read error response body';
        }
        
        return NextResponse.json({ 
          error: `Proxy API request failed with status: ${imfResponse.status}`,
          errorBody: errorBody,
          timestamp: new Date().toISOString(),
          headers: Object.fromEntries(imfResponse.headers.entries())
        }, { status: 500 });
      }
      
      // Attempt to parse JSON
      const responseData = await imfResponse.json();
      
      // Return success info
      return NextResponse.json({
        success: true,
        statusCode: imfResponse.status,
        timestamp: new Date().toISOString(),
        hasData: !!responseData?.datasets?.NGDPD || !!responseData?.values?.NGDPD,
        dataStructure: responseData?.datasets ? 'datasets' : 
                      responseData?.values ? 'values' : 'unknown',
        countryCount: responseData?.datasets?.NGDPD ? 
                     Object.keys(responseData.datasets.NGDPD).length : 
                     responseData?.values?.NGDPD ? 
                     Object.keys(responseData.values.NGDPD).length : 0,
        headers: Object.fromEntries(imfResponse.headers.entries())
      });
      
    } catch (fetchError) {
      console.error('[SERVER] Initial fetch error:', fetchError);
      
      // Try a different proxy service
      try {
        console.log('[SERVER] Trying alternative proxy approach');
        const alternativeProxyUrl = `https://corsproxy.io/?${encodeURIComponent(imfUrl)}`;
        
        const alternativeResponse = await fetch(alternativeProxyUrl, { cache: 'no-store' });
        
        if (!alternativeResponse.ok) {
          return NextResponse.json({ 
            error: `Alternative proxy responded with status: ${alternativeResponse.status}`,
            timestamp: new Date().toISOString()
          }, { status: 500 });
        }
        
        const responseData = await alternativeResponse.json();
        
        return NextResponse.json({
          success: true,
          approach: 'alternative-proxy',
          statusCode: alternativeResponse.status,
          timestamp: new Date().toISOString(),
          hasData: !!responseData?.datasets?.NGDPD || !!responseData?.values?.NGDPD,
          dataStructure: responseData?.datasets ? 'datasets' : 
                        responseData?.values ? 'values' : 'unknown'
        });
      } catch (alternativeError) {
        console.error('[SERVER] Alternative approach failed:', alternativeError);
        
        return NextResponse.json({ 
          error: `All proxy approaches failed. Last error: ${alternativeError instanceof Error ? alternativeError.message : String(alternativeError)}`,
          initialError: `${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
          timestamp: new Date().toISOString(),
          errorType: fetchError instanceof Error ? fetchError.name : 'Unknown Error Type'
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('[SERVER] Test IMF API outer error:', error);
    return NextResponse.json({ 
      error: `Fatal error in test endpoint: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.name : 'Unknown Error Type',
      errorStack: error instanceof Error ? error.stack : 'No stack trace available'
    }, { status: 500 });
  }
} 