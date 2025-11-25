import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PAI Business Dashboard',
  description: 'Personal AI Infrastructure Business Dashboard - Manage your AI-powered business operations',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-950 text-slate-100 overflow-hidden`}
        suppressHydrationWarning
      >
        <Providers>
          <div className="h-screen w-screen overflow-hidden">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
