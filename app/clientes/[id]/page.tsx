"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart, FileSpreadsheet, ClipboardCheck, ArrowLeft, Loader2 } from "lucide-react";
import { useGetClientQuery, useGetClientReportsQuery } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const clientId = params.id as string;
  const [storedAnalyses, setStoredAnalyses] = useState<StoredAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("reports");

  const { data: client, isLoading: isClientLoading } = useGetClientQuery(clientId);
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
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push('/clientes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground">
            Visualize informações e relatórios do cliente
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-orange-100 text-orange-800 text-xl">
                {client.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{client.name}</CardTitle>
              <CardDescription className="text-lg">
                {client.ownerName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="analyses">Análises</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios ({reports.length})</CardTitle>
              <CardDescription>
                Relatórios gerados para este cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isReportsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum relatório foi gerado ainda para este cliente.
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
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            Relatório de {report.type === "account" ? "Conta" : "Anúncios"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(report.createdAt), "PPpp", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant={report.type === "account" ? "outline" : "secondary"}>
                          {report.type === "account" ? "Conta" : "Anúncios"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <BarChart className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analyses" className="space-y-4 mt-4">
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
                              <Badge variant="outline">
                                {analysis.results[0]?.filename.includes('account') ? 'Conta' : 'Anúncios'}
                              </Badge>
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
                      </Card>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}