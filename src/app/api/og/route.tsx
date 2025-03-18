import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

// Define fonts - using Montserrat for the title
export const runtime = 'edge';

// Route segment config
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Image generation function
export async function GET(req: NextRequest) {
  try {
    // Try to fetch data from CoinGecko
    let satsPerUSD = 1209;  // fallback values
    let satsPerCNY = 167.3;
    let satsPerEUR = 1320;
    let satsPerJPY = 8.075;

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,cny,eur,jpy',
        { next: { revalidate: 0 } }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Calculate SATS per unit (100,000,000 / BTC price in currency)
        if (data.bitcoin && data.bitcoin.usd) {
          satsPerUSD = 100000000 / data.bitcoin.usd;
          satsPerCNY = 100000000 / data.bitcoin.cny;
          satsPerEUR = 100000000 / data.bitcoin.eur;
          satsPerJPY = 100000000 / data.bitcoin.jpy;
        }
      }
    } catch (error) {
      console.error("Error fetching data, using fallback values:", error);
      // Continue with fallback values
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

    // Load the subsetted Montserrat fonts
    const montserratBold = await fetch(
      new URL('../../../../public/fonts/subset/Montserrat-Bold.subset.ttf', import.meta.url)
    ).then((res) => res.arrayBuffer());
    
    const montserratLight = await fetch(
      new URL('../../../../public/fonts/subset/Montserrat-Light.subset.ttf', import.meta.url)
    ).then((res) => res.arrayBuffer());

    // The currencies to display
    const currencies = [
      { code: 'USD', satsPerUnit: satsPerUSD },
      { code: 'CNY', satsPerUnit: satsPerCNY },
      { code: 'EUR', satsPerUnit: satsPerEUR },
      { code: 'JPY', satsPerUnit: satsPerJPY },
    ];

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
            padding: '40px',
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
              padding: '40px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              width: '90%',
              maxWidth: '1000px',
            }}
          >
            {/* Title */}
            <div 
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                fontFamily: 'Montserrat',
                fontSize: '48px',
                lineHeight: 1.2,
                color: '#1f2937',
                textAlign: 'center',
              }}
            >
              <span style={{ fontWeight: 700 }}>Satoshi</span>
              <span style={{ fontWeight: 300 }}> - Bitcoin&apos;s Native Currency Unit</span>
            </div>

            {/* Table */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '600px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              {currencies.map((currency, index) => (
                <div
                  key={currency.code}
                  style={{
                    display: 'flex',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f3f4f6',
                    borderBottom: index < currencies.length - 1 ? '1px solid #e5e7eb' : 'none',
                    height: '72px',
                  }}
                >
                  {/* Currency column */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderRight: '1px solid #e5e7eb',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        marginRight: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '50%',
                      }}
                    >
                      <img
                        src={`https://satoshi-forex.vercel.app/icons/currencies/${currency.code}.svg`}
                        width={24}
                        height={24}
                        alt={currency.code}
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                    <span style={{ fontSize: '24px', fontWeight: 500, color: '#1f2937' }}>
                      {currency.code}
                    </span>
                  </div>

                  {/* Value column */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                      fontFamily: 'monospace',
                      fontSize: '24px',
                      color: '#1f2937',
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
          {
            name: 'Montserrat',
            data: montserratBold,
            weight: 700,
            style: 'normal',
          },
          {
            name: 'Montserrat',
            data: montserratLight,
            weight: 300,
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