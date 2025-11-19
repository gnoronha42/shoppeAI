"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientForm } from "@/components/client/client-form";
import { ClientChecklist } from "@/components/client/client-checklist";
import dynamic from "next/dynamic";
import {
  FileText,
  BarChart,
  FileSpreadsheet,
  ClipboardCheck,
  ArrowLeft,
  Loader2,
  Link as LinkIcon,
  Download,
  CalendarIcon,
  TrendingUp,
  Plus,
} from "lucide-react";
import {
  useGetClientQuery,
  useGetClientReportsQuery,
  useDeleteClientMutation,
  useGetClientAnalysesQuery,
} from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";

// Importar marked dinamicamente para evitar erros de SSR
import { marked } from "marked";

// +++ INÍCIO DO NOVO COMPONENTE DE INTEGRAÇÃO
function ShopeeIntegration({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<{ connected: boolean; shop_id?: string; token_expiry?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/shopee/status?client_id=${clientId}`, { cache: 'no-store' });
        const data = await res.json();
        if(res.ok) {
          setStatus(data);
        } else {
          throw new Error(data.error || 'Falha ao buscar status');
        }
      } catch (e: any) {
        console.error(e);
        toast({ title: 'Erro', description: e.message || 'Falha ao consultar status', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [clientId, toast]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      // O endpoint /connect agora redireciona diretamente via backend
      // O parâmetro 'redirect_success' diz para onde voltar na nossa app
      const successUrl = new URL(`/clientes/${clientId}`, window.location.origin);
      successUrl.searchParams.set('tab', 'integrations'); // Volta para a aba de integrações

      const connectUrl = new URL('/api/shopee/connect', window.location.origin);
      connectUrl.searchParams.set('client_id', clientId);
      connectUrl.searchParams.set('redirect', '1');
      connectUrl.searchParams.set('redirect_success', successUrl.toString());

      // Redireciona o usuário para o backend, que por sua vez redireciona para a Shopee
      window.location.href = connectUrl.toString();
      
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao conectar', description: e.message || 'Tente novamente', variant: 'destructive' });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando status...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="font-medium">
            Status: {' '}
            <Badge variant={status?.connected ? 'default' : 'destructive'} className={status?.connected ? 'bg-green-600' : ''}>
              {status?.connected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </p>
          {status?.connected && status.shop_id && (
            <p className="text-sm text-muted-foreground">Shop ID: {status.shop_id}</p>
          )}
          {status?.token_expiry && (
            <p className="text-sm text-muted-foreground">
              Token expira em: {new Date(status.token_expiry).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <Button onClick={handleConnect} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
          <LinkIcon className="mr-2 h-4 w-4" />
          {status?.connected ? 'Reconectar' : 'Conectar com Shopee'}
        </Button>
      </div>
    </div>
  );
}
// +++ FIM DO NOVO COMPONENTE DE INTEGRAÇÃO

interface StoredAnalysis {
  id: string;
  title: string;
  type: string;
  created_at: string;
  content?: string;
}

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = params.id as string;
  const { hasPermission } = useAuth();
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [selectedAnalysisContent, setSelectedAnalysisContent] = useState<
    string | null
  >(null);
  const [selectedTab, setSelectedTab] = useState("info");
  const [deleteClient, { isLoading: isDeleting }] = useDeleteClientMutation();

  // Estados para relatório histórico
  const [historicalReportType, setHistoricalReportType] = useState<'account' | 'ads'>('account');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [isGeneratingHistoricalReport, setIsGeneratingHistoricalReport] = useState(false);
  const [historicalReportContent, setHistoricalReportContent] = useState<string | null>(null);

  // Adicionar estes estados no componente (após os estados existentes)
  const [comparisonContent, setComparisonContent] = useState<string | null>(null);
  const [isGeneratingComparison, setIsGeneratingComparison] = useState(false);
  const [comparisonReportId, setComparisonReportId] = useState<string | null>(null);

  const {
    data: client,
    isLoading: isClientLoading,
    refetch: refetchClient,
  } = useGetClientQuery(clientId);
  const { data: reports = [], isLoading: isReportsLoading } =
    useGetClientReportsQuery(clientId);
  const {
    data: analyses = [],
    isLoading: isAnalysesLoading,
    refetch: refetchAnalyses,
    error: analysesError,
  } = useGetClientAnalysesQuery(clientId);

  useEffect(() => {
    // Checa se a URL tem um parâmetro para abrir uma aba específica
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setSelectedTab(tab);
    }
  }, []);

  useEffect(() => {
    console.log("Cliente ID:", clientId);
    console.log("Análises carregadas:", analyses);
    console.log("Erro de análises:", analysesError);
  }, [clientId, analyses, analysesError]);

  const handleDeleteClient = async () => {
    try {
      await deleteClient(clientId).unwrap();
      toast({
        title: "Cliente excluído com sucesso",
        description: "O cliente foi removido permanentemente",
        variant: "default",
      });
      router.push("/clientes");
    } catch (error: any) {
      console.error("Erro ao excluir cliente:", error);
      toast({
        title: "Erro ao excluir cliente",
        description: error?.data?.error || "Não foi possível excluir o cliente",
        variant: "destructive",
      });
    }
  };

  const handleClientUpdate = () => {
    refetchClient();
    toast({
      title: "Cliente atualizado",
      description: "As informações do cliente foram atualizadas com sucesso",
      variant: "default",
    });
    setSelectedTab("info");
  };

  const handleViewAnalysis = async (analysisId: string) => {
    const analysis = analyses.find((a) => a.id === analysisId);
    console.log("Análise selecionada:", analysis);

    if (analysis && analysis.content) {
      console.log("Usando conteúdo já carregado da análise");
      setSelectedAnalysisContent(analysis.content);
      setSelectedAnalysis(analysisId);
      return;
    }

    try {
      console.log("Buscando conteúdo da análise:", analysisId);
      const response = await fetch(`/api/analises?id=${analysisId}`, {
        credentials: 'include', // Enviar cookies automaticamente
      });
      if (!response.ok) {
        throw new Error("Erro ao carregar análise");
      }

      const data = await response.json();
      console.log("Dados recebidos da API:", data);

      if (data && data.analysis_results && data.analysis_results.length > 0) {
        setSelectedAnalysisContent(data.analysis_results[0].content);
        setSelectedAnalysis(analysisId);
      } else {
        console.warn("Conteúdo da análise não encontrado:", data);
        toast({
          title: "Conteúdo não encontrado",
          description: "Não foi possível carregar o conteúdo desta análise",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar análise:", error);
      toast({
        title: "Erro ao carregar análise",
        description: "Ocorreu um erro ao buscar o conteúdo da análise",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAnalysis = async (analysisId: string) => {
    try {
      console.log("Excluindo análise:", analysisId);

      // Corrigido para usar o searchParam ao invés de path param
      const response = await fetch(`/api/analises/save?id=${analysisId}`, {
        method: "DELETE",
        credentials: 'include', // Enviar cookies automaticamente
      });

      const responseText = await response.text();
      console.log("Resposta da exclusão:", response.status, responseText);

      if (!response.ok) {
        throw new Error(
          `Erro ao excluir análise: ${response.status} ${responseText}`
        );
      }

      // Atualizar a lista de análises usando o refetch do RTK Query
      console.log("Atualizando lista de análises após exclusão");
      await refetchAnalyses();

      toast({
        title: "Análise excluída",
        description: "A análise foi excluída com sucesso",
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao excluir análise:", error);
      toast({
        title: "Erro ao excluir análise",
        description: "Ocorreu um erro ao excluir a análise",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (analysisId: string) => {
    try {
      const analysis = analyses.find((a) => a.id === analysisId);
      if (!analysis) {
        throw new Error("Análise não encontrada");
      }

      const response = await fetch(`/api/analises?id=${analysisId}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar análise");
      }

      const data = await response.json();

      // Adicionar log para debugar a estrutura dos dados
      console.log("Dados retornados da API para PDF:", data);

      let content = null;

      // Tentar diferentes estruturas de dados possíveis
      if (data && data.analysis_results && data.analysis_results.length > 0) {
        content = data.analysis_results[0].content;
      } else if (data && data.content) {
        content = data.content;
      } else if (analysis && analysis.content) {
        content = analysis.content;
      }

      if (!content) {
        console.error("Estrutura de dados recebida:", data);
        throw new Error("Conteúdo da análise não encontrado");
      }

      // NOVA LÓGICA: Primeira tentativa de geração do PDF
      let pdfResponse = await fetch("/api/analises/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          markdown: content,
          clientName: client?.name || "Cliente",
          analysisType: analysis.type,
        }),
      });

      // Verificar se o PDF precisa ser regenerado
      if (pdfResponse.status === 422) {
        const errorData = await pdfResponse.json();

        if (errorData.shouldRegenerate) {
          console.log("⚠️ Relatório incompleto detectado. Seções faltantes:", errorData.missingSections);

          toast({
            title: "Relatório incompleto detectado",
            description: "Gerando nova versão com todas as seções...",
            variant: "default",
          });

          // SEGUNDA TENTATIVA: Tentar novamente após 2 segundos
          await new Promise(resolve => setTimeout(resolve, 2000));

          pdfResponse = await fetch("/api/analises/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              markdown: content,
              clientName: client?.name || "Cliente",
              analysisType: analysis.type,
              forceComplete: true, // Flag para forçar completude
            }),
          });
        }
      }

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        console.error("Erro na resposta do PDF:", pdfResponse.status, errorText);
        throw new Error("Erro ao gerar PDF");
      }

      const blob = await pdfResponse.blob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_${client?.name || "Cliente"}.pdf`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF gerado com sucesso",
        description: "O PDF foi gerado e baixado",
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o PDF da análise",
        variant: "destructive",
      });
    }
  };

  // Função para gerar relatório histórico (mockada)
  const handleGenerateHistoricalReport = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Selecione o período",
        description: "É necessário selecionar uma data de início e fim",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeneratingHistoricalReport(true);

      // TODO: Descomentar quando a implementação real estiver pronta
      /*
      const response = await fetch('/api/analises/historical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId,
          type: historicalReportType,
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar relatório histórico');
      }

      const data = await response.json();
      
      // Aqui você pode chamar seu microserviço com os dados históricos
      // const historicalAnalysis = await callHistoricalAnalysisService(data.data);
      
      setHistoricalReportContent(historicalAnalysis);
      */

      // Simular delay de processamento (versão mockada)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock de conteúdo do relatório histórico
      const mockHistoricalReport = `
# 📊 RELATÓRIO HISTÓRICO - ${client?.name}

**Período:** ${dateRange.from.toLocaleDateString('pt-BR')} a ${dateRange.to.toLocaleDateString('pt-BR')}
**Tipo de Análise:** ${historicalReportType === 'account' ? 'Conta' : 'Anúncios'}

## 📈 Resumo Executivo

Durante o período analisado, identificamos **${Math.floor(Math.random() * 5) + 3}** análises do tipo ${historicalReportType === 'account' ? 'conta' : 'anúncios'}.

### Principais Insights:
- **Crescimento médio:** +${Math.floor(Math.random() * 20) + 15}%
- **ROAS médio:** ${(Math.random() * 3 + 8).toFixed(2)}x
- **Conversão média:** ${(Math.random() * 2 + 2).toFixed(2)}%

## 📋 Análise Detalhada

### Evolução das Métricas
- **GMV Total:** R$ ${(Math.random() * 50000 + 10000).toLocaleString('pt-BR')}
- **Pedidos:** ${Math.floor(Math.random() * 500) + 100}
- **Ticket Médio:** R$ ${(Math.random() * 100 + 50).toFixed(2)}

### Tendências Identificadas
1. **Melhoria na conversão** nos últimos ${Math.floor(Math.random() * 10) + 5} dias
2. **Aumento no tráfego orgânico** de ${Math.floor(Math.random() * 30) + 10}%
3. **Otimização das campanhas** resultou em ROAS superior

## 🎯 Recomendações Baseadas no Histórico

### Ações Imediatas:
- Escalar campanhas com ROAS > 8x
- Implementar estratégias que funcionaram no período
- Ajustar orçamento com base nos melhores dias

### Próximos Passos:
- Continuar monitoramento das métricas principais
- Testar novas segmentações baseadas no histórico
- Implementar automações para manter performance

---
*Relatório gerado em ${new Date().toLocaleString('pt-BR')}*
      `;

      setHistoricalReportContent(mockHistoricalReport);

      toast({
        title: "Relatório histórico gerado!",
        description: "O relatório foi gerado com base nas análises do período selecionado",
        variant: "default",
      });

    } catch (error) {
      console.error("Erro ao gerar relatório histórico:", error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao processar o relatório histórico",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingHistoricalReport(false);
    }
  };

  // Adicionar esta função após handleGenerateHistoricalReport
  const handleGenerateComparison = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Selecione o período",
        description: "É necessário selecionar uma data de início e fim",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeneratingComparison(true);

      const response = await fetch('/api/analises/comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId,
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
          analysisType: historicalReportType,
          maxAnalyses: 100, // Permitir até 100 análises por comparação
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar comparação');
      }

      const {
        comparison,
        reportId,
        analysesCount,
        totalAnalysesFound,
        period,
        optimization,
        insightsUsed,
        fullAnalysesUsed,
        warning,
        tokenLimitReached
      } = await response.json();

      setComparisonContent(comparison);
      setComparisonReportId(reportId);

      let toastMessage = `Baseado em ${analysesCount} análises`;
      if (totalAnalysesFound && totalAnalysesFound > analysesCount) {
        toastMessage += ` de ${totalAnalysesFound} encontradas`;
      }
      toastMessage += ` (${insightsUsed} otimizadas, ${fullAnalysesUsed} completas)`;

      if (optimization?.reductionPercentage) {
        toastMessage += `. ${optimization.reductionPercentage}% tokens economizados`;
      }

      if (warning) {
        toastMessage += `. ${warning}`;
      }

      toast({
        title: tokenLimitReached ? "Comparação gerada com limitações" : "Análise comparativa gerada!",
        description: toastMessage,
        variant: tokenLimitReached ? "destructive" : "default",
      });

    } catch (error: any) {
      console.error("Erro ao gerar comparação:", error);
      toast({
        title: "Erro ao gerar comparação",
        description: error.message || "Ocorreu um erro ao processar a comparação histórica",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingComparison(false);
    }
  };

  // Renderização condicional para marcação HTML
  const renderMarkdown = (content: string) => {
    if (typeof window === "undefined" || !marked) {
      return { __html: "Carregando..." };
    }
    // @ts-ignore
    if (typeof marked.parse === "function") {
      // @ts-ignore
      return { __html: marked.parse(content) };
    }
    // @ts-ignore
    if (typeof marked.default === "function") {
      // @ts-ignore
      return { __html: marked.default(content) };
    }
    return { __html: "Erro ao renderizar markdown" };
  };

  const isComparison = (report: any) => {
    return report.title?.includes('COMPARAÇÃO') ||
      report.analysis_results?.[0]?.processed_by === 'comparison-service';
  };

  if (isClientLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Cliente não encontrado</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/clientes")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/clientes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie informações do cliente
            </p>
          </div>
        </div>
        {hasPermission('edit_clients') && (
          <div className="flex gap-2">
            {hasPermission('edit_clients') && (
              <Button variant="outline" onClick={() => setSelectedTab("edit")}>
                Editar Cliente
              </Button>
            )}

            {hasPermission('delete_clients') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Excluir</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente
                      o cliente &quot;{client.name}&quot; e todos os dados
                      associados a ele.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteClient}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Excluindo..." : "Sim, excluir cliente"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full md:w-[800px] grid-cols-4">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="analyses">
            Análises ({analyses.length})
          </TabsTrigger>
          <TabsTrigger value="historical">Relatório Histórico</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Detalhes da Loja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-orange-100 text-orange-800 text-xl">
                    {client.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-3 w-full">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold">{client.name}</h3>
                      <p className="text-muted-foreground">
                        {client.ownerName}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4"></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm">Data de Registro</span>
                      </div>
                    </div>

                    <div className="space-y-1"></div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" onClick={() => router.push("/analise")}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Nova Análise
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="analyses" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isAnalysesLoading ? (
              <div className="col-span-full flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : analyses.length === 0 ? (
              <div className="col-span-full text-center py-8 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">
                  Nenhuma análise encontrada para este cliente
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push("/analise")}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Criar Nova Análise
                </Button>
              </div>
            ) : (
              <>
                {analyses.map((analysis) => (
                  <Card key={analysis.id} className="overflow-hidden">
                    <CardHeader className="pb-2 flex flex-row items-center">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {analysis.title}
                        </CardTitle>
                        <CardDescription>
                          {new Date(analysis.created_at).toLocaleString(
                            "pt-BR"
                          )}
                          {analysis.creator && (
                            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
                              por {analysis.creator.name}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          analysis.type === "account" ? "outline" : "secondary"
                        }
                      >
                        {analysis.type === "account" ? "Conta" : "Anúncios"}
                      </Badge>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAnalysis(analysis.id)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Visualizar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(analysis.id)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          PDF
                        </Button>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full"
                        onClick={() => handleDeleteAnalysis(analysis.id)}
                      >
                        Excluir Análise
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </>
            )}
          </div>

          {selectedAnalysis && selectedAnalysisContent && (
            <Card className="mt-8">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Visualização da Análise</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedAnalysis(null);
                      setSelectedAnalysisContent(null);
                    }}
                  >
                    Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div
                    dangerouslySetInnerHTML={renderMarkdown(
                      selectedAnalysisContent
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historical" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Relatório Histórico
              </CardTitle>
              <CardDescription>
                Gere um relatório consolidado baseado nas análises anteriores do cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seleção de período */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Período de Análise</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            dateRange.from.toLocaleDateString('pt-BR')
                          ) : (
                            "Selecione a data inicial"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                          disabled={(date) =>
                            date > new Date() || date < new Date("2020-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange.to && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.to ? (
                            dateRange.to.toLocaleDateString('pt-BR')
                          ) : (
                            "Selecione a data final"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                          disabled={(date) =>
                            date > new Date() ||
                            date < new Date("2020-01-01") ||
                            (dateRange.from ? date < dateRange.from : false)
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Seleção do tipo de análise */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de Análise</Label>
                <RadioGroup
                  value={historicalReportType}
                  onValueChange={(value) => setHistoricalReportType(value as 'account' | 'ads')}
                  className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="account" id="historical-account" />
                    <Label htmlFor="historical-account" className="cursor-pointer">
                      Análise de Conta
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ads" id="historical-ads" />
                    <Label htmlFor="historical-ads" className="cursor-pointer">
                      Análise de Anúncios
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  {historicalReportType === "account"
                    ? "Consolidará análises de desempenho geral da conta no período selecionado"
                    : "Consolidará análises de campanhas publicitárias no período selecionado"}
                </p>
              </div>

              {/* Botões de geração - AQUI É O LOCAL CORRETO */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end">

                <Button
                  onClick={handleGenerateComparison}
                  disabled={!dateRange.from || !dateRange.to || isGeneratingComparison}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {isGeneratingComparison
                    ? "Gerando Comparação..."
                    : "Comparar Análises"
                  }
                </Button>
              </div>

              {/* Informações adicionais */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">

                  <strong>Comparar Análises:</strong> Analisa múltiplas análises do período usando IA para identificar tendências e insights evolutivos.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Visualização do relatório histórico */}
          {historicalReportContent && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Relatório Histórico Gerado</CardTitle>
                  <CardDescription>
                    Período: {dateRange.from?.toLocaleDateString('pt-BR')} a {dateRange.to?.toLocaleDateString('pt-BR')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Aqui você pode implementar a funcionalidade de download do PDF
                      toast({
                        title: "Funcionalidade em desenvolvimento",
                        description: "Download do PDF do relatório histórico será implementado em breve",
                        variant: "default",
                      });
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHistoricalReportContent(null)}
                  >
                    Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div
                    dangerouslySetInnerHTML={renderMarkdown(historicalReportContent)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Adicionar após o card do relatório histórico */}
          {comparisonContent && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Análise Comparativa Histórica</CardTitle>
                  <CardDescription>
                    Comparação baseada nas análises do período selecionado
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch("/api/analises/generate", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            markdown: comparisonContent,
                            clientName: client?.name || "Cliente",
                            analysisType: "comparison",
                          }),
                        });

                        if (!response.ok) {
                          throw new Error("Erro ao gerar PDF");
                        }

                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `comparacao_${client?.name || "Cliente"}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);

                        toast({
                          title: "PDF gerado com sucesso",
                          description: "A comparação foi baixada em PDF",
                          variant: "default",
                        });
                      } catch (error) {
                        console.error("Erro ao gerar PDF:", error);
                        toast({
                          title: "Erro ao gerar PDF",
                          description: "Ocorreu um erro ao gerar o PDF da comparação",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setComparisonContent(null)}
                  >
                    Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div
                    dangerouslySetInnerHTML={renderMarkdown(comparisonContent)}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="edit" className="mt-6">
          <Card>
            <CardHeader>

              <CardTitle>Editar Cliente</CardTitle>
              <CardDescription>
                Atualize as informações do cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientForm client={client} onSuccess={handleClientUpdate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="mt-6">
          <ClientChecklist clientId={clientId} clientName={client.name} />
        </TabsContent>

        {/* +++ INÍCIO DA NOVA ABA DE INTEGRAÇÕES */}
        <TabsContent value="integrations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <img src="/assets/shopee-logo.png" alt="Shopee" className="h-6 w-6" />
                Integração com Shopee
              </CardTitle>
              <CardDescription>
                Vincule a conta Shopee deste cliente para sincronizar dados de vendas e produtos automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShopeeIntegration clientId={clientId} />
            </CardContent>
          </Card>
        </TabsContent>
        {/* +++ FIM DA NOVA ABA DE INTEGRAÇÕES */}
      </Tabs>
    </div>
  );
}
