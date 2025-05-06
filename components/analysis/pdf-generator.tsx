import jsPDF from "jspdf";
import "jspdf-autotable";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PDFGeneratorProps {
  markdown: string;
  clientName: string;
  analysisType: string;
  onFinish?: () => void;
  onSuccess?: () => void;
  autoGenerate?: boolean;
  saveAnalysis?: boolean;
}

export function PDFGenerator({
  markdown,
  clientName,
  analysisType,
  onFinish,
  onSuccess,
  autoGenerate,
  saveAnalysis,
}: PDFGeneratorProps) {
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  // Garantir que o código só rode no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  const generatePDF = () => {
    if (!isClient) return; // Não executar no servidor

    try {
      // Importante: garantir que autoTable seja carregado corretamente
      const doc = new jsPDF();

      // Verificar se autoTable está disponível
      if (typeof doc.autoTable !== "function") {
        console.error(
          "autoTable não está disponível. Inicializando manualmente..."
        );
        // @ts-ignore
        import("jspdf-autotable").then(() => {
          generatePDFWithAutoTable();
        });
        return;
      }

      generatePDFWithAutoTable(doc);
    } catch (error) {
      console.error("Erro ao gerar PDF a partir do Markdown:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
      if (onFinish) onFinish();
    }
  };

  const saveAnalysisToDatabase = async () => {
    if (!saveAnalysis) return;

    try {
      // Executar a lógica para salvar a análise no banco de dados
      const response = await fetch("/api/analises/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          markdown,
          clientName,
          analysisType,
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao salvar análise");
      }

      toast({
        title: "Análise salva com sucesso",
        description: "A análise foi salva no banco de dados",
        variant: "default",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao salvar análise:", error);
      toast({
        title: "Erro ao salvar análise",
        description: "Não foi possível salvar a análise. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const generatePDFWithAutoTable = (docInstance?: jsPDF) => {
    try {
      const doc = docInstance || new jsPDF();
      const date = new Date().toLocaleDateString("pt-BR");

      // Configurar header
      doc.setFillColor(245, 124, 0);
      doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(`Relatório de Análise - ${clientName}`, 14, 15);

      // Data e tipo de análise
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(
        `Data: ${date} | Tipo: ${
          analysisType === "account" ? "Conta" : "Anúncios"
        }`,
        14,
        30
      );

      let yPosition = 40;

      // Dividir o markdown em linhas
      const lines = markdown.split("\n");
      let inTable = false;
      let tableHeaders: string[] = [];
      let tableData: string[][] = [];
      let currentSection = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        if (line.startsWith("# ")) {
          doc.setFontSize(16);
          doc.setTextColor(245, 124, 0);
          doc.text(line.substring(2), 14, yPosition);
          yPosition += 10;
          continue;
        }
        if (line.startsWith("## ")) {
          doc.setFontSize(14);
          doc.setTextColor(245, 124, 0);
          doc.text(line.substring(3), 14, yPosition);
          yPosition += 8;
          continue;
        }
        if (line.startsWith("### ")) {
          doc.setFontSize(12);
          doc.setTextColor(245, 124, 0);
          doc.text(line.substring(4), 14, yPosition);
          yPosition += 8;
          currentSection = line.substring(4).trim();
          continue;
        }
        if (line.startsWith("|") && line.endsWith("|")) {
          if (!inTable) {
            inTable = true;
            tableHeaders = line
              .split("|")
              .filter((h) => h.trim() !== "")
              .map((h) => h.trim());
            if (
              i + 1 < lines.length &&
              lines[i + 1].includes("|") &&
              lines[i + 1].includes("-")
            ) {
              i++;
            }
          } else {
            const rowData = line
              .split("|")
              .filter((c) => c.trim() !== "")
              .map((c) => c.trim());
            tableData.push(rowData);
          }
          continue;
        } else if (inTable) {
          inTable = false;

          // Certificar que autoTable está disponível
          if (typeof doc.autoTable === "function") {
            doc.autoTable({
              startY: yPosition,
              head: [tableHeaders],
              body: tableData,
              theme: "grid",
              headStyles: {
                fillColor: [245, 124, 0],
                textColor: [255, 255, 255],
                fontStyle: "bold",
              },
              styles: {
                fontSize: 9,
                cellPadding: 3,
              },
              columnStyles: {
                0: { fontStyle: "bold" },
              },
            });

            // Verificar se lastAutoTable existe
            if (doc.lastAutoTable) {
              yPosition = doc.lastAutoTable.finalY + 10;
            } else {
              // Backup para quando lastAutoTable não está disponível
              yPosition += tableData.length * 10 + 20;
            }
          } else {
            // Fallback caso autoTable não esteja disponível
            for (let row of tableData) {
              let x = 14;
              for (let cell of row) {
                doc.text(cell, x, yPosition);
                x += 40;
              }
              yPosition += 5;
            }
            yPosition += 10;
          }

          tableHeaders = [];
          tableData = [];
        }
        if (
          currentSection.includes("ANÁLISE SKU A SKU") &&
          line.startsWith("Produto:")
        ) {
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(line, 14, yPosition);
          yPosition += 6;
          const productData = [];
          let j = i + 1;
          while (
            j < lines.length &&
            !lines[j].startsWith("Produto:") &&
            !lines[j].startsWith("---") &&
            !lines[j].startsWith("#")
          ) {
            const productLine = lines[j].trim();
            if (productLine === "") {
              j++;
              continue;
            }
            if (
              productLine.includes(":") &&
              !productLine.startsWith("✅") &&
              !productLine.includes("Diagnóstico") &&
              !productLine.includes("Sugestão")
            ) {
              const [key, value] = productLine.split(":").map((p) => p.trim());
              productData.push([key, value]);
            } else if (productLine.includes("Diagnóstico Técnico")) {
              doc.setFontSize(10);
              doc.setTextColor(0, 100, 0);
              doc.text(productLine, 14, yPosition);
              yPosition += 6;
              let diagnosisText = "";
              let k = j + 1;
              while (
                k < lines.length &&
                !lines[k].includes("Sugestão Técnica") &&
                !lines[k].startsWith("Produto:") &&
                !lines[k].startsWith("---")
              ) {
                if (lines[k].trim() !== "") {
                  diagnosisText += lines[k].trim() + " ";
                }
                k++;
              }
              doc.setFontSize(9);
              doc.setTextColor(60, 60, 60);
              const diagnosisWrapped = doc.splitTextToSize(diagnosisText, 180);
              doc.text(diagnosisWrapped, 14, yPosition);
              yPosition += diagnosisWrapped.length * 5 + 5;
              j = k - 1;
            } else if (productLine.includes("Sugestão Técnica")) {
              doc.setFontSize(10);
              doc.setTextColor(0, 100, 0);
              doc.text(productLine, 14, yPosition);
              yPosition += 6;
              let suggestionText = "";
              let k = j + 1;
              while (
                k < lines.length &&
                !lines[k].startsWith("Produto:") &&
                !lines[k].startsWith("---") &&
                !lines[k].startsWith("#")
              ) {
                if (lines[k].trim() !== "") {
                  suggestionText += lines[k].trim() + " ";
                }
                k++;
              }
              doc.setFontSize(9);
              doc.setTextColor(60, 60, 60);
              const suggestionWrapped = doc.splitTextToSize(
                suggestionText,
                180
              );
              doc.text(suggestionWrapped, 14, yPosition);
              yPosition += suggestionWrapped.length * 5 + 10;
              j = k - 1;
            }
            j++;
          }
          if (productData.length > 0 && typeof doc.autoTable === "function") {
            doc.autoTable({
              startY: yPosition,
              body: productData,
              theme: "plain",
              styles: {
                fontSize: 9,
                cellPadding: 2,
              },
              columnStyles: {
                0: { fontStyle: "bold", cellWidth: 40 },
              },
            });

            if (doc.lastAutoTable) {
              yPosition = doc.lastAutoTable.finalY + 10;
            } else {
              yPosition += productData.length * 6 + 10;
            }
          } else {
            // Fallback para quando autoTable não está disponível
            for (let data of productData) {
              doc.text(`${data[0]}: ${data[1]}`, 14, yPosition);
              yPosition += 5;
            }
            yPosition += 10;
          }
          doc.setDrawColor(200, 200, 200);
          doc.line(14, yPosition - 5, 200, yPosition - 5);
          yPosition += 5;
          i = j - 1;
          continue;
        }
        if (line.startsWith("-") || line.startsWith("*")) {
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          const bulletText = doc.splitTextToSize(line, 180);
          doc.text(bulletText, 14, yPosition);
          yPosition += bulletText.length * 5 + 2;
        } else if (
          line.startsWith("✅") ||
          line.startsWith("⚠️") ||
          line.startsWith("📊") ||
          line.startsWith("📈")
        ) {
          doc.setFontSize(10);
          doc.setTextColor(0, 100, 0);
          const emojiText = doc.splitTextToSize(line, 180);
          doc.text(emojiText, 14, yPosition);
          yPosition += emojiText.length * 5 + 2;
        } else if (line.startsWith(">")) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          const quoteText = doc.splitTextToSize(line.substring(1).trim(), 160);
          doc.setDrawColor(245, 124, 0);
          doc.setLineWidth(0.5);
          doc.line(10, yPosition - 3, 10, yPosition + quoteText.length * 5 - 2);
          doc.text(quoteText, 14, yPosition);
          yPosition += quoteText.length * 5 + 3;
        } else if (line === "---") {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(14, yPosition, 180, yPosition);
          yPosition += 5;
        } else {
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          const normalText = doc.splitTextToSize(line, 180);
          doc.text(normalText, 14, yPosition);
          yPosition += normalText.length * 5 + 2;
        }
      }
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `ShoppeAI - Análise de Desempenho | Página ${i} de ${pageCount}`,
          14,
          290
        );
      }
      doc.save(`Analise_${clientName}_${date.replace(/\//g, "-")}.pdf`);

      toast({
        title: "PDF gerado com sucesso!",
        description: "O relatório foi salvo no seu dispositivo.",
        variant: "default",
      });

      // Salvar a análise no banco de dados após gerar o PDF
      if (saveAnalysis) {
        saveAnalysisToDatabase();
      }

      if (onSuccess) onSuccess();
      if (onFinish) onFinish();
    } catch (error) {
      console.error("Erro ao gerar PDF a partir do Markdown:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
      if (onFinish) onFinish();
    }
  };

  useEffect(() => {
    if (isClient && autoGenerate && markdown) {
      generatePDF();
    }
    // eslint-disable-next-line
  }, [isClient, autoGenerate, markdown]);

  if (!isClient) return null;

  return (
    <Button
      onClick={generatePDF}
      className="bg-orange-600 hover:bg-orange-700 text-white"
      disabled={!markdown}
    >
      <Download className="mr-2 h-4 w-4" />
      Gerar PDF
    </Button>
  );
}
