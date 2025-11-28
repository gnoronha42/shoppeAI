"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/sidebar";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isSelleriaPage = pathname === "/selleria";
  const isObrigadoPage = pathname === "/obrigado";
  const isCalculadoraPage = pathname === "/calculadora";
  const isHomePage = pathname === "/";

  const showSidebar = !isLoginPage && !isSelleriaPage && !isObrigadoPage && !isCalculadoraPage;
  const useStandardLayout = showSidebar && !isHomePage;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen">
            {showSidebar && <Sidebar />}
            <main className={`${showSidebar ? 'md:pl-80' : ''} ${useStandardLayout ? 'p-4 md:p-6' : ''} min-h-screen bg-gray-50 dark:bg-zinc-900`}>
              <div className={`${useStandardLayout ? 'max-w-7xl mx-auto' : ''}`}>
                {children}
              </div>
            </main>
          </div>
           
        </Providers>
      </body>
    </html>
  );
}