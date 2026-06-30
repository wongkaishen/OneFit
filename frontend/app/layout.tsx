import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, EB_Garamond } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OneFit",
  description: "OneFit — digital wellness platform",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "OneFit", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#E5573F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${garamond.variable}`} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
