"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { Select, SelectItem, SelectContent, SelectValue, SelectTrigger } from "@/components/ui/select";
import { motion } from "framer-motion";


// Componente para ícones da lista
const CheckmarkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-[#FF3A29]">
        <path d="M20 6L9 17l-5-5"/>
    </svg>
);


// Componente para os cards de recursos (substituindo os flip-boxes)
const FeatureCard = ({ icon, title, description, fullDescription }: { icon: React.ReactNode, title: string, description: string, fullDescription: string }) => (
  <div className="group relative w-full h-64 rounded-xl border border-white/20 bg-white/5 p-6 text-center text-white transition-all duration-500 [transform-style:preserve-3d] hover:[transform:rotateY(180deg)]">
    {/* Frente do Card */}
    <div className="absolute inset-0 flex flex-col items-center justify-center [backface-visibility:hidden]">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
    {/* Dorso do Card */}
    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-800 p-6 [transform:rotateY(180deg)] [backface-visibility:hidden]">
      <p className="text-sm text-gray-200">{fullDescription}</p>
    </div>
  </div>
);


export default function SelleriaPage() {
    const [lottieJson, setLottieJson] = useState(null);

  useEffect(() => {
    fetch('https://consultoriaefeitovendas.com.br/wp-content/uploads/2025/07/simple-ai-pulse.json')
      .then(response => response.json())
      .then(data => setLottieJson(data))
      .catch(error => console.error('Error loading Lottie animation:', error));
  }, []);

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

      try {
     
        const userResponse = await fetch("/api/analysts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nome, email: form.email, telefone: form.telefone }),
        });
        
        const userData = await userResponse.json();
      
        
        if (userData.success) {
          console.log(' Usuário salvo com sucesso:', userData.analyst?.name);
          console.log(' Telefone salvo:', userData.analyst?.telefone);
        } else {
          console.log(' Aviso no cadastro de usuário:', userData.message || userData.error);
        }
      } catch (userError) {
        console.error('Erro ao salvar usuário (continuando com análise):', userError);
      }
      
      const res = await fetch("https://analysis-micro.onrender.com/api/whatsapp-express", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      clearInterval(progressInterval);
      setProgress(100);
      const data = await res.json();
   
      
      if (res.ok && data.success) {
        const relatorioCompleto = data.preview || data.relatorio || data.analise;
        
        if (relatorioCompleto) {
          console.log(' Análise gerada com sucesso!');
  
          
          try {
            localStorage.setItem('relatorio', relatorioCompleto);
            sessionStorage.setItem('relatorio', relatorioCompleto);
            localStorage.setItem('relatorio_timestamp', Date.now().toString());
            
           
            
            window.location.href = '/obrigado';
          } catch (error) {
            console.error('Erro ao processar análise:', error);
            setError('Erro ao processar análise. Tente novamente.');
          }
        } else {
          console.error('Nenhuma análise encontrada na resposta');
          setError('Erro: Análise não foi gerada. Tente novamente.');
        }
        setForm({
          nome: "", email: "", telefone: "", faturamento30d: "",
          visitantes: "", pedidos: "", investimentoAds: "", roasMensal: "", desafio: "",
        });
      } else {
        setError(data.error || "Erro ao gerar análise.");
      }
    } catch (err: any) {
      setError("Erro de conexão com o microserviço.");
    }
    setLoading(false);
    setTimeout(() => setProgress(0), 500);
  };
  

 
  function AIPulse() {
    const rings = [0, 1, 2]; // número de ondas
  
    return (
      <div className="relative flex items-center justify-center w-96 h-96 bg-red">
        {/* O quadrado central */}
        <div className="relative flex items-center justify-center w-48 h-48 rounded-2xl bg-gray-800">
          <span className="text-7xl font-bold text-gray-200">AI</span>
          {/* Borda degradê */}
          <div className="absolute inset-0 rounded-2xl p-[3px] bg-gradient-to-br from-indigo-500 via-purple-500 to-orange-400">
            <div className="w-full h-full rounded-2xl bg-gray-800 text-center flex items-center justify-center text-7xl font-bold text-gray-200">AI</div>
          </div>
        </div>
  
        {/* Ondas animadas */}
        {rings.map((i) => (
          <motion.div
            key={i}
            className="absolute w-48 h-48 rounded-2xl border border-white/30"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{
              scale: [4, 2.5],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    );
  }
  

  const features = [
    { 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF3A29" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>, 
      title: "Analisa suas métricas", 
      description: "Analisa seus números com precisão e visão estratégica.",
      fullDescription: "A Seller.IA interpreta visitas, vendas e conversões como um especialista. Mostra os pontos fortes e os gargalos que travam o crescimento." 
    },
    { 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF3A29" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>, 
      title: "Direção clara de ação", 
      description: "Indica onde investir e o que cortar sem dúvidas.",
      fullDescription: "Direciona seus recursos para campanhas e produtos de maior retorno, eliminando desperdícios e potencializando cada real aplicado."
    },
    { 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF3A29" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, 
      title: "Corrige perdas invisíveis", 
      description: "Encontra falhas ocultas que drenam seu faturamento.",
      fullDescription: "A IA identifica anúncios ineficientes e produtos mal otimizados, entregando ações práticas para recuperar lucro e evitar perdas futuras."
    },
    { 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF3A29" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, 
      title: "Crescimento sob medida", 
      description: "Cria estratégias de crescimento sob medida para sua loja.",
      fullDescription: "Com base no histórico da sua conta e no comportamento do consumidor, a Seller.IA define planos seguros para escalar vendas."
    },
    { 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF3A29" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>, 
      title: "Clareza em segundos", 
      description: "Gera relatórios claros, objetivos e fáceis de entender.",
      fullDescription: "Em minutos você tem um diagnóstico completo e recomendações práticas. Nada de relatórios confusos, só clareza para agir rápido."
    },
    { 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF3A29" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>, 
      title: "Evolução constante", 
      description: "Evolui constantemente conforme sua loja gera mais dados.",
      fullDescription: "A Seller.IA aprende com seus resultados e se adapta ao mercado, mantendo suas estratégias sempre atualizadas e competitivas."
    }
  ];

  return (
    <div className="bg-[#000000] text-white overflow-x-hidden">

      {/* Seção 1: Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Apresentamos a <span className="bg-gradient-to-r from-[#FF3A29] to-[#F98934] bg-clip-text text-transparent">Seller.IA</span>
            </h1>
            <h2 className="text-lg md:text-xl text-gray-300">
              <b>A primeira Inteligência Artificial treinada com dados reais de contas Shopee.</b>
              <br/><br/>
              Sua conta está estagnada porque você ainda toma decisões com base em achismo. Enquanto você tenta “adivinhar” o que deu certo no mês passado, tem gente usando inteligência artificial para prever o que vai vender nas próximas semanas.
              <br/><br/>
              <b>Essa é a diferença entre quem fatura R$ 20 mil e quem fatura R$ 500 mil. A verdadeira diferença entre quem sobrevive e quem escala.</b>
            </h2>
          </div>
          <div className="flex justify-center">
            {AIPulse()}
          </div>
        </div>
      </section>
      
      {/* Seção do Formulário (Calculadora) */}
    

      {/* Seção 2: "achismo" vs "dados reais" */}
      <section className="py-20 px-2">
        <div className="container  p-5 bg-black rounded-xl border border-gray-800">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Você pode continuar jogando esse jogo do achismo, ou pode usar dados reais, históricos e comportamentais <span className="bg-gradient-to-r from-[#FF3A29] to-[#F98934] bg-clip-text text-transparent">da sua própria conta para crescer.</span>
              </h2>
              <h3 className="text-lg md:text-xl text-gray-300 mt-6">
                Essa Inteligência Artificial não foi criada por teóricos de mercado. Ela foi treinada por quem já escalou milhares de contas reais.
              </h3>
            </div>
            <div className="space-y-4">
                <div className="flex items-start gap-4"><CheckmarkIcon /><span>Faz a análise das suas métricas como um especialista.</span></div>
                <div className="flex items-start gap-4"><CheckmarkIcon /><span>Encontra onde você está perdendo dinheiro.</span></div>
                <div className="flex items-start gap-4"><CheckmarkIcon /><span>Diz exatamente onde investir e onde parar.</span></div>
                <div className="flex items-start gap-4"><CheckmarkIcon /><span>Cria estratégias de escala com base nas suas vendas.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 3: Marquee */}
      <div className="relative w-full bg-[#FF3A29] flex items-center justify-center h-8 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         
        </div>
        {/* Marquee effect for desktop/large screens */}
        <div className="w-full h-full flex items-center">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-8 min-w-max">
            <span className="font-bold text-white">PREVISIBILIDADE</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">ESCALA</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">LUCRATIVIDADE</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">SHOPEE</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">PREVISIBILIDADE</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">ESCALA</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">LUCRATIVIDADE</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">SHOPEE</span>
            <span className="font-bold text-white">•</span>
          </div>
          <div className="absolute left-0 top-0 w-full h-full animate-marquee2 whitespace-nowrap flex items-center gap-8 min-w-max">
            <span className="font-bold text-white">PREVISIBILIDADE</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">ESCALA</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">LUCRATIVIDADE</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">SHOPEE</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">PREVISIBILIDADE</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">ESCALA</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">LUCRATIVIDADE</span>
            <span className="font-bold text-white">•</span>
            <span className="font-bold text-white">SHOPEE</span>
            <span className="font-bold text-white">•</span>
          </div>
        </div>
      </div>
      
      <section id="analise" className="py-20 px-4 bg-black">
        <div className="container mx-auto">
            <Card className="w-full max-w-4xl mx-auto bg-transparent border-2 border-[#57545c] rounded-lg shadow-lg">
                <CardHeader className="text-center p-8">
                    <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF3A29] via-[#F96534] to-[#E2732C] bg-clip-text text-transparent mb-2">
                        Receba sua Análise Express Gratuita
                    </CardTitle>
                    <CardDescription className="text-lg text-gray-300">
                        Preencha os dados e veja na hora o que está impedindo sua loja de crescer.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    {success && <div className="bg-green-900 border border-green-700 text-green-200 p-4 rounded-md mb-6 text-center font-semibold">{success}</div>}
                    {error && <div className="bg-red-900 border border-red-700 text-red-200 p-4 rounded-md mb-6 text-center font-semibold">{error}</div>}
                    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white" htmlFor="nome">Nome / Nome da Loja *</label>
                                <input type="text" id="nome" name="nome" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3A29] transition" required value={form.nome} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white" htmlFor="email">E-mail</label>
                                <input type="email" id="email" name="email" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3A29] transition" required value={form.email} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white" htmlFor="telefone">Telefone (WhatsApp) *</label>
                                <input type="text" id="telefone" name="telefone" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3A29] transition" required value={form.telefone} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white" htmlFor="faturamento30d">Valor Faturado (Últimos 30 Dias) *</label>
                                <input type="text" id="faturamento30d" name="faturamento30d" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3A29] transition" required value={form.faturamento30d} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white" htmlFor="visitantes">Visitantes (Últimos 30 Dias) *</label>
                                <input type="text" id="visitantes" name="visitantes" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3A29] transition" required value={form.visitantes} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white" htmlFor="pedidos">Pedidos (Últimos 30 Dias) *</label>
                                <input type="text" id="pedidos" name="pedidos" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3A29] transition" required value={form.pedidos} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                                <label className="block text-sm font-medium mb-2 text-white" htmlFor="investimentoAds">Investimento Mensal em Ads *</label>
                                <input type="text" id="investimentoAds" name="investimentoAds" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3A29] transition" required value={form.investimentoAds} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white" htmlFor="roasMensal">ROAS Mensal *</label>
                                <input type="text" id="roasMensal" name="roasMensal" className="w-full border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3A29] transition" required value={form.roasMensal} onChange={handleChange} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-white" htmlFor="desafio">Maior Desafio Hoje *</label>
                            <Select name="desafio" required value={form.desafio} onValueChange={(value) => setForm({ ...form, desafio: value })}>
                                <SelectTrigger className="w-full border-2 border-[#FF3A29] bg-white/5 text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3A29] transition">
                                    <SelectValue placeholder="Selecione seu maior desafio atual" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 text-white border-gray-700">
                                    <SelectItem value="trafego">Aumentar Tráfego / Visibilidade</SelectItem>
                                    <SelectItem value="conversao">Melhorar Taxa de Conversão</SelectItem>
                                    <SelectItem value="ads">Otimizar Shopee Ads / ROAS</SelectItem>
                                    <SelectItem value="ticket">Aumentar Ticket Médio</SelectItem>
                                    <SelectItem value="logistica">Melhorar Logística / Entrega</SelectItem>
                                    <SelectItem value="concorrencia">Competir com Concorrência</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="pt-4">
                            <Button type="submit" className="w-full text-lg font-bold py-3 px-6 bg-gradient-to-r from-[#FF3A29] to-[#F98934] hover:from-[#F96534] hover:to-[#E2732C] text-white border-none rounded-md shadow-lg transform hover:scale-105 transition-transform duration-300" disabled={loading}>
                                {!loading && <span>Gerar Minha Análise Agora</span>}
                                {loading && <span>Gerando análise... {progress}%</span>}
                            </Button>
                            {loading && <div className="mt-4"><Progress value={progress} className="bg-gray-700 [&>div]:bg-orange-500" /></div>}
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex-col gap-2 p-6 text-center text-xs text-gray-400">
                  <div className="flex flex-wrap gap-4 justify-center">
                    <span>🔒 Dados protegidos</span>
                    <span>⚡ Análise instantânea</span>
                    <span>🚀 +500 lojas analisadas</span>
                  </div>
                </CardFooter>
            </Card>
        </div>
      </section>

      {/* Seção 5: "Poder de um time" */}
      <section className="py-20 px-4 bg-black">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
                <Image 
                    src="https://consultoriaefeitovendas.com.br/wp-content/uploads/2025/09/Karina-Leite-2-1024x1024.png"
                    alt="Especialista em Shopee"
                    width={500}
                    height={500}
                    className=" object-cover"
                />
            </div>
            <div className="text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    O poder de um time inteiro em uma <span className="bg-gradient-to-r from-[#FF3A29] to-[#F98934] bg-clip-text text-transparent">única inteligência artificial</span>
                </h2>
                <p className="text-lg text-gray-300">
                    Agora imagine ter ao seu lado um estrategista que nunca dorme, acompanha cada métrica em tempo real e enxerga oportunidades que você não vê.
                    <br/><br/>
                    Esse é o papel da Seller.IA sua inteligência artificial dedicada, capaz de analisar milhares de dados da sua conta Shopee em segundos e transformar tudo em recomendações claras, objetivas e acionáveis.
                    <br/><br/>
                    Não é opinião, não é chute. É leitura precisa, baseada em ciência de escala e em resultados reais de quem já faturou milhões na plataforma.
                </p>
            </div>
        </div>
      </section>

      {/* Seção 6: Recursos */}
      <section className="py-20 px-4 "> 
        <div className="container mx-auto text-center">
            <h2 className="text-3xl text-center md:text-center md:text-4xl font-bold mb-4">
                Os recursos da <span className="bg-gradient-to-r from-[#FF3A29] to-[#F98934] bg-clip-text text-transparent">Seller.IA</span>
            </h2>
            <p className="text-lg text-gray-300 mb-12">Diga adeus ao trabalho manual e erros desnecessários.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((feature, index) => (
                    <FeatureCard key={index} {...feature} />
                ))}
            </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 px-4 bg-black text-center text-gray-500">
        <p>Todos os direitos reservados | Seller.IA</p>
      </footer>

    </div>
  );
} 