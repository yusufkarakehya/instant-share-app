import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PrimeReactProvider } from 'primereact/api';
import "primereact/resources/themes/lara-light-cyan/theme.css";
import 'primereact/resources/primereact.min.css';
import 'primeflex/primeflex.css';
import 'primeicons/primeicons.css';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Instant Share",
  description: "Peer to peer instant file sharing app.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrimeReactProvider>
          {children}
        </PrimeReactProvider>
      </body>
    </html>
  );
}
