import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Longitudes | Temporal Coordination',
  description: 'Premium timezone coordination and meeting scheduling platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#131313] text-[#e5e2e1] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}