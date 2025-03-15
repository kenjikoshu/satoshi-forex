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
    
    const imfResponse = await fetch(imfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SatoshiForex/1.0)',
        'Accept': 'application/json'
      }
    });
    
    if (!imfResponse.ok) {
      console.error('[SERVER] Test IMF API fetch failed:', imfResponse.status, await imfResponse.text());
      return NextResponse.json({ 
        error: `Direct IMF API request failed with status: ${imfResponse.status}`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    const responseData = await imfResponse.json();
    
    // Just return basic success info, not the full data
    return NextResponse.json({
      success: true,
      statusCode: imfResponse.status,
      timestamp: new Date().toISOString(),
      hasData: !!responseData?.datasets?.NGDPD
    });
  } catch (error) {
    console.error('[SERVER] Test IMF API error:', error);
    return NextResponse.json({ 
      error: `Error fetching from IMF API: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 