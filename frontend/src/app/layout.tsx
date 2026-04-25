import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const space = Space_Grotesk({ subsets: ["latin"], variable: '--font-space' });

export const metadata: Metadata = {
  title: "Wraith Protocol",
  description: "Wraith Protocol - Active Defense for Uniswap v4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} ${space.variable} bg-background text-on-background min-h-screen relative font-body-md overflow-x-hidden selection:bg-primary-container selection:text-on-primary-fixed`}
      >
        <Providers>
          <div className="scanlines"></div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
