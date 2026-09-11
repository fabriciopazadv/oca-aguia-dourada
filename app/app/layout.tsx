import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'OCA Águia Dourada | Gestão',
  description: 'Estoque, vendas e financeiro da OCA Águia Dourada',
  icons: { icon: '/favicon.svg', apple: '/icon-192.png' },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'OCA Gestão',
    statusBarStyle: 'default',
  },
  robots: { index: false, follow: false },
};
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#30281e',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
