import type { Metadata, Viewport } from "next";
import { iosPwaHeadTags } from "./head-meta";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineStatusProvider } from "@/components/OfflineBanner";
import { AuthProvider } from "@/lib/auth-context";
import { BrandingProvider } from "@/components/BrandingProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Business OS Mobile POS",
  description: "Business OS Mobile Point of Sale — online-only floor ordering",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>{iosPwaHeadTags}</head>
      <body>
        <AuthProvider>
          <BrandingProvider>
            <OfflineStatusProvider>
              {children}
              <InstallPrompt />
            </OfflineStatusProvider>
          </BrandingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
