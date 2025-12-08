"use client";

import React, { useState, useEffect } from "react";

// --- HELPER FUNCTIONS ---

// Função para converter string para float (aceita formato brasileiro e internacional)
function _toFloat(x: any): number {
  if (!x) return 0;
  const str = x.toString().trim();
  
  // Se tiver vírgula, assume formato BR/Europeu (1.000,00)
  if (str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
  }
  return parseFloat(str) || 0;
}

// Função de formatação BRL
function _toBRL(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

// --- INTERFACES ---

interface CalculatorInput {
  nome: string;
  custoProduto: string;
  custoUnidade: string; // Taxa Fixa Shopee
  outrasDespesas: string;
  margem: string; // Margem sobre Venda
  margemMarkup: string; // Margem sobre Custo (Markup)
  comissao: string;
  impostos: string;
  usarCPA: string;
  roas: string;
  vendasMes: string;
  precoAtual: string;
}

interface ResultVenda {
  precoVenda: number;
  custoTotalUnidade: number; // Custo Fixo Total
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
  lucroR: number;
  margemPct: number; // Margem equivalente sobre o preço de venda
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
  custoTotalR: number; // Ponto de Equilíbrio
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

// --- COMPONENTE PRINCIPAL ---

export default function CalculadoraPage() {
  const [form, setForm] = useState<CalculatorInput>({
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
    precoAtual: ""
  });

  const [results, setResults] = useState<{
    venda: ResultVenda | null;
    markup: ResultMarkup | null;
    praticado: ResultPraticado | null;
  }>({ venda: null, markup: null, praticado: null });

  const [isMobile, setIsMobile] = useState(false);

  // Cores do Tema Shopee (Extraídas do HTML)
  const colors = {
    primary: '#FF5722', // Laranja Shopee
    profit: '#69F0AE', // Verde Menta Suave
    analysis: '#4FC3F7', // Azul Claro
    loss: '#F44336', // Vermelho
    bgDark: '#0A0A0A',
    cardDark: '#1A1A1A',
    borderSoft: '#333',
    text: '#fff',
    textMuted: '#ccc'
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 850);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      // Se mudar para usar CPA e não tiver ROAS, define como 10
      if (name === "usarCPA" && value === "sim" && !prev.roas) {
        next.roas = "10";
      }
      return next;
    });
  };

  const calcularTudo = () => {
    // 1. Coleta de Dados e Conversão
    const C_prod = _toFloat(form.custoProduto);
    const C_fixa_shopee = _toFloat(form.custoUnidade);
    const C_out = _toFloat(form.outrasDespesas);
    const comiss = _toFloat(form.comissao);
    const impost = _toFloat(form.impostos);
    const usar_cpa = form.usarCPA === 'sim';
    const roas_desejado = _toFloat(form.roas || "10");
    const vendasMes = Math.floor(_toFloat(form.vendasMes));
    const precoAtual = _toFloat(form.precoAtual);
    
    const margemVenda = _toFloat(form.margem);
    const margemMarkup = _toFloat(form.margemMarkup);

    const DIAS_NO_MES = 30;
    let cpa_pct = (usar_cpa && roas_desejado > 0) ? 100 / roas_desejado : 0;

    let resVenda: ResultVenda | null = null;
    let resMarkup: ResultMarkup | null = null;
    let resPraticado: ResultPraticado | null = null;

    // --- CÁLCULO 1: Margem sobre Venda ---
    if (margemVenda > 0) {
      const soma_pct_ideal = margemVenda + comiss + impost + cpa_pct;
      
      if (soma_pct_ideal >= 100) {
        alert(`Cálculo 1 (Margem/Venda): A soma das porcentagens é ${soma_pct_ideal.toFixed(2)}% (>=100%). Reduza os valores.`);
      } else {
        const C_fixo_total = C_prod + C_fixa_shopee + C_out;
        const preco = C_fixo_total / (1 - soma_pct_ideal / 100);

        const lucro_R = preco * (margemVenda / 100);
        const cpa_R = preco * (cpa_pct / 100);
        const com_R = preco * (comiss / 100);
        const imp_R = preco * (impost / 100);
        const roas_real = cpa_R > 0 ? (preco / cpa_R) : Infinity;
        
        // Preço de Empate Operacional (Preço Final - Lucro)
        const preco_empate = preco - lucro_R;

        let receitaTotal = 0, lucroTotal = 0, investimentoTotal = 0;
        if (vendasMes > 0) {
          receitaTotal = preco * vendasMes;
          lucroTotal = lucro_R * vendasMes;
          investimentoTotal = cpa_R * vendasMes;
        }

        resVenda = {
          precoVenda: preco,
          custoTotalUnidade: C_fixo_total,
          lucroR: lucro_R,
          margemPct: margemVenda,
          comissaoR: com_R,
          impostosR: imp_R,
          cpaR: cpa_R,
          cpaPct: cpa_pct,
          roasReal: roas_real,
          precoEmpate: preco_empate,
          receitaTotal,
          lucroTotal,
          investimentoTotal,
          lucroDiario: lucroTotal / DIAS_NO_MES
        };
      }
    }

    // --- CÁLCULO 2: Markup sobre Custo ---
    if (margemMarkup > 0) {
      const lucro_R = C_prod * (margemMarkup / 100);
      const soma_pct_var = comiss + impost + cpa_pct;

      if (soma_pct_var >= 100) {
        alert(`Cálculo 2 (Markup/Custo): A soma das porcentagens variáveis é ${soma_pct_var.toFixed(2)}% (>=100%). Reduza os valores.`);
      } else {
        const C_fixo_total_R_markup = C_prod + C_fixa_shopee + C_out + lucro_R;
        const preco = C_fixo_total_R_markup / (1 - soma_pct_var / 100);

        const cpa_R = preco * (cpa_pct / 100);
        const com_R = preco * (comiss / 100);
        const imp_R = preco * (impost / 100);
        const roas_real = cpa_R > 0 ? (preco / cpa_R) : Infinity;
        
        // Preço de Empate Operacional (Preço Final - Lucro)
        const preco_empate = preco - lucro_R;

        let receitaTotal = 0, lucroTotal = 0, investimentoTotal = 0;
        if (vendasMes > 0) {
          receitaTotal = preco * vendasMes;
          lucroTotal = lucro_R * vendasMes;
          investimentoTotal = cpa_R * vendasMes;
        }

        resMarkup = {
          precoVenda: preco,
          lucroR: lucro_R,
          margemPct: (lucro_R / preco) * 100, // Margem real sobre venda
          comissaoR: com_R,
          impostosR: imp_R,
          cpaR: cpa_R,
          cpaPct: cpa_pct,
          roasReal: roas_real,
          precoEmpate: preco_empate,
          receitaTotal,
          lucroTotal,
          investimentoTotal,
          lucroDiario: lucroTotal / DIAS_NO_MES
        };
      }
    }

    // --- CÁLCULO 3: Análise de Preço Praticado ---
    if (precoAtual > 0) {
      // Garante que temos custos base
      const C_fixo_total_R = C_prod + C_fixa_shopee + C_out;
      if (C_fixo_total_R > 0 || (comiss + impost) > 0) {
        const total_variavel_pct = comiss + impost + cpa_pct;
        
        // Custo Variável R$ (Comissão + Impostos + CPA)
        const custoVariavelR = precoAtual * (total_variavel_pct / 100);
        
        // Custo Total por Unidade
        const custoTotalR = C_fixo_total_R + custoVariavelR;
        
        // Lucro Real
        const lucroRealR = precoAtual - custoTotalR;
        
        // Margem Real sobre Venda
        const margemRealPct = (lucroRealR / precoAtual) * 100;

        // CPA e ROAS
        const cpa_pct_calculado = total_variavel_pct - (comiss + impost); 
        const cpaRealR = precoAtual * (cpa_pct_calculado / 100);
        const roasRealAtual = cpaRealR > 0 ? (precoAtual / cpaRealR) : Infinity;

        const com_R = precoAtual * (comiss / 100);
        const imp_R = precoAtual * (impost / 100);

        let receitaTotal = 0, lucroTotal = 0, investimentoTotal = 0;
        if (vendasMes > 0) {
          receitaTotal = precoAtual * vendasMes;
          lucroTotal = lucroRealR * vendasMes;
          investimentoTotal = cpaRealR * vendasMes;
        }

        resPraticado = {
          precoPraticado: precoAtual,
          custoTotalR: custoTotalR,
          lucroRealR: lucroRealR,
          margemRealPct: margemRealPct,
          comissaoR: com_R,
          impostosR: imp_R,
          cpaRealR: cpaRealR,
          cpaPct: cpa_pct_calculado,
          roasReal: roasRealAtual,
          receitaTotal,
          lucroTotal,
          investimentoTotal,
          lucroDiario: lucroTotal / DIAS_NO_MES
        };
      }
    }

    if (!resVenda && !resMarkup && !resPraticado) {
      alert("Preencha pelo menos uma 'Margem', 'Markup' OU o 'Preço Praticado' para calcular.");
    }

    setResults({ venda: resVenda, markup: resMarkup, praticado: resPraticado });
  };

  // --- ESTILOS INLINE (Adaptados do HTML para React) ---
  
  const styles: Record<string, React.CSSProperties> = {
    container: {
      backgroundColor: colors.bgDark,
      color: colors.text,
      fontFamily: "'Poppins', sans-serif",
      margin: 0,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh'
    },
    title: {
      color: colors.primary,
      fontSize: '2.2rem',
      marginBottom: '0.5rem',
      textAlign: 'center'
    },
    description: {
      color: colors.textMuted,
      marginBottom: '2rem',
      textAlign: 'center'
    },
    calculatorsContainer: {
      display: 'flex',
      gap: '2rem',
      width: '100%',
      maxWidth: '1200px',
      justifyContent: 'center',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      marginBottom: '2rem'
    },
    card: {
      backgroundColor: colors.cardDark,
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: `0 0 10px rgba(255, 87, 34, 0.2)`,
      width: '100%',
      maxWidth: '580px',
      boxSizing: 'border-box'
    },
    roasTable: {
      backgroundColor: colors.bgDark,
      border: `1px solid ${colors.primary}`,
      width: '100%',
      maxWidth: '1200px',
      marginBottom: '2rem',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    resultsContainer: {
      display: 'flex',
      gap: '2rem',
      width: '100%',
      maxWidth: '1200px',
      justifyContent: 'center',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      margin: '0 auto'
    },
    resultCard: {
      backgroundColor: colors.cardDark,
      border: `1px solid ${colors.borderSoft}`,
      borderRadius: '12px',
      padding: '1.5rem',
      width: isMobile ? '100%' : '360px',
      boxSizing: 'border-box',
      boxShadow: '0 0 5px rgba(0, 0, 0, 0.5)'
    },
    input: {
      width: '100%',
      padding: '8px',
      marginTop: '4px',
      border: `1px solid ${colors.borderSoft}`,
      borderRadius: '6px',
      backgroundColor: '#222',
      color: '#fff',
      boxSizing: 'border-box'
    },
    label: {
      display: 'block',
      marginTop: '10px',
      fontSize: '0.9rem'
    },
    button: {
      marginTop: '15px',
      width: '100%',
      padding: '10px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: 'bold',
      background: `linear-gradient(90deg, ${colors.primary}, #ff7043)`,
      color: 'white',
      transition: '0.3s'
    },
    detailItem: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '0.9rem',
      padding: '2px 0',
      margin: 0
    },
    lucroBox: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '1.1rem',
      fontWeight: 'bold',
      paddingTop: '5px'
    },
    empateBox: {
      backgroundColor: '#111',
      border: `2px solid ${colors.borderSoft}`,
      padding: '10px',
      margin: '15px 0',
      borderRadius: '8px',
      textAlign: 'center'
    },
    th: {
      backgroundColor: colors.primary,
      color: 'white',
      padding: '10px',
      border: '1px solid #333',
      fontWeight: 'bold'
    },
    td: {
      padding: '10px',
      border: '1px solid #333',
      textAlign: 'center'
    }
  };

  // --- RENDER ---

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Calculadora de Precificação Shopee 📈</h1>
      <p style={styles.description}>
        Use a tabela de referência, defina seus custos e calcule o preço ideal para atingir sua meta de <strong>ROAS</strong>.
      </p>

      {/* TABELA ROAS */}
      <div style={styles.roasTable}>
        <h2 style={{ color: colors.primary, margin: '1rem', fontSize: '1.5rem', textAlign: 'center' }}>Tabela de ROAS Ideal</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr>
              <th style={styles.th}>Nível Estratégico</th>
              <th style={styles.th}>Faixa de ROAS</th>
              <th style={styles.th}>Foco Principal</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={styles.td}>Focado em Volume</td><td style={styles.td}>3 a 7</td><td style={styles.td}>Expandir vendas e alcance.</td></tr>
            <tr><td style={styles.td}>Intermediário</td><td style={styles.td}>7.1 a 9</td><td style={styles.td}>Manter bom volume com retorno.</td></tr>
            <tr><td style={styles.td}>Estável</td><td style={styles.td}>9.1 a 12</td><td style={styles.td}>Garantir consistência e margem.</td></tr>
            <tr><td style={styles.td}>Alta Rentabilidade</td><td style={styles.td}>12.1+</td><td style={styles.td}>Maximizar lucro e eficiência.</td></tr>
          </tbody>
        </table>
      </div>

      <div style={styles.calculatorsContainer}>
        {/* FORMULÁRIO */}
        <div style={styles.card}>
          <h2 style={{ color: colors.primary, marginBottom: '1rem', fontSize: '1.5rem' }}>Dados do Produto e Custos</h2>
          
          <label style={styles.label}>Nome do Produto *</label>
          <input name="nome" value={form.nome} onChange={handleChange} placeholder="Ex: Camiseta Premium" style={styles.input} />

          <label style={styles.label}>Custo do Produto no Fornecedor (R$) *</label>
          <input name="custoProduto" value={form.custoProduto} onChange={handleChange} placeholder="Ex: 20,00" style={styles.input} />

          <label style={styles.label}>Taxa Fixa Shopee (R$) - Ex: 4,00</label>
          <input name="custoUnidade" value={form.custoUnidade} onChange={handleChange} placeholder="4,00" style={styles.input} />
          
          <label style={styles.label}>Outras Despesas por Unidade (R$) [Embalagem, M.O., etc.]</label>
          <input name="outrasDespesas" value={form.outrasDespesas} onChange={handleChange} placeholder="Ex: 1,00" style={styles.input} />

          <hr style={{ margin: '15px 0', borderColor: colors.borderSoft }} />
          
          <div style={{ display: 'flex', gap: '15px', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '5px', color: colors.primary }}>Margem sobre o Preço de Venda (%)</div>
              <label style={{ marginTop: 0, fontSize: '0.9rem' }}>Lucro Desejado (%) <br /> <span style={{ color: colors.primary, fontSize: '0.8rem' }}>(Deixe vazio se usar Markup)</span></label>
              <input name="margem" value={form.margem} onChange={handleChange} placeholder="Ex: 20" style={styles.input} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '5px', color: colors.profit }}>Margem sobre o Custo (Markup %)</div>
              <label style={{ marginTop: 0, fontSize: '0.9rem' }}>Markup Desejado (%) <br /> <span style={{ color: colors.profit, fontSize: '0.8rem' }}>(Deixe vazio se usar Margem)</span></label>
              <input name="margemMarkup" value={form.margemMarkup} onChange={handleChange} placeholder="Ex: 50" style={styles.input} />
            </div>
          </div>

          <hr style={{ margin: '15px 0', borderColor: colors.borderSoft }} />

          <label style={styles.label}>Comissão Shopee (%) *</label>
          <input name="comissao" value={form.comissao} onChange={handleChange} placeholder="Ex: 20" style={styles.input} />

          <label style={styles.label}>Impostos (%) *</label>
          <input name="impostos" value={form.impostos} onChange={handleChange} placeholder="Ex: 6" style={styles.input} />

          <label style={styles.label}>Usa Tráfego Pago (CPA)?</label>
          <select name="usarCPA" value={form.usarCPA} onChange={handleChange} style={styles.input}>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>

          {form.usarCPA === 'sim' && (
            <div>
              <label style={styles.label}>ROAS Desejado *</label>
              <input name="roas" value={form.roas} onChange={handleChange} placeholder="Ex: 10" style={styles.input} />
            </div>
          )}
          
          <label style={styles.label}>Expectativa de Vendas no Mês *</label>
          <input name="vendasMes" value={form.vendasMes} onChange={handleChange} placeholder="Ex: 120" style={styles.input} />
          
          <label style={styles.label}>Preço de Venda **PRATICADO** (R$) *</label>
          <input name="precoAtual" value={form.precoAtual} onChange={handleChange} placeholder="Ex: 79,90" style={styles.input} />
          
          <button onClick={calcularTudo} style={styles.button}>Calcular Preço(s) 🚀</button>
        </div>
      </div>

      {/* RESULTADOS */}
      <div style={styles.resultsContainer}>
        
        {/* RESULTADO 1: MARGEM SOBRE VENDA */}
        {results.venda && (
          <div style={styles.resultCard}>
            <h2 style={{ color: colors.primary, marginBottom: '1rem', fontSize: '1.5rem' }}>Preço de Venda (Margem/Preço)</h2>
            <div style={{
              fontSize: '1.8rem', fontWeight: 'bold', color: colors.primary,
              backgroundColor: '#111', padding: '0.8rem', textAlign: 'center',
              borderRadius: '8px', marginBottom: '1rem', border: `1px solid ${colors.primary}`
            }}>
              {_toBRL(results.venda.precoVenda)}
            </div>

            <div>
              <h3 style={{ color: colors.primary, marginTop: '1rem', fontSize: '1.1rem', borderBottom: `2px solid ${colors.borderSoft}` }}>Custos & Margens (Unidade)</h3>
              <div style={styles.detailItem}><strong>Custo Fixo Total:</strong> <span style={{color: colors.primary}}>{_toBRL(results.venda.custoTotalUnidade)}</span></div>
              <div style={styles.detailItem}><strong>Comissão:</strong> <span style={{color: colors.primary}}>{_toBRL(results.venda.comissaoR)}</span></div>
              <div style={styles.detailItem}><strong>Impostos:</strong> <span style={{color: colors.primary}}>{_toBRL(results.venda.impostosR)}</span></div>
              {form.usarCPA === 'sim' && (
                <div style={styles.detailItem}><strong>CPA ({results.venda.cpaPct.toFixed(1)}%):</strong> <span style={{color: colors.primary}}>{_toBRL(results.venda.cpaR)}</span></div>
              )}
              
              <hr style={{ margin: '5px 0', borderColor: colors.borderSoft }} />
              
              <div style={styles.lucroBox}>
                <span style={{ color: colors.profit }}>LUCRO LÍQUIDO ({results.venda.margemPct.toFixed(1)}%):</span> 
                <span style={{ color: colors.profit }}>{_toBRL(results.venda.lucroR)}</span>
              </div>

              <div style={styles.empateBox}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>**PREÇO MÍNIMO OPERACIONAL**</p>
                <strong style={{ fontSize: '1.3rem', color: colors.primary }}>{_toBRL(results.venda.precoEmpate)}</strong>
              </div>
            </div>

            <div style={{ backgroundColor: '#111', padding: '1rem', borderRadius: '10px', textAlign: 'center', border: `1px solid ${colors.borderSoft}` }}>
              {form.usarCPA === 'sim' ? (
                <>
                  <strong style={{ color: colors.analysis, fontSize: '1.2rem', display: 'block' }}>ROAS Desejado: {parseFloat(form.roas).toFixed(2)}x</strong>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>ROAS real: <strong>{results.venda.roasReal.toFixed(2)}x</strong></p>
                </>
              ) : (
                <>
                  <strong style={{ color: colors.analysis }}>Venda Orgânica</strong>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Sem custo de tráfego.</p>
                </>
              )}
            </div>

            {results.venda.receitaTotal > 0 && (
              <>
                <hr style={{ margin: '1rem 0 0.5rem 0', borderColor: colors.borderSoft }} />
                <h3 style={{ color: colors.primary, fontSize: '1.1rem' }}>Estimativas Mensais 💰</h3>
                <div style={styles.detailItem}><strong>Faturamento:</strong> <strong style={{color: colors.primary}}>{_toBRL(results.venda.receitaTotal)}</strong></div>
                {results.venda.investimentoTotal > 0 && (
                  <div style={styles.detailItem}><strong>Ads:</strong> <strong style={{color: colors.analysis}}>{_toBRL(results.venda.investimentoTotal)}</strong></div>
                )}
                <div style={{ ...styles.detailItem, fontSize: '1.2rem', marginTop: '5px' }}>
                  <strong>Lucro Mensal:</strong> <strong style={{color: colors.profit}}>{_toBRL(results.venda.lucroTotal)}</strong>
                </div>
                <div style={{ ...styles.detailItem, marginTop: '5px' }}>
                  <strong>Lucro Diário:</strong> <strong style={{color: colors.profit}}>{_toBRL(results.venda.lucroDiario)}</strong>
                </div>
              </>
            )}
          </div>
        )}

        {/* RESULTADO 2: MARKUP */}
        {results.markup && (
          <div style={styles.resultCard}>
            <h2 style={{ color: colors.profit, marginBottom: '1rem', fontSize: '1.5rem' }}>Preço de Venda (Markup)</h2>
            <div style={{
              fontSize: '1.8rem', fontWeight: 'bold', color: colors.profit,
              backgroundColor: '#111', padding: '0.8rem', textAlign: 'center',
              borderRadius: '8px', marginBottom: '1rem', border: `1px solid ${colors.profit}`
            }}>
              {_toBRL(results.markup.precoVenda)}
            </div>

            <div>
              <h3 style={{ color: colors.profit, marginTop: '1rem', fontSize: '1.1rem', borderBottom: `2px solid ${colors.borderSoft}` }}>Custos & Margens</h3>
              <div style={styles.detailItem}><strong>Comissão:</strong> <span style={{color: colors.profit}}>{_toBRL(results.markup.comissaoR)}</span></div>
              <div style={styles.detailItem}><strong>Impostos:</strong> <span style={{color: colors.profit}}>{_toBRL(results.markup.impostosR)}</span></div>
              {form.usarCPA === 'sim' && (
                <div style={styles.detailItem}><strong>CPA ({results.markup.cpaPct.toFixed(1)}%):</strong> <span style={{color: colors.profit}}>{_toBRL(results.markup.cpaR)}</span></div>
              )}
              
              <hr style={{ margin: '5px 0', borderColor: colors.borderSoft }} />
              
              <div style={styles.lucroBox}>
                <span style={{ color: colors.profit }}>LUCRO LÍQUIDO ({results.markup.margemPct.toFixed(1)}%):</span> 
                <span style={{ color: colors.profit }}>{_toBRL(results.markup.lucroR)}</span>
              </div>

              <div style={styles.empateBox}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>**PREÇO MÍNIMO OPERACIONAL**</p>
                <strong style={{ fontSize: '1.3rem', color: colors.profit }}>{_toBRL(results.markup.precoEmpate)}</strong>
              </div>
            </div>

            {results.markup.receitaTotal > 0 && (
              <>
                <hr style={{ margin: '1rem 0 0.5rem 0', borderColor: colors.borderSoft }} />
                <h3 style={{ color: colors.profit, fontSize: '1.1rem' }}>Estimativas Mensais 💰</h3>
                <div style={styles.detailItem}><strong>Faturamento:</strong> <strong style={{color: colors.profit}}>{_toBRL(results.markup.receitaTotal)}</strong></div>
                <div style={{ ...styles.detailItem, fontSize: '1.2rem', marginTop: '5px' }}>
                  <strong>Lucro Mensal:</strong> <strong style={{color: colors.profit}}>{_toBRL(results.markup.lucroTotal)}</strong>
                </div>
              </>
            )}
          </div>
        )}

        {/* RESULTADO 3: PREÇO PRATICADO */}
        {results.praticado && (
          <div style={styles.resultCard}>
            <h2 style={{ color: colors.analysis, marginBottom: '1rem', fontSize: '1.5rem' }}>Análise Preço Praticado</h2>
            <div style={{
              fontSize: '1.8rem', fontWeight: 'bold', color: colors.analysis,
              backgroundColor: '#111', padding: '0.8rem', textAlign: 'center',
              borderRadius: '8px', marginBottom: '1rem', border: `1px solid ${colors.analysis}`
            }}>
              {_toBRL(results.praticado.precoPraticado)}
            </div>

            <div>
              <h3 style={{ color: colors.analysis, marginTop: '1rem', fontSize: '1.1rem', borderBottom: `2px solid ${colors.borderSoft}` }}>Análise de Custos</h3>
              <div style={styles.detailItem}><strong>Comissão:</strong> <span style={{color: colors.analysis}}>{_toBRL(results.praticado.comissaoR)}</span></div>
              <div style={styles.detailItem}><strong>Impostos:</strong> <span style={{color: colors.analysis}}>{_toBRL(results.praticado.impostosR)}</span></div>
              {form.usarCPA === 'sim' && (
                <div style={styles.detailItem}><strong>CPA ({results.praticado.cpaPct.toFixed(1)}%):</strong> <span style={{color: colors.analysis}}>{_toBRL(results.praticado.cpaRealR)}</span></div>
              )}
              
              <hr style={{ margin: '5px 0', borderColor: colors.borderSoft }} />
              
              <div style={{...styles.empateBox, borderColor: results.praticado.lucroRealR < 0 ? colors.loss : colors.profit}}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>**CUSTO TOTAL (PONTO DE EQUILÍBRIO)**</p>
                <strong style={{ fontSize: '1.3rem', color: results.praticado.lucroRealR < 0 ? colors.loss : colors.profit }}>
                  {_toBRL(results.praticado.custoTotalR)}
                </strong>
              </div>

              <div style={styles.lucroBox}>
                <span style={{ color: results.praticado.lucroRealR < 0 ? colors.loss : colors.profit }}>LUCRO LÍQUIDO REAL:</span> 
                <span style={{ color: results.praticado.lucroRealR < 0 ? colors.loss : colors.profit }}>{_toBRL(results.praticado.lucroRealR)}</span>
              </div>
              <p style={{ fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
                Margem Real: <strong style={{ color: results.praticado.lucroRealR < 0 ? colors.loss : colors.profit }}>
                  {results.praticado.margemRealPct.toFixed(2)}%
                </strong>
              </p>
            </div>

            {results.praticado.receitaTotal > 0 && (
              <>
                <hr style={{ margin: '1rem 0 0.5rem 0', borderColor: colors.borderSoft }} />
                <h3 style={{ color: colors.analysis, fontSize: '1.1rem' }}>Análise Mensal 💰</h3>
                <div style={styles.detailItem}><strong>Faturamento:</strong> <strong style={{color: colors.primary}}>{_toBRL(results.praticado.receitaTotal)}</strong></div>
                <div style={{ ...styles.detailItem, fontSize: '1.2rem', marginTop: '5px' }}>
                  <strong>Lucro Mensal:</strong> <strong style={{ color: results.praticado.lucroTotal < 0 ? colors.loss : colors.profit }}>
                    {_toBRL(results.praticado.lucroTotal)}
                  </strong>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
