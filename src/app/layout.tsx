import "./globals.css";
import { AuthProvider } from "../auth/AuthProvider";
import TweaksPanel from "../components/TweaksPanel";

export const metadata = {
  title: "OneFit",
  description: "Daily · movement",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <TweaksPanel />
        </AuthProvider>
      </body>
    </html>
  );
}
