'use client';

import React from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  // Se for a página de login, não aplica o layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Se não estiver autenticado e não estiver na página de login, redireciona
  // if (!isAuthenticated && !isLoginPage) {
  //   window.location.href = '/login';
  //   return null;
  // }

  // Se estiver autenticado e não for página de login, aplica o layout
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <RootLayoutContent>
            {children}
          </RootLayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}