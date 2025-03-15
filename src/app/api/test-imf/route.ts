// Test route to check if IMF API is directly accessible from Vercel
import { NextResponse } from 'next/server';

export const runtime = 'edge';
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
      imfResponse = await fetch(imfUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SatoshiForex/1.0)',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        // Adding cache control to bypass any caching issues
        cache: 'no-store',
        // Adding timeout
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      // Log the response status and headers
      console.log('[SERVER] IMF API response status:', imfResponse.status);
      console.log('[SERVER] IMF API response headers:', Object.fromEntries(imfResponse.headers.entries()));
      
      if (!imfResponse.ok) {
        console.error('[SERVER] IMF API fetch failed with status code:', imfResponse.status);
        
        // Get response body for error details
        let errorBody;
        try {
          errorBody = await imfResponse.text();
          console.error('[SERVER] IMF API error response body:', errorBody);
        } catch (bodyError) {
          console.error('[SERVER] Failed to read error response body:', bodyError);
          errorBody = 'Failed to read error response body';
        }
        
        return NextResponse.json({ 
          error: `Direct IMF API request failed with status: ${imfResponse.status}`,
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
        hasData: !!responseData?.datasets?.NGDPD,
        headers: Object.fromEntries(imfResponse.headers.entries())
      });
      
    } catch (fetchError) {
      console.error('[SERVER] Initial fetch error:', fetchError);
      
      // Try an alternative approach
      console.log('[SERVER] Trying alternative fetch approach');
      
      return NextResponse.json({ 
        error: `Error fetching from IMF API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        timestamp: new Date().toISOString(),
        errorType: fetchError instanceof Error ? fetchError.name : 'Unknown Error Type',
        errorStack: fetchError instanceof Error ? fetchError.stack : 'No stack trace available'
      }, { status: 500 });
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