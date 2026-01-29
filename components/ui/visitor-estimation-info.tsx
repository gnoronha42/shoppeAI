import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, Users, ShoppingCart } from "lucide-react";

interface VisitorEstimationInfoProps {
  method: 'ads_based' | 'sales_based';
  data?: {
    cliques?: number;
    multiplicador?: number;
    visitantesEstimados?: number;
    vendas?: number;
    taxaConversao?: number;
  };
}

export function VisitorEstimationInfo({ method, data = {} }: VisitorEstimationInfoProps) {
  if (method === 'ads_based') {
    return (
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Visitantes Estimados via Dados de ADS
                </h4>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  Estimativa
                </Badge>
              </div>
              
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Os dados de visitantes apresentados são <strong>estimativas calculadas</strong> com base nos cliques reais das suas campanhas de anúncios na Shopee.
              </p>

              {data.cliques && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white/50 dark:bg-blue-900/50 p-2 rounded">
                    <span className="font-medium">Cliques em Ads:</span> {data.cliques.toLocaleString('pt-BR')}
                  </div>
                  <div className="bg-white/50 dark:bg-blue-900/50 p-2 rounded">
                    <span className="font-medium">Multiplicador orgânico:</span> {data.multiplicador || 2}x
                  </div>
                  <div className="bg-white/50 dark:bg-blue-900/50 p-2 rounded">
                    <span className="font-medium">Total estimado:</span> {data.visitantesEstimados?.toLocaleString('pt-BR') || 0}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">Por que é estimativa?</p>
                    <p>A API da Shopee não fornece dados reais de visitantes da loja. Apenas o painel Seller Center possui essa informação. Por isso, usamos os dados de Ads (que são reais) para estimar o tráfego total.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-green-900 dark:text-green-100">
                Visitantes Estimados via Vendas
              </h4>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Estimativa
              </Badge>
            </div>
            
            <p className="text-sm text-green-800 dark:text-green-200">
              Os dados de visitantes apresentados são <strong>estimativas calculadas</strong> com base nas vendas reais dos seus produtos.
            </p>

            {data.vendas && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white/50 dark:bg-green-900/50 p-2 rounded">
                  <span className="font-medium">Total de vendas:</span> {data.vendas.toLocaleString('pt-BR')} unidades
                </div>
                <div className="bg-white/50 dark:bg-green-900/50 p-2 rounded">
                  <span className="font-medium">Taxa de conversão:</span> {((data.taxaConversao || 1.5) * 100).toFixed(1)}%
                </div>
                <div className="bg-white/50 dark:bg-green-900/50 p-2 rounded">
                  <span className="font-medium">Total estimado:</span> {data.visitantesEstimados?.toLocaleString('pt-BR') || 0}
                </div>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Por que é estimativa?</p>
                  <p>A API da Shopee não disponibiliza dados de tráfego ou visitantes únicos. Apenas vendas e dados de produtos são acessíveis via integração. Por isso, aplicamos uma taxa de conversão média do e-commerce para estimar quantas pessoas visitaram sua loja.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
              <ShoppingCart className="h-3 w-3" />
              <span><strong>Importante:</strong> Este é um cálculo aproximado. Para dados precisos de visitantes, consulte o painel Seller Center da Shopee.</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}