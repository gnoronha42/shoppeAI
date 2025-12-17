'use client';

import React, { useEffect, useState } from 'react';
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CheckCircle,
  Calendar,
  RefreshCw,
} from "lucide-react";
import logo from "@/assets/logo.png";

const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (value: number) => value.toLocaleString('pt-BR');

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
    totalRealPaidValue: 0,
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

  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 dias atrás
    return date.toISOString().split('T')[0];
  });
  
  const [dateTo, setDateTo] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1); // Ontem (Shopee padrão ignora o dia atual incompleto)
    return date.toISOString().split('T')[0];
  });

  const [customPeriod, setCustomPeriod] = useState(false);

  const fetchStats = async (fromDate?: string, toDate?: string) => {
    setLoading(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_ANALYSIS_BASE_URL}/api/dashboard/stats`;
      
      if (fromDate && toDate) {
        // Ajustar para o fuso horário local (00:00:00 do dia inicial até 23:59:59 do dia final)
        const timeFrom = Math.floor(new Date(fromDate + 'T00:00:00').getTime() / 1000);
        const timeTo = Math.floor(new Date(toDate + 'T23:59:59').getTime() / 1000);
        url += `?time_from=${timeFrom}&time_to=${timeTo}`;
      }
      
      const res = await fetch(url);
        const data = await res.json();
        if (data && !data.error) {
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
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDateChange = () => {
    if (customPeriod) {
      fetchStats(dateFrom, dateTo);
    } else {
      fetchStats(); 
    }
  };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        // Ajustar fuso horário se necessário, ou usar UTC
        // Como o input date retorna YYYY-MM-DD, new Date() assume UTC 00:00 se não especificar hora
        // Para exibição simples DD/MM:
        const day = date.getDate() + 1; // Ajuste para compensar timezone se necessário, ou usar getUTCDate
        // Melhor abordagem para string YYYY-MM-DD:
        const [year, month, d] = dateStr.split('-').map(Number);
        return `${d.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
    };

    const periodLabel = customPeriod 
        ? `(${formatDateDisplay(dateFrom)}-${formatDateDisplay(dateTo)})`
        : '(Últimos 30 Dias)';

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="w-full px-6 py-8 space-y-8">
            {/* Header */}
            <div className="bg-white rounded-lg px-6 py-4 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4">
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

          {/* Date Picker */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium text-gray-700">Período:</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={!customPeriod ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCustomPeriod(false);
                  fetchStats();
                }}
                className={!customPeriod ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                Padrão (30d)
              </Button>
              
              <Button
                variant={customPeriod ? "default" : "outline"}
                size="sm"
                onClick={() => setCustomPeriod(true)}
                className={customPeriod ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                Personalizado
              </Button>
            </div>

            {customPeriod && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="dateFrom" className="text-sm text-gray-600">De:</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-auto"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="dateTo" className="text-sm text-gray-600">Até:</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-auto"
                  />
                </div>
                
                <Button
                  onClick={handleDateChange}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar
                </Button>
              </>
            )}
          </div>
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
                            <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wider">Vendas {periodLabel}</CardTitle>
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.totalRealPaidValue || metrics.totalGmv)}</div>
                            <div className="flex items-center gap-1 mt-1">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <p className="text-xs text-green-600 font-medium">Espelho exato do painel Shopee</p>
                            </div>
          </CardContent>
        </Card>
                    <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wider">Pedidos {periodLabel}</CardTitle>
                            <ShoppingBag className="h-5 w-5 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{formatNumber(metrics.totalPedidos)}</div>
                            <p className="text-xs text-gray-500 mt-1">Meta: 786 pedidos (painel Shopee)</p>
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
                                                    {store.isAnnualFallback ? (
                                                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                                            Anual (2025)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                                            {customPeriod ? 'Personalizado' : '30 Dias'}
                                                        </span>
                                                    )}
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
                                    {formatCurrency(metrics.totalRealPaidValue || metrics.totalGmv)}
                                </div>
                                <div className="text-sm text-gray-600">Vendas Totais</div>
                                
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
