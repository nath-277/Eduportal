import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { PwaProvider } from '@/components/layout/pwa-provider';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'),
  title: {
    default: 'EduPortal',
    template: '%s · EduPortal',
  },
  description:
    'A Web-Based Departmental Student Information and Collaborative Resource Portal.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'EduPortal',
    description: 'A Web-Based Departmental Student Information and Collaborative Resource Portal.',
    siteName: 'EduPortal',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 1200,
        alt: 'EduPortal - Departmental Student Information & Resource Portal',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EduPortal',
    description: 'A Web-Based Departmental Student Information and Collaborative Resource Portal.',
    images: ['/og-image.png'],
  },
  other: {
    'theme-color': '#3b82f6',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'EduPortal',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <QueryProvider>
          <PwaProvider>{children}</PwaProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
