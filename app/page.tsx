'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Plus, ShoppingBag, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

const formatCurrency = (value: number) => `R$ ${value.toLocaleString()}`;
const formatPercentage = (value: number) => `${value}%`;
const formatNumber = (value: number) => value.toLocaleString();

const chartData = {
  bar: [
    { name: "Jan", vendas: 4000 },
    { name: "Fev", vendas: 3000 },
    { name: "Mar", vendas: 5000 },
    { name: "Abr", vendas: 2000 },
    { name: "Mai", vendas: 7000 },
    { name: "Jun", vendas: 6000 },
  ],
  line: [
    { name: "Jan", visitas: 1000, conversoes: 400 },
    { name: "Fev", visitas: 2000, conversoes: 800 },
    { name: "Mar", visitas: 1500, conversoes: 620 },
    { name: "Abr", visitas: 3000, conversoes: 1200 },
    { name: "Mai", visitas: 2500, conversoes: 900 },
    { name: "Jun", visitas: 3500, conversoes: 1500 },
  ],
  pie: [
    { name: "Roupas", value: 40 },
    { name: "Eletrônicos", value: 30 },
    { name: "Acessórios", value: 20 },
    { name: "Outros", value: 10 },
  ]
};

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das estatísticas da sua loja Shopee
          </p>
        </div>
        <Link href="/analise">
          <Button className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Nova Análise
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendas Totais</p>
                <p className="text-2xl font-bold">R$ 45.231</p>
              </div>
              <div className="rounded-full p-2 bg-orange-100 dark:bg-orange-900/20">
                <ShoppingBag className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">12% </span>
              <span className="text-muted-foreground ml-1">comparado ao mês anterior</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clientes</p>
                <p className="text-2xl font-bold">254</p>
              </div>
              <div className="rounded-full p-2 bg-orange-100 dark:bg-orange-900/20">
                <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">8% </span>
              <span className="text-muted-foreground ml-1">comparado ao mês anterior</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold">3.2%</p>
              </div>
              <div className="rounded-full p-2 bg-orange-100 dark:bg-orange-900/20">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">0.5% </span>
              <span className="text-muted-foreground ml-1">comparado ao mês anterior</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Relatórios</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div className="rounded-full p-2 bg-orange-100 dark:bg-orange-900/20">
                <FileSpreadsheet className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-muted-foreground">Último gerado: 2 dias atrás</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Vendas Mensais</CardTitle>
            <CardDescription>Desempenho de vendas dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {/* <BarChart
              data={chartData.bar}
              index="name"
              categories={["vendas"]}
              colors={["var(--chart-1)"]}
              valueFormatter={formatCurrency}
              className="h-80"
            /> */}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Distribuição de Produtos</CardTitle>
            <CardDescription>Categorias mais vendidas</CardDescription>
          </CardHeader>
          <CardContent>
            {/* <PieChart
              data={chartData.pie}
              index="name"
              valueFormatter={formatPercentage}
              colors={["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]}
              className="h-80"
            /> */}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tráfego vs Conversões</CardTitle>
          <CardDescription>Relação entre visitas e vendas concretizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {/* <LineChart
            data={chartData.line}
            index="name"
            categories={["visitas", "conversoes"]}
            colors={["var(--chart-2)", "var(--chart-1)"]}
            valueFormatter={formatNumber}
            className="h-80"
          /> */}
        </CardContent>
      </Card>
    </div>
  );
}