import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DriveBot',
  description: 'A simple RAG chatbot for Google Drive',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
