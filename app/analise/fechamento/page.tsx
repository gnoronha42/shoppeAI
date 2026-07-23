"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, AlertCircle, FileSpreadsheet } from "lucide-react";
import { ClientSelector } from "@/components/client/client-selector";
import { FileUpload } from "@/components/analysis/file-upload";
import { useSelector } from "react-redux";
import {
  selectSelectedClientId,
  selectSelectedClient,
} from "@/features/clients/clientSlice";
import { useToast } from "@/hooks/use-toast";
import { MarkdownReport } from "@/components/analysis/markdown-report";
import { PDFGenerator } from "@/components/analysis/pdf-generator";

const ACCEPT_FILES =
  "image/*, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .xlsx, .xls";

const MAX_IMAGES = 9;
const MAX_FILES = MAX_IMAGES + 1; // 1 parentskudetail + até 9 prints

function isParentSkuFile(file: File) {
  const n = file.name.toLowerCase();
  return (
    n.includes("parentskudetail") &&
    (n.endsWith(".xlsx") || n.endsWith(".xls"))
  );
}

function isXlsxFile(file: File) {
  const n = file.name.toLowerCase();
  return (
    n.endsWith(".xlsx") ||
    n.endsWith(".xls") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  );
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function extractPeriodFromName(name: string): string {
  const m = name.match(/(\d{8})[_-](\d{8})/);
  if (!m) return "";
  const fmt = (s: string) =>
    `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
  return `${fmt(m[1])} a ${fmt(m[2])}`;
}

// ────────────────────────────────────────────────────────────────
// Conversor determinístico: JSON dashboard → Markdown legível
// (usado enquanto o painel Seller.IA principal não renderiza esse endpoint diretamente)
// ────────────────────────────────────────────────────────────────
function relatorioJsonToMarkdown(rel: any): string {
  const brl = (n: any) =>
    typeof n === "number"
      ? n.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : String(n ?? "—");
  const int = (n: any) =>
    typeof n === "number" ? n.toLocaleString("pt-BR") : String(n ?? "—");
  const pct = (v: any) =>
    v == null || v === "" ? "—" : String(v).endsWith("%") ? String(v) : `${v}%`;

  const ident = rel?.identificacao || {};
  const snapLoja = rel?.snapshot_executivo?.conta_loja || {};
  const snapAds = rel?.snapshot_executivo?.ads || {};
  const snapInt = rel?.snapshot_executivo?.integradas || {};
  const kpis = rel?.analise_detalhada_kpis || {};
  const prods = rel?.analise_produtos || {};

  const lines: string[] = [];

  lines.push(`# Fechamento Mensal — ${ident.loja || "Cliente"}`);
  lines.push(`Período atual: **${ident.periodo_atual || "—"}**`);
  if (ident.periodo_anterior && ident.periodo_anterior !== "—")
    lines.push(`Período anterior: **${ident.periodo_anterior}**`);
  lines.push("");

  // 1. KPIs da Loja
  lines.push("## 1. KPIs da Loja");
  lines.push("");
  lines.push("| Métrica | Atual | Anterior | Variação |");
  lines.push("| :--- | ---: | ---: | ---: |");
  const rowLoja = (label: string, k: string, isMoney = true) => {
    const v = snapLoja[k];
    if (!v) return;
    const atual = isMoney && typeof v.atual === "number" ? `R$ ${brl(v.atual)}` : `${v.atual ?? "—"}`;
    const anterior =
      isMoney && typeof v.anterior === "number" ? `R$ ${brl(v.anterior)}` : `${v.anterior ?? "—"}`;
    lines.push(`| ${label} | ${atual} | ${anterior} | ${v.variacao || "—"} |`);
  };
  rowLoja("Vendas (GMV pago)", "gmv_pago", true);
  rowLoja("Pedidos", "pedidos_pagos", false);
  rowLoja("Visitantes", "visitantes", false);
  if (snapLoja.conversao_real_pago) {
    lines.push(
      `| Taxa de Conversão | ${pct(snapLoja.conversao_real_pago.atual)} | ${pct(snapLoja.conversao_real_pago.anterior)} | ${snapLoja.conversao_real_pago.variacao || "—"} |`,
    );
  }
  rowLoja("Ticket Médio", "ticket_medio_pago", true);
  rowLoja("Pedidos Cancelados", "cancelamentos_quantidade", false);
  lines.push("");

  // 2. ADS
  lines.push("## 2. Anúncios de Produtos (Shopee Ads)");
  lines.push("");
  lines.push("| Métrica | Atual | Anterior | Variação |");
  lines.push("| :--- | ---: | ---: | ---: |");
  const rowAds = (label: string, k: string, isMoney = true) => {
    const v = snapAds[k];
    if (!v) return;
    const atual = isMoney && typeof v.atual === "number" ? `R$ ${brl(v.atual)}` : `${v.atual ?? "—"}`;
    const anterior =
      isMoney && typeof v.anterior === "number" ? `R$ ${brl(v.anterior)}` : `${v.anterior ?? "—"}`;
    lines.push(`| ${label} | ${atual} | ${anterior} | ${v.variacao || "—"} |`);
  };
  rowAds("Investimento Ads", "investimento_ads", true);
  rowAds("Impressões", "impressoes_ads", false);
  rowAds("Cliques", "cliques_ads", false);
  if (snapAds.ctr_ads) {
    lines.push(
      `| CTR Ads | ${pct(snapAds.ctr_ads.atual)} | ${pct(snapAds.ctr_ads.anterior)} | ${snapAds.ctr_ads.variacao || "—"} |`,
    );
  }
  rowAds("GMV Ads (Painel)", "gmv_ads_painel", true);
  rowAds("Pedidos Ads", "pedidos_ads", false);
  rowAds("ROAS Ads", "roas_ads_painel", false);
  rowAds("CPA Ads", "cpa_ads", true);
  if (snapInt?.tacos) {
    lines.push(
      `| TACoS | ${pct(snapInt.tacos.atual)} | ${pct(snapInt.tacos.anterior)} | ${snapInt.tacos.variacao || "—"} |`,
    );
  }
  lines.push("");

  // 3. Top produtos
  const top5 = prods?.top5_por_gmv_pago?.dados || [];
  if (Array.isArray(top5) && top5.length) {
    lines.push("## 3. Top 5 Produtos por GMV pago (planilha)");
    lines.push("");
    lines.push("| # | Produto | GMV pago | Participação |");
    lines.push("| ---: | :--- | ---: | ---: |");
    top5.forEach((p: any, i: number) => {
      lines.push(
        `| ${i + 1} | ${p.produto || "—"} | R$ ${brl(p.gmv)} | ${p.participacao || "—"} |`,
      );
    });
    lines.push("");
  }

  // 4. Visão geral (Gemini)
  const vg = rel?.visao_geral_desempenho || {};
  if (vg.resumo || vg.diagnostico_principal) {
    lines.push("## 4. Visão Geral do Desempenho");
    if (vg.resumo) lines.push(vg.resumo);
    if (vg.diagnostico_principal) {
      lines.push("");
      lines.push(`**Diagnóstico principal:** ${vg.diagnostico_principal}`);
    }
    if (Array.isArray(vg.causas_provaveis) && vg.causas_provaveis.length) {
      lines.push("");
      lines.push("**Causas prováveis:**");
      vg.causas_provaveis.forEach((c: string) => lines.push(`- ${c}`));
    }
    if (vg.prioridade_execucao) {
      lines.push("");
      lines.push(`**Prioridade de execução:** ${vg.prioridade_execucao}`);
    }
    lines.push("");
  }

  // 5. Pontos positivos / atenção
  const pos = rel?.pontos_positivos || [];
  const atn = rel?.pontos_de_atencao || [];
  if (pos.length) {
    lines.push("## 5. Pontos Positivos");
    pos.forEach((p: any) => lines.push(`- ${typeof p === "string" ? p : p.descricao || JSON.stringify(p)}`));
    lines.push("");
  }
  if (atn.length) {
    lines.push("## 6. Pontos de Atenção");
    atn.forEach((p: any) => lines.push(`- ${typeof p === "string" ? p : p.descricao || JSON.stringify(p)}`));
    lines.push("");
  }

  // 7. Plano tático 30 dias
  const plano = rel?.plano_tatico_30_dias;
  if (plano) {
    const semanas = ["semana_1", "semana_2", "semana_3", "semana_4"];
    const hasContent = semanas.some((s) => (plano[s]?.acoes || []).length);
    if (hasContent) {
      lines.push("## 7. Plano Tático — 30 dias");
      semanas.forEach((s, i) => {
        const w = plano[s];
        if (!w?.titulo && (!w?.acoes || !w.acoes.length)) return;
        lines.push("");
        lines.push(`### Semana ${i + 1}${w.titulo ? ` — ${w.titulo}` : ""}`);
        (w.acoes || []).forEach((a: any) =>
          lines.push(`- ${typeof a === "string" ? a : a.acao || JSON.stringify(a)}`),
        );
      });
      lines.push("");
    }
  }

  // 8. KPIs detalhados (crescimento absoluto) — só se houver dado
  const has41 = kpis["4_1_gmv_pago"]?.dados;
  if (has41) {
    lines.push("## 8. Detalhamento por KPI");
    lines.push("");
    Object.entries(kpis).forEach(([k, v]: [string, any]) => {
      if (!v?.dados) return;
      const nome = k
        .replace(/^\d+_\d+_/, "")
        .replace(/_/g, " ")
        .toUpperCase();
      lines.push(`**${nome}**`);
      const d = v.dados;
      const linha: string[] = [];
      if (d.atual !== undefined) linha.push(`Atual: ${typeof d.atual === "number" ? int(d.atual) : d.atual}`);
      if (d.anterior !== undefined) linha.push(`Anterior: ${typeof d.anterior === "number" ? int(d.anterior) : d.anterior}`);
      if (d.variacao) linha.push(`Variação: ${d.variacao}`);
      if (d.crescimento_absoluto !== undefined) linha.push(`Crescimento absoluto: ${int(d.crescimento_absoluto)}`);
      lines.push(`- ${linha.join(" | ")}`);
      if (v.analise) lines.push(`  ${v.analise}`);
      lines.push("");
    });
  }

  return lines.join("\n");
}

export default function AnaliseFechamentoPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [customMarkdown, setCustomMarkdown] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showMarkdownImport, setShowMarkdownImport] = useState(false);
  const selectedClientId = useSelector(selectSelectedClientId);
  const selectedClient = useSelector(selectSelectedClient);
  const { toast } = useToast();

  const getBaseUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_ANALYSIS_BASE_URL;
    if (!baseUrl)
      throw new Error("NEXT_PUBLIC_ANALYSIS_BASE_URL não definida");
    return baseUrl;
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = (e) => reject(e);
    });

  const analyzeFechamento = async (
    parentSku: File | null,
    imageFiles: File[]
  ) => {
    setApiError(null);
    const baseUrl = getBaseUrl();

    const images = await Promise.all(
      imageFiles.map(async (file) => ({
        name: file.name,
        contentBase64: await readFileAsBase64(file),
        mimeType: file.type || "image/png",
      }))
    );

    const body: Record<string, unknown> = {
      clientName: selectedClient?.name || "Cliente",
      images,
    };

    if (parentSku) {
      body.parentSkuFile = {
        name: parentSku.name,
        contentBase64: await readFileAsBase64(parentSku),
      };
    }

    const response = await fetch(`${baseUrl}/analise-fechamento-mensal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData.error || errorData.message || "Erro desconhecido";
      setApiError(msg);
      throw new Error(`Erro na análise: ${msg}`);
    }

    const data = await response.json();
    // Backend v2 devolve `analysis` (markdown) + `data.relatorio` (JSON).
    // Preferir markdown pronto do servidor (igual às outras telas) — evita
    // depender só do conversor no browser.
    if (typeof data.analysis === "string" && data.analysis.trim()) {
      return data.analysis as string;
    }
    if (data?.data?.relatorio) {
      return relatorioJsonToMarkdown(data.data.relatorio);
    }
    throw new Error("Formato de resposta inesperado do servidor");
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
        analysisType: "fechamento-mensal",
      }),
    });
    if (!response.ok) throw new Error(`Erro ${response.status}`);
    setSaveStatus("Salva com sucesso!");
    toast({
      title: "Fechamento salvo",
      description: "Encontrado na página do cliente",
      variant: "default",
    });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }

    const imageFiles = files.filter(isImageFile);
    const xlsxFiles = files.filter(isXlsxFile);
    const parentSku =
      xlsxFiles.find(isParentSkuFile) || xlsxFiles[0] || null;

    if (imageFiles.length === 0 && !parentSku) {
      toast({
        title: "Nenhum arquivo enviado",
        description:
          "Envie a planilha parentskudetail.xlsx e os prints do painel Shopee.",
        variant: "destructive",
      });
      return;
    }

    if (imageFiles.length > MAX_IMAGES) {
      toast({
        title: `Máximo ${MAX_IMAGES} imagens`,
        description: `Envie até ${MAX_IMAGES} prints por fechamento.`,
        variant: "destructive",
      });
      return;
    }

    if (xlsxFiles.length > 1) {
      toast({
        title: "Só 1 planilha",
        description:
          "Envie apenas o parentskudetail.xlsx do mês. Os demais dados vêm dos prints.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      setApiError(null);
      const result = await analyzeFechamento(parentSku, imageFiles);
      setCustomMarkdown(result);
      toast({
        title: "Fechamento concluído",
        description: "Relatório mensal gerado. Use Baixar PDF para obter o arquivo.",
        variant: "default",
      });
      // Scroll até o relatório (igual às outras telas de análise)
      setTimeout(() => {
        document.getElementById("fechamento-relatorio")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
      try {
        await saveAnalysisToDatabase(result);
      } catch {
        toast({
          title: "Relatório gerado",
          description: "Houve problema ao salvar. Você pode baixar o PDF.",
          variant: "default",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Erro ao gerar fechamento",
        description:
          error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const imageFiles = files.filter(isImageFile);
  const xlsxFiles = files.filter(isXlsxFile);
  const parentSku = xlsxFiles.find(isParentSkuFile) || xlsxFiles[0] || null;
  const periodo = parentSku ? extractPeriodFromName(parentSku.name) : "";

  const canSubmit =
    !!selectedClientId &&
    (imageFiles.length >= 1 || !!parentSku) &&
    imageFiles.length <= MAX_IMAGES &&
    xlsxFiles.length <= 1 &&
    !isAnalyzing;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fechamento Mensal</h1>
        <p className="text-muted-foreground">
          Relatório de fechamento com prints do painel Shopee + planilha{" "}
          <code className="text-xs">parentskudetail</code> (Gemini)
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
          <CardTitle>Upload</CardTitle>
          <CardDescription>
            Envie 1 planilha <strong>parentskudetail.YYYYMMDD_YYYYMMDD.xlsx</strong>{" "}
            e até 9 prints do painel Shopee. Nome e ordem das imagens não importam —
            o Gemini identifica cada tela pelo conteúdo (Métricas, Fontes, Funil, Ads…).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
              Prints recomendados (qualquer nome/ordem)
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 ml-3 list-disc space-y-0.5">
              <li>Métricas Principais (pode ser mais de um print)</li>
              <li>Fontes de Tráfego</li>
              <li>Visão Geral do Produto (funil)</li>
              <li>Produtos com Melhor Desempenho (opcional)</li>
              <li>Desempenho de Anúncios — mês atual e mês anterior</li>
            </ul>
          </div>

          <FileUpload
            onFilesChange={setFiles}
            maxFiles={MAX_FILES}
            accept={ACCEPT_FILES}
          />

          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium">Arquivos ({files.length}):</p>
              <ul className="mt-1 space-y-1">
                {files.map((file, i) => {
                  const isImage = isImageFile(file);
                  const isParent = isParentSkuFile(file);
                  const tipo = isImage
                    ? "Imagem"
                    : isParent
                      ? "Parent SKU"
                      : "Planilha";
                  const per = isParent
                    ? extractPeriodFromName(file.name)
                    : "";
                  return (
                    <li key={i} className="text-xs flex items-center gap-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          tipo === "Parent SKU"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : tipo === "Imagem"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {tipo}
                      </span>
                      <span className="text-muted-foreground">{file.name}</span>
                      {per && (
                        <span className="text-[10px] text-muted-foreground">
                          ({per})
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {periodo && (
                <p className="text-xs text-muted-foreground mt-2">
                  Período detectado: <strong>{periodo}</strong>
                </p>
              )}
              {!parentSku && imageFiles.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Sem parentskudetail.xlsx — o relatório usará só os prints
                  (menos assertivo no Top Produtos).
                </p>
              )}
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
          <CalendarCheck className="mr-2 h-4 w-4" />
          {isAnalyzing
            ? "Gerando fechamento..."
            : "Gerar fechamento mensal"}
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
        <Card>
          <CardHeader>
            <CardTitle>Editor de Markdown</CardTitle>
            <CardDescription>
              Edite o conteúdo do relatório em formato Markdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full h-60 p-3 border rounded"
              value={customMarkdown}
              onChange={(e) => setCustomMarkdown(e.target.value)}
              placeholder="Edite o conteúdo Markdown..."
            />
          </CardContent>
          <CardFooter className="flex justify-end">
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
        <Card id="fechamento-relatorio">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Relatório de Fechamento</CardTitle>
              <CardDescription>
                Gerado com prints + parentskudetail via Gemini
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <PDFGenerator
                markdown={customMarkdown}
                clientName={selectedClient?.name || "Cliente"}
                analysisType="account"
                images={[]}
                ocrTexts={[]}
              />
              {saveStatus && (
                <span className="text-sm text-muted-foreground">
                  {saveStatus}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <MarkdownReport markdown={customMarkdown} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
