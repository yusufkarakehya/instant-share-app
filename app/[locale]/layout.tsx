import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PrimeReactProvider } from 'primereact/api';
import "primereact/resources/themes/lara-light-cyan/theme.css";
import 'primereact/resources/primereact.css';
import 'primeflex/primeflex.css';
import 'primeicons/primeicons.css';
import '@/styles/app/App.scss';
import "./globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const inter = Inter({ subsets: ["latin"] });

interface RootLayoutProps {
  children: React.ReactNode;
  params: {
    locale: "en" | "tr"
  };
}

export const metadata: Metadata = {
  title: "Instant Share",
  description: "Peer to peer instant file sharing app.",
};

export default async function RootLayout({ children, params: { locale } }: RootLayoutProps) {
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <PrimeReactProvider>
            {children}
          </PrimeReactProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
