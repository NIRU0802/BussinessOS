import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/toast-provider";

export const metadata: Metadata = {
  title: "Business OS - Super Admin",
  description: "Platform operations portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
