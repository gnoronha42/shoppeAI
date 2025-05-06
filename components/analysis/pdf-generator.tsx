import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

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
  const [isPrinting, setIsPrinting] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Garantir que o código só rode no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const generatePDF = () => {
    if (!isClient) return;
    setIsPrinting(true);

    try {
      // Criar o conteúdo HTML para impressão
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Relatório - ${clientName}</title>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.5;
              color: #333;
              max-width: 210mm;
              margin: 0 auto;
              padding: 10mm;
            }
            
            @page {
              size: A4;
              margin: 10mm;
            }
            
            @media print {
              html, body {
                width: 210mm;
                height: 297mm;
              }
              
              .no-print {
                display: none !important;
              }
              
              .page-break {
                page-break-after: always;
                break-after: page;
              }
            }
            
            .header {
              background-color: #f57c00;
              color: white;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 5px;
            }
            
            h1 {
              font-size: 24px;
              color: #f57c00;
              margin-top: 25px;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 1px solid #eee;
            }
            
            h2 {
              font-size: 20px;
              color: #f57c00;
              margin-top: 20px;
              margin-bottom: 10px;
            }
            
            h3 {
              font-size: 16px;
              color: #f57c00;
              margin-top: 15px;
              margin-bottom: 8px;
            }
            
            p {
              margin: 8px 0;
            }
            
            ul, ol {
              padding-left: 20px;
              margin: 8px 0;
            }
            
            hr {
              border: none;
              border-top: 1px solid #ddd;
              margin: 20px 0;
            }
            
            .emoji-text {
              color: #1b5e20;
              font-weight: 500;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            
            th {
              background-color: #f57c00;
              color: white;
              text-align: left;
              padding: 8px;
              font-weight: 600;
            }
            
            td {
              border: 1px solid #ddd;
              padding: 8px;
            }
            
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            
            blockquote {
              border-left: 4px solid #f57c00;
              padding-left: 15px;
              margin: 15px 0;
              color: #666;
              font-style: italic;
            }
            
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 10px;
              color: #999;
              border-top: 1px solid #eee;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="color: white; margin: 0;">Relatório de Análise - ${clientName}</h1>
            <p style="margin: 5px 0 0; font-size: 12px;">Data: ${new Date().toLocaleDateString("pt-BR")} | Tipo: ${
              analysisType === "account" ? "Conta" : "Anúncios"
            }</p>
          </div>
          
          <div class="content">
            ${formatMarkdownForHTML(markdown)}
          </div>
          
          <div class="footer">
            <p>ShoppeAI - Análise de Desempenho | Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
          </div>
        </body>
        </html>
      `;

      // Usar um iframe oculto para imprimir
      if (printFrameRef.current) {
        const iframe = printFrameRef.current;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(printContent);
          iframeDoc.close();
          
          // Esperar um pouco para que o conteúdo carregue
          setTimeout(() => {
            try {
              iframe.contentWindow?.print();
              
              // Quando a impressão for concluída (ou cancelada)
              setTimeout(() => {
                setIsPrinting(false);
                
                toast({
                  title: "PDF gerado com sucesso!",
                  description: "O relatório foi enviado para impressão.",
                  variant: "default",
                });
                
                // Salvar a análise no banco de dados após gerar o PDF
                if (saveAnalysis) {
                  saveAnalysisToDatabase();
                }
                
                if (onFinish) onFinish();
              }, 1000);
            } catch (error) {
              console.error("Erro ao imprimir:", error);
              setIsPrinting(false);
              
              toast({
                title: "Erro ao gerar PDF",
                description: "Ocorreu um erro ao enviar para impressão. Tente novamente.",
                variant: "destructive",
              });
              
              if (onFinish) onFinish();
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setIsPrinting(false);
      
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao preparar o conteúdo para impressão. Tente novamente.",
        variant: "destructive",
      });
      
      if (onFinish) onFinish();
    }
  };

  // Formatar markdown para HTML
  const formatMarkdownForHTML = (markdownText: string) => {
    // Pré-processamento para tabelas
    let processedMarkdown = markdownText;
    const tableRegex = /(\|.*\|\n)+/g;
    const tables = markdownText.match(tableRegex);
    
    if (tables) {
      tables.forEach(tableText => {
        let tableHTML = '<table class="markdown-table">';
        const rows = tableText.trim().split('\n');
        
        // Verificar se tem linha de cabeçalho e separador
        let hasHeader = rows.length > 1 && rows[1].includes('---');
        
        rows.forEach((row, rowIndex) => {
          // Pular linha de separador
          if (rowIndex === 1 && hasHeader && row.includes('---')) {
            return;
          }
          
          const cells = row.split('|').filter(cell => cell.trim() !== '');
          
          if (cells.length > 0) {
            if (rowIndex === 0 && hasHeader) {
              // Cabeçalho
              tableHTML += '<thead><tr>';
              cells.forEach(cell => {
                tableHTML += `<th>${cell.trim()}</th>`;
              });
              tableHTML += '</tr></thead><tbody>';
            } else {
              // Linhas normais
              if (rowIndex === 0 && !hasHeader) {
                tableHTML += '<tbody>';
              }
              
              tableHTML += '<tr>';
              cells.forEach(cell => {
                tableHTML += `<td>${cell.trim()}</td>`;
              });
              tableHTML += '</tr>';
            }
          }
        });
        
        tableHTML += '</tbody></table>';
        processedMarkdown = processedMarkdown.replace(tableText, tableHTML);
      });
    }
    
    // Continuar com o restante do processamento
    let html = processedMarkdown
      // Títulos
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      
      // Separadores
      .replace(/^---$/gm, '<hr>')
      
      // Emojis e textos especiais
      .replace(/^(✅|⚠️|📊|📈|📌|📍|🟢|🟡|🔴)(.*$)/gm, '<p class="emoji-text">$1$2</p>')
      
      // Links - opcional
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      
      // Bold e itálico
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      
      // Bullets
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^(\s*)-\s*([^\n]*)/gm, '<li>$2</li>')
      
      // Agrupar items de lista
      .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')
      
      // Quebras de linha
      .replace(/\n\n/g, '</p><p>');
    
    return `<div>${html}</div>`;
  };

  useEffect(() => {
    if (isClient && autoGenerate && markdown) {
      generatePDF();
    }
    // eslint-disable-next-line
  }, [isClient, autoGenerate, markdown]);

  if (!isClient) return null;

  return (
    <>
      <Button 
        onClick={generatePDF} 
        className="bg-orange-600 hover:bg-orange-700 text-white"
        disabled={!markdown || isPrinting}
      >
        <Printer className="mr-2 h-4 w-4" />
        {isPrinting ? "Gerando PDF..." : "Gerar PDF"}
      </Button>
      
      <iframe
        ref={printFrameRef}
        style={{ 
          position: 'absolute',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
        title="Print Frame"
      />
    </>
  );
}
