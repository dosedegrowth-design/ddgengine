import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AnalyticsPixels } from "@/components/analytics/pixels";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DDG Engine — Visibilidade automática no Google e ChatGPT",
    template: "%s · DDG Engine",
  },
  description:
    "A primeira plataforma brasileira de visibilidade em IA + Google. Conecte seu site em 7 minutos. Sem plugin, sem código. Aprovação por WhatsApp.",
  keywords: [
    "blog automation",
    "SEO automation",
    "AI content",
    "ChatGPT visibility",
    "GEO",
    "AEO",
    "marketing digital",
    "PME",
  ],
  authors: [{ name: "Dose de Growth" }],
  creator: "Dose de Growth",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "DDG Engine — Visibilidade automática no Google e ChatGPT",
    description:
      "A primeira plataforma brasileira de visibilidade em IA + Google. Setup em 7 minutos, sem plugin, sem código.",
    siteName: "DDG Engine",
    images: [{ url: "/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DDG Engine",
    description:
      "Visibilidade automática no Google e ChatGPT. Setup em 7 minutos, sem plugin.",
    images: ["/og"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
        <AnalyticsPixels />
      </body>
    </html>
  );
}
