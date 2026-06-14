import "./globals.css";

export const metadata = {
  title: "OneFit",
  description: "Daily · movement",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
