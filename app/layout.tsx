import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSiteUrl, SITE } from "@/lib/seo/site";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE.name,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.defaultDescription,
  icons: {
    icon: "/images/logo-app.png",
    apple: "/images/logo-app.png",
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: getSiteUrl(),
    siteName: SITE.name,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-center" richColors closeButton theme="dark" />
        </Providers>
      </body>
    </html>
  );
}
