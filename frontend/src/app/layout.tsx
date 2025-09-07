import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./[locale]/globals.css";
import { Providers } from "./[locale]/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FluxTranche - AI-Powered DeFi Vaults",
  description: "Risk-tranched yield optimization powered by AI on RISE Chain",
};

type Props = {
  children: React.ReactNode;
};

export default function RootLayout({
  children
}: Props) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}