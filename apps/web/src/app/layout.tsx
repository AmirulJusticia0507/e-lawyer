import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'e-Lawyer Platform',
  description: 'Platform litigasi digital terpadu untuk advokat, pengadilan, dan klien.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
