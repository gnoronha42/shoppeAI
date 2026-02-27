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
    const response = await fetch(`${baseUrl}/analisepdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown, analysisType, clientName }),
    });
  
    if (!response.ok) {
      alert('Erro ao gerar PDF');
      return;
    }
  
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clientName}-${analysisType}-relatorio.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
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
