# Ansh & Riley Full-Stack Template

This is a full-stack template project for Software Composers to create  applications with AI.

## Getting started
To create a new project, you go to `/paths`, choose from our list of Paths, and then use Cursor's Composer feature to quickly scaffold your project!

You can also edit the Path's prompt template to be whatever you like!

## Technologies used
This doesn't really matter, but is useful for the AI to understand more about this project. We are using the following technologies
- React with Next.js 14 App Router
- TailwindCSS
- Firebase Auth, Storage, and Database
- Multiple AI endpoints including OpenAI, Anthropic, and Replicate using Vercel's AI SDK

# Satoshi Forex

A single-page website that ranks Bitcoin (in Satoshis, SATS), Gold (XAU), Silver (XAG), and top fiat currencies based on economic size, using market cap for Bitcoin, Gold, and Silver, and GDP for fiat currencies.

## Features

- **Real-time Bitcoin Data**: Fetches current Bitcoin price and market cap from CoinGecko API
- **GDP Data**: Retrieves GDP data for major economies from the IMF API
- **Precious Metals**: Includes Gold and Silver with sample market cap data
- **Satoshi Value Calculation**: Shows the value of 1 satoshi (0.00000001 BTC) in each currency
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
```
git clone <repository-url>
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