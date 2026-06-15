import "./globals.css";
import { AuthProvider } from "../auth/AuthProvider";
import DemoBadge from "../components/DemoBadge";

export const metadata = {
  title: "OneFit",
  description: "Daily · movement. Track activity, diet, and progress.",
  applicationName: "OneFit",
  manifest: "/manifest.json",
  themeColor: "#B94838",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default" as const,
    title: "OneFit",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#B94838",
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <DemoBadge />
        </AuthProvider>
      </body>
    </html>
  );
}
