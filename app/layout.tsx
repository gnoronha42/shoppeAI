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

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen">
            {!isLoginPage && <Sidebar />}
            <main className={`${!isLoginPage ? 'md:pl-64 p-6' : ''} min-h-screen bg-gray-50 dark:bg-zinc-900`}>
              <div className={`${!isLoginPage ? 'max-w-7xl mx-auto' : ''}`}>
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}