import { useEffect, useState, useRef } from "react";
import { AnalysisPDF } from "./AnalysisPDF";
import html2canvas from "html2canvas";

interface PDFGeneratorProps {
  markdown: string;
  clientName: string;
  analysisType: string;
  images: string[]; // <- adicione isso
  ocrTexts: string[]; // <- se usado na geração
  onAfterDownload?: () => void;
}

export function PDFGenerator({
  markdown,
  clientName,
  analysisType,
  images,
  ocrTexts = [],
  onAfterDownload,
}: PDFGeneratorProps) {
  const [isClient, setIsClient] = useState(false);
  const analysisRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const baixarPdf = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_ANALYSIS_MICRO_URL || 'https://analysis-micro.onrender.com';
    try {
      const response = await fetch(`${baseUrl}/analisepdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, analysisType, clientName }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.error || `Erro HTTP ${response.status}`;
        alert(`Erro ao gerar PDF: ${msg}`);
        return;
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0 || blob.type.includes('json')) {
        alert('Erro ao gerar PDF: resposta vazia ou inválida do servidor');
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clientName}-${analysisType}-relatorio.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onAfterDownload?.();
    } catch (e: unknown) {
      alert(`Erro ao gerar PDF: ${e instanceof Error ? e.message : 'falha de rede'}`);
    }
  };
  
  
  

  if (!isClient) return null; // Evita SSR

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={baixarPdf}
        style={{
          background: "#f57c00",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: 4,
          fontWeight: 600,
          cursor: "pointer",
          border: "none",
        }}
      >
        Baixar PDF
      </button>

      {/* Elemento invisível para captura, se quiser usar */}
      <div style={{ position: "absolute", top: -9999, left: -9999 }}>
        <AnalysisPDF
          ref={analysisRef}
          clientName={clientName}
          analysisType={analysisType}
          markdown={markdown}
          fileName={`relatorio_${clientName}.pdf`}
        />
      </div>
    </div>
  );
}
