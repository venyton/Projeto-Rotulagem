import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InterfaceScaleProvider } from "@/components/interface-scale-control";
import { Footer } from "@/components/footer";
import { SiteTranslationProvider } from "@/features/i18n/components/SiteTranslationProvider";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <SiteTranslationProvider>
              <InterfaceScaleProvider />
              <div className="flex min-h-screen flex-col">
                <Header isLoggedIn={Boolean(session)} />
                <div className="flex-1">
                  {children}
                </div>
                <Footer />
              </div>
            </SiteTranslationProvider>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
