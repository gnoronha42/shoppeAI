"use client";

import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { Toaster } from "@/components/ui/toaster";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
          <Sidebar />
          <div className="md:pl-64 pt-4 md:pt-0">
            <main className="container mx-auto p-4 md:p-8">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </ThemeProvider>
    </Provider>
  );
}