"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, AlertCircle } from "lucide-react";
import { ClientSelector } from "@/components/client/client-selector";
import { FileUpload } from "@/components/analysis/file-upload";
import { useSelector } from "react-redux";
import {
  selectSelectedClientId,
  selectSelectedClient,
} from "@/features/clients/clientSlice";
import { useToast } from "@/hooks/use-toast";
import { AnalysisType } from "@/types";
import { AnalysisTypeSelector } from "@/components/analysis/analysis-type-selector";
import { MarkdownReport } from "@/components/analysis/markdown-report";
import { PDFGenerator } from "@/components/analysis/pdf-generator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACCEPT_DATA_FILES =
  "text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .xlsx, .xls";

function isDataFile(file: File) {
  return (
    file.type === "text/csv" ||
    file.name.toLowerCase().endsWith(".csv") ||
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.name.toLowerCase().endsWith(".xls") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  );
}

function classifyFileName(name: string): string {
  const lower = name.toLowerCase();
  if (
    lower.includes("anúncio") ||
    lower.includes("anuncio") ||
    lower.includes("dados+gerais") ||
    lower.includes("dados gerais") ||
    lower.includes("ads")
  )
    return "Anúncios";
  if (
    lower.includes("shop-stats") ||
    lower.includes("shop_stats") ||
    lower.includes("shopee-shop-stats") ||
    lower.includes("estatísticas") ||
    lower.includes("estatisticas")
  )
    return "Shop-Stats";
  return "Planilha";
}

function extractPeriodFromName(name: string): string {
  const match1 = name.match(/(\d{2})_(\d{2})_(\d{4})-(\d{2})_(\d{2})_(\d{4})/);
  if (match1)
    return `${match1[1]}/${match1[2]}/${match1[3]} - ${match1[4]}/${match1[5]}/${match1[6]}`;
  const match2 = name.match(/(\d{4})(\d{2})(\d{2})-(\d{4})(\d{2})(\d{2})/);
  if (match2)
    return `${match2[3]}/${match2[2]}/${match2[1]} - ${match2[6]}/${match2[5]}/${match2[4]}`;
  return "";
}

export default function AnaliseGeminiPage() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("account");
  const [files, setFiles] = useState<File[]>([]);
  const [useRawData, setUseRawData] = useState(true);
  const [showMarkdownImport, setShowMarkdownImport] = useState(false);
  const selectedClientId = useSelector(selectSelectedClientId);
  const selectedClient = useSelector(selectSelectedClient);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [customMarkdown, setCustomMarkdown] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [overridePedidosAds, setOverridePedidosAds] = useState<string>("");
  const [overridePedidosAdsAnterior, setOverridePedidosAdsAnterior] = useState<string>("");
  const { toast } = useToast();

  function parseBRL(s: string): number {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }

  function parseMetricasFromMarkdown(md: string) {
    // Tabela: | Investimento Ads | R$ 1.234,56 | (1ª = mês atual, 2ª = mês anterior)
    const invMatches = Array.from(md.matchAll(/\|\s*Investimento\s+Ads\s*\|\s*R\$\s*([\d.,]+)\s*\|/gi));
    const inv0 = invMatches[0] ? parseBRL(invMatches[0][1]) : 0;
    const inv1 = invMatches[1] ? parseBRL(invMatches[1][1]) : 0;
    const investimentoAtual = inv0;
    const investimentoAnterior = inv1 || inv0; // se só houver um bloco, reutiliza para "anterior"

    const ppMatches = Array.from(md.matchAll(/\|\s*Pedidos\s+Pagos\s*\|\s*(\d+)\s*\|/gi));
    const pp0 = ppMatches[0] ? parseInt(ppMatches[0][1], 10) || 0 : 0;
    const pp1 = ppMatches[1] ? parseInt(ppMatches[1][1], 10) || 0 : 0;
    const pedidosPagosAtual = pp0;
    const pedidosPagosAnterior = pp1 || pp0;

    const paMatches = Array.from(md.matchAll(/\|\s*Pedidos\s+Ads\s*\|\s*(\d+)\s*\|/gi));
    const pa0 = paMatches[0] ? parseInt(paMatches[0][1], 10) || 0 : 0;
    const pa1 = paMatches[1] ? parseInt(paMatches[1][1], 10) || 0 : 0;
    const pedidosAdsAtual = pa0;
    const pedidosAdsAnterior = pa1 || pa0;

    return {
      investimentoAtual,
      investimentoAnterior,
      pedidosPagosAtual,
      pedidosPagosAnterior,
      pedidosAdsAtual,
      pedidosAdsAnterior,
    };
  }

  function formatBR(value: number): string {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function applyPedidosAdsAndCpaInMarkdown(
    md: string,
    novoPedidosAdsAtual: number,
    novoPedidosAdsAnterior: number
  ): string {
    const m = parseMetricasFromMarkdown(md);
    let out = md;

    // 1) Pedidos Ads: 1ª ocorrência = atual, 2ª = anterior
    let countPedidos = 0;
    out = out.replace(/\|\s*Pedidos Ads\s*\|\s*\d+\s*\|/gi, () => {
      countPedidos++;
      return countPedidos === 1
        ? `| Pedidos Ads | ${novoPedidosAdsAtual} |`
        : `| Pedidos Ads | ${novoPedidosAdsAnterior} |`;
    });

    // 2) CPA Ads: Investimento ÷ Pedidos Ads (1ª ocorrência = atual, 2ª = anterior)
    let countCpa = 0;
    out = out.replace(/\|\s*CPA Ads\s*\|\s*R\$\s*[\d.,]+\s*\|/gi, () => {
      countCpa++;
      if (countCpa === 1) {
        const cpa = novoPedidosAdsAtual > 0 ? m.investimentoAtual / novoPedidosAdsAtual : 0;
        return `| CPA Ads | R$ ${formatBR(cpa)} |`;
      }
      const cpa = novoPedidosAdsAnterior > 0 ? m.investimentoAnterior / novoPedidosAdsAnterior : 0;
      return `| CPA Ads | R$ ${formatBR(cpa)} |`;
    });

    // 3) CPA Geral (Loja): Investimento ÷ Pedidos pagos (1ª = atual, 2ª = anterior)
    let countCpaGeral = 0;
    out = out.replace(/\|\s*CPA Geral \(Loja\)\s*\|\s*R\$\s*[\d.,]+\s*\|/gi, () => {
      countCpaGeral++;
      if (countCpaGeral === 1) {
        const cpa = m.pedidosPagosAtual > 0 ? m.investimentoAtual / m.pedidosPagosAtual : 0;
        return `| CPA Geral (Loja) | R$ ${formatBR(cpa)} |`;
      }
      const cpa = m.pedidosPagosAnterior > 0 ? m.investimentoAnterior / m.pedidosPagosAnterior : 0;
      return `| CPA Geral (Loja) | R$ ${formatBR(cpa)} |`;
    });

    return out;
  }

  const handleApplyPedidosAds = () => {
    const numAtual = parseInt(overridePedidosAds.trim(), 10);
    const numAnterior = parseInt(overridePedidosAdsAnterior.trim(), 10);
    if (isNaN(numAtual) || numAtual < 0) {
      toast({ title: "Valor inválido", description: "Informe um número válido para Pedidos Ads (mês atual).", variant: "destructive" });
      return;
    }
    if (overridePedidosAdsAnterior.trim() !== "" && (isNaN(numAnterior) || numAnterior < 0)) {
      toast({ title: "Valor inválido", description: "Informe um número válido para Pedidos Ads (mês anterior).", variant: "destructive" });
      return;
    }
    const anterior = overridePedidosAdsAnterior.trim() === "" ? parseMetricasFromMarkdown(customMarkdown).pedidosAdsAnterior : numAnterior;
    const updated = applyPedidosAdsAndCpaInMarkdown(customMarkdown, numAtual, anterior);
    setCustomMarkdown(updated);
    if (overridePedidosAdsAnterior.trim() !== "") setOverridePedidosAdsAnterior(String(anterior));
    toast({
      title: "Relatório atualizado",
      description: "Pedidos Ads (atual e anterior) e CPA Geral atualizados na análise.",
      variant: "default",
    });
  };

  const getBaseUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_ANALYSIS_BASE_URL;
    if (!baseUrl)
      throw new Error("NEXT_PUBLIC_ANALYSIS_BASE_URL não definida");
    return baseUrl;
  };

  const readCSVFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file, "utf-8");
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
    });
  };

  const readXLSXFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = (e) => reject(e);
    });
  };

  const readDataFile = async (
    file: File
  ): Promise<{ content: string; isBase64: boolean }> => {
    if (
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls")
    ) {
      const base64 = await readXLSXFile(file);
      return { content: base64, isBase64: true };
    }
    const text = await readCSVFile(file);
    return { content: text, isBase64: false };
  };

  const analyzePlanilhasWithGemini = async (dataFiles: File[]) => {
    setApiError(null);
    const csvFilesContent = await Promise.all(
      dataFiles.map(async (file) => {
        const fileData = await readDataFile(file);
        return { nome: file.name, conteudo: fileData.content };
      })
    );
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/analise-planilhas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvFiles: csvFilesContent,
        analysisType,
        clientName: selectedClient?.name || "Cliente",
        rawData: useRawData,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      const msg =
        errorData.error || errorData.message || "Erro desconhecido";
      setApiError(msg);
      throw new Error(`Erro na análise: ${msg}`);
    }
    const data = await response.json();
    if (!data.analysis)
      throw new Error("Formato de resposta inesperado do servidor");
    return data.analysis;
  };

  const saveAnalysisToDatabase = async (markdown: string) => {
    setSaveStatus("Salvando...");
    const response = await fetch("/api/analises/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedClientId,
        clientName: selectedClient?.name,
        markdown,
        analysisType,
      }),
    });
    if (!response.ok) throw new Error(`Erro ${response.status}`);
    setSaveStatus("Salva com sucesso!");
    toast({
      title: "Análise salva",
      description: "Encontrada na página do cliente",
      variant: "default",
    });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast({
        title: "Selecione um cliente",
        variant: "destructive",
      });
      return;
    }
    const dataFiles = files.filter(isDataFile);
    if (dataFiles.length === 0) {
      toast({
        title: "Nenhuma planilha enviada",
        description: "Envie pelo menos 1 planilha para análise com Gemini.",
        variant: "destructive",
      });
      return;
    }
    if (dataFiles.length > 4) {
      toast({
        title: "Máximo 4 planilhas",
        description: "Use no máximo 4 arquivos: 2 de anúncios + 2 de shop-stats.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsAnalyzing(true);
      setApiError(null);
      const result = await analyzePlanilhasWithGemini(dataFiles);
      setCustomMarkdown(result);
      const { pedidosAdsAtual, pedidosAdsAnterior } = parseMetricasFromMarkdown(result);
      setOverridePedidosAds(pedidosAdsAtual > 0 ? String(pedidosAdsAtual) : "");
      setOverridePedidosAdsAnterior(pedidosAdsAnterior > 0 ? String(pedidosAdsAnterior) : "");
      toast({
        title: "Análise concluída",
        description: "Relatório gerado com Gemini.",
        variant: "default",
      });
      try {
        await saveAnalysisToDatabase(result);
      } catch {
        toast({
          title: "Análise gerada",
          description: "Houve problema ao salvar. Você pode baixar o PDF.",
          variant: "default",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Erro ao gerar relatório",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const dataFiles = files.filter(isDataFile);
  const canSubmit =
    selectedClientId && dataFiles.length >= 1 && dataFiles.length <= 4 && !isAnalyzing;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análise Gemini</h1>
        <p className="text-muted-foreground">
          Análise inteligente de planilhas com Gemini (comparativa quando possível)
        </p>
      </div>

      {apiError && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 dark:text-red-400 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientSelector />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipo de análise</CardTitle>
          <CardDescription>
            Mesmo modelo de relatório da página Análise (por planilhas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalysisTypeSelector value={analysisType} onChange={setAnalysisType} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload de planilhas</CardTitle>
          {/* <CardDescription>
            Anúncios e/ou Shop-Stats: análise flexível com Gemini
          </CardDescription> */}
        </CardHeader>
        <CardContent>
          {/* <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
              Envie 1 a 4 planilhas exportadas da Shopee
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-3 list-disc">
              <li>Planilha de Anúncios – mês anterior</li>
              <li>Planilha de Anúncios – mês atual</li>
              <li>Planilha Shop-Stats – mês anterior (opcional)</li>
              <li>Planilha Shop-Stats – mês atual (opcional)</li>
            </ul>
          </div> */}
          <FileUpload
            onFilesChange={setFiles}
            maxFiles={6}
            accept={ACCEPT_DATA_FILES}
          />
          <label className="mt-4 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useRawData}
              onChange={(e) => setUseRawData(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">
              Enviar dados brutos à IA (mais preciso: a IA lê as planilhas inteiras e calcula os totais; sem camada de extração)
            </span>
          </label>
          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium">
                Arquivos ({files.length}):
              </p>
              <ul className="mt-1 space-y-1">
                {files.map((file, i) => {
                  const tipo = classifyFileName(file.name);
                  const periodo = extractPeriodFromName(file.name);
                  return (
                    <li key={i} className="text-xs flex items-center gap-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          tipo === "Anúncios"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                            : tipo === "Shop-Stats"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {tipo}
                      </span>
                      <span className="text-muted-foreground">{file.name}</span>
                      {periodo && (
                        <span className="text-[10px] text-muted-foreground">
                          ({periodo})
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {isAnalyzing
            ? "Analisando com Gemini..."
            : "Gerar análise comparativa (Gemini)"}
        </Button>

        <Button
          onClick={() => setShowMarkdownImport(!showMarkdownImport)}
          variant="outline"
          className="flex-1"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {showMarkdownImport
            ? "Fechar Editor de Markdown"
            : "Editar Markdown Manualmente"}
        </Button>
      </div>

      {showMarkdownImport && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Editor de Markdown</CardTitle>
            <CardDescription>
              Edite o conteúdo do relatório em formato Markdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <textarea
                className="w-full h-60 p-3 border rounded"
                value={customMarkdown}
                onChange={(e) => setCustomMarkdown(e.target.value)}
                placeholder="Edite o conteúdo Markdown..."
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMarkdownImport(false)}
            >
              Fechar
            </Button>
          </CardFooter>
        </Card>
      )}

      {customMarkdown && (
        <>
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="text-base">Ajuste — Pedidos Ads e CPA</CardTitle>
              <CardDescription>
                Altere o número de Pedidos Ads e aplique para atualizar o relatório. O CPA Geral (Loja) será recalculado como Investimento ÷ Pedidos pagos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gemini-pedidos-ads">Pedidos Ads (mês atual)</Label>
                  <Input
                    id="gemini-pedidos-ads"
                    type="number"
                    min={0}
                    placeholder="Ex: 323"
                    value={overridePedidosAds}
                    onChange={(e) => setOverridePedidosAds(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gemini-pedidos-ads-ant">Pedidos Ads (mês anterior)</Label>
                  <Input
                    id="gemini-pedidos-ads-ant"
                    type="number"
                    min={0}
                    placeholder="Ex: 301"
                    value={overridePedidosAdsAnterior}
                    onChange={(e) => setOverridePedidosAdsAnterior(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-32"
                  />
                </div>
                <Button onClick={handleApplyPedidosAds}>
                  Aplicar e recalcular CPA
                </Button>
              </div>
              {(() => {
                const m = parseMetricasFromMarkdown(customMarkdown);
                const cpaAdsAtual = m.pedidosAdsAtual > 0 ? m.investimentoAtual / m.pedidosAdsAtual : 0;
                const cpaGeralAtual = m.pedidosPagosAtual > 0 ? m.investimentoAtual / m.pedidosPagosAtual : 0;
                return (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <strong>Mês atual:</strong> CPA Ads = R$ {formatBR(m.investimentoAtual)} ÷ {m.pedidosAdsAtual} = <strong>R$ {formatBR(cpaAdsAtual)}</strong> &nbsp;|&nbsp; CPA Geral (Loja) = R$ {formatBR(m.investimentoAtual)} ÷ {m.pedidosPagosAtual} = <strong>R$ {formatBR(cpaGeralAtual)}</strong>
                    </p>
                    {m.pedidosAdsAnterior > 0 && (() => {
                      const cpaAdsAnt = m.investimentoAnterior / m.pedidosAdsAnterior;
                      const cpaGeralAnt = m.pedidosPagosAnterior > 0 ? m.investimentoAnterior / m.pedidosPagosAnterior : 0;
                      return (
                        <p>
                          <strong>Mês anterior:</strong> CPA Ads = R$ {formatBR(m.investimentoAnterior)} ÷ {m.pedidosAdsAnterior} = <strong>R$ {formatBR(cpaAdsAnt)}</strong> &nbsp;|&nbsp; CPA Geral (Loja) = R$ {formatBR(m.investimentoAnterior)} ÷ {m.pedidosPagosAnterior} = <strong>R$ {formatBR(cpaGeralAnt)}</strong>
                        </p>
                      );
                    })()}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Relatório</CardTitle>
              <CardDescription>Análise comparativa gerada com Gemini</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <PDFGenerator
                markdown={customMarkdown}
                clientName={selectedClient?.name || "Cliente"}
                analysisType={analysisType}
                images={[]}
                ocrTexts={[]}
              />
              {saveStatus && (
                <span className="text-sm text-muted-foreground">{saveStatus}</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <MarkdownReport markdown={customMarkdown} />
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
}
