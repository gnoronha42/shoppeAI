"use client";

import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/lib/store";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="shoppeai-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </ReduxProvider>
  );
}