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
import Image from "next/image";
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
  ShoppingBag,
  Video,
  Info
} from "lucide-react";
import {
  useGetClientQuery,
  useGetClientReportsQuery,
  useDeleteClientMutation,
  useGetClientAnalysesQuery,
  useGetShopeeShopInfoQuery,
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
import shopeeLogo from "../../../assets/shoppeLogo.png";
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

  // Gera link de conexão para compartilhar com o cliente (copia para área de transferência)
  const handleGenerateConnectLink = async () => {
    try {
      setLoading(true);
      // Redireciona para rota pública após o OAuth (cliente não entra na aplicação logada)
      const successUrl = new URL(`/obrigado`, window.location.origin);
      successUrl.searchParams.set('integracao', 'shopee');
      successUrl.searchParams.set('status', 'ok');
      successUrl.searchParams.set('client_id', clientId);

      const url = new URL('/api/shopee/connect', window.location.origin);
      url.searchParams.set('client_id', clientId);
      // Não usar redirect=1 => retorna JSON com { url }
      url.searchParams.set('redirect_success', successUrl.toString());

      const res = await fetch(url.toString(), { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Falha ao gerar link');
      }

      // Copia para área de transferência
      await navigator.clipboard.writeText(data.url);
      toast({
        title: 'Link de conexão gerado',
        description: 'O link foi copiado para a área de transferência',
        variant: 'default',
      });
    } catch (e: any) {
      console.error('Erro ao gerar link de conexão:', e);
      toast({
        title: 'Erro ao gerar link',
        description: e?.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
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
        <div className="flex gap-2">
          <Button onClick={handleConnect} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
            <LinkIcon className="mr-2 h-4 w-4" />
            {status?.connected ? 'Reconectar' : 'Conectar com Shopee'}
          </Button>
          <Button onClick={handleGenerateConnectLink} disabled={loading} variant="outline">
            Gerar link de conexão
          </Button>
        </div>
      </div>
    </div>
  );
}
// +++ FIM DO COMPONENTE DE INTEGRAÇÃO SHOPEE (VENDAS)

// +++ INÍCIO DO COMPONENTE DE INTEGRAÇÃO SHOPEE ADS
function ShopeeAdsIntegration({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<{ 
    connected: boolean; 
    shop_id?: string; 
    token_expiry?: string | null;
    is_expired?: boolean;
    partner_id?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/shopee-ads/status?client_id=${clientId}`, { cache: 'no-store' });
        const data = await res.json();
        if(res.ok) {
          setStatus(data);
        } else {
          throw new Error(data.error || 'Falha ao buscar status de Ads');
        }
      } catch (e: any) {
        console.error(e);
        // Não mostrar toast de erro se simplesmente não existe integração
        if (!e.message?.includes('não encontrada')) {
          toast({ title: 'Erro', description: e.message || 'Falha ao consultar status de Ads', variant: 'destructive' });
        }
        setStatus({ connected: false });
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [clientId, toast]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const successUrl = new URL(`/clientes/${clientId}`, window.location.origin);
      successUrl.searchParams.set('tab', 'integrations');
      successUrl.searchParams.set('ads_connected', '1');

      const connectUrl = new URL('/api/shopee-ads/connect', window.location.origin);
      connectUrl.searchParams.set('client_id', clientId);
      connectUrl.searchParams.set('redirect', '1');
      connectUrl.searchParams.set('redirect_success', successUrl.toString());

      // Redireciona para OAuth da Shopee (App de Ads)
      window.location.href = connectUrl.toString();
      
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao conectar Ads', description: e.message || 'Tente novamente', variant: 'destructive' });
      setLoading(false);
    }
  };

  // Gera link de conexão para compartilhar com o cliente
  const handleGenerateConnectLink = async () => {
    try {
      setLoading(true);
      const successUrl = new URL(`/obrigado`, window.location.origin);
      successUrl.searchParams.set('integracao', 'shopee-ads');
      successUrl.searchParams.set('status', 'ok');
      successUrl.searchParams.set('client_id', clientId);

      const url = new URL('/api/shopee-ads/connect', window.location.origin);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_success', successUrl.toString());

      const res = await fetch(url.toString(), { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Falha ao gerar link de Ads');
      }

      await navigator.clipboard.writeText(data.url);
      toast({
        title: 'Link de conexão Ads gerado',
        description: 'O link foi copiado para a área de transferência',
        variant: 'default',
      });
    } catch (e: any) {
      console.error('Erro ao gerar link de conexão Ads:', e);
      toast({
        title: 'Erro ao gerar link',
        description: e?.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando status de Ads...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="font-medium">
            Status: {' '}
            <Badge 
              variant={status?.connected ? (status?.is_expired ? 'destructive' : 'default') : 'destructive'} 
              className={status?.connected && !status?.is_expired ? 'bg-blue-600' : ''}
            >
              {status?.connected 
                ? (status?.is_expired ? 'Token Expirado' : 'Conectado') 
                : 'Desconectado'}
            </Badge>
          </p>
          {status?.connected && status.shop_id && (
            <p className="text-sm text-muted-foreground">Shop ID: {status.shop_id}</p>
          )}
          {status?.partner_id && (
            <p className="text-sm text-muted-foreground">Partner ID: {status.partner_id}</p>
          )}
          {status?.token_expiry && (
            <p className="text-sm text-muted-foreground">
              Token expira em: {new Date(status.token_expiry).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleConnect} 
            disabled={loading} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <BarChart className="mr-2 h-4 w-4" />
            {status?.connected ? 'Reconectar Ads' : 'Conectar App de Ads'}
          </Button>
          <Button onClick={handleGenerateConnectLink} disabled={loading} variant="outline">
            Gerar link de conexão
          </Button>
        </div>
      </div>
      
      {/* Informações sobre o App de Ads */}
      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>ℹ️ App de Métricas de Ads:</strong> Esta integração é separada da integração principal 
          e permite acessar dados de campanhas publicitárias como ROAS, investimento, CPA e performance diária.
        </p>
      </div>
    </div>
  );
}
// +++ FIM DO COMPONENTE DE INTEGRAÇÃO SHOPEE ADS

// +++ INÍCIO DO COMPONENTE DE INFORMAÇÕES DA LOJA SHOPEE
function ShopeeShopInfo({ clientId }: { clientId: string }) {
  const {
    data: shopeeInfo,
    isLoading,
    error,
  } = useGetShopeeShopInfoQuery(clientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando informações da loja...
      </div>
    );
  }

  if (error || !shopeeInfo) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          <strong>⚠️ Informações não disponíveis:</strong> Não foi possível carregar os dados da loja. 
          Verifique se a integração está ativa e funcionando corretamente.
        </p>
      </div>
    );
  }

  const { shop_info } = shopeeInfo;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome da Loja */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Nome da Loja</label>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-medium">{shop_info.shop_name || 'Não informado'}</p>
          </div>
        </div>

        {/* Email da Loja */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Email</label>
          <div className="p-3 bg-muted/50 rounded-lg">
            {shop_info.shop_email ? (
              <p className="font-medium">{shop_info.shop_email}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Não disponível via API Shopee
              </p>
            )}
          </div>
        </div>

        {/* Telefone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Telefone</label>
          <div className="p-3 bg-muted/50 rounded-lg">
            {shop_info.phone ? (
              <p className="font-medium">{shop_info.phone}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Não disponível via API Shopee
              </p>
            )}
          </div>
        </div>

        {/* País */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">País</label>
          <div className="p-3 bg-muted/50 rounded-lg">
            {shop_info.country ? (
              <p className="font-medium">{shop_info.country}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Não disponível via API Shopee
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Descrição da Loja */}
      {shop_info.shop_description && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Descrição da Loja</label>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">{shop_info.shop_description}</p>
          </div>
        </div>
      )}

      {/* Badges de Status */}
      <div className="flex flex-wrap gap-2">
        {shop_info.is_cb && (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Cross Border
          </Badge>
        )}
        {shop_info.is_cnsc && (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            CNSC
          </Badge>
        )}
      </div>

      {/* Informações de Autenticação */}
      {(shop_info.auth_time || shop_info.expire_time) && (
        <div className="bg-muted/30 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Informações de Integração:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {shop_info.auth_time && (
              <div>
                <span className="font-medium">Autorizado em:</span>{' '}
                {new Date(shop_info.auth_time * 1000).toLocaleString('pt-BR')}
              </div>
            )}
            {shop_info.expire_time && (
              <div>
                <span className="font-medium">Expira em:</span>{' '}
                {new Date(shop_info.expire_time * 1000).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nota sobre limitações da API */}
      {(!shop_info.shop_email || !shop_info.phone || !shop_info.country) && (
        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">ℹ️ Sobre Email, Telefone e País:</p>
              <p>
                A API Shopee Open Platform não fornece email e telefone do seller por questões de privacidade e segurança. 
                Esses dados estão disponíveis apenas no painel Seller Center da Shopee. 
                Para obter essas informações, acesse diretamente o painel do seller.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// +++ FIM DO COMPONENTE DE INFORMAÇÕES DA LOJA SHOPEE

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

  // Buscar informações da loja Shopee (apenas para clientes Shopee integrados)
  const {
    data: shopeeInfo,
    isLoading: isShopeeInfoLoading,
    error: shopeeInfoError,
  } = useGetShopeeShopInfoQuery(clientId, {
    skip: client?.platform !== 'shopee', // Só buscar para clientes Shopee
  });

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

      if (pdfResponse.status === 422) {
        const errorData = await pdfResponse.json();

        if (errorData.shouldRegenerate) {

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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {client.name}
              <Badge variant="secondary" className={`ml-2 flex gap-1 items-center ${client.platform === 'tiktok' ? 'bg-black text-white hover:bg-gray-800' : 'bg-orange-100 text-orange-800 hover:bg-orange-200'}`}>
                 {client.platform === 'tiktok' ? <Video size={12}/> : <ShoppingBag size={12}/>}
                 {client.platform === 'tiktok' ? 'TikTok' : 'Shopee'}
              </Badge>
            </h1>
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
        <TabsList className={`grid w-full md:w-[900px] ${client.platform === 'tiktok' ? 'grid-cols-2' : 'grid-cols-5'}`}>
          <TabsTrigger value="info">Informações</TabsTrigger>
          {client.platform !== 'tiktok' && (
            <>
              <TabsTrigger value="analyses">
                Análises ({analyses.length})
              </TabsTrigger>
              <TabsTrigger value="historical">Relatório Histórico</TabsTrigger>
              <TabsTrigger value="integrations">Integrações</TabsTrigger>
            </>
          )}
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

                  {/* Informações da Loja Shopee (se integrada) */}
                  {client.platform === 'shopee' && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-orange-600" />
                          Informações da Loja Shopee
                        </h4>
                        <ShopeeShopInfo clientId={clientId} />
                      </div>
                    </>
                  )}

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

        {client.platform !== 'tiktok' && (
          <>
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
        </>
        )}

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

        {/* +++ INÍCIO DA ABA DE INTEGRAÇÕES */}
        {client.platform !== 'tiktok' && (
        <TabsContent value="integrations" className="mt-6 space-y-6">
            {/* Integração Principal - Vendas/Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image width={24} height={24} src={shopeeLogo} alt="Shopee" />
                  Integração Shopee (Vendas)
                  <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-800">
                    Principal
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Vincule a conta Shopee para sincronizar dados de vendas, pedidos e produtos automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ShopeeIntegration clientId={clientId} />
              </CardContent>
            </Card>

            {/* Integração de Ads - Métricas de Campanhas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-6 w-6 text-blue-600" />
                  Integração Shopee Ads (Métricas)
                  <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800">
                    Anúncios
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Vincule o app de Ads para acessar métricas de campanhas: ROAS, investimento, CPA, cliques e performance diária.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ShopeeAdsIntegration clientId={clientId} />
              </CardContent>
            </Card>

            {/* Card informativo */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h4 className="font-medium">📌 Por que duas integrações?</h4>
                  <p className="text-sm text-muted-foreground">
                    A Shopee Open Platform separa as permissões de API em diferentes tipos de aplicativos:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li><strong>App de Vendas (ERP):</strong> Acessa pedidos, produtos, informações da loja</li>
                    <li><strong>App de Ads:</strong> Acessa métricas de campanhas publicitárias, saldo, ROAS</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Para ter acesso completo aos dados, é necessário conectar ambos os apps com a loja.
                  </p>
                </div>
              </CardContent>
            </Card>
        </TabsContent>
        )}
        {/* +++ FIM DA ABA DE INTEGRAÇÕES */}
      </Tabs>
    </div>
  );
}
