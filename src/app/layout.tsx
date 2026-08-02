import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Antigravity | Apify Job Scraper Store',
  description:
    'Production-grade job scraping platform. Run powerful scrapers on LinkedIn, Indeed, Glassdoor, and more. Real-time results, proxy rotation, and enterprise-grade infrastructure.',
  keywords: ['job scraper', 'apify', 'linkedin scraper', 'indeed scraper', 'job data', 'web scraping'],
  authors: [{ name: 'Antigravity' }],
  openGraph: {
    title: 'Antigravity Apify Store',
    description: 'Enterprise job scraping infrastructure at your fingertips',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">{children}</div>
      </body>
    </html>
  );
}
