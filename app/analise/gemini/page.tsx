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
  const [useMockScenario, setUseMockScenario] = useState(false);
  const [mockScenarioJson, setMockScenarioJson] = useState("");
  const { toast } = useToast();

  function parseBRL(s: string): number {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }

  function parseIntBR(s: string): number {
    return parseInt(s.replace(/\./g, ""), 10) || 0;
  }

  function formatBR(value: number): string {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function calcVariacao(atual: number, anterior: number): string {
    if (anterior === 0) return atual > 0 ? "Novo" : "—";
    const pct = ((atual - anterior) / anterior) * 100;
    const sinal = pct >= 0 ? "+" : "";
    return `${sinal}${pct.toFixed(2).replace(".", ",")}%`;
  }

  // O Gemini gera tabelas comparativas numa única linha:
  //   | Pedidos Ads | 233 | 287 | +79,44% |
  // (métrica | mês atual | mês anterior | variação)
  // OU em linhas separadas:
  //   | Pedidos Ads | 233 |
  // Precisamos lidar com ambos os formatos.

  // Captura linha inteira da métrica na tabela (todos os campos até o fim da linha)
  function findRowValues(md: string, metricName: RegExp): { raw: string; values: string[] }[] {
    const results: { raw: string; values: string[] }[] = [];
    const lineRegex = new RegExp(`^\\|[^|]*${metricName.source}[^|]*\\|(.+)$`, "gim");
    let match: RegExpExecArray | null;
    while ((match = lineRegex.exec(md)) !== null) {
      const rest = match[1];
      const cells = rest.split("|").map((c) => c.trim()).filter((c) => c !== "");
      results.push({ raw: match[0], values: cells });
    }
    return results;
  }

  function parseMetricasFromMarkdown(md: string) {
    // Investimento Ads: valor em R$ (pode ter 1 ou 2 colunas)
    const invRows = findRowValues(md, /Investimento\s+Ads/);
    let investimentoAtual = 0;
    let investimentoAnterior = 0;
    if (invRows.length > 0) {
      const vals = invRows[0].values.map((v) => parseBRL(v.replace(/R\$\s*/g, "")));
      investimentoAtual = vals[0] || 0;
      investimentoAnterior = vals[1] || vals[0] || 0;
    }
    if (invRows.length > 1) {
      const vals = invRows[1].values.map((v) => parseBRL(v.replace(/R\$\s*/g, "")));
      investimentoAnterior = vals[0] || investimentoAnterior;
    }

    // Pedidos Pagos
    const ppRows = findRowValues(md, /Pedidos\s+Pagos/);
    let pedidosPagosAtual = 0;
    let pedidosPagosAnterior = 0;
    if (ppRows.length > 0) {
      const vals = ppRows[0].values.map((v) => parseIntBR(v));
      pedidosPagosAtual = vals[0] || 0;
      pedidosPagosAnterior = vals[1] || vals[0] || 0;
    }
    if (ppRows.length > 1) {
      const vals = ppRows[1].values.map((v) => parseIntBR(v));
      pedidosPagosAnterior = vals[0] || pedidosPagosAnterior;
    }

    // Pedidos Ads
    const paRows = findRowValues(md, /Pedidos\s+Ads/);
    let pedidosAdsAtual = 0;
    let pedidosAdsAnterior = 0;
    if (paRows.length > 0) {
      const vals = paRows[0].values.map((v) => parseIntBR(v));
      pedidosAdsAtual = vals[0] || 0;
      pedidosAdsAnterior = vals[1] || 0;
    }
    if (paRows.length > 1) {
      const vals = paRows[1].values.map((v) => parseIntBR(v));
      pedidosAdsAnterior = vals[0] || pedidosAdsAnterior;
    }

    return {
      investimentoAtual,
      investimentoAnterior,
      pedidosPagosAtual,
      pedidosPagosAnterior,
      pedidosAdsAtual,
      pedidosAdsAnterior,
    };
  }

  function replaceRowMetric(
    md: string,
    metricRegex: RegExp,
    buildNewValues: (rowIndex: number, oldValues: string[]) => string[] | null
  ): string {
    let out = md;
    const rows = findRowValues(md, metricRegex);
    rows.forEach((row, idx) => {
      const newVals = buildNewValues(idx, row.values);
      if (!newVals) return;
      const newCells = newVals.map((v) => ` ${v} `).join("|");
      const metricMatch = row.raw.match(/^\|([^|]+)\|/);
      const metricCell = metricMatch ? metricMatch[1] : "";
      const newRow = `|${metricCell}|${newCells}|`;
      out = out.replace(row.raw, newRow);
    });
    return out;
  }

  function applyPedidosAdsAndCpaInMarkdown(
    md: string,
    novoPedidosAdsAtual: number,
    novoPedidosAdsAnterior: number
  ): string {
    const m = parseMetricasFromMarkdown(md);
    let out = md;

    // Pedidos Ads
    out = replaceRowMetric(out, /Pedidos\s+Ads/, (idx, oldVals) => {
      if (oldVals.length >= 3) {
        const variacao = calcVariacao(novoPedidosAdsAtual, novoPedidosAdsAnterior);
        return [String(novoPedidosAdsAtual), String(novoPedidosAdsAnterior), variacao];
      }
      if (oldVals.length >= 2) return [String(novoPedidosAdsAtual), String(novoPedidosAdsAnterior)];
      return [String(idx === 0 ? novoPedidosAdsAtual : novoPedidosAdsAnterior)];
    });

    // CPA Ads (Investimento ÷ Pedidos Ads)
    const cpaAdsAtual = novoPedidosAdsAtual > 0 ? m.investimentoAtual / novoPedidosAdsAtual : 0;
    const cpaAdsAnterior = novoPedidosAdsAnterior > 0 ? m.investimentoAnterior / novoPedidosAdsAnterior : 0;
    out = replaceRowMetric(out, /CPA\s+Ads/, (idx, oldVals) => {
      if (oldVals.length >= 3) {
        const variacao = calcVariacao(cpaAdsAtual, cpaAdsAnterior);
        return [`R$ ${formatBR(cpaAdsAtual)}`, `R$ ${formatBR(cpaAdsAnterior)}`, variacao];
      }
      if (oldVals.length >= 2) return [`R$ ${formatBR(cpaAdsAtual)}`, `R$ ${formatBR(cpaAdsAnterior)}`];
      return [`R$ ${formatBR(idx === 0 ? cpaAdsAtual : cpaAdsAnterior)}`];
    });

    // CPA Geral (Loja) (Investimento ÷ Pedidos pagos)
    const cpaGeralAtual = m.pedidosPagosAtual > 0 ? m.investimentoAtual / m.pedidosPagosAtual : 0;
    const cpaGeralAnterior = m.pedidosPagosAnterior > 0 ? m.investimentoAnterior / m.pedidosPagosAnterior : 0;
    out = replaceRowMetric(out, /CPA\s+Geral\s*\(Loja\)/, (idx, oldVals) => {
      if (oldVals.length >= 3) {
        const variacao = calcVariacao(cpaGeralAtual, cpaGeralAnterior);
        return [`R$ ${formatBR(cpaGeralAtual)}`, `R$ ${formatBR(cpaGeralAnterior)}`, variacao];
      }
      if (oldVals.length >= 2) return [`R$ ${formatBR(cpaGeralAtual)}`, `R$ ${formatBR(cpaGeralAnterior)}`];
      return [`R$ ${formatBR(idx === 0 ? cpaGeralAtual : cpaGeralAnterior)}`];
    });

    return out;
  }

  function getEffectivePedidosAds(): { atual: number; anterior: number } {
    const m = parseMetricasFromMarkdown(customMarkdown);
    const a = overridePedidosAds.trim();
    const b = overridePedidosAdsAnterior.trim();
    return {
      atual: a !== "" && !isNaN(Number(a)) && Number(a) >= 0 ? Number(a) : m.pedidosAdsAtual,
      anterior: b !== "" && !isNaN(Number(b)) && Number(b) >= 0 ? Number(b) : m.pedidosAdsAnterior,
    };
  }

  const handleApplyPedidosAds = () => {
    const { atual, anterior } = getEffectivePedidosAds();
    if (atual <= 0 && overridePedidosAds.trim() !== "") {
      toast({ title: "Valor inválido", description: "Informe um número > 0 para Pedidos Ads (mês atual).", variant: "destructive" });
      return;
    }
    const updated = applyPedidosAdsAndCpaInMarkdown(customMarkdown, atual, anterior);
    setCustomMarkdown(updated);
    toast({
      title: "Relatório atualizado",
      description: "Pedidos Ads e CPA atualizados na análise.",
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
    let parsedMockScenario: Record<string, unknown> | null = null;
    if (useMockScenario && mockScenarioJson.trim()) {
      try {
        const parsed = JSON.parse(mockScenarioJson);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Formato inválido");
        }
        parsedMockScenario = parsed as Record<string, unknown>;
      } catch {
        throw new Error("JSON do cenário mock inválido. Revise o conteúdo antes de gerar.");
      }
    }

    const response = await fetch(`${baseUrl}/analise-planilhas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvFiles: csvFilesContent,
        analysisType,
        clientName: selectedClient?.name || "Cliente",
        rawData: useRawData,
        ...(overridePedidosAds.trim() !== "" && { overridePedidosAdsAtual: Number(overridePedidosAds) }),
        ...(overridePedidosAdsAnterior.trim() !== "" && { overridePedidosAdsAnterior: Number(overridePedidosAdsAnterior) }),
        useMockScenario,
        ...(parsedMockScenario && { mockScenarioData: parsedMockScenario }),
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

      <Card className="border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="text-base">Cenário mock para apresentação (opcional)</CardTitle>
          <CardDescription>
            Quando ativo, os dados mockados são enviados para a IA como cenário prioritário de apresentação.
            As planilhas continuam sendo usadas como base de contexto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useMockScenario}
              onChange={(e) => setUseMockScenario(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Usar cenário mock na análise Gemini</span>
          </label>

          {useMockScenario && (
            <div className="space-y-2">
              <Label htmlFor="mock-scenario-json">JSON do cenário mock</Label>
              <textarea
                id="mock-scenario-json"
                className="w-full min-h-44 p-3 border rounded text-xs font-mono"
                value={mockScenarioJson}
                onChange={(e) => setMockScenarioJson(e.target.value)}
                placeholder='Cole aqui o JSON (ex.: mock-apresentacao-ideal-sallen7.json)'
              />
              <p className="text-xs text-muted-foreground">
                Dica: cole o conteúdo completo do JSON de mock. Se o JSON for inválido, a geração é bloqueada.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {dataFiles.length > 0 && analysisType === "account" && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-base">Pedidos Ads (opcional)</CardTitle>
            <CardDescription>
              Se o número de Pedidos Ads das planilhas estiver incorreto, informe aqui o valor correto. Serão usados nos TOTAIS OFICIAIS enviados à IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="pre-pedidos-ads">Pedidos Ads (mês atual)</Label>
                <Input
                  id="pre-pedidos-ads"
                  type="number"
                  min={0}
                  placeholder="Ex: 323"
                  value={overridePedidosAds}
                  onChange={(e) => setOverridePedidosAds(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-36"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pre-pedidos-ads-ant">Pedidos Ads (mês anterior)</Label>
                <Input
                  id="pre-pedidos-ads-ant"
                  type="number"
                  min={0}
                  placeholder="Ex: 301"
                  value={overridePedidosAdsAnterior}
                  onChange={(e) => setOverridePedidosAdsAnterior(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-36"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Deixe em branco para usar o valor extraído automaticamente das planilhas.
            </p>
          </CardContent>
        </Card>
      )}

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
              <CardTitle className="text-base">Ajuste fino — Pedidos Ads (pós-geração)</CardTitle>
              <CardDescription>
                Os valores informados antes da geração já foram aplicados nos TOTAIS OFICIAIS. Use esta seção apenas se precisar corrigir o markdown já gerado.
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
                const { atual: paAtual, anterior: paAnterior } = getEffectivePedidosAds();
                const cpaAdsAtual = paAtual > 0 ? m.investimentoAtual / paAtual : 0;
                const cpaGeralAtual = m.pedidosPagosAtual > 0 ? m.investimentoAtual / m.pedidosPagosAtual : 0;
                const cpaAdsAnt = paAnterior > 0 ? m.investimentoAnterior / paAnterior : 0;
                const cpaGeralAnt = m.pedidosPagosAnterior > 0 ? m.investimentoAnterior / m.pedidosPagosAnterior : 0;
                return (
                  <div className="space-y-2 text-sm">
                    <div className="rounded border p-3 bg-white dark:bg-zinc-900 space-y-1">
                      <p className="font-medium text-foreground">Mês atual</p>
                      <p className="text-muted-foreground">
                        CPA Ads = R$ {formatBR(m.investimentoAtual)} ÷ {paAtual || "—"} = <strong className="text-foreground">{paAtual > 0 ? `R$ ${formatBR(cpaAdsAtual)}` : "—"}</strong>
                      </p>
                      <p className="text-muted-foreground">
                        CPA Geral (Loja) = R$ {formatBR(m.investimentoAtual)} ÷ {m.pedidosPagosAtual || "—"} = <strong className="text-foreground">{m.pedidosPagosAtual > 0 ? `R$ ${formatBR(cpaGeralAtual)}` : "—"}</strong>
                      </p>
                    </div>
                    <div className="rounded border p-3 bg-white dark:bg-zinc-900 space-y-1">
                      <p className="font-medium text-foreground">Mês anterior</p>
                      <p className="text-muted-foreground">
                        CPA Ads = R$ {formatBR(m.investimentoAnterior)} ÷ {paAnterior || "—"} = <strong className="text-foreground">{paAnterior > 0 ? `R$ ${formatBR(cpaAdsAnt)}` : "—"}</strong>
                      </p>
                      <p className="text-muted-foreground">
                        CPA Geral (Loja) = R$ {formatBR(m.investimentoAnterior)} ÷ {m.pedidosPagosAnterior || "—"} = <strong className="text-foreground">{m.pedidosPagosAnterior > 0 ? `R$ ${formatBR(cpaGeralAnt)}` : "—"}</strong>
                      </p>
                    </div>
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
