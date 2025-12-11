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
      
      // Priorizar localStorage e sessionStorage (mais confiável que URL)
      const relatorioLocalStorage = typeof window !== 'undefined' ? localStorage.getItem('relatorio') : null;
      const relatorioSessionStorage = typeof window !== 'undefined' ? sessionStorage.getItem('relatorio') : null;
      const relatorioParam = searchParams?.get('relatorio');
      const timestamp = typeof window !== 'undefined' ? localStorage.getItem('relatorio_timestamp') : null;
      
     
      
     
      if (relatorioLocalStorage) {
        
        setRelatorio(relatorioLocalStorage);
      } else if (relatorioSessionStorage) {
       
        setRelatorio(relatorioSessionStorage);
      } else if (relatorioParam) {
       
        const decoded = decodeURIComponent(relatorioParam);
        setRelatorio(decoded);
      } else {
       
        
        // Tentar buscar outras possíveis chaves no localStorage
        const possibleKeys = ['relatorio', 'preview', 'analise', 'report'];
        let found = false;
        for (const key of possibleKeys) {
          const value = localStorage.getItem(key);
          if (value) {
          
            setRelatorio(value);
            found = true;
            break;
          }
        }
        
        if (!found) {
          setRelatorio("Análise não encontrada. Por favor, refaça sua análise.");
        }
      }
    } catch (error) {
      console.error(' Erro ao carregar relatório:', error);
      setRelatorio("Erro ao carregar análise. Por favor, refaça sua análise.");
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
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center bg-black overflow-x-hidden ">
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
          Sua análise personalizada está pronta! Veja abaixo os insights e recomendações para sua loja.
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
            Análise Personalizada
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
              Análise completa gerada por IA - {new Date().toLocaleDateString('pt-BR')}
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
              
          
          </CardFooter>
        </Card>
          
        
     
      </div>
      <div className="w-full max-w-7xl mx-auto px-4 py-12 print:hidden">
        
        <div className="w-full max-w-7xl mx-auto px-4 py-12 print:hidden">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Planos Profissionais para <span className="bg-gradient-to-r from-[#FF3A29] via-[#F96534] to-[#E2732C] bg-clip-text text-transparent">Escalar sua Conta na Shopee</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-700 max-w-4xl mx-auto text-white">
            Escolha o nível ideal de Inteligência, estratégia e gestão com base em dados reais. Sem achismo.
          </p>
        </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plano E1 */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-md bg-yellow-400 flex items-center justify-center flex-shrink-0">
                <svg fill="white" viewBox="0 0 512 512" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <title>ionicons-v5-p</title>
                    <path d="M477.64,38.26a4.75,4.75,0,0,0-3.55-3.66c-58.57-14.32-193.9,36.71-267.22,110a317,317,0,0,0-35.63,42.1c-22.61-2-45.22-.33-64.49,8.07C52.38,218.7,36.55,281.14,32.14,308a9.64,9.64,0,0,0,10.55,11.2L130,309.57a194.1,194.1,0,0,0,1.19,19.7,19.53,19.53,0,0,0,5.7,12L170.7,375a19.59,19.59,0,0,0,12,5.7,193.53,193.53,0,0,0,19.59,1.19l-9.58,87.2a9.65,9.65,0,0,0,11.2,10.55c26.81-4.3,89.36-20.13,113.15-74.5,8.4-19.27,10.12-41.77,8.18-64.27a317.66,317.66,0,0,0,42.21-35.64C441,232.05,491.74,99.74,477.64,38.26ZM294.07,217.93a48,48,0,1,1,67.86,0A47.95,47.95,0,0,1,294.07,217.93Z"></path>
                    <path d="M168.4,399.43c-5.48,5.49-14.27,7.63-24.85,9.46-23.77,4.05-44.76-16.49-40.49-40.52,1.63-9.11,6.45-21.88,9.45-24.88a4.37,4.37,0,0,0-3.65-7.45,60,60,0,0,0-35.13,17.12C50.22,376.69,48,464,48,464s87.36-2.22,110.87-25.75A59.69,59.69,0,0,0,176,403.09C176.37,398.91,171.28,396.42,168.4,399.43Z"></path>
                  </g>
                </svg>
              </div>
              <h3 className="text-3xl  font-semibold">
                Plano <span className="bg-gradient-to-r from-[#FF3A29] via-[#F96534] to-[#E2732C] bg-clip-text text-transparent font-bold">E1</span>
              </h3>
            </div>

            <h4 className="text-2xl font-bold text-gray-900 mb-2">Inteligência Estratégica</h4>
            <p className="text-3xl font-extrabold text-gray-700 mb-4">R$497,00<span className="text-lg text-gray-500">/mês</span></p>
            <button
              onClick={() => window.open("https://wa.me/5541984775343?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20Plano%20de%20An%C3%A1lise%20com%20I.A%20de%20R%24497%20e%20quero%20entender%20como%20funciona%20a%20an%C3%A1lise%20da%20minha%20loja.", "_blank", "noopener,noreferrer")}
              className="w-full bg-[#FF3A29] hover:bg-[#E63320] text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
              type="button"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
              </svg>
              FALE COM NOSSO CONSULTOR
            </button>
            <div className="border-t border-gray-200 my-4"></div>

            <p className="text-sm text-gray-600 mb-6">
              Ideal para quem já vende e quer tomar decisões com base em dados.
            </p>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Envio de Análises semanais da conta e dos anúncios com apoio da nossa IA
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Diagnóstico prático com sugestões aplicáveis toda semana
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Relatório mensal de fechamento com visão estratégica
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Identificação de gargalos, oportunidades e ações para escalar
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Direcionamento de melhorias na performance dos produtos
              </li>
            </ul>

           
          </div>

          {/* Plano E2 */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-md bg-[#FF3A29] flex items-center justify-center flex-shrink-0">
              <svg fill="white" viewBox="0 0 512 512" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <title>ionicons-v5-p</title>
                    <path d="M477.64,38.26a4.75,4.75,0,0,0-3.55-3.66c-58.57-14.32-193.9,36.71-267.22,110a317,317,0,0,0-35.63,42.1c-22.61-2-45.22-.33-64.49,8.07C52.38,218.7,36.55,281.14,32.14,308a9.64,9.64,0,0,0,10.55,11.2L130,309.57a194.1,194.1,0,0,0,1.19,19.7,19.53,19.53,0,0,0,5.7,12L170.7,375a19.59,19.59,0,0,0,12,5.7,193.53,193.53,0,0,0,19.59,1.19l-9.58,87.2a9.65,9.65,0,0,0,11.2,10.55c26.81-4.3,89.36-20.13,113.15-74.5,8.4-19.27,10.12-41.77,8.18-64.27a317.66,317.66,0,0,0,42.21-35.64C441,232.05,491.74,99.74,477.64,38.26ZM294.07,217.93a48,48,0,1,1,67.86,0A47.95,47.95,0,0,1,294.07,217.93Z"></path>
                    <path d="M168.4,399.43c-5.48,5.49-14.27,7.63-24.85,9.46-23.77,4.05-44.76-16.49-40.49-40.52,1.63-9.11,6.45-21.88,9.45-24.88a4.37,4.37,0,0,0-3.65-7.45,60,60,0,0,0-35.13,17.12C50.22,376.69,48,464,48,464s87.36-2.22,110.87-25.75A59.69,59.69,0,0,0,176,403.09C176.37,398.91,171.28,396.42,168.4,399.43Z"></path>
                  </g>
                </svg>
              </div>
              <h3 className="text-3xl  font-semibold">
                Plano <span className="bg-gradient-to-r from-[#FF3A29] via-[#F96534] to-[#E2732C] bg-clip-text text-transparent font-bold">E2</span>
              </h3>
            </div>

            <h4 className="text-2xl font-bold text-gray-900 mb-2">Estratégia com Suporte Direto</h4>
            <p className="text-3xl font-extrabold text-gray-700 mb-4">R$997,00<span className="text-lg text-gray-500">/mês</span></p>
            <button
              onClick={() => window.open("https://wa.me/5541984775343?text=Ol%C3%A1!%20Vi%20o%20Plano%20de%20I.A%20com%20Suporte%20por%20R%24997%20e%20quero%20saber%20mais%20detalhes%20sobre%20o%20acompanhamento%20que%20voc%C3%AAs%20oferecem.", "_blank", "noopener,noreferrer")}
              className="w-full bg-[#FF3A29] hover:bg-[#E63320] text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
              type="button"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
              </svg>
              FALE COM NOSSO CONSULTOR
            </button>
            <div className="border-t border-gray-200 my-4"></div>

            <p className="text-sm text-gray-600 mb-6">
              Ideal para quem aplica sozinho, mas quer validação e orientação contínua.
            </p>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Envio de análises semanais da conta e dos anúncios com apoio da nossa IA
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Diagnóstico prático com sugestões aplicáveis toda semana
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Relatório mensal de fechamento com visão estratégica
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Identificação de gargalos, oportunidades e ações para escalar
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Direcionamento de melhorias na performance dos produtos
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                2 reuniões mensais com estrategista (30min cada)
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Grupo exclusivo para tirar dúvidas direto com nosso time
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Auditoria quinzenal dos produtos e anúncios da sua conta
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Recomendações personalizadas de ajuste semanal
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Alinhamento de estratégia para campanhas sazonais (ex: 9.9, 11.11)
              </li>
            </ul>

       
          </div>

          {/* Plano E3 */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-md bg-[#9100B3]/20 flex items-center justify-center flex-shrink-0">
                <svg fill="white" viewBox="0 0 512 512" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <title>ionicons-v5-p</title>
                    <path d="M477.64,38.26a4.75,4.75,0,0,0-3.55-3.66c-58.57-14.32-193.9,36.71-267.22,110a317,317,0,0,0-35.63,42.1c-22.61-2-45.22-.33-64.49,8.07C52.38,218.7,36.55,281.14,32.14,308a9.64,9.64,0,0,0,10.55,11.2L130,309.57a194.1,194.1,0,0,0,1.19,19.7,19.53,19.53,0,0,0,5.7,12L170.7,375a19.59,19.59,0,0,0,12,5.7,193.53,193.53,0,0,0,19.59,1.19l-9.58,87.2a9.65,9.65,0,0,0,11.2,10.55c26.81-4.3,89.36-20.13,113.15-74.5,8.4-19.27,10.12-41.77,8.18-64.27a317.66,317.66,0,0,0,42.21-35.64C441,232.05,491.74,99.74,477.64,38.26ZM294.07,217.93a48,48,0,1,1,67.86,0A47.95,47.95,0,0,1,294.07,217.93Z"></path>
                    <path d="M168.4,399.43c-5.48,5.49-14.27,7.63-24.85,9.46-23.77,4.05-44.76-16.49-40.49-40.52,1.63-9.11,6.45-21.88,9.45-24.88a4.37,4.37,0,0,0-3.65-7.45,60,60,0,0,0-35.13,17.12C50.22,376.69,48,464,48,464s87.36-2.22,110.87-25.75A59.69,59.69,0,0,0,176,403.09C176.37,398.91,171.28,396.42,168.4,399.43Z"></path>
                  </g>
                </svg>
              </div>
              <h3 className="text-3xl font-semibold">
                Plano <span className="bg-gradient-to-r from-[#FF3A29] via-[#F96534] to-[#E2732C] bg-clip-text text-transparent font-bold">E3</span>
              </h3>
            </div>

            <h4 className="text-2xl font-bold text-gray-900 mb-2">Gestão com IA + Especialistas</h4>
            <p className="text-3xl font-extrabold text-gray-700 mb-4">R$1.897,00<span className="text-lg text-gray-500">/mês</span></p>
            <button
              onClick={() => window.open("https://wa.me/5541984775343?text=Ol%C3%A1!%20Tenho%20interesse%20no%20Plano%20de%20Gest%C3%A3o%20Completa%20e%20quero%20entender%20melhor%20como%20funciona%20o%20trabalho%20de%20voc%C3%AAs%20na%20pr%C3%A1tica.", "_blank", "noopener,noreferrer")}
              className="w-full bg-[#FF3A29] hover:bg-[#E63320] text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
              type="button"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
              </svg>
              FALE COM NOSSO CONSULTOR
            </button> 
            <div className="border-t border-gray-200 my-4"></div>

            <p className="text-sm text-gray-600 mb-6">
              Ideal para quem quer focar nas vendas e deixar tudo nas mãos de quem entende.
            </p>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <strong>Tudo dos planos E1 e E2</strong>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Acesso ao nosso time de especialistas que fazem a gestão completa da sua conta Shopee
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Criação e otimização de cadastros, títulos, imagens (conforme disponibilidade de pacote) e SEO
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Estratégia e execução de campanhas no Shopee Ads
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Leitura de dados semanais com inteligência artificial + revisão humana
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Planejamento mensal de vendas e ações para escalar
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="#FF3A29" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                Monitoramento contínuo com foco em performance e crescimento
              </li>
            </ul>

          
          </div>
        </div>
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