import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InterfaceScaleProvider } from "@/components/interface-scale-control";
import { SiteTranslationProvider } from "@/features/i18n/components/SiteTranslationProvider";
import { ApplicationChrome } from "@/components/layout/ApplicationChrome";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SoIZI - Tabela Nutricional",
  description: "Crie tabelas nutricionais padrão ANVISA",
  icons: {
    icon: "/logo-tabela-branco.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <SiteTranslationProvider>
              <InterfaceScaleProvider />
              <ApplicationChrome isLoggedIn={Boolean(session)}>
                {children}
              </ApplicationChrome>
            </SiteTranslationProvider>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
