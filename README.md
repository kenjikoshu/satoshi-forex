# Satoshi Forex

A single-page website that ranks Bitcoin (in Satoshis, SATS), Gold (XAU), Silver (XAG), and top fiat currencies based on economic size, using market cap for Bitcoin, Gold, and Silver, and GDP for fiat currencies.

## Features

- **Real-time Bitcoin Data**: Fetches current Bitcoin price and market cap from CoinGecko API
- **GDP Data**: Retrieves GDP data for major economies from the IMF API
- **Precious Metals**: Includes Gold and Silver with sample market cap data
- **Satoshi Value Calculation**: Shows the value of 1 satoshi (0.00000001 BTC) in each currency
- **Responsive Design**: Works on desktop and mobile devices
- **Share Functionality**: Capture and share the rankings as an image
- **Fallback Mechanism**: Uses cached data when API calls fail

## Technologies Used

- **Frontend**: React with Next.js 14 App Router
- **Styling**: TailwindCSS for responsive design
- **Data Visualization**: Custom-built tables and rankings
- **Image Generation**: html2canvas for creating shareable images
- **Date Formatting**: date-fns for handling timestamps

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
```
git clone https://github.com/kenjikoshu/satoshi-forex.git
cd satoshi-forex
```

2. Install dependencies:
```
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:
```
# CoinGecko API - Free tier doesn't require a key, but Pro tier does
# Pro API Key is optional but recommended to avoid rate limits
NEXT_PUBLIC_COINGECKO_API_KEY=

# IMF API for GDP and M2 Money Supply data
# IMF API has no usage limits and is completely free to use
# No API key required

# Set this to true to enable detailed console logging for debugging
NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=false
```

### Setting Up API Keys

#### CoinGecko API
- Basic usage does not require an API key
- For higher rate limits, sign up for a Pro account at [CoinGecko Pro](https://www.coingecko.com/en/api/pricing)
- Add your API key to `NEXT_PUBLIC_COINGECKO_API_KEY` in the `.env.local` file

#### IMF API
The application uses the IMF's Data API to fetch GDP data for various countries. No API key is required, but there are rate limits.

The IMF API endpoints used are:
- GDP data: `https://www.imf.org/external/datamapper/api/v1/NGDPD`

### Running the Application

Start the development server:
```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

To create a production build:
```
npm run build
```

To start the production server:
```
npm run start
```

## Project Structure

```
satoshi-forex/
├── cache/                  # Cached API responses
├── public/                 # Static assets
├── src/
│   ├── app/
│   │   ├── api/            # API routes
│   │   │   ├── coingecko/  # Bitcoin price data API
│   │   │   └── imf/        # GDP data API
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout component
│   │   └── page.tsx        # Main application page
│   └── lib/                # Utility functions and helpers
├── .env.local              # Environment variables (create this)
├── next.config.mjs         # Next.js configuration
├── package.json            # Dependencies and scripts
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Data Sources

- **Bitcoin Price**: [CoinGecko API](https://www.coingecko.com/en/api)
- **GDP Data**: [IMF DataMapper API](https://www.imf.org/external/datamapper/api/v1/NGDPD)
- **Gold and Silver Market Cap**: Estimated based on current prices and known supply

## Caching Strategy

The application implements a caching mechanism to:
- Reduce API calls to external services
- Provide fallback data when APIs are unavailable
- Improve loading performance

Cached data is stored in the `cache/` directory and is automatically refreshed when new data is successfully fetched.

## License

This project is licensed under the MIT License - see the LICENSE file for details.