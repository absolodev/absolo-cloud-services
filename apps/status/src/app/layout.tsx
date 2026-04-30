import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--absolo-font-sans',
  display: 'swap',
});

export const metadata = {
  title: 'Absolo Cloud — Status',
  description: 'Real-time and historic system status for Absolo Cloud services.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
