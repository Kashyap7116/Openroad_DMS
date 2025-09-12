
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/context/language-context';

export const metadata: Metadata = {
  title: 'Openroad DMS',
  description: 'Openroad – Data Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Tinos:wght@400;700&family=Serif:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g transform='skewX(-15)'><rect x='0' y='0' width='30' height='100' fill='%238ab4f8'/><rect x='35' y='0' width='30' height='100' fill='%23004488'/><rect x='70' y='0' width='30' height='100' fill='%23DB4437'/></g></svg>" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <LanguageProvider>
            {children}
          </LanguageProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
