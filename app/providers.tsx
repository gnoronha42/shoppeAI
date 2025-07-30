"use client";

import { store } from "@/lib/store";
import { Provider } from "react-redux";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider defaultTheme="light" storageKey="shopee-analytics-theme">
        <AuthProvider>
        {children}
        <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}