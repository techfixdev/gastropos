import type { Metadata } from "next";
import { Comic_Neue, DynaPuff } from "next/font/google";
import "./globals.css";
import { PosRuntime } from "@/modules/pos/ui/pos-runtime";

const displayFont = DynaPuff({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});

const bodyFont = Comic_Neue({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "GastroPOS",
  description: "Punto de venta para cafeterias y pastelerias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${displayFont.variable} ${bodyFont.variable} antialiased`}>
        <PosRuntime />
        {children}
      </body>
    </html>
  );
}
