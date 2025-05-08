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

// Importar marked dinamicamente para evitar erros de SSR
const marked = dynamic(() => import("marked").then((mod) => mod.marked), {
  ssr: false,
});

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
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [selectedAnalysisContent, setSelectedAnalysisContent] = useState<
    string | null
  >(null);
  const [selectedTab, setSelectedTab] = useState("info");
  const [deleteClient, { isLoading: isDeleting }] = useDeleteClientMutation();

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
      const response = await fetch(`/api/analises?id=${analysisId}`);
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
      if (
        !data ||
        !data.analysis_results ||
        data.analysis_results.length === 0
      ) {
        throw new Error("Conteúdo não encontrado");
      }

      const content = data.analysis_results[0].content;

      const pdfResponse = await fetch("/api/analises/generate", {
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

      if (!pdfResponse.ok) {
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

  // Renderização condicional para marcação HTML
  const renderMarkdown = (content: string) => {
    if (typeof window === "undefined" || !marked) {
      return { __html: "Carregando..." };
    }
    return { __html: marked(content) };
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSelectedTab("edit")}>
            Editar Cliente
          </Button>
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
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full md:w-[600px] grid-cols-3">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="analyses">
            Análises ({analyses.length})
          </TabsTrigger>
          <TabsTrigger value="edit">Editar</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
