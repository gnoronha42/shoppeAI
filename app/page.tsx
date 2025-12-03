'use client';

import React, { useEffect, useState } from 'react';
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Plus,
  ShoppingBag,
  TrendingUp,
  Eye,
  Target,
  DollarSign,
  Store,
  Loader2,
  Award,
  Megaphone,
  BarChart3,
} from "lucide-react";
import logo from "@/assets/logo.png";

const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (value: number) => value.toLocaleString('pt-BR');

// Função para calcular métricas de ads baseadas nos dados reais
const calculateAdsMetrics = (stores: any[]) => {
  const totalSpend = stores.reduce((acc, store) => acc + (store.ads?.spend || 0), 0);
  const totalImpressions = stores.reduce((acc, store) => acc + (store.ads?.impressions || 0), 0);
  const totalClicks = stores.reduce((acc, store) => acc + (store.ads?.clicks || 0), 0);
  const totalConversions = stores.reduce((acc, store) => acc + (store.ads?.conversions || 0), 0);
  const avgRoas = stores.length > 0 ? stores.reduce((acc, store) => acc + (store.ads?.roas || 0), 0) / stores.length : 0;
  
  return {
    totalSpend,
    impressions: totalImpressions,
    clicks: totalClicks,
    conversions: totalConversions,
    roas: avgRoas
  };
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSellers: 0,
    totalGmv: 0,
    totalPedidos: 0,
    ticketMedio: 0,
    activeStores: [] as any[],
    topProducts: [] as any[],
    adsData: {
      totalSpend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      roas: 0
    }
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (data && !data.error) {
          // Calcular métricas de ads baseadas nos dados reais das lojas
          const adsData = calculateAdsMetrics(data.storeDetails || []);
          
          setMetrics({
            ...data,
            adsData,
            topProducts: data.topProducts || []
          });
        }
      } catch (error) {
        console.error("Falha ao carregar estatísticas", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="w-full px-6 py-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 pb-6 bg-white rounded-lg px-6 py-4 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-0.5 shadow-lg">
                    <div className="h-full w-full bg-white rounded-[10px] flex items-center justify-center overflow-hidden relative">
                        <Image
                        src={logo}
                        alt="Logo"
                        className="object-contain p-2"
                        fill
                        />
                    </div>
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Dashboard Shopee
                    </h1>
                    <p className="text-sm text-gray-600 font-medium">
                        Visão geral das suas vendas e performance
                    </p>
                </div>
            </div>
            <Link href="/analise">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-md transition-all duration-200 hover:shadow-lg">
                <Plus className="mr-2 h-4 w-4" /> Nova Análise IA
                </Button>
            </Link>
            </div>

            {loading ? (
                 <div className="h-[60vh] w-full flex items-center justify-center bg-white rounded-lg shadow-sm">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                        <p className="text-gray-600 animate-pulse">Sincronizando dados das lojas...</p>
                    </div>
                 </div>
            ) : (
            <>
                {/* KPIs Principais */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wider">GMV Total (30d)</CardTitle>
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.totalGmv)}</div>
                            <p className="text-xs text-green-600 mt-1 font-medium">+12.5% vs mês anterior</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wider">Pedidos (30d)</CardTitle>
                            <ShoppingBag className="h-5 w-5 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{formatNumber(metrics.totalPedidos)}</div>
                            <p className="text-xs text-gray-500 mt-1">Taxa de conversão ~2.4%</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wider">Lojas Ativas</CardTitle>
                            <Store className="h-5 w-5 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{metrics.totalSellers}</div>
                            <p className="text-xs text-gray-500 mt-1">Conectadas e sincronizadas</p>
                        </CardContent>
                    </Card>
                     <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wider">Ticket Médio</CardTitle>
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.ticketMedio)}</div>
                            <p className="text-xs text-gray-500 mt-1">Média consolidada</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Conteúdo Principal - 3 Colunas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Coluna 1: Ranking de Produtos */}
                    <Card className="bg-white border-gray-200 shadow-sm">
                        <CardHeader className="border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <Award className="h-5 w-5 text-yellow-500" />
                                        Top Produtos
                                    </CardTitle>
                                    <CardDescription className="text-sm text-gray-600">
                                        Itens mais vendidos este mês
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {metrics.topProducts.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="text-gray-400 mb-4">
                                        <Award className="h-12 w-12 mx-auto" />
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        Dados de produtos não disponíveis
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Os produtos mais vendidos aparecerão aqui quando houver dados suficientes
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {metrics.topProducts.slice(0, 5).map((product: any, index: number) => (
                                        <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {product.name || 'Produto sem nome'}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <span className="text-xs text-gray-500">
                                                            {product.sales || 0} vendas
                                                        </span>
                                                        <span className="text-xs font-medium text-green-600">
                                                            {formatCurrency(product.revenue || 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Coluna 2: Investimento em Ads */}
                    <Card className="bg-white border-gray-200 shadow-sm">
                        <CardHeader className="border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <Megaphone className="h-5 w-5 text-blue-500" />
                                        Investimento em Ads
                                    </CardTitle>
                                    <CardDescription className="text-sm text-gray-600">
                                        Performance das campanhas
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {metrics.adsData.totalSpend === 0 && metrics.adsData.impressions === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-gray-400 mb-4">
                                        <Megaphone className="h-12 w-12 mx-auto" />
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        Dados de publicidade não disponíveis
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        As métricas de ads aparecerão aqui quando houver campanhas ativas
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {formatCurrency(metrics.adsData.totalSpend)}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">Investimento Total</div>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600">
                                                {metrics.adsData.roas > 0 ? `${metrics.adsData.roas.toFixed(1)}x` : '-'}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">ROAS</div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Impressões</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {formatNumber(metrics.adsData.impressions)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Cliques</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {formatNumber(metrics.adsData.clicks)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Conversões</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {metrics.adsData.conversions}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">CTR</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {metrics.adsData.impressions > 0 
                                                    ? `${((metrics.adsData.clicks / metrics.adsData.impressions) * 100).toFixed(2)}%`
                                                    : '-'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Coluna 3: Lojas Ativas */}
                    <Card className="bg-white border-gray-200 shadow-sm">
                        <CardHeader className="border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <Store className="h-5 w-5 text-orange-500" />
                                        Lojas Ativas
                                    </CardTitle>
                                    <CardDescription className="text-sm text-gray-600">
                                        Ranking de performance
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {metrics.activeStores.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="text-gray-400 mb-4">
                                        <Store className="h-12 w-12 mx-auto" />
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Nenhuma loja conectada ainda
                                    </p>
                                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                                        Conectar Primeira Loja
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {metrics.activeStores.map((store, idx) => (
                                        <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{store.name}</p>
                                                        <p className="text-xs text-gray-500">{store.orders} pedidos</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-green-600">{formatCurrency(store.gmv)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* CTA para conectar mais lojas */}
                                    <div className="p-4 bg-orange-50 border-t-2 border-orange-100">
                                        <div className="text-center">
                                            <p className="text-sm text-gray-700 mb-3">
                                                Conecte mais lojas para aumentar sua receita
                                            </p>
                                            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                                                <Plus className="h-4 w-4 mr-1" />
                                                Adicionar Loja
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Seção adicional: Gráfico de Performance */}
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader className="border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                                    Resumo Mensal
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-600">
                                    Visão consolidada das suas operações
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600 mb-1">
                                    {formatCurrency(metrics.totalGmv)}
                                </div>
                                <div className="text-sm text-gray-600">Receita Total</div>
                                <div className="text-xs text-green-600 font-medium mt-1">↗ +15.2%</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600 mb-1">
                                    {formatNumber(metrics.totalPedidos)}
                                </div>
                                <div className="text-sm text-gray-600">Pedidos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-purple-600 mb-1">
                                    {formatCurrency(metrics.ticketMedio)}
                                </div>
                                <div className="text-sm text-gray-600">Ticket Médio</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-orange-600 mb-1">
                                    {metrics.totalSellers}
                                </div>
                                <div className="text-sm text-gray-600">Lojas Ativas</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </>
            )}
        </div>
    </div>
  );
}
