import "./globals.css";
import { AuthProvider } from "../auth/AuthProvider";

export const metadata = {
  title: "OneFit",
  description: "Daily · movement",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
