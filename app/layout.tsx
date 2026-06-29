import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '900'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Cipher — Private. Encrypted. Social.',
  description:
    'Cipher is an end-to-end encrypted social network. Share stories, post to your feed, and message friends with privacy by default.',
  keywords: ['encrypted messaging', 'social network', 'privacy', 'e2ee', 'cipher'],
  authors: [{ name: 'Cipher' }],
  openGraph: {
    title: 'Cipher — Private. Encrypted. Social.',
    description: 'End-to-end encrypted social messaging.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-ink font-sans text-soft antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-cipher-radial opacity-60" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
