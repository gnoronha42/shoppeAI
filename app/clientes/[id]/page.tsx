"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientForm } from "@/components/client/client-form";
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
import { useGetClientQuery, useGetClientReportsQuery, useDeleteClientMutation } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

interface AnalysisResult {
  filename: string;
  analysis: string;
}

interface StoredAnalysis {
  date: number;
  results: AnalysisResult[];
}

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = params.id as string;
  const [storedAnalyses, setStoredAnalyses] = useState<StoredAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("info");
  const [deleteClient, { isLoading: isDeleting }] = useDeleteClientMutation();

  const { data: client, isLoading: isClientLoading, refetch: refetchClient } = useGetClientQuery(clientId);
  const { data: reports = [], isLoading: isReportsLoading } = useGetClientReportsQuery(clientId);

  useEffect(() => {
    // Recuperar análises armazenadas no localStorage
    const analyses: StoredAnalysis[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`analysis_${clientId}`)) {
        try {
          const dateStr = key.split('_')[2];
          const results = JSON.parse(localStorage.getItem(key) || '[]');
          analyses.push({
            date: parseInt(dateStr),
            results
          });
        } catch (error) {
          console.error("Erro ao recuperar análise:", error);
        }
      }
    }
    
    // Ordenar análises da mais recente para a mais antiga
    analyses.sort((a, b) => b.date - a.date);
    setStoredAnalyses(analyses);
  }, [clientId]);

  const handleDeleteClient = async () => {
    try {
      await deleteClient(clientId).unwrap();
      toast({
        title: "Cliente excluído com sucesso",
        description: "O cliente foi removido permanentemente",
        variant: "default",
      });
      router.push('/clientes');
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

  const generatePDF = (analysis: StoredAnalysis) => {
    toast({
      title: "Gerando PDF...",
      description: "O PDF da análise está sendo gerado",
      variant: "default",
    });
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
        <Button variant="outline" className="mt-4" onClick={() => router.push('/clientes')}>
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
          <Button variant="ghost" size="icon" onClick={() => router.push('/clientes')}>
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
          <Button 
            variant="outline" 
            onClick={() => setSelectedTab("edit")}
          >
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
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente 
                  "{client.name}" e todos os dados associados a ele.
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
          <TabsTrigger value="analyses">Análises ({storedAnalyses.length})</TabsTrigger>
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
                      <p className="text-muted-foreground">{client.ownerName}</p>
                    </div>
                  
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   
                    
                    
                    
                    
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm">Data de Registro</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                     
                    
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => router.push('/analise')}
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Nova Análise
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="analyses" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Análises IA ({storedAnalyses.length})</CardTitle>
              <CardDescription>
                Análises de IA geradas a partir dos prints da loja
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storedAnalyses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhuma análise de IA foi gerada ainda para este cliente.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => router.push('/analise')}
                    >
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Realizar Análise
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      {storedAnalyses.map((analysis, index) => (
                        <Card 
                          key={index} 
                          className={`cursor-pointer hover:shadow-md transition-shadow ${selectedAnalysis === `${analysis.date}` ? 'ring-2 ring-orange-500' : ''}`}
                          onClick={() => setSelectedAnalysis(`${analysis.date}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">Análise #{storedAnalyses.length - index}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(analysis.date), "PPpp", { locale: ptBR })}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {analysis.results.length} imagens analisadas
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge variant="outline">
                                  {analysis.results[0]?.filename.includes('account') ? 'Conta' : 'Anúncios'}
                                </Badge>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    generatePDF(analysis);
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {selectedAnalysis && (
                      <Card className="mt-6">
                        <CardHeader>
                          <CardTitle>Resultado da Análise</CardTitle>
                          <CardDescription>
                            {format(new Date(parseInt(selectedAnalysis)), "PPpp", { locale: ptBR })}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {storedAnalyses
                              .find(a => `${a.date}` === selectedAnalysis)
                              ?.results.map((result, index) => (
                                <div key={index} className="space-y-2">
                                  <h3 className="font-medium">Imagem: {result.filename}</h3>
                                  <div className="p-4 bg-muted rounded-md whitespace-pre-wrap">
                                    {result.analysis}
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end">
                          <Button 
                            variant="outline"
                            onClick={() => generatePDF(storedAnalyses.find(a => `${a.date}` === selectedAnalysis)!)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Baixar PDF
                          </Button>
                        </CardFooter>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
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
              <ClientForm 
                client={client} 
                onSuccess={handleClientUpdate} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}