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
  MapPin,
  Store,
  Loader2,
} from "lucide-react";
import logo from "@/assets/logo.png";

const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (value: number) => value.toLocaleString('pt-BR');

// Mock para evolução semanal (será ajustado visualmente, mas dados hardcoded por enquanto pois histórico requer armazenamento)
const weeklyEvolutionMock = [
  { label: "Há 7 semanas", factor: 0.6 },
  { label: "Há 6 semanas", factor: 0.65 },
  { label: "Há 5 semanas", factor: 0.7 },
  { label: "Há 4 semanas", factor: 0.78 },
  { label: "Há 3 semanas", factor: 0.85 },
  { label: "Há 2 semanas", factor: 0.92 },
  { label: "Última semana", factor: 1.0 },
];

const mapPins = [
  { top: "18%", left: "32%" },
  { top: "26%", left: "48%" },
  { top: "34%", left: "41%" },
  { top: "42%", left: "55%" },
  { top: "50%", left: "37%" },
  { top: "58%", left: "62%" },
  { top: "66%", left: "45%" },
  { top: "72%", left: "53%" },
  { top: "80%", left: "30%" },
];

function MapPanel() {
  return (
    <div className="relative h-72 w-full rounded-2xl bg-gradient-to-br from-orange-950/30 via-slate-900/50 to-slate-950 border border-orange-500/20 overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#f97316_0,_transparent_50%),radial-gradient(circle_at_bottom,_#ea580c_0,_transparent_50%)]" />
      <div className="absolute inset-4">
        <div className="h-full w-full rounded-xl border border-orange-500/10 bg-slate-950/20 backdrop-blur-sm relative">
          {mapPins.map((pin, index) => (
            <span
              key={index}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: pin.top, left: pin.left }}
            >
              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/30 animate-pulse">
                <MapPin className="h-2.5 w-2.5 text-white" />
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 left-5">
        <p className="text-xs font-semibold text-orange-200/90 uppercase tracking-wide">
          Distribuição de lojas
        </p>
        <p className="text-[11px] text-orange-200/60">
          Concentração regional de vendas
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSellers: 0,
    totalGmv: 0,
    totalPedidos: 0,
    ticketMedio: 0,
    activeStores: [] as any[]
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (data && !data.error) {
          setMetrics(data);
        }
      } catch (error) {
        console.error("Falha ao carregar estatísticas", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Gerar dados de evolução baseados no total atual
  const currentEvolution = weeklyEvolutionMock.map(item => ({
    ...item,
    sellers: Math.round(metrics.totalSellers * item.factor) || metrics.totalSellers, // Sellers constant mostly
    pedidos: Math.round(metrics.totalPedidos * item.factor / 4.5), // Spread over weeks approx
    gmv: metrics.totalGmv * item.factor / 4.5,
    ticket: metrics.ticketMedio * (0.9 + Math.random() * 0.2), // Slight variation
    conversao: 1.5 + Math.random() * 2
  }));

  return (
    <div className="">
        {/* Overlay laranja translúcido global */}
        <div className="fixed inset-0 bg-gradient-to-br from-orange-900/10 via-slate-950/90 to-slate-950 pointer-events-none" />
        
        <div className="relative z-10 w-full px-6 py-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-orange-500/10 pb-6">
            <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 p-0.5 shadow-xl shadow-orange-900/20">
                    <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden relative">
                        <Image
                        src={logo}
                        alt="Logo"
                        className="object-contain p-2"
                        fill
                        />
                    </div>
                </div>
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white">
                        Painel Integrado
                    </h1>
                    <p className="text-sm text-orange-200/60 font-light tracking-wide">
                        Monitoramento em tempo real das operações Shopee
                    </p>
                </div>
            </div>
            <Link href="/analise">
                <Button className="bg-orange-600 hover:bg-orange-500 text-white border border-orange-400/20 shadow-lg shadow-orange-900/40 transition-all duration-300 hover:scale-105">
                <Plus className="mr-2 h-4 w-4" /> Nova Análise IA
                </Button>
            </Link>
            </div>

            {loading ? (
                 <div className="h-[60vh] w-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                        <p className="text-orange-200/50 animate-pulse">Sincronizando dados das lojas...</p>
                    </div>
                 </div>
            ) : (
            <>
                {/* KPIs Principais */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-slate-900/40 border-orange-500/20 backdrop-blur-md hover:bg-slate-900/60 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-200/70 uppercase tracking-wider">GMV Total (30d)</CardTitle>
                            <DollarSign className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{formatCurrency(metrics.totalGmv)}</div>
                            <p className="text-xs text-orange-200/40 mt-1">+12.5% vs mês anterior</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/40 border-orange-500/20 backdrop-blur-md hover:bg-slate-900/60 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-200/70 uppercase tracking-wider">Pedidos (30d)</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{formatNumber(metrics.totalPedidos)}</div>
                            <p className="text-xs text-orange-200/40 mt-1">Taxa de conversão global ~2.4%</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/40 border-orange-500/20 backdrop-blur-md hover:bg-slate-900/60 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-200/70 uppercase tracking-wider">Lojas Ativas</CardTitle>
                            <Store className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{metrics.totalSellers}</div>
                            <p className="text-xs text-orange-200/40 mt-1">Lojas conectadas e sincronizadas</p>
                        </CardContent>
                    </Card>
                     <Card className="bg-slate-900/40 border-orange-500/20 backdrop-blur-md hover:bg-slate-900/60 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-200/70 uppercase tracking-wider">Ticket Médio</CardTitle>
                            <TrendingUp className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{formatCurrency(metrics.ticketMedio)}</div>
                            <p className="text-xs text-orange-200/40 mt-1">Média consolidada</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Conteúdo Principal - Mapa e Tabelas */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8 h-full">
                    
                    {/* Coluna Esquerda: Tabela de Evolução e Mapa */}
                    <div className="space-y-8 flex flex-col">
                        
                         {/* Mapa */}
                         <div className="w-full">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-orange-100">Geolocalização</h3>
                            </div>
                            <MapPanel />
                        </div>

                        {/* Tabela Evolução */}
                        <div className="flex-1 rounded-2xl border border-orange-500/10 bg-slate-900/30 backdrop-blur-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-orange-500/10 bg-orange-950/10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-orange-100">Performance Histórica</h3>
                                    <p className="text-xs text-orange-200/50">Consolidado das últimas 7 semanas</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-orange-950/20 text-orange-200/70 uppercase text-xs font-medium">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Período</th>
                                            <th className="px-6 py-3 text-right">Pedidos</th>
                                            <th className="px-6 py-3 text-right">GMV</th>
                                            <th className="px-6 py-3 text-right">Ticket</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-orange-500/5 text-slate-300">
                                        {currentEvolution.map((row, i) => (
                                            <tr key={i} className="hover:bg-orange-500/5 transition-colors">
                                                <td className="px-6 py-4 font-medium text-orange-100/90">{row.label}</td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-400">{formatNumber(row.pedidos)}</td>
                                                <td className="px-6 py-4 text-right font-mono text-emerald-400">{formatCurrency(row.gmv)}</td>
                                                <td className="px-6 py-4 text-right font-mono text-amber-400">{formatCurrency(row.ticket)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Lojas e Insights */}
                    <div className="space-y-8">
                         <div className="rounded-2xl border border-orange-500/10 bg-slate-900/30 backdrop-blur-sm overflow-hidden h-full">
                            <div className="px-6 py-4 border-b border-orange-500/10 bg-orange-950/10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-orange-100">Lojas Integradas</h3>
                                    <p className="text-xs text-orange-200/50">Ranking de performance atual</p>
                                </div>
                                <Store className="h-4 w-4 text-orange-500" />
                            </div>
                            <div className="p-0">
                                {metrics.activeStores.length === 0 ? (
                                    <div className="p-8 text-center text-orange-200/40 text-sm">
                                        Nenhuma loja integrada no momento.
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-orange-500/5">
                                            {metrics.activeStores.map((store, idx) => (
                                                <tr key={idx} className="hover:bg-orange-500/5">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold text-xs">
                                                                {idx + 1}
                                                            </div>
                                                            <span className="font-medium text-orange-50">{store.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-mono text-emerald-400">{formatCurrency(store.gmv)}</div>
                                                        <div className="text-xs text-slate-500">{store.orders} pedidos</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                         {/* Card Promocional / CTA */}
                         <div className="rounded-2xl bg-gradient-to-br from-orange-600 to-orange-800 p-6 text-white shadow-xl shadow-orange-900/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                            <h3 className="text-xl font-bold mb-2">Escale sua operação</h3>
                            <p className="text-orange-100 text-sm mb-4">Conecte mais lojas para ter uma visão 360º do seu ecossistema de vendas.</p>
                            <Button variant="secondary" className="w-full bg-white text-orange-700 hover:bg-orange-50 border-none font-semibold">
                                Conectar Nova Loja
                            </Button>
                         </div>
                    </div>
                </div>
            </>
            )}
        </div>
    </div>
  );
}
