"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { ShoppingBag, BarChart2, BrainCircuit, Settings, Clock, Menu, X, Users, LogOut, UserPlus, Calculator } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { useAuth } from '@/contexts/AuthContext';

const regularItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: <ShoppingBag className="mr-2 h-5 w-5" />,
  },
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
    title: "Calculadora",
    href: "/calculadora",
    icon: <Calculator className="mr-2 h-5 w-5" />,
  },
 // {
   // title: "Pergunte a IA",
    //href: "/ia",
    //icon: <BrainCircuit className="mr-2 h-5 w-5" />,
  //},
  {
    title: "Configurações",
    href: "/configuracoes",
    icon: <Settings className="mr-2 h-5 w-5" />,
  },
 
];

const adminItems = [
  {
    title: "Gerenciar Analistas",
    href: "/analistas",
    icon: <UserPlus className="mr-2 h-5 w-5" />,
    requiresSuperUser: true,
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
  const { user, logout } = useAuth();

  const isSuperUser = user?.role === 'superuser';

  const sidebarItems = [...regularItems, ...(isSuperUser ? adminItems : [])];

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
          <div className="p-6 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-orange-600 mr-2" />
               
               <Image src={logo} alt="Shop.AI" width={100} height={100} />

            </div>
            <ThemeToggle />
          </div>
          
          <nav className="flex-1 p-6 space-y-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center px-5 py-3.5 text-sm font-medium rounded-lg transition-all duration-200",
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
          
          <div className="p-6 border-t border-gray-200 dark:border-zinc-800">
            <div className="mb-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-orange-100 p-2 dark:bg-zinc-800">
                  <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name || 'Usuário'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 Shopee Analytics
            </p>
          </div>
        </div>
      </div>
    </>
  );
}