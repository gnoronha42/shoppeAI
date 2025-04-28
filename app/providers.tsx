"use client";

import { store } from "@/lib/store";
import { Provider } from "react-redux";
import { ThemeProvider } from "@/components/ui/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider defaultTheme="light" storageKey="shopee-analytics-theme">
        {children}
      </ThemeProvider>
    </Provider>
  );
}