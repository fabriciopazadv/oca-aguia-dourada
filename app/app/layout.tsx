import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'OCA Águia Dourada | Gestão',
  description: 'Estoque, vendas e financeiro da OCA Águia Dourada',
  icons: { icon: '/favicon.svg' },
  robots: { index: false, follow: false },
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
