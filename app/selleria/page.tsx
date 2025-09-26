"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import logo from "@/assets/logo.png";
import logoefeito from "@/assets/logoe.png";
import { Select, SelectItem, SelectContent, SelectValue, SelectTrigger } from "@/components/ui/select";

export default function SelleriaPage() {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    faturamento30d: "",
    visitantes: "",
    pedidos: "",
    investimentoAds: "",
    roasMensal: "",
    desafio: "",
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);
    setProgress(10);
    try {
      const progressInterval = setInterval(() => {
        setProgress((old) => {
          if (old < 90) return old + 10;
          return old;
        });
      }, 300);
      const res = await fetch("https://analysis-micro.onrender.com/api/whatsapp-express", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      clearInterval(progressInterval);
      setProgress(100);
      const data = await res.json();
   
      
      if (res.ok && data.success) {
        if (data.preview ) {
          const relatorioCompleto =  data.preview;
    
          
          try {
            localStorage.setItem('relatorio', relatorioCompleto);
            
            // Também salvar no sessionStorage como backup
            sessionStorage.setItem('relatorio', relatorioCompleto);
            
            const verificacao = localStorage.getItem('relatorio');
            
            localStorage.setItem('relatorio_timestamp', Date.now().toString());
            
    
            window.location.href = '/obrigado';
          } catch (error) {
            console.error('❌ Erro no processo:', error);
            setError('Erro ao processar relatório. Tente novamente.');
          }
        } else {
          setSuccess("Mensagem enviada para o WhatsApp! Você receberá a análise em até 24h.");
          toast({
            title: "Mensagem enviada!",
            description: "Você receberá a análise em até 24h no WhatsApp.",
          });
        }
        setForm({
          nome: "",
          email: "",
          telefone: "",
          faturamento30d: "",
          visitantes: "",
          pedidos: "",
          investimentoAds: "",
          roasMensal: "",
          desafio: "",
        });
      } else {
        setError(data.error || "Erro ao enviar mensagem para o WhatsApp.");
      }
    } catch (err: any) {
      setError("Erro de conexão com o microserviço.");
    }
    setLoading(false);
    setTimeout(() => setProgress(0), 500);
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center bg-black overflow-x-hidden">
      {/* HERO SECTION */}
      <div className="w-full flex flex-col items-center justify-center pt-12 pb-8 px-2">
        <div className="relative flex flex-col items-center">
          <div 
            className="absolute inset-0 rounded-full blur-xl transform scale-150 -translate-y-8"
            style={{
              background: "radial-gradient(circle, rgba(30,58,138,0.2) 0%, rgba(30,64,175,0.3) 40%, transparent 70%)"
            }}
          ></div>
          
          <div className="relative mb-[-100px] mt-[-100px] z-10">  
            <Image src={logo} alt="Shop.AI" width={400} height={400} />
          </div>
         
          <h1 className="relative z-10 text-3xl md:text-5xl font-extrabold text-center bg-gradient-to-r from-[#FF3A29] via-[#F96534] to-[#E2732C] bg-clip-text text-transparent mb-4 px-6">
          Sua loja pode vender muito mais 

          </h1>
          
          <p className="relative z-10 text-lg md:text-2xl text-center text-gray-200 max-w-2xl mb-6 px-4">
          Pare de adivinhar. A Seller.IA faz uma análise gratuita e mostra exatamente o que está impedindo sua loja de crescer  🚀
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 shadow text-white font-semibold text-xs">
            <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#e65c00">
              <g>
                <path d="M11.5283 1.5999C11.7686 1.29437 12.2314 1.29437 12.4717 1.5999L14.2805 3.90051C14.4309 4.09173 14.6818 4.17325 14.9158 4.10693L17.7314 3.3089C18.1054 3.20292 18.4799 3.475 18.4946 3.86338L18.6057 6.78783C18.615 7.03089 18.77 7.24433 18.9984 7.32823L21.7453 8.33761C22.1101 8.47166 22.2532 8.91189 22.0368 9.23478L20.4078 11.666C20.2724 11.8681 20.2724 12.1319 20.4078 12.334L22.0368 14.7652C22.2532 15.0881 22.1101 15.5283 21.7453 15.6624L18.9984 16.6718C18.77 16.7557 18.615 16.9691 18.6057 17.2122L18.4946 20.1366C18.4799 20.525 18.1054 20.7971 17.7314 20.6911L14.9158 19.8931C14.6818 19.8267 14.4309 19.9083 14.2805 20.0995L12.4717 22.4001C12.2314 22.7056 11.7686 22.7056 11.5283 22.4001L9.71949 20.0995C9.56915 19.9083 9.31823 19.8267 9.08421 19.8931L6.26856 20.6911C5.89463 20.7971 5.52014 20.525 5.50539 20.1366L5.39427 17.2122C5.38503 16.9691 5.22996 16.7557 5.00164 16.6718L2.25467 15.6624C1.88986 15.5283 1.74682 15.0881 1.96317 14.7652L3.59221 12.334C3.72761 12.1319 3.72761 11.8681 3.59221 11.666L1.96317 9.23478C1.74682 8.91189 1.88986 8.47166 2.25467 8.33761L5.00165 7.32823C5.22996 7.24433 5.38503 7.03089 5.39427 6.78783L5.50539 3.86338C5.52014 3.475 5.89463 3.20292 6.26857 3.3089L9.08421 4.10693C9.31823 4.17325 9.56915 4.09173 9.71949 3.90051L11.5283 1.5999Z" stroke="#ce3027" strokeWidth="1.2"></path>
                <path d="M9 12L11 14L15 10" stroke="#ce3027" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
              </g>
            </svg>
            Análise inteligente
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 shadow text-white font-semibold text-xs">
            <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#e65c00">
              <g>
                <path d="M11.5283 1.5999C11.7686 1.29437 12.2314 1.29437 12.4717 1.5999L14.2805 3.90051C14.4309 4.09173 14.6818 4.17325 14.9158 4.10693L17.7314 3.3089C18.1054 3.20292 18.4799 3.475 18.4946 3.86338L18.6057 6.78783C18.615 7.03089 18.77 7.24433 18.9984 7.32823L21.7453 8.33761C22.1101 8.47166 22.2532 8.91189 22.0368 9.23478L20.4078 11.666C20.2724 11.8681 20.2724 12.1319 20.4078 12.334L22.0368 14.7652C22.2532 15.0881 22.1101 15.5283 21.7453 15.6624L18.9984 16.6718C18.77 16.7557 18.615 16.9691 18.6057 17.2122L18.4946 20.1366C18.4799 20.525 18.1054 20.7971 17.7314 20.6911L14.9158 19.8931C14.6818 19.8267 14.4309 19.9083 14.2805 20.0995L12.4717 22.4001C12.2314 22.7056 11.7686 22.7056 11.5283 22.4001L9.71949 20.0995C9.56915 19.9083 9.31823 19.8267 9.08421 19.8931L6.26856 20.6911C5.89463 20.7971 5.52014 20.525 5.50539 20.1366L5.39427 17.2122C5.38503 16.9691 5.22996 16.7557 5.00164 16.6718L2.25467 15.6624C1.88986 15.5283 1.74682 15.0881 1.96317 14.7652L3.59221 12.334C3.72761 12.1319 3.72761 11.8681 3.59221 11.666L1.96317 9.23478C1.74682 8.91189 1.88986 8.47166 2.25467 8.33761L5.00165 7.32823C5.22996 7.24433 5.38503 7.03089 5.39427 6.78783L5.50539 3.86338C5.52014 3.475 5.89463 3.20292 6.26857 3.3089L9.08421 4.10693C9.31823 4.17325 9.56915 4.09173 9.71949 3.90051L11.5283 1.5999Z" stroke="#ce3027" strokeWidth="1.2"></path>
                <path d="M9 12L11 14L15 10" stroke="#ce3027" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
              </g>
            </svg>
            Decisões baseadas em dados
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 shadow text-white font-semibold text-xs">
            <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#e65c00">
              <g>
                <path d="M11.5283 1.5999C11.7686 1.29437 12.2314 1.29437 12.4717 1.5999L14.2805 3.90051C14.4309 4.09173 14.6818 4.17325 14.9158 4.10693L17.7314 3.3089C18.1054 3.20292 18.4799 3.475 18.4946 3.86338L18.6057 6.78783C18.615 7.03089 18.77 7.24433 18.9984 7.32823L21.7453 8.33761C22.1101 8.47166 22.2532 8.91189 22.0368 9.23478L20.4078 11.666C20.2724 11.8681 20.2724 12.1319 20.4078 12.334L22.0368 14.7652C22.2532 15.0881 22.1101 15.5283 21.7453 15.6624L18.9984 16.6718C18.77 16.7557 18.615 16.9691 18.6057 17.2122L18.4946 20.1366C18.4799 20.525 18.1054 20.7971 17.7314 20.6911L14.9158 19.8931C14.6818 19.8267 14.4309 19.9083 14.2805 20.0995L12.4717 22.4001C12.2314 22.7056 11.7686 22.7056 11.5283 22.4001L9.71949 20.0995C9.56915 19.9083 9.31823 19.8267 9.08421 19.8931L6.26856 20.6911C5.89463 20.7971 5.52014 20.525 5.50539 20.1366L5.39427 17.2122C5.38503 16.9691 5.22996 16.7557 5.00164 16.6718L2.25467 15.6624C1.88986 15.5283 1.74682 15.0881 1.96317 14.7652L3.59221 12.334C3.72761 12.1319 3.72761 11.8681 3.59221 11.666L1.96317 9.23478C1.74682 8.91189 1.88986 8.47166 2.25467 8.33761L5.00165 7.32823C5.22996 7.24433 5.38503 7.03089 5.39427 6.78783L5.50539 3.86338C5.52014 3.475 5.89463 3.20292 6.26857 3.3089L9.08421 4.10693C9.31823 4.17325 9.56915 4.09173 9.71949 3.90051L11.5283 1.5999Z" stroke="#ce3027" strokeWidth="1.2"></path>
                <path d="M9 12L11 14L15 10" stroke="#ce3027" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
              </g>
            </svg>
            Escala previsível
          </div>
        </div>
      </div>
      {/* FORM SECTION */}
      <div className="w-full flex justify-center items-center pb-12">
        <Card className="w-full max-w-lg md:max-w-2xl bg-transparent border-4 border-[#57545c] rounded-[20px] shadow-none p-0">
          <CardHeader className="pt-8 pb-2 text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-[#FF3A29] via-[#F96534] to-[#E2732C] bg-clip-text text-transparent">
              Receba sua Análise Express
            </CardTitle>
            <CardDescription className="text-base md:text-lg text-gray-200">
              Preencha os dados abaixo e receba sua análise personalizada no WhatsApp e e-mail
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-0">
            {success && <div className="bg-green-100 text-green-800 p-3 rounded mb-4 text-center font-semibold">{success}</div>}
            {error && <div className="bg-red-100 text-red-800 p-3 rounded mb-4 text-center font-semibold">{error}</div>}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white" htmlFor="nome">Nome / Nome da Loja *</label>
                  <input type="text" id="nome" name="nome" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-300 rounded-[8px] px-3 py-2 focus:outline-none focus:border-[#FF3A29] transition" required value={form.nome} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white" htmlFor="email">E-mail </label>
                  <input type="email" id="email" name="email" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-300 rounded-[8px] px-3 py-2 focus:outline-none focus:border-[#FF3A29] transition" required value={form.email} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white" htmlFor="telefone">Telefone (WhatsApp) para Receber a Análise * *</label>
                  <input type="text" id="telefone" name="telefone" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-300 rounded-[8px] px-3 py-2 focus:outline-none focus:border-[#FF3A29] transition" required value={form.telefone} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white" htmlFor="faturamento30d">Valor Faturado nos Últimos 30 Dias *</label>
                  <input type="text" id="faturamento30d" name="faturamento30d" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-300 rounded-[8px] px-3 py-2 focus:outline-none focus:border-[#FF3A29] transition" required value={form.faturamento30d} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white" htmlFor="visitantes">Visitantes (Últimos 30 Dias) *</label>
                  <input type="text" id="visitantes" name="visitantes" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-300 rounded-[8px] px-3 py-2 focus:outline-none focus:border-[#FF3A29] transition" required value={form.visitantes} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white" htmlFor="pedidos">Pedidos (Últimos 30 Dias) *</label>
                  <input type="text" id="pedidos" name="pedidos" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-300 rounded-[8px] px-3 py-2 focus:outline-none focus:border-[#FF3A29] transition" required value={form.pedidos} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white" htmlFor="investimentoAds">Investimento Mensal em Shopee Ads *</label>
                  <input type="text" id="investimentoAds" name="investimentoAds" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-300 rounded-[8px] px-3 py-2 focus:outline-none focus:border-[#FF3A29] transition" required value={form.investimentoAds} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white" htmlFor="roasMensal">ROAS Mensal *</label>
                  <input type="text" id="roasMensal" name="roasMensal" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-300 rounded-[8px] px-3 py-2 focus:outline-none focus:border-[#FF3A29] transition" required value={form.roasMensal} onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white" htmlFor="desafio">Maior Desafio Hoje *</label>
             
                <Select name="desafio" required value={form.desafio} onValueChange={(value) => setForm({ ...form, desafio: value })}>
                  <SelectTrigger className="w-full border-2 border-[#FF3A29] bg-white/5 text-white rounded-[8px] px-3 py-2 focus:outline-none focus:border-[#FF3A29] transition">
                    <SelectValue placeholder="Selecione seu maior desafio atual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trafego">Aumentar Tráfego / Visibilidade</SelectItem>
                    <SelectItem value="conversao">Melhorar Taxa de Conversão</SelectItem>
                    <SelectItem value="ads">Otimizar Shopee Ads / ROAS</SelectItem>
                    <SelectItem value="ticket">Aumentar Ticket Médio</SelectItem>
                    <SelectItem value="logistica">Melhorar Logística / Entrega</SelectItem>
                    <SelectItem value="concorrencia">Competir com Concorrência</SelectItem>
                  </SelectContent>
                </Select>
                 
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full text-lg py-3 bg-gradient-to-r from-[#FF3A29] to-[#F98934] hover:from-[#F96534] hover:to-[#E2732C] text-white font-bold border-none shadow-none" disabled={loading}>
                  {!loading && <span>Gerar Análise da Minha Conta</span>}
                  {loading && <span>Processando... aguarde {progress}%</span>}
                </Button>
         
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pb-6 pt-2">
            <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-300">
              <span>🔒 Dados protegidos</span>
              <span>🚀 +500 lojas analisadas</span>
              <span>⭐ 4.9/5 de satisfação</span>
            </div>
          </CardFooter>
        </Card>
      </div>
      <Image src={logoefeito} alt="Shop.AI" width={200} height={200} />

    </div>
  );
} 