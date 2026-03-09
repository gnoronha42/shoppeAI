"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const isLoginPage = pathname === "/login";
  const isSelleriaPage = pathname === "/selleria";
  const isObrigadoPage = pathname === "/obrigado";
  const isCalculadoraPage = pathname === "/calculadora";
  const isCalculadora2026Page = pathname === "/calculadora-2026";
  const isCalculadoraUnificadaPage = pathname === "/calculadora-unificada";
  const isHomePage = pathname === "/";

  const isCliente = user?.role === "cliente";
  const isPublicRoute = isLoginPage || isSelleriaPage || isObrigadoPage;

  // Cliente só pode acessar a Calculadora 2026; redireciona o resto
  useEffect(() => {
    if (isAuthenticated && isCliente && !isPublicRoute && !isCalculadora2026Page) {
      router.replace("/calculadora-2026");
    }
  }, [isAuthenticated, isCliente, isPublicRoute, isCalculadora2026Page, router]);

  // Sidebar: não exibir em login, selleria, obrigado, calculadoras (admin e cliente veem calculadora em tela cheia)
  const showSidebar =
    !isLoginPage &&
    !isSelleriaPage &&
    !isObrigadoPage &&
    !isCalculadoraPage &&
    !isCalculadora2026Page &&
    !isCalculadoraUnificadaPage;
  const useStandardLayout = showSidebar && !isHomePage;

  return (
    <div className="min-h-screen">
      {showSidebar && <Sidebar />}
      <main
        className={`${showSidebar ? "md:pl-80" : ""} ${useStandardLayout ? "p-4 md:p-6" : ""} min-h-screen bg-gray-50 dark:bg-zinc-900`}
      >
        <div className={useStandardLayout ? "max-w-7xl mx-auto" : ""}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}