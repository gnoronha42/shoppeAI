export interface DashboardConfig {
  gmvGeral: number;
  investimentoAds: number;
  ctrGeral: number;
  numeroPedidos: number;
  numeroVisitas: number;
  cpaMedio: number;
}

export interface CalculatedMetrics {
  roi: string;
  taxaConversao: string;
  lucro: string;
}

export interface ChartData {
  vendasMensais: Array<{
    name: string;
    vendas: number;
  }>;
  distribuicaoNichos: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  trafegoConversao: Array<{
    name: string;
    visitas: number;
    conversoes: number;
  }>;
} 