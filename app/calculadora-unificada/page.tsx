"use client";

import React, { useState, useEffect } from "react";

function _toFloat(x: any): number {
  if (!x) return 0;
  const str = x.toString().trim();
  if (str.includes(",")) {
    return parseFloat(str.replace(/\./g, "").replace(/,/g, ".")) || 0;
  }
  return parseFloat(str) || 0;
}

function _toBRL(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

const DIAS_NO_MES = 30;

interface FormState {
  nome: string;
  custoProduto: string;
  custoUnidade: string;
  outrasDespesas: string;
  margem: string;
  margemMarkup: string;
  comissao: string;
  impostos: string;
  usarCPA: string;
  roas: string;
  vendasMes: string;
  precoAtual: string;
}

interface ResultVenda {
  precoVenda: number;
  custoFixoTotal: number;
  lucroR: number;
  margemPct: number;
  comissaoR: number;
  impostosR: number;
  cpaR: number;
  cpaPct: number;
  roasReal: number;
  precoEmpate: number;
  receitaTotal: number;
  lucroTotal: number;
  investimentoTotal: number;
  lucroDiario: number;
}

interface ResultMarkup {
  precoVenda: number;
  custoFixoTotal: number;
  lucroR: number;
  margemPct: number;
  comissaoR: number;
  impostosR: number;
  cpaR: number;
  cpaPct: number;
  roasReal: number;
  precoEmpate: number;
  receitaTotal: number;
  lucroTotal: number;
  investimentoTotal: number;
  lucroDiario: number;
}

interface ResultPraticado {
  precoPraticado: number;
  custoTotalR: number;
  lucroRealR: number;
  margemRealPct: number;
  comissaoR: number;
  impostosR: number;
  cpaRealR: number;
  cpaPct: number;
  roasReal: number;
  receitaTotal: number;
  lucroTotal: number;
  investimentoTotal: number;
  lucroDiario: number;
}

const colors = {
  primary: "#FF5722",
  profit: "#69F0AE",
  analysis: "#4FC3F7",
  loss: "#F44336",
  bgDark: "#0A0A0A",
  cardDark: "#1A1A1A",
  borderSoft: "#333",
};

export default function CalculadoraUnificadaPage() {
  const [form, setForm] = useState<FormState>({
    nome: "",
    custoProduto: "",
    custoUnidade: "",
    outrasDespesas: "",
    margem: "",
    margemMarkup: "",
    comissao: "",
    impostos: "",
    usarCPA: "nao",
    roas: "10",
    vendasMes: "",
    precoAtual: "",
  });

  const [results, setResults] = useState<{
    venda: ResultVenda | null;
    markup: ResultMarkup | null;
    praticado: ResultPraticado | null;
  }>({ venda: null, markup: null, praticado: null });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 850);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "usarCPA" && value === "sim" && !prev.roas ? { roas: "10" } : {}),
    }));
  };

  const calcularTudo = () => {
    const C_prod = _toFloat(form.custoProduto);
    const C_fixa = _toFloat(form.custoUnidade);
    const C_out = _toFloat(form.outrasDespesas);
    const comiss = _toFloat(form.comissao);
    const impost = _toFloat(form.impostos);
    const usar_cpa = form.usarCPA === "sim";
    const roas_desejado = _toFloat(form.roas || "10");
    const vendasMes = Math.floor(_toFloat(form.vendasMes));
    const precoAtual = _toFloat(form.precoAtual);
    const margemVenda = _toFloat(form.margem);
    const margemMarkup = _toFloat(form.margemMarkup);

    const cpa_pct = usar_cpa && roas_desejado > 0 ? 100 / roas_desejado : 0;
    const C_fixo_total = C_prod + C_fixa + C_out;

    let resVenda: ResultVenda | null = null;
    let resMarkup: ResultMarkup | null = null;
    let resPraticado: ResultPraticado | null = null;

    if (margemVenda > 0) {
      const soma = margemVenda + comiss + impost + cpa_pct;
      if (soma >= 100) {
        alert(`Cálculo 1: soma das porcentagens é ${soma.toFixed(2)}% (>=100%). Reduza os valores.`);
      } else {
        const preco = C_fixo_total / (1 - soma / 100);
        const lucro_R = preco * (margemVenda / 100);
        const cpa_R = preco * (cpa_pct / 100);
        const com_R = preco * (comiss / 100);
        const imp_R = preco * (impost / 100);
        const roas_real = cpa_R > 0 ? preco / cpa_R : Infinity;
        const preco_empate = preco - lucro_R;
        const receitaTotal = vendasMes > 0 ? preco * vendasMes : 0;
        const lucroTotal = vendasMes > 0 ? lucro_R * vendasMes : 0;
        const investimentoTotal = vendasMes > 0 ? cpa_R * vendasMes : 0;
        resVenda = {
          precoVenda: preco,
          custoFixoTotal: C_fixo_total,
          lucroR: lucro_R,
          margemPct: margemVenda,
          comissaoR: com_R,
          impostosR: imp_R,
          cpaR: cpa_R,
          cpaPct: cpa_pct,
          roasReal: roas_real,
          precoEmpate,
          receitaTotal,
          lucroTotal,
          investimentoTotal,
          lucroDiario: lucroTotal / DIAS_NO_MES,
        };
      }
    }

    if (margemMarkup > 0) {
      const lucro_R = C_prod * (margemMarkup / 100);
      const soma = comiss + impost + cpa_pct;
      if (soma >= 100) {
        alert(`Cálculo 2 (Markup): soma variáveis é ${soma.toFixed(2)}% (>=100%). Reduza os valores.`);
      } else {
        const C_fixo_com_lucro = C_fixo_total + lucro_R;
        const preco = C_fixo_com_lucro / (1 - soma / 100);
        const cpa_R = preco * (cpa_pct / 100);
        const com_R = preco * (comiss / 100);
        const imp_R = preco * (impost / 100);
        const roas_real = cpa_R > 0 ? preco / cpa_R : Infinity;
        const preco_empate = preco - lucro_R;
        const margemRealPct = (lucro_R / preco) * 100;
        const receitaTotal = vendasMes > 0 ? preco * vendasMes : 0;
        const lucroTotal = vendasMes > 0 ? lucro_R * vendasMes : 0;
        const investimentoTotal = vendasMes > 0 ? cpa_R * vendasMes : 0;
        resMarkup = {
          precoVenda: preco,
          custoFixoTotal: C_fixo_total,
          lucroR: lucro_R,
          margemPct: margemRealPct,
          comissaoR: com_R,
          impostosR: imp_R,
          cpaR: cpa_R,
          cpaPct: cpa_pct,
          roasReal: roas_real,
          precoEmpate,
          receitaTotal,
          lucroTotal,
          investimentoTotal,
          lucroDiario: lucroTotal / DIAS_NO_MES,
        };
      }
    }

    if (precoAtual > 0 && C_fixo_total > 0) {
      const total_variavel_pct = comiss + impost + cpa_pct;
      const custoVariavelR = precoAtual * (total_variavel_pct / 100);
      const custoTotalR = C_fixo_total + custoVariavelR;
      const lucroRealR = precoAtual - custoTotalR;
      const margemRealPct = (lucroRealR / precoAtual) * 100;
      const cpa_pct_calc = total_variavel_pct - (comiss + impost);
      const cpaRealR = precoAtual * (cpa_pct_calc / 100);
      const roasReal = cpaRealR > 0 ? precoAtual / cpaRealR : Infinity;
      const com_R = precoAtual * (comiss / 100);
      const imp_R = precoAtual * (impost / 100);
      const receitaTotal = vendasMes > 0 ? precoAtual * vendasMes : 0;
      const lucroTotal = vendasMes > 0 ? lucroRealR * vendasMes : 0;
      const investimentoTotal = vendasMes > 0 ? cpaRealR * vendasMes : 0;
      resPraticado = {
        precoPraticado: precoAtual,
        custoTotalR,
        lucroRealR,
        margemRealPct,
        comissaoR: com_R,
        impostosR: imp_R,
        cpaRealR,
        cpaPct: cpa_pct_calc,
        roasReal,
        receitaTotal,
        lucroTotal,
        investimentoTotal,
        lucroDiario: lucroTotal / DIAS_NO_MES,
      };
    }

    if (!resVenda && !resMarkup && !resPraticado) {
      alert("Preencha pelo menos uma 'Margem', 'Markup' OU o 'Preço Praticado' para calcular.");
    }

    setResults({ venda: resVenda, markup: resMarkup, praticado: resPraticado });
  };

  const baseStyle: React.CSSProperties = {
    backgroundColor: colors.bgDark,
    color: "#fff",
    fontFamily: "'Poppins', sans-serif",
    margin: 0,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minHeight: "100vh",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.cardDark,
    padding: "1.5rem",
    borderRadius: 12,
    boxShadow: "0 0 10px rgba(255, 87, 34, 0.2)",
    width: "100%",
    maxWidth: 580,
    boxSizing: "border-box",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 8,
    marginTop: 4,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: 6,
    backgroundColor: "#222",
    color: "#fff",
    boxSizing: "border-box",
  };

  const resultCardStyle: React.CSSProperties = {
    backgroundColor: colors.cardDark,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: 12,
    padding: "1.5rem",
    width: isMobile ? "100%" : 360,
    maxWidth: 580,
    boxSizing: "border-box",
    boxShadow: "0 0 5px rgba(0,0,0,0.5)",
  };

  const detailItem: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "2px 0", margin: 0 };

  return (
    <div style={baseStyle}>
      <h1 style={{ color: colors.primary, fontSize: "2.2rem", marginBottom: "0.5rem", textAlign: "center" }}>
        Calculadora de Precificação Shopee Unificada 📈
      </h1>
      <p style={{ color: "#ccc", marginBottom: "2rem", textAlign: "center" }}>
        Use a tabela de referência, defina seus custos e calcule o preço ideal para atingir sua meta de <strong>ROAS</strong>.
      </p>

      <div style={{ width: "100%", maxWidth: 1200, marginBottom: "2rem", border: `1px solid ${colors.primary}`, borderRadius: 8, overflow: "hidden" }}>
        <h2 style={{ color: colors.primary, margin: "1rem", fontSize: "1.5rem", textAlign: "center" }}>Tabela de ROAS Ideal</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
          <thead>
            <tr>
              <th style={{ backgroundColor: colors.primary, color: "#fff", padding: 10, border: "1px solid #333", fontWeight: "bold" }}>Nível Estratégico</th>
              <th style={{ backgroundColor: colors.primary, color: "#fff", padding: 10, border: "1px solid #333", fontWeight: "bold" }}>Faixa de ROAS</th>
              <th style={{ backgroundColor: colors.primary, color: "#fff", padding: 10, border: "1px solid #333", fontWeight: "bold" }}>Foco Principal</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>Focado em Volume</td><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>3 a 7</td><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>Expandir vendas e alcance.</td></tr>
            <tr><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>Intermediário</td><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>7.1 a 9</td><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>Manter bom volume com retorno.</td></tr>
            <tr><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>Estável</td><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>9.1 a 12</td><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>Garantir consistência e margem.</td></tr>
            <tr><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>Alta Rentabilidade</td><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>12.1+</td><td style={{ padding: 10, border: "1px solid #333", textAlign: "center" }}>Maximizar lucro e eficiência.</td></tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "2rem", width: "100%", maxWidth: 1200, justifyContent: "center", flexWrap: "wrap", marginBottom: "2rem" }}>
        <div style={cardStyle}>
          <h2 style={{ color: colors.primary, marginBottom: "1rem", fontSize: "1.5rem" }}>Dados do Produto e Custos</h2>
          <label style={{ display: "block", marginTop: 10, fontSize: "0.9rem" }}>Nome do Produto *</label>
          <input name="nome" value={form.nome} onChange={handleChange} placeholder="Ex: Camiseta Premium" style={inputStyle} />
          <label style={{ display: "block", marginTop: 10, fontSize: "0.9rem" }}>Custo do Produto no Fornecedor (R$) *</label>
          <input name="custoProduto" value={form.custoProduto} onChange={handleChange} placeholder="Ex: 20,00" style={inputStyle} />
          <label style={{ display: "block", marginTop: 10, fontSize: "0.9rem" }}>Taxa Fixa Shopee (R$) - Ex: 4,00</label>
          <input name="custoUnidade" value={form.custoUnidade} onChange={handleChange} placeholder="4,00" style={inputStyle} />
          <label style={{ display: "block", marginTop: 10, fontSize: "0.9rem" }}>Outras Despesas por Unidade (R$) [Embalagem, M.O., etc.]</label>
          <input name="outrasDespesas" value={form.outrasDespesas} onChange={handleChange} placeholder="Ex: 1,00" style={inputStyle} />
          <hr style={{ margin: "15px 0", borderColor: colors.borderSoft }} />
          <div style={{ display: "flex", gap: 15, flexDirection: isMobile ? "column" : "row" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 5, color: colors.primary, borderBottom: `1px solid ${colors.borderSoft}`, paddingBottom: 5 }}>Margem sobre o Preço de Venda (%)</div>
              <label style={{ marginTop: 0, fontSize: "0.9rem" }}>Margem de Lucro Desejada (%) <br /><span style={{ color: colors.primary, fontSize: "0.8rem" }}>(Deixe em branco se for calcular por Markup)</span></label>
              <input name="margem" value={form.margem} onChange={handleChange} placeholder="Ex: 20" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 5, color: colors.profit, borderBottom: `1px solid ${colors.borderSoft}`, paddingBottom: 5 }}>Margem sobre o Custo do Produto (Markup %)</div>
              <label style={{ marginTop: 0, fontSize: "0.9rem" }}>Margem de Lucro Desejada (%) <br /><span style={{ color: colors.profit, fontSize: "0.8rem" }}>(Deixe em branco se for calcular por Preço de Venda)</span></label>
              <input name="margemMarkup" value={form.margemMarkup} onChange={handleChange} placeholder="Ex: 50" style={inputStyle} />
            </div>
          </div>
          <hr style={{ margin: "15px 0", borderColor: colors.borderSoft }} />
          <label style={{ display: "block", marginTop: 10, fontSize: "0.9rem" }}>Comissão Shopee (%) *</label>
          <input name="comissao" value={form.comissao} onChange={handleChange} placeholder="Ex: 20" style={inputStyle} />
          <label style={{ display: "block", marginTop: 10, fontSize: "0.9rem" }}>Impostos (%) *</label>
          <input name="impostos" value={form.impostos} onChange={handleChange} placeholder="Ex: 6" style={inputStyle} />
          <label style={{ display: "block", marginTop: 10, fontSize: "0.9rem" }}>Usa Tráfego Pago (CPA)?</label>
          <select name="usarCPA" value={form.usarCPA} onChange={handleChange} style={inputStyle}>
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
          {form.usarCPA === "sim" && (
            <>
              <label style={{ display: "block", marginTop: 10, fontSize: "0.9rem" }}>ROAS Desejado *</label>
              <input name="roas" value={form.roas} onChange={handleChange} placeholder="Ex: 10" style={inputStyle} />
            </>
          )}
          <label style={{ display: "block", marginTop: 10, fontSize: "0.9rem" }}>Expectativa de Vendas no Mês *</label>
          <input name="vendasMes" value={form.vendasMes} onChange={handleChange} placeholder="Ex: 120 (quantidade de vendas)" style={inputStyle} />
          <label style={{ display: "block", marginTop: 10, fontSize: "0.9rem" }}>Preço de Venda **PRATICADO** (R$) *</label>
          <input name="precoAtual" value={form.precoAtual} onChange={handleChange} placeholder="Ex: 79,90" style={inputStyle} />
          <button type="button" onClick={calcularTudo} style={{ marginTop: 15, width: "100%", padding: 10, border: "none", borderRadius: 6, cursor: "pointer", fontSize: "1rem", fontWeight: "bold", background: "linear-gradient(90deg, #FF5722, #ff7043)", color: "white" }}>
            Calcular Preço(s) 🚀
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "2rem", width: "100%", maxWidth: 1200, justifyContent: "center", flexWrap: "wrap", margin: "0 auto" }}>
        {results.venda && (
          <div style={resultCardStyle}>
            <h2 style={{ color: colors.primary, marginBottom: "1rem", fontSize: "1.5rem" }}>Resultado 1: Preço de Venda (Margem/Preço)</h2>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: colors.primary, backgroundColor: "#111", padding: "0.8rem", textAlign: "center", borderRadius: 8, marginBottom: "1rem", border: `1px solid ${colors.primary}` }}>
              {_toBRL(results.venda.precoVenda)}
            </div>
            <h3 style={{ color: colors.primary, marginTop: "1rem", fontSize: "1.1rem", borderBottom: `2px solid ${colors.borderSoft}` }}>Custos & Margens (Unidade R$)</h3>
            <div style={detailItem}><strong>Custo Fornecedor:</strong> <span style={{ color: colors.primary }}>{_toBRL(_toFloat(form.custoProduto))}</span></div>
            <div style={detailItem}><strong>Outras Despesas:</strong> <span style={{ color: colors.primary }}>{_toBRL(_toFloat(form.outrasDespesas))}</span></div>
            <div style={{ ...detailItem, marginBottom: 5, borderBottom: "1px dashed " + colors.borderSoft }}><strong>Custo Fixo Total (R$):</strong> <span style={{ color: colors.primary }}>{_toBRL(results.venda.custoFixoTotal)}</span></div>
            <div style={detailItem}><strong>Taxa Fixa Shopee:</strong> <span style={{ color: colors.primary }}>{_toBRL(_toFloat(form.custoUnidade))}</span></div>
            <div style={detailItem}><strong>Comissão Shopee ({_toFloat(form.comissao).toFixed(1)}%):</strong> <span style={{ color: colors.primary }}>{_toBRL(results.venda.comissaoR)}</span></div>
            <div style={detailItem}><strong>Impostos ({_toFloat(form.impostos).toFixed(1)}%):</strong> <span style={{ color: colors.primary }}>{_toBRL(results.venda.impostosR)}</span></div>
            {form.usarCPA === "sim" && <div style={detailItem}><strong>CPA ({results.venda.cpaPct.toFixed(1)}%):</strong> <span style={{ color: colors.primary }}>{_toBRL(results.venda.cpaR)}</span></div>}
            <hr style={{ margin: "5px 0", borderColor: colors.borderSoft }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1.1rem", fontWeight: "bold", paddingTop: 5 }}>
              <span style={{ color: colors.profit }}>LUCRO LÍQUIDO ({results.venda.margemPct.toFixed(1)}%):</span>
              <span style={{ color: colors.profit }}>{_toBRL(results.venda.lucroR)}</span>
            </div>
            <div style={{ backgroundColor: "#111", border: `2px solid ${colors.borderSoft}`, padding: 10, margin: "15px 0", borderRadius: 8, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>**PREÇO MÍNIMO OPERACIONAL**</p>
              <strong style={{ fontSize: "1.3rem", color: colors.primary }}>{_toBRL(results.venda.precoEmpate)}</strong>
            </div>
            <div style={{ backgroundColor: "#111", padding: "1rem", borderRadius: 10, textAlign: "center", border: `1px solid ${colors.borderSoft}` }}>
              {form.usarCPA === "sim" ? <><strong style={{ color: colors.analysis, fontSize: "1.2rem", display: "block" }}>ROAS Desejado: {_toFloat(form.roas).toFixed(2)}x</strong><p style={{ margin: 0, fontSize: "0.9rem" }}>O preço gera ROAS real de <strong>{results.venda.roasReal === Infinity ? "∞" : results.venda.roasReal.toFixed(2) + "x"}</strong>.</p></> : <><strong style={{ color: colors.analysis }}>Venda Orgânica</strong><br /><span>Sem custo de tráfego (ROAS infinito).</span></>}
            </div>
            {results.venda.receitaTotal > 0 && (
              <>
                <hr style={{ margin: "1rem 0 0.5rem 0", borderColor: colors.borderSoft }} />
                <h3 style={{ color: colors.primary, fontSize: "1.1rem" }}>Estimativas Mensais & Diárias 💰📅</h3>
                <div style={detailItem}><strong>Faturamento Bruto:</strong> <strong style={{ color: colors.primary }}>{_toBRL(results.venda.receitaTotal)}</strong></div>
                {results.venda.investimentoTotal > 0 && <div style={detailItem}><strong>Investimento em Ads:</strong> <strong style={{ color: colors.analysis }}>{_toBRL(results.venda.investimentoTotal)}</strong></div>}
                <div style={{ ...detailItem, fontSize: "1.2rem", marginTop: 5 }}><strong>Lucro Mensal Estimado:</strong> <strong style={{ color: colors.profit }}>{_toBRL(results.venda.lucroTotal)}</strong></div>
                <hr style={{ margin: "5px 0", borderColor: colors.borderSoft }} />
                <div style={detailItem}><strong>Vendas Diárias (Meta):</strong> <strong style={{ color: colors.primary }}>{(Math.floor(_toFloat(form.vendasMes)) / DIAS_NO_MES).toFixed(1)}</strong></div>
                <div style={{ ...detailItem, fontSize: "1.2rem", marginTop: 5 }}><strong>Lucro Diário:</strong> <strong style={{ color: colors.profit }}>{_toBRL(results.venda.lucroDiario)}</strong></div>
              </>
            )}
          </div>
        )}

        {results.markup && (
          <div style={resultCardStyle}>
            <h2 style={{ color: colors.profit, marginBottom: "1rem", fontSize: "1.5rem" }}>Resultado 2: Preço de Venda (Markup/Custo)</h2>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: colors.profit, backgroundColor: "#111", padding: "0.8rem", textAlign: "center", borderRadius: 8, marginBottom: "1rem", border: `1px solid ${colors.profit}` }}>
              {_toBRL(results.markup.precoVenda)}
            </div>
            <h3 style={{ color: colors.profit, marginTop: "1rem", fontSize: "1.1rem", borderBottom: `2px solid ${colors.borderSoft}` }}>Custos & Margens (Unidade R$)</h3>
            <div style={detailItem}><strong>Custo Fixo Total (R$):</strong> <span style={{ color: colors.profit }}>{_toBRL(results.markup.custoFixoTotal)}</span></div>
            <div style={detailItem}><strong>Comissão:</strong> <span style={{ color: colors.profit }}>{_toBRL(results.markup.comissaoR)}</span></div>
            <div style={detailItem}><strong>Impostos:</strong> <span style={{ color: colors.profit }}>{_toBRL(results.markup.impostosR)}</span></div>
            {form.usarCPA === "sim" && <div style={detailItem}><strong>CPA ({results.markup.cpaPct.toFixed(1)}%):</strong> <span style={{ color: colors.profit }}>{_toBRL(results.markup.cpaR)}</span></div>}
            <hr style={{ margin: "5px 0", borderColor: colors.borderSoft }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1.1rem", fontWeight: "bold", paddingTop: 5 }}>
              <span style={{ color: colors.profit }}>LUCRO LÍQUIDO ({results.markup.margemPct.toFixed(1)}%):</span>
              <span style={{ color: colors.profit }}>{_toBRL(results.markup.lucroR)}</span>
            </div>
            <div style={{ backgroundColor: "#111", border: `2px solid ${colors.borderSoft}`, padding: 10, margin: "15px 0", borderRadius: 8, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>**PREÇO MÍNIMO OPERACIONAL**</p>
              <strong style={{ fontSize: "1.3rem", color: colors.profit }}>{_toBRL(results.markup.precoEmpate)}</strong>
            </div>
            {results.markup.receitaTotal > 0 && (
              <>
                <hr style={{ margin: "1rem 0 0.5rem 0", borderColor: colors.borderSoft }} />
                <h3 style={{ color: colors.profit, fontSize: "1.1rem" }}>Estimativas Mensais & Diárias 💰📅</h3>
                <div style={detailItem}><strong>Faturamento Bruto:</strong> <strong style={{ color: colors.profit }}>{_toBRL(results.markup.receitaTotal)}</strong></div>
                <div style={{ ...detailItem, fontSize: "1.2rem", marginTop: 5 }}><strong>Lucro Mensal Estimado:</strong> <strong style={{ color: colors.profit }}>{_toBRL(results.markup.lucroTotal)}</strong></div>
                <div style={detailItem}><strong>Lucro Diário:</strong> <strong style={{ color: colors.profit }}>{_toBRL(results.markup.lucroDiario)}</strong></div>
              </>
            )}
          </div>
        )}

        {results.praticado && (
          <div style={resultCardStyle}>
            <h2 style={{ color: colors.analysis, marginBottom: "1rem", fontSize: "1.5rem" }}>Resultado 3: Preço Praticado (Análise)</h2>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: colors.analysis, backgroundColor: "#111", padding: "0.8rem", textAlign: "center", borderRadius: 8, marginBottom: "1rem", border: `1px solid ${colors.analysis}` }}>
              {_toBRL(results.praticado.precoPraticado)}
            </div>
            <h3 style={{ color: colors.analysis, marginTop: "1rem", fontSize: "1.1rem", borderBottom: `2px solid ${colors.borderSoft}` }}>Análise de Custos (Unidade R$)</h3>
            <div style={detailItem}><strong>Comissão:</strong> <span style={{ color: colors.analysis }}>{_toBRL(results.praticado.comissaoR)}</span></div>
            <div style={detailItem}><strong>Impostos:</strong> <span style={{ color: colors.analysis }}>{_toBRL(results.praticado.impostosR)}</span></div>
            {form.usarCPA === "sim" && <div style={detailItem}><strong>CPA ({results.praticado.cpaPct.toFixed(1)}%):</strong> <span style={{ color: colors.analysis }}>{_toBRL(results.praticado.cpaRealR)}</span></div>}
            <div style={{ backgroundColor: "#111", border: `2px solid ${results.praticado.lucroRealR < 0 ? colors.loss : colors.profit}`, padding: 10, margin: "10px 0", borderRadius: 8, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>**CUSTO TOTAL (PONTO DE EQUILÍBRIO)**</p>
              <strong style={{ fontSize: "1.3rem", color: results.praticado.lucroRealR < 0 ? colors.loss : colors.profit }}>{_toBRL(results.praticado.custoTotalR)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1.1rem", fontWeight: "bold", paddingTop: 5 }}>
              <span style={{ color: results.praticado.lucroRealR < 0 ? colors.loss : colors.profit }}>LUCRO LÍQUIDO REAL:</span>
              <span style={{ color: results.praticado.lucroRealR < 0 ? colors.loss : colors.profit }}>{_toBRL(results.praticado.lucroRealR)}</span>
            </div>
            <p style={{ fontSize: "0.9rem", textAlign: "center", margin: 0 }}>Margem Real: <strong style={{ color: results.praticado.lucroRealR < 0 ? colors.loss : colors.profit }}>{results.praticado.margemRealPct.toFixed(2)}%</strong></p>
            {results.praticado.receitaTotal > 0 && (
              <>
                <hr style={{ margin: "1rem 0 0.5rem 0", borderColor: colors.borderSoft }} />
                <h3 style={{ color: colors.analysis, fontSize: "1.1rem" }}>Análise Mensal & Diária 💰📅</h3>
                <div style={detailItem}><strong>Faturamento Bruto:</strong> <strong style={{ color: colors.primary }}>{_toBRL(results.praticado.receitaTotal)}</strong></div>
                <div style={{ ...detailItem, fontSize: "1.2rem", marginTop: 5 }}><strong>Lucro Mensal Estimado:</strong> <strong style={{ color: results.praticado.lucroTotal < 0 ? colors.loss : colors.profit }}>{_toBRL(results.praticado.lucroTotal)}</strong></div>
                <div style={detailItem}><strong>Lucro Diário:</strong> <strong style={{ color: results.praticado.lucroDiario < 0 ? colors.loss : colors.profit }}>{_toBRL(results.praticado.lucroDiario)}</strong></div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
