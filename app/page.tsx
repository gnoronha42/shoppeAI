'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Plus, ShoppingBag, TrendingUp, Users, Eye, Target, DollarSign, BarChart3, PieChart, LineChart } from "lucide-react";
import Link from "next/link";
import { useDashboardConfig } from "@/hooks/use-dashboard-config";
import { ChartData } from "@/types/dashboard";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const formatCurrency = (value: number) => `R$ ${value.toLocaleString()}`;
const formatPercentage = (value: number) => `${value}%`;
const formatNumber = (value: number) => value.toLocaleString();

// Dados simulados para os gráficos baseados nas configurações
const generateChartData = (config: any): ChartData => {
  // Total de vendas: 77.300.000 (77 milhões e 300 mil)
  const totalVendas = 77300000;
  
  // Distribuição mensal com crescimento ao longo do ano
  // Meses 6 e 7 terão mais vendas (Black Friday, Natal, etc.)
  const vendasMensais = [
    { name: "Jan", vendas: Math.round(totalVendas * 0.12) }, // 12% - Início do ano
    { name: "Fev", vendas: Math.round(totalVendas * 0.10) }, // 10% - Carnaval
    { name: "Mar", vendas: Math.round(totalVendas * 0.13) }, // 13% - Recuperação
    { name: "Abr", vendas: Math.round(totalVendas * 0.14) }, // 14% - Crescimento
    { name: "Mai", vendas: Math.round(totalVendas * 0.15) }, // 15% - Maio
    { name: "Jun", vendas: Math.round(totalVendas * 0.18) }, // 18% - Junho (mais vendas)
    { name: "Jul", vendas: Math.round(totalVendas * 0.18) }, // 18% - Julho (mais vendas)
    { name: "Ago", vendas: Math.round(totalVendas * 0.18) }, // 18% - Agosto (mais vendas)
  ];

  return {
    vendasMensais,
    distribuicaoNichos: [
      { name: "Casa e Construção", value: 18, color: "#f97316" },
      { name: "Saúde e Beleza", value: 15, color: "#3b82f6" },
      { name: "Moda", value: 22, color: "#10b981" },
      { name: "Artigos de Papelaria", value: 8, color: "#8b5cf6" },
      { name: "Eletrônico", value: 20, color: "#ef4444" },
      { name: "Esporte e Lazer", value: 12, color: "#06b6d4" },
      { name: "Casa e Decoração", value: 16, color: "#f59e0b" },
      { name: "Eletrodoméstico", value: 14, color: "#84cc16" },
      { name: "Artigo de Festa", value: 5, color: "#ec4899" },
    ],
    trafegoConversao: [
      { name: "Jan", visitas: Math.round(config.numeroVisitas * 0.8), conversoes: Math.round(config.numeroPedidos * 0.8) },
      { name: "Fev", visitas: Math.round(config.numeroVisitas * 0.9), conversoes: Math.round(config.numeroPedidos * 0.9) },
      { name: "Mar", visitas: Math.round(config.numeroVisitas * 1.1), conversoes: Math.round(config.numeroPedidos * 1.1) },
      { name: "Abr", visitas: Math.round(config.numeroVisitas * 0.7), conversoes: Math.round(config.numeroPedidos * 0.7) },
      { name: "Mai", visitas: Math.round(config.numeroVisitas * 1.2), conversoes: Math.round(config.numeroPedidos * 1.2) },
      { name: "Jun", visitas: config.numeroVisitas, conversoes: config.numeroPedidos },
      { name: "Jul", visitas: config.numeroVisitas, conversoes: config.numeroPedidos },
      { name: "Ago", visitas: config.numeroVisitas, conversoes: config.numeroPedidos },
    ]
  };
};

// Cores para o gráfico de pizza
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#84cc16', '#ec4899'];

// Componente personalizado para o tooltip do gráfico de pizza
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">{payload[0].name}</p>
        <p className="text-gray-600 dark:text-gray-300">
          {payload[0].value}% do total
        </p>
      </div>
    );
  }
  return null;
};

export default function Home() {
  const { config, getCalculatedMetrics } = useDashboardConfig();
  const chartData = generateChartData(config);
  const metrics = getCalculatedMetrics();

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
        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">GMV Geral</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(config.gmvGeral)}</p>
              </div>
              <div className="rounded-full p-3 bg-orange-100 dark:bg-orange-900/20">
                <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">+{metrics.roi}% </span>
              <span className="text-muted-foreground ml-1">ROI sobre investimento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Investimento ADS</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(config.investimentoAds)}</p>
              </div>
              <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/20">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <span className="text-muted-foreground">Acumulado no mês</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CTR Geral</p>
                <p className="text-2xl font-bold text-green-600">{config.ctrGeral}%</p>
              </div>
              <div className="rounded-full p-3 bg-green-100 dark:bg-green-900/20">
                <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">+0.5% </span>
              <span className="text-muted-foreground ml-1">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPA Médio</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(config.cpaMedio)}</p>
              </div>
              <div className="rounded-full p-3 bg-purple-100 dark:bg-purple-900/20">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <span className="text-muted-foreground">Custo por aquisição</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pedidos</p>
                <p className="text-2xl font-bold text-indigo-600">{formatNumber(config.numeroPedidos)}</p>
              </div>
              <div className="rounded-full p-3 bg-indigo-100 dark:bg-indigo-900/20">
                <ShoppingBag className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">+8% </span>
              <span className="text-muted-foreground ml-1">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Visitas</p>
                <p className="text-2xl font-bold text-teal-600">{formatNumber(config.numeroVisitas)}</p>
              </div>
              <div className="rounded-full p-3 bg-teal-100 dark:bg-teal-900/20">
                <Eye className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <span className="text-muted-foreground">Taxa de conversão: {metrics.taxaConversao}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ROI Total</p>
                <p className="text-2xl font-bold text-rose-600">{metrics.roi}%</p>
              </div>
              <div className="rounded-full p-3 bg-rose-100 dark:bg-rose-900/20">
                <TrendingUp className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <span className="text-muted-foreground">Retorno sobre investimento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Relatórios</p>
                <p className="text-2xl font-bold text-amber-600">12</p>
              </div>
              <div className="rounded-full p-3 bg-amber-100 dark:bg-amber-900/20">
                <FileSpreadsheet className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <span className="text-muted-foreground">Último gerado: 2 dias atrás</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Vendas Mensais
            </CardTitle>
            <CardDescription>Desempenho de vendas dos últimos 7 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <div className="text-center space-y-4">
                <BarChart3 className="h-16 w-16 text-blue-200 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-muted-foreground">Gráfico de Vendas</h3>
                  <p className="text-sm text-muted-foreground">Dados baseados nas suas configurações</p>
                </div>
                <div className="grid grid-cols-7 gap-2 text-xs">
                  {chartData.vendasMensais.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="bg-blue-100 dark:bg-blue-900/20 rounded p-2 mb-1">
                        <div className="text-blue-600 font-semibold">{formatCurrency(item.vendas)}</div>
                      </div>
                      <div className="text-muted-foreground">{item.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 hover:shadow-lg transition-shadow w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <PieChart className="h-6 w-6 text-green-600" />
              Distribuição de Nichos
            </CardTitle>
            <CardDescription>Categorias mais vendidas por nicho</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData.distribuicaoNichos}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    fontSize={12}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.distribuicaoNichos.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-lg transition-shadow w-full lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className=" w-12 text-purple-600" />
            Tráfego vs Conversões
          </CardTitle>
          <CardDescription>Relação entre visitas e vendas concretizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center space-y-4">
              <LineChart className="h-17 w-16 text-purple-200 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-muted-foreground">Métricas de Conversão</h3>
                <p className="text-sm text-muted-foreground">Visitas vs Pedidos por mês</p>
              </div>
              <div className="grid grid-cols-6 gap-2 text-xs">
                {chartData.trafegoConversao.map((item, index) => (
                  <div key={index} className="text-center space-y-1">
                    <div className="bg-purple-100 dark:bg-purple-900/20 rounded p-2">
                      <div className="text-purple-600 font-semibold">{formatNumber(item.visitas)}</div>
                      <div className="text-xs text-muted-foreground">visitas</div>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/20 rounded p-2">
                      <div className="text-green-600 font-semibold">{formatNumber(item.conversoes)}</div>
                      <div className="text-xs text-muted-foreground">pedidos</div>
                    </div>
                    <div className="text-muted-foreground">{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}