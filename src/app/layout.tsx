import "./globals.css";
import { Open_Sans, Montserrat } from 'next/font/google';
import type { Metadata } from 'next';

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
  weight: ['400', '500', '600', '700', '800'],
});

// Define metadata for the site including OpenGraph and Twitter cards
export const metadata: Metadata = {
  title: 'Satoshis Forex | Compare Bitcoin Satoshi to Global Currencies',
  description: 'Compare Bitcoin Satoshi to the world\'s top currencies in real time',
  openGraph: {
    title: 'Satoshis Forex | Compare Bitcoin Satoshi to Global Currencies',
    description: 'Compare Bitcoin Satoshi to the world\'s top currencies in real time',
    type: 'website',
    url: 'https://satoshi-forex.vercel.app',
    siteName: 'Satoshis Forex',
    images: [{
      url: 'https://satoshi-forex.vercel.app/api/og',
      width: 1200,
      height: 630,
      alt: 'Satoshi - Bitcoin\'s Native Currency Unit with current exchange rates',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Satoshis Forex | Compare Bitcoin Satoshi to Global Currencies',
    description: 'Compare Bitcoin Satoshi to the world\'s top currencies in real time',
    images: ['https://satoshi-forex.vercel.app/api/og'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${openSans.variable} ${montserrat.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
