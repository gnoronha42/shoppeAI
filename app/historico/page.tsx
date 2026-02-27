"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, FileSpreadsheet, FileText, Search, Download, Eye, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

// Tipos para os dados
interface AnalysisHistory {
  id: string;
  clientId: string;
  clientName: string;
  ownerName: string;
  type: string;
  title: string | null;
  createdAt: string;
  createdBy: string;
  size: string;
  hasResults: boolean;
  imagesCount: number;
}

interface HistoryResponse {
  analyses: AnalysisHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    total: number;
    byType: Record<string, number>;
  };
}

export default function HistoricoPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  
  // Função para buscar dados do histórico
  const fetchHistory = async (searchValue = searchTerm, typeFilter = activeTab, pageNum = page) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        type: typeFilter,
        search: searchValue,
        page: pageNum.toString(),
        limit: '20'
      });
      
      const response = await fetch(`/api/historico?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar histórico');
      }
      
      const data: HistoryResponse = await response.json();
      setHistoryData(data);
      
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de análises');
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar dados iniciais
  useEffect(() => {
    fetchHistory();
  }, []);
  
  // Atualizar quando mudar tab ou busca
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      fetchHistory(searchTerm, activeTab, 1);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, activeTab]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'account': return 'Conta';
      case 'ads': return 'Anúncios';
      case 'express': return 'Express';
      default: return type;
    }
  };
  
  const handleDownloadPDF = async (analysis: AnalysisHistory) => {
    try {
      toast.info('Gerando PDF...');
      
      // Buscar o conteúdo completo da análise
      const response = await fetch(`/api/analises?id=${analysis.id}`);
      if (!response.ok) throw new Error('Erro ao buscar análise');
      
      const analysisData = await response.json();
      const content = analysisData.analysis_results?.[0]?.content;
      
      if (!content) {
        toast.error('Conteúdo da análise não encontrado');
        return;
      }
      
      // Gerar PDF
      const baseUrl = process.env.NEXT_PUBLIC_ANALYSIS_MICRO_URL || 'https://analysis-micro.onrender.com';
      const pdfResponse = await fetch(`${baseUrl}/analisepdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdown: content,
          analysisType: analysis.type,
          clientName: analysis.clientName,
        }),
      });
      
      if (!pdfResponse.ok) throw new Error('Erro ao gerar PDF');
      
      // Download do PDF
      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${analysis.clientName}-${analysis.type}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF baixado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };
  
  const filteredAnalyses = historyData?.analyses || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico</h1>
        <p className="text-muted-foreground">
          Acesse seus relatórios e análises anteriores
        </p>
        {historyData && (
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span>Total: {historyData.stats.total}</span>
            {historyData.stats.byType.account && (
              <span>Conta: {historyData.stats.byType.account}</span>
            )}
            {historyData.stats.byType.ads && (
              <span>Anúncios: {historyData.stats.byType.ads}</span>
            )}
            {historyData.stats.byType.express && (
              <span>Express: {historyData.stats.byType.express}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou proprietário..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Todos {historyData?.stats.total ? `(${historyData.stats.total})` : ''}
          </TabsTrigger>
          <TabsTrigger value="account">
            Análise de Conta {historyData?.stats.byType.account ? `(${historyData.stats.byType.account})` : ''}
          </TabsTrigger>
          <TabsTrigger value="ads">
            Análise de Ads {historyData?.stats.byType.ads ? `(${historyData.stats.byType.ads})` : ''}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                Relatórios ({filteredAnalyses.length})
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin inline" />}
              </CardTitle>
              <CardDescription>
                {activeTab === 'all' && 'Histórico de todos os relatórios gerados'}
                {activeTab === 'account' && 'Histórico de relatórios de análise de conta'}
                {activeTab === 'ads' && 'Histórico de relatórios de análise de anúncios'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando histórico...</span>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Criado por</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAnalyses.map((analysis) => (
                        <TableRow key={analysis.id}>
                          <TableCell>
                            <Link href={`/clientes/${analysis.clientId}`} className="hover:underline">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-orange-100 text-orange-800">
                                    {analysis.clientName.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{analysis.clientName}</p>
                                  <p className="text-xs text-muted-foreground">{analysis.ownerName}</p>
                                </div>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant={analysis.type === "account" ? "outline" : analysis.type === "ads" ? "secondary" : "default"}>
                              {getTypeLabel(analysis.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">
                              {analysis.title || `Análise de ${getTypeLabel(analysis.type)}`}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(analysis.createdAt)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {analysis.createdBy}
                            </span>
                          </TableCell>
                          <TableCell>{analysis.size}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  // Visualizar análise - redirecionar para página de análise
                                  window.open(`/analise?analysisId=${analysis.id}`, '_blank');
                                }}
                                title="Visualizar análise"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDownloadPDF(analysis)}
                                title="Baixar PDF"
                                disabled={!analysis.hasResults}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  // Análise detalhada - abrir página do cliente
                                  window.open(`/clientes/${analysis.clientId}`, '_blank');
                                }}
                                title="Ver detalhes do cliente"
                              >
                                <BarChart className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredAnalyses.length === 0 && !loading && (
                    <div className="py-8 text-center">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'Nenhum relatório encontrado para sua busca' : 'Nenhum relatório encontrado'}
                      </p>
                      {searchTerm && (
                        <Button 
                          variant="outline" 
                          onClick={() => setSearchTerm('')}
                          className="mt-2"
                        >
                          Limpar busca
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Paginação */}
                  {historyData && historyData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <div className="text-sm text-muted-foreground">
                        Página {historyData.pagination.page} de {historyData.pagination.totalPages}
                        {' '}({historyData.pagination.total} total)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = page - 1;
                            setPage(newPage);
                            fetchHistory(searchTerm, activeTab, newPage);
                          }}
                          disabled={!historyData.pagination.hasPrev || loading}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = page + 1;
                            setPage(newPage);
                            fetchHistory(searchTerm, activeTab, newPage);
                          }}
                          disabled={!historyData.pagination.hasNext || loading}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}