"use client";
import React, { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { useSearchParams } from "next/navigation";
import logoefeito from "@/assets/logoe.png";

// Componente interno que usa useSearchParams
function ObrigadoContent() {
  const [relatorio, setRelatorio] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  
  useEffect(() => {
    try {
      console.log('🔍 Debugando página obrigado...');
      
      // Priorizar localStorage e sessionStorage (mais confiável que URL)
      const relatorioLocalStorage = typeof window !== 'undefined' ? localStorage.getItem('relatorio') : null;
      const relatorioSessionStorage = typeof window !== 'undefined' ? sessionStorage.getItem('relatorio') : null;
      const relatorioParam = searchParams?.get('relatorio');
      const timestamp = typeof window !== 'undefined' ? localStorage.getItem('relatorio_timestamp') : null;
      
      console.log('💾 localStorage relatorio:', relatorioLocalStorage ? 'Presente (tamanho: ' + relatorioLocalStorage.length + ')' : 'Ausente');
      console.log('🗂️ sessionStorage relatorio:', relatorioSessionStorage ? 'Presente (tamanho: ' + relatorioSessionStorage.length + ')' : 'Ausente');
      console.log('📄 Parâmetro URL relatorio:', relatorioParam ? 'Presente (tamanho: ' + relatorioParam.length + ')' : 'Ausente');
      console.log('⏰ Timestamp:', timestamp ? new Date(parseInt(timestamp)).toLocaleString() : 'Ausente');
      
      // Prioridade: localStorage > sessionStorage > URL
      if (relatorioLocalStorage) {
        console.log('✅ Usando relatório do localStorage (prioridade 1)');
        console.log('📝 Relatório localStorage (primeiros 100 chars):', relatorioLocalStorage.substring(0, 100));
        setRelatorio(relatorioLocalStorage);
      } else if (relatorioSessionStorage) {
        console.log('✅ Usando relatório do sessionStorage (prioridade 2)');
        console.log('📝 Relatório sessionStorage (primeiros 100 chars):', relatorioSessionStorage.substring(0, 100));
        setRelatorio(relatorioSessionStorage);
      } else if (relatorioParam) {
        console.log('✅ Usando relatório da URL (prioridade 3)');
        const decoded = decodeURIComponent(relatorioParam);
        console.log('📝 Relatório decodificado (primeiros 100 chars):', decoded.substring(0, 100));
        setRelatorio(decoded);
      } else {
        console.log('❌ Nenhum relatório encontrado');
        console.log('🔍 URL atual:', window.location.href);
        console.log('🔍 SearchParams disponíveis:', Array.from(searchParams?.entries() || []));
        console.log('🔍 localStorage keys:', Object.keys(localStorage));
        
        // Tentar buscar outras possíveis chaves no localStorage
        const possibleKeys = ['relatorio', 'preview', 'analise', 'report'];
        let found = false;
        for (const key of possibleKeys) {
          const value = localStorage.getItem(key);
          if (value) {
            console.log(`🔍 Encontrou dados em localStorage['${key}']:`, value.substring(0, 100));
            setRelatorio(value);
            found = true;
            break;
          }
        }
        
        if (!found) {
          setRelatorio("Relatório não encontrado. Por favor, refaça sua análise.");
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar relatório:', error);
      setRelatorio("Erro ao carregar relatório. Por favor, refaça sua análise.");
    }
    
    setLoading(false);
  }, [searchParams]);

  const handlePrint = () => {
    window.print();
  };

  const handleBackToHome = () => {
    // Limpar dados antes de voltar
    localStorage.removeItem('relatorio');
    localStorage.removeItem('relatorio_timestamp');
    sessionStorage.removeItem('relatorio');
    window.location.href = "/selleria";
  };

  const handleClearAndReload = () => {
    // Função para debug - limpar tudo e recarregar
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="relative w-full min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center bg-black overflow-x-hidden">
      {/* Gradiente circular azul escuro cobrindo toda a página */}
      <div 
        className="fixed inset-0 -z-10 flex items-center justify-center"
        style={{
          background: "radial-gradient(ellipse at center, rgba(30,58,138,0.15) 0%, rgba(30,64,175,0.25) 30%, rgba(20,44,120,0.2) 50%, transparent 75%)"
        }}
      ></div>
      
      {/* HEADER SECTION */}
      <div className="w-full flex flex-col items-center justify-center pt-8 pb-6 px-2">
        <div className="mb-[-80px] mt-[-80px]">  
          <Image src={logo} alt="Shop.AI" width={300} height={300} />
        </div>
       
        <h1 className="text-3xl md:text-5xl font-extrabold text-center bg-gradient-to-r from-[#FF3A29] via-[#F96534] to-[#E2732C] bg-clip-text text-transparent mb-4 px-6">
          Obrigado!
        </h1>

        
        
        <p className="text-lg md:text-xl text-center text-gray-200 max-w-2xl mb-6 px-4">
          Sua análise foi gerada com sucesso. 
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-green-500/20 rounded-full px-3 py-1.5 shadow text-green-300 font-semibold text-xs">
            <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Análise Concluída
          </div>
          <div className="flex items-center gap-2 bg-blue-500/20 rounded-full px-3 py-1.5 shadow text-blue-300 font-semibold text-xs">
            <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Relatório Personalizado
          </div>
        </div>
      </div>

      {/* RELATÓRIO SECTION */}
      <div className="w-full flex justify-center items-center pb-8 px-4">
        <Card className="w-full max-w-4xl bg-white/95 border-4 border-[#57545c] rounded-[20px] shadow-2xl print:shadow-none print:border-gray-300">
          <CardHeader className="pt-8 pb-4 text-center print:pb-2">
            <CardTitle className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-[#FF3A29] via-[#F96534] to-[#E2732C] bg-clip-text text-transparent print:text-black">
              Análise da Sua Loja Shopee
            </CardTitle>
            <CardDescription className="text-base md:text-lg text-gray-600 print:text-black">
              Relatório completo gerado por IA - {new Date().toLocaleDateString('pt-BR')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-2 pb-4 print:text-black">
            <div 
              className="prose max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap print:text-black text-sm md:text-base"
              dangerouslySetInnerHTML={{ __html: relatorio.replace(/\n/g, '<br>') }}
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-6 pt-2 print:hidden">
            <div className="flex flex-wrap gap-3 justify-center w-full">
              
              
             

           
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-500">
              <span>📊 Análise gerada por IA</span>
              <span>🔒 Dados seguros</span>
              <span>⭐ Seller.IA</span>
            </div>

            <a
              href="https://consultoriaefeitovendas.com.br/seller-ia/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full px-8 py-4 rounded-full bg-gradient-to-r from-[#FF3A29] to-[#F98934] hover:from-[#F96534] hover:to-[#E2732C] text-white font-bold text-xl shadow-lg transition-all duration-200 mb-4"
              style={{ maxWidth: '98%' }}
            >
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Conheça o Seller.IA 
            </a>
          </CardFooter>
        </Card>
     
      </div>
      <Image src={logoefeito} alt="Shop.AI" width={200} height={200} />

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:text-black {
            color: black !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          .prose {
            font-size: 12px !important;
            line-height: 1.4 !important;
          }
          
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}

export default function ObrigadoPage() {
  return (
    <Suspense fallback={
      <div className="relative w-full min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl">Carregando página...</div>
      </div>
    }>
      <ObrigadoContent />
     
    </Suspense>
  );
}