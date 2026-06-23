import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Obscura | Confidential Agentic Credit",
  description: "Confidential agentic credit on the Zama Protocol (FHEVM). AI agents borrow against encrypted collateral with debt, credit limit, reputation and x402 amounts stored as encrypted euint64 — settled in confidential ERC-7984 cUSDT on Ethereum Sepolia.",
  keywords: ["confidential agentic credit", "FHE", "FHEVM", "Zama", "fully homomorphic encryption", "ERC-7984", "cUSDT", "encrypted", "AI agents", "DeFi", "lending", "credit", "x402", "reputation", "Ethereum Sepolia"],
  authors: [{ name: "Obscura", url: "https://github.com/big14way/Obscura" }],
  creator: "Obscura",
  publisher: "Obscura",
  // metadataBase: set this to the public deploy URL once the app is hosted (e.g. Vercel).
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Obscura | Confidential Agentic Credit",
    description: "Composable privacy for onchain credit. AI agents borrow against encrypted collateral on the Zama FHEVM — debt, credit limit, reputation and x402 amounts stay encrypted (euint64), settled in ERC-7984 cUSDT on Ethereum Sepolia.",
    siteName: "Obscura",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Obscura - Confidential Agentic Credit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Obscura | Confidential Agentic Credit",
    description: "Confidential agentic credit on the Zama FHEVM — encrypted debt, credit and x402 payments, settled in ERC-7984 cUSDT.",
    creator: "@big14way",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Obscura",
              "description": "Confidential agentic credit on the Zama FHEVM - AI agents borrow against encrypted collateral with debt, credit and x402 amounts stored as encrypted euint64, settled in ERC-7984 cUSDT on Ethereum Sepolia",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "Obscura",
                "url": "https://github.com/big14way/Obscura"
              }
            }),
          }}
        />
      </head>
      <body className={`${inter.className} bg-[#0B0614] text-white antialiased`}>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
