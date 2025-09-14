"use client";
import React, { useState } from "react";
import Head from "next/head";

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
    try {
      const res = await fetch("https://analysis-micro.onrender.com/api/whatsapp-express", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("Mensagem enviada para o WhatsApp! Você receberá a análise em até 24h.");
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
  };

  return (
    <>
      <Head>
        <title>SellerIA - Análise Express Shopee</title>
        <meta name="description" content="Análise gratuita e completa da sua loja Shopee. Descubra oportunidades de crescimento em 2 minutos." />
        <meta name="keywords" content="shopee, análise, loja, ecommerce, vendas, selleria" />
        <meta property="og:title" content="SellerIA - Análise Express Shopee" />
        <meta property="og:description" content="Receba uma análise completa da sua loja Shopee em menos de 2 minutos" />
        <meta property="og:type" content="website" />
        <link rel="icon" type="image/x-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0idXJsKCNncmFkaWVudDApIi8+CjxwYXRoIGQ9Ik0xNiA4TDIwIDEyTDE2IDE2TDEyIDEyTDE2IDhaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgMTZMMjAgMjBMMTYgMjRMMTIgMjBMMTYgMTZaIiBmaWxsPSJ3aGl0ZSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDAiIHgxPSIwIiB5MT0iMCIgeDI9IjMyIiB5Mj0iMzIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzdDM0FFRCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM2RDI4RDkiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K" />
      </Head>
      <div className="selleria-root">
        <div className="header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">✨</div>
              <div className="logo-text">
                <h1>SellerIA</h1>
                <p>Powered by EFEITO VENDAS</p>
              </div>
            </div>
            <div className="badge">⚡ Análise Express</div>
          </div>
        </div>
        <div className="main-content">
          <div className="hero">
            <h2>Descubra o Potencial da Sua Loja Shopee</h2>
            <p>Receba uma análise completa e personalizada da sua conta em menos de 2 minutos. Nossa IA especializada identifica oportunidades de crescimento imediatas.</p>
            <div className="benefits">
              <div className="benefit-item">📊 Diagnóstico Completo</div>
              <div className="benefit-item">🎯 Pontos de Melhoria</div>
              <div className="benefit-item">📈 Ações Imediatas</div>
            </div>
          </div>
          <div className="form-card">
            <div className="form-header">
              <h2 className="form-title">🛍️ Análise Express da Sua Loja</h2>
              <p className="form-description">Preencha os dados abaixo e receba sua análise personalizada</p>
            </div>
            <div className="form-content">
              {success && <div className="success-message">{success}</div>}
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleSubmit} autoComplete="off">
                <div className="form-group">
                  <div className="form-row">
                    <div>
                      <label className="form-label" htmlFor="nome">Nome / Nome da Loja *</label>
                      <input type="text" id="nome" name="nome" className="form-input" placeholder="Ex: João Silva / Loja Tech Pro" required value={form.nome} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="email">E-mail para Receber a Análise *</label>
                      <input type="email" id="email" name="email" className="form-input" placeholder="seu@email.com" required value={form.email} onChange={handleChange} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <div className="form-row">
                    <div>
                      <label className="form-label" htmlFor="telefone">Telefone (WhatsApp) *</label>
                      <input type="text" id="telefone" name="telefone" className="form-input" placeholder="Ex: 5511999999999" required value={form.telefone} onChange={handleChange} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <div className="form-row">
                    <div>
                      <label className="form-label" htmlFor="faturamento30d">Valor Faturado nos Últimos 30 Dias *</label>
                      <input type="text" id="faturamento30d" name="faturamento30d" className="form-input" placeholder="Ex: 15.000" required value={form.faturamento30d} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="visitantes">Visitantes (Últimos 30 Dias) *</label>
                      <input type="text" id="visitantes" name="visitantes" className="form-input" placeholder="Ex: 2.500" required value={form.visitantes} onChange={handleChange} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <div className="form-row">
                    <div>
                      <label className="form-label" htmlFor="pedidos">Pedidos (Últimos 30 Dias) *</label>
                      <input type="text" id="pedidos" name="pedidos" className="form-input" placeholder="Ex: 85" required value={form.pedidos} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="investimentoAds">Investimento Mensal em Shopee Ads *</label>
                      <input type="text" id="investimentoAds" name="investimentoAds" className="form-input" placeholder="Ex: 1.200" required value={form.investimentoAds} onChange={handleChange} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <div className="form-row">
                    <div>
                      <label className="form-label" htmlFor="roasMensal">ROAS Mensal *</label>
                      <input type="text" id="roasMensal" name="roasMensal" className="form-input" placeholder="Ex: 8.5" required value={form.roasMensal} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="desafio">Maior Desafio Hoje *</label>
                      <select id="desafio" name="desafio" className="form-select" required value={form.desafio} onChange={handleChange}>
                        <option value="">Selecione seu maior desafio atual</option>
                        <option value="trafego">Aumentar Tráfego / Visibilidade</option>
                        <option value="conversao">Melhorar Taxa de Conversão</option>
                        <option value="ads">Otimizar Shopee Ads / ROAS</option>
                        <option value="ticket">Aumentar Ticket Médio</option>
                        <option value="logistica">Melhorar Logística / Entrega</option>
                        <option value="concorrencia">Competir com Concorrência</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button type="submit" className="submit-button" disabled={loading}>
                  <span style={{ display: loading ? "none" : "inline" }}>🔎 Gerar Análise Express da Minha Conta</span>
                  {loading && <div className="loading-spinner" />}
                </button>
              </form>
            </div>
          </div>
          <div className="trust-section">
            <p className="trust-main">✅ Análise 100% gratuita • ✅ Sem compromisso • ✅ Resultados em 2 minutos</p>
            <div className="trust-indicators">
              <span>🔒 Dados protegidos</span>
              <span>🚀 +500 lojas analisadas</span>
              <span>⭐ 4.9/5 de satisfação</span>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .selleria-root {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #374151;
          background: linear-gradient(135deg, #faf5ff 0%, #ffffff 50%, #faf5ff 100%);
          min-height: 100vh;
        }
        .selleria-root .header { background: white; border-bottom: 1px solid #e5e7eb; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); }
        .selleria-root .header-content { max-width: 1200px; margin: 0 auto; padding: 1.5rem 1rem; display: flex; justify-content: space-between; align-items: center; }
        .selleria-root .logo-section { display: flex; align-items: center; gap: 0.75rem; }
        .selleria-root .logo-icon { width: 2.5rem; height: 2.5rem; background: linear-gradient(135deg, #7c3aed, #6d28d9); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.25rem; }
        .selleria-root .logo-text h1 { font-size: 1.5rem; font-weight: bold; background: linear-gradient(135deg, #7c3aed, #6d28d9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .selleria-root .logo-text p { font-size: 0.875rem; color: #6b7280; }
        .selleria-root .badge { background: #f3f4f6; color: #7c3aed; padding: 0.5rem 1rem; border-radius: 1rem; font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; gap: 0.25rem; }
        .selleria-root .main-content { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; display: flex; flex-direction: column; align-items: center; }
        .selleria-root .hero { text-align: center; margin-bottom: 3rem; width: 100%; }
        .selleria-root .hero h2 { font-size: 2.5rem; font-weight: bold; color: #111827; margin-bottom: 1rem; }
        .selleria-root .hero p { font-size: 1.25rem; color: #6b7280; margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
        .selleria-root .benefits { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; margin-bottom: 2rem; }
        .selleria-root .benefit-item { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; padding: 0.75rem 1.5rem; border-radius: 2rem; font-weight: 600; font-size: 0.875rem; white-space: nowrap; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3); }
        .selleria-root .form-card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.2); width: 100%; max-width: 600px; }
        .selleria-root .form-header { text-align: center; padding: 2rem 2rem 0; }
        .selleria-root .form-title { font-size: 1.5rem; font-weight: bold; color: #111827; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .selleria-root .form-description { font-size: 1.125rem; color: #6b7280; }
        .selleria-root .form-content { padding: 2rem; }
        .selleria-root .form-group { margin-bottom: 1.5rem; }
        .selleria-root .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
        .selleria-root .form-label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem; }
        .selleria-root .form-input, .selleria-root .form-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem; transition: all 0.2s; background: white; }
        .selleria-root .form-input:focus, .selleria-root .form-select:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }
        .selleria-root .form-select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1rem; padding-right: 2.5rem; }
        .selleria-root .submit-button { width: 100%; padding: 1rem 1.5rem; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; border: none; border-radius: 0.5rem; font-size: 1.125rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1.5rem; }
        .selleria-root .submit-button:hover { background: linear-gradient(135deg, #6d28d9, #5b21b6); box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.4); }
        .selleria-root .submit-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .selleria-root .loading-spinner { width: 1.25rem; height: 1.25rem; border: 2px solid rgba(255, 255, 255, 0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .selleria-root .trust-section { text-align: center; margin-top: 3rem; }
        .selleria-root .trust-main { font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem; }
        .selleria-root .trust-indicators { display: flex; justify-content: center; gap: 2rem; font-size: 0.75rem; color: #9ca3af; flex-wrap: wrap; }
        @media (max-width: 768px) { 
          .selleria-root .header-content { flex-direction: column; gap: 1rem; text-align: center; } 
          .selleria-root .main-content { padding: 1rem; } 
          .selleria-root .hero { margin-bottom: 2rem; } 
          .selleria-root .hero h2 { font-size: 1.75rem; line-height: 1.2; } 
          .selleria-root .hero p { font-size: 1rem; margin-bottom: 1.5rem; } 
          .selleria-root .benefits { gap: 1rem; } 
          .selleria-root .benefit-item { font-size: 0.75rem; padding: 0.5rem 1rem; } 
          .selleria-root .form-card { margin: 0; border-radius: 0.75rem; } 
          .selleria-root .form-header { padding: 1.5rem 1rem 0; } 
          .selleria-root .form-content { padding: 1.5rem 1rem; } 
          .selleria-root .form-title { font-size: 1.25rem; } 
          .selleria-root .form-description { font-size: 1rem; } 
          .selleria-root .form-row { grid-template-columns: 1fr; gap: 1rem; } 
          .selleria-root .form-group { margin-bottom: 1.25rem; } 
          .selleria-root .submit-button { font-size: 1rem; padding: 0.875rem 1.25rem; } 
          .selleria-root .trust-indicators { flex-direction: column; gap: 0.5rem; font-size: 0.75rem; } 
          .selleria-root .trust-main { font-size: 0.8rem; } 
        }
        .selleria-root .success-message { background: #10b981; color: white; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; text-align: center; }
        .selleria-root .error-message { background: #ef4444; color: white; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; text-align: center; }
      `}</style>
    </>
  );
} 