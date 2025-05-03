"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { ShoppingBag, BarChart2, BrainCircuit, Settings, Clock, Menu, X, Users } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import Image from "next/image";
import logo from "@/assets/logo.png";

const sidebarItems = [
  // {
  //   title: "Dashboard",
  //   href: "/",
  //   icon: <ShoppingBag className="mr-2 h-5 w-5" />,
  // },
  {
    title: "Clientes",
    href: "/clientes",
    icon: <Users className="mr-2 h-5 w-5" />,
  },
  {
    title: "Análise",
    href: "/analise",
    icon: <BarChart2 className="mr-2 h-5 w-5" />,
  },
  {
    title: "Pergunte a IA",
    href: "/ia",
    icon: <BrainCircuit className="mr-2 h-5 w-5" />,
  },
  {
    title: "Configurações",
    href: "/configuracoes",
    icon: <Settings className="mr-2 h-5 w-5" />,
  },
  {
    title: "Histórico",
    href: "/historico",
    icon: <Clock className="mr-2 h-5 w-5" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white dark:bg-zinc-900"
        >
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 transition-transform duration-300 ease-in-out transform",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-orange-600 mr-2" />
               
               <Image src={logo} alt="Shop.AI" width={100} height={100} />

            </div>
            <ThemeToggle />
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                  pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                    ? "bg-orange-100 text-orange-700 dark:bg-zinc-800 dark:text-orange-400"
                    : "text-gray-700 hover:bg-orange-50 dark:text-gray-300 dark:hover:bg-zinc-800"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
          </nav>
          
          <div className="p-4 border-t border-gray-200 dark:border-zinc-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 Shopee Analytics
            </p>
          </div>
        </div>
      </div>
    </>
  );
}