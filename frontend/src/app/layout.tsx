import type { Metadata } from "next";
import { AuthProvider } from "@/context/auth-context";
import { BrandingProvider } from "@/context/branding-context";
import { SettingsProvider } from "@/context/settings-context";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "HR ERP - Enterprise HR Management System",
  description: "Complete HR management system with 11 powerful modules for employee management, payroll, attendance, leaves, bonuses, and insurance.",
  keywords: "HR, ERP, payroll, attendance, leave management, human resources",
  authors: [{ name: "HR ERP Team" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <BrandingProvider>
            <SettingsProvider>
              {children}
            </SettingsProvider>
          </BrandingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
