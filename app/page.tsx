'use client';

import React from 'react';
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
} from "lucide-react";
import { useDashboardConfig } from "@/hooks/use-dashboard-config";
import logo from "@/assets/logo.png";

const formatCurrency = (value: number) => `R$ ${value.toLocaleString()}`;
const formatNumber = (value: number) => value.toLocaleString();

const weeklyEvolution = [
  { label: "Há 7 semanas", sellers: 120, pedidos: 2100, gmv: 320000, ticket: 152, conversao: 2.3 },
  { label: "Há 6 semanas", sellers: 154, pedidos: 2450, gmv: 385000, ticket: 157, conversao: 2.5 },
  { label: "Há 5 semanas", sellers: 189, pedidos: 2760, gmv: 421000, ticket: 163, conversao: 2.7 },
  { label: "Há 4 semanas", sellers: 213, pedidos: 2980, gmv: 472000, ticket: 169, conversao: 2.9 },
  { label: "Há 3 semanas", sellers: 247, pedidos: 3250, gmv: 518000, ticket: 176, conversao: 3.1 },
  { label: "Há 2 semanas", sellers: 281, pedidos: 3520, gmv: 563000, ticket: 180, conversao: 3.3 },
  { label: "Última semana", sellers: 308, pedidos: 3890, gmv: 612000, ticket: 187, conversao: 3.6 },
];

const topGrowth = [
  { ranking: 1, conta: "lojax_oficial", nicho: "Moda Feminina", gmvAtual: 182000, variacao: "+38%", gmvAnterior: 132000 },
  { ranking: 2, conta: "supercasa_br", nicho: "Casa & Decoração", gmvAtual: 165000, variacao: "+33%", gmvAnterior: 124000 },
  { ranking: 3, conta: "techprime_store", nicho: "Eletrônicos", gmvAtual: 154000, variacao: "+29%", gmvAnterior: 119000 },
  { ranking: 4, conta: "beleza_viva", nicho: "Saúde & Beleza", gmvAtual: 141000, variacao: "+26%", gmvAnterior: 112000 },
  { ranking: 5, conta: "kidsworld_oficial", nicho: "Infantil", gmvAtual: 132000, variacao: "+24%", gmvAnterior: 106000 },
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
    <div className="relative h-72 w-full rounded-2xl bg-gradient-to-br from-sky-900/70 via-slate-900/70 to-slate-950/80 border border-sky-500/40 overflow-hidden">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_#22d3ee_0,_transparent_55%),radial-gradient(circle_at_bottom,_#0ea5e9_0,_transparent_60%)]" />
      <div className="absolute inset-4">
        <div className="h-full w-full rounded-xl border border-sky-500/30 bg-slate-950/40 backdrop-blur-sm relative">
          {mapPins.map((pin, index) => (
            <span
              key={index}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: pin.top, left: pin.left }}
            >
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300/80">
                <MapPin className="h-3 w-3 text-slate-950" />
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 left-5">
        <p className="text-xs font-semibold text-sky-100/90 uppercase tracking-wide">
          Distribuição de lojas monitoradas
        </p>
        <p className="text-[11px] text-sky-100/80">
          Mapa ilustrativo da concentração de clientes por região.
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const { config, getCalculatedMetrics } = useDashboardConfig();
  const metrics = getCalculatedMetrics();

  const totalSellers = weeklyEvolution[weeklyEvolution.length - 1].sellers;
  const totalPedidos = config.numeroPedidos;
  const totalGmv = config.gmvGeral;

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel de Performance</h1>
            <p className="text-sm text-slate-300 mt-1">
              Visão executiva das lojas acompanhadas com IA e integrações Shopee.
            </p>
          </div>
          <Link href="/analise">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/30">
              <Plus className="mr-2 h-4 w-4" /> Nova Análise
            </Button>
          </Link>
        </div>

        <Card className="bg-slate-900/70 border-slate-800 shadow-2xl shadow-sky-900/30 backdrop-blur-xl">
          <CardHeader className="pb-4 border-b border-slate-800/80 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 rounded-xl bg-slate-950/80 border border-slate-700 flex items-center justify-center overflow-hidden">
                <Image
                  src={logo}
                  alt="Logo"
                  className="object-contain"
                  fill
                />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-50">
                  Visão Geral Mentoria & Escalada de Lojas
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Dados consolidados dos últimos 30 dias para todas as contas conectadas.
                </CardDescription>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-right text-xs">
              <div>
                <p className="text-slate-400 uppercase tracking-wide">Lojas Ativas</p>
                <p className="text-lg font-semibold text-emerald-400">
                  {formatNumber(totalSellers)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 uppercase tracking-wide">GMV Total 30d</p>
                <p className="text-lg font-semibold text-sky-400">
                  {formatCurrency(totalGmv)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 uppercase tracking-wide">Pedidos 30d</p>
                <p className="text-lg font-semibold text-amber-400">
                  {formatNumber(totalPedidos)}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300">GMV Geral</span>
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-lg font-semibold text-emerald-300">
                      {formatCurrency(config.gmvGeral)}
                    </p>
                    <p className="text-[11px] text-emerald-200/80 mt-1">
                      ROI médio {metrics.roi}% nas contas ativas.
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-3 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300">Investimento Ads</span>
                      <Target className="h-4 w-4 text-sky-400" />
                    </div>
                    <p className="text-lg font-semibold text-sky-300">
                      {formatCurrency(config.investimentoAds)}
                    </p>
                    <p className="text-[11px] text-sky-200/80 mt-1">
                      CPA médio de {formatCurrency(config.cpaMedio)} por pedido.
                    </p>
                  </div>
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-3 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300">Pedidos</span>
                      <ShoppingBag className="h-4 w-4 text-indigo-400" />
                    </div>
                    <p className="text-lg font-semibold text-indigo-300">
                      {formatNumber(config.numeroPedidos)}
                    </p>
                    <p className="text-[11px] text-indigo-200/80 mt-1">
                      Conversão média de {metrics.taxaConversao}% das visitas.
                    </p>
                  </div>
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300">Visitas</span>
                      <Eye className="h-4 w-4 text-rose-400" />
                    </div>
                    <p className="text-lg font-semibold text-rose-300">
                      {formatNumber(config.numeroVisitas)}
                    </p>
                    <p className="text-[11px] text-rose-200/80 mt-1">
                      Tráfego consolidado de campanhas e orgânico.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-xs">
                  <p className="text-slate-300 font-medium mb-1">
                    KPIs dos últimos 7 ciclos semanais
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Evolução contínua de GMV, número de sellers e eficiência de funil por semana,
                    com base nas configurações atuais e dados das integrações.
                  </p>
                </div>
              </div>

              <MapPanel />
            </div>

            <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 backdrop-blur-md overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                      Evolução últimas semanas
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Funil consolidado das lojas com Great Mall ativo.
                    </p>
                  </div>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Semana</th>
                        <th className="px-3 py-2 text-right">Sellers</th>
                        <th className="px-3 py-2 text-right">Pedidos</th>
                        <th className="px-3 py-2 text-right">GMV</th>
                        <th className="px-3 py-2 text-right">Ticket médio</th>
                        <th className="px-3 py-2 text-right">Conversão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyEvolution.map((row, index) => (
                        <tr
                          key={row.label}
                          className={index % 2 === 0 ? "bg-slate-900/40" : "bg-slate-900/10"}
                        >
                          <td className="px-3 py-2">{row.label}</td>
                          <td className="px-3 py-2 text-right">{formatNumber(row.sellers)}</td>
                          <td className="px-3 py-2 text-right">{formatNumber(row.pedidos)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.gmv)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.ticket)}</td>
                          <td className="px-3 py-2 text-right">{row.conversao.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 backdrop-blur-md overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                      Top 5 Crescimento em Faturamento
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Contas com maior aceleração de GMV nas últimas 4 semanas.
                    </p>
                  </div>
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Ranking</th>
                        <th className="px-3 py-2 text-left">Conta</th>
                        <th className="px-3 py-2 text-left">Nicho</th>
                        <th className="px-3 py-2 text-right">GMV atual</th>
                        <th className="px-3 py-2 text-right">Variação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topGrowth.map((row) => (
                        <tr key={row.ranking} className="border-b border-slate-900/40 last:border-0">
                          <td className="px-3 py-2 text-left text-slate-400">
                            #{row.ranking}
                          </td>
                          <td className="px-3 py-2 text-left font-medium">
                            {row.conta}
                          </td>
                          <td className="px-3 py-2 text-left text-slate-300">
                            {row.nicho}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrency(row.gmvAtual)}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-semibold">
                            {row.variacao}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}