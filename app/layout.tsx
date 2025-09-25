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

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen">
            {!isLoginPage && !isSelleriaPage && !isObrigadoPage && <Sidebar />}
            <main className={`${!isLoginPage && !isSelleriaPage && !isObrigadoPage   ? 'md:pl-80 p-4 md:p-6' : ''} min-h-screen bg-gray-50 dark:bg-zinc-900`}>
              <div className={`${!isLoginPage && !isSelleriaPage && !isObrigadoPage  ? 'max-w-7xl mx-auto' : ''}`}>
                {children}
              </div>
            </main>
          </div>
           
        </Providers>
      </body>
    </html>
  );
}