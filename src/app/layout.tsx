import "./globals.css";
import { Open_Sans, Montserrat } from 'next/font/google';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import Header from './components/Header';
import Footer from './components/Footer';
import { ThemeProvider } from 'next-themes';

// Initialize the Open Sans font with specific subsets and weights
const openSans = Open_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-open-sans',
  weight: ['300', '400', '500', '600', '700'],
});

// Initialize the Montserrat font with specific subsets and weights
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
});

// Define metadata for the site including OpenGraph and Twitter cards
export const metadata: Metadata = {
  title: 'Satoshis Forex | Compare Bitcoin Satoshis to Global Currencies',
  description: 'Compare Bitcoin Satoshis to the world\'s top currencies in real time',
  openGraph: {
    title: 'Satoshis Forex | Compare Bitcoin Satoshis to Global Currencies',
    description: 'Compare Bitcoin Satoshis to the world\'s top currencies in real time',
    type: 'website',
    url: 'https://satoshis.forex',
    siteName: 'Satoshis Forex',
    images: [{
      url: 'https://satoshis.forex/api/og',
      width: 1200,
      height: 630,
      alt: 'Satoshis - Bitcoin\'s Native Currency Unit with current exchange rates',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Satoshis Forex | Compare Bitcoin Satoshi to Global Currencies',
    description: 'Compare Bitcoin Satoshis to the world\'s top currencies in real time',
    images: ['https://satoshis.forex/api/og'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${openSans.variable} ${montserrat.variable}`}>
      <body className="font-sans min-h-screen">
        <ThemeProvider attribute="class">
          <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </div>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
