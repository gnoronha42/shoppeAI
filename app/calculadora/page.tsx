"use client";

import React, { useState, useEffect } from "react";

// Função para converter string para float (aceita formato brasileiro)
function _toFloat(x: any): number {
  if (!x) return 0;
  const str = x.toString().replace(/\./g, '').replace(/,/g, '.');
  return parseFloat(str) || 0;
}

// Interface para os dados de entrada
interface CalculatorInput {
  nome: string;
  custoProduto: string;
  custoUnidade: string;
  margem: string;
  comissao: string;
  impostos: string;
  outrasDespesas: string;
  usarCPA: string;
  roas: string;
}

// Interface para o resultado
interface CalculatorResult {
  nome: string;
  precoVenda: number;
  custoTotal: number;
  comissaoR: number;
  impostosR: number;
  cpaR: number;
  lucro: number;
  cpaPct: number;
  roasReal: number;
  usarCPA: boolean;
  roasDesejado: number;
}

export default function CalculadoraPage() {
  const [form, setForm] = useState<CalculatorInput>({
    nome: "",
    custoProduto: "",
    custoUnidade: "",
    margem: "",
    comissao: "",
    impostos: "",
    outrasDespesas: "",
    usarCPA: "nao",
    roas: "10",
  });

  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    setForm({ ...form, [name]: value });
    
    // Se mudar para usar CPA e não tiver ROAS, define como 10
    if (name === "usarCPA" && value === "sim" && !form.roas) {
      setForm(prev => ({ ...prev, [name]: value, roas: "10" }));
    }
  };

  const calcularPreco = () => {
    // 1. Coleta de Dados e Conversão
    const nome = form.nome.trim();
    const C_prod = _toFloat(form.custoProduto);
    const C_unit = _toFloat(form.custoUnidade);
    const margem = _toFloat(form.margem);
    const comiss = _toFloat(form.comissao);
    const impost = _toFloat(form.impostos);
    const C_out = _toFloat(form.outrasDespesas);
    const usar_cpa = form.usarCPA === 'sim';
    const roas_desejado = _toFloat(form.roas || "10");

    // 2. Cálculo do Percentual de CPA/Tráfego
    let cpa_pct = usar_cpa && roas_desejado > 0 ? 100 / roas_desejado : 0;
    const soma_pct = margem + comiss + impost + cpa_pct;

    // 3. Validação
    if (soma_pct >= 100) {
      alert(`A soma das porcentagens (Margem, Com., Impostos, CPA) é de ${soma_pct.toFixed(2)}% (>=100%). O preço de venda seria infinito. Reduza as porcentagens.`);
      return;
    }

    // 4. Fórmula do Preço de Venda
    const C0 = C_prod + C_unit + C_out;
    const preco = C0 / (1 - soma_pct/100);
    
    // 5. Valores Absolutos (em R$)
    const cpa_R = preco * (cpa_pct/100);
    const lucro = preco * (margem/100);
    const com_R = preco * (comiss/100);
    const imp_R = preco * (impost/100);

    // 6. ROAS Real
    const roas_real_calc = cpa_R > 0 ? preco / cpa_R : Infinity;
    const roas_real = parseFloat(roas_real_calc.toFixed(2));

    setResult({
      nome,
      precoVenda: preco,
      custoTotal: C0,
      comissaoR: com_R,
      impostosR: imp_R,
      cpaR: cpa_R,
      lucro,
      cpaPct: cpa_pct,
      roasReal: roas_real,
      usarCPA: usar_cpa,
      roasDesejado: roas_desejado
    });

    setShowResult(true);
  };

  return (
    <div style={{
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: "'Poppins', sans-serif",
      margin: 0,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh'
    }}>
      <h1 style={{
        color: '#ff5722',
        fontSize: '2.2rem',
        marginBottom: '0.5rem',
        textAlign: 'center'
      }}>
        Calculadora de Precificação Shopee
      </h1>
      <p style={{
        color: '#ccc',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        Use a tabela de referência, defina seus custos e calcule o preço ideal para atingir sua meta de <strong>ROAS</strong>.
      </p>

      <div style={{
        display: 'flex',
        gap: isMobile ? '1rem' : '2rem',
        width: '100%',
        maxWidth: '1200px',
        justifyContent: 'center',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        margin: '0 auto',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        
        {/* Tabela de ROAS */}
        <div style={{
          backgroundColor: '#0d0d0d',
          border: '1px solid #ff5722',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 0 10px rgba(255, 87, 34, 0.2)',
          width: isMobile ? '90%' : '380px',
          maxWidth: isMobile ? '500px' : 'none',
          marginBottom: isMobile ? '20px' : '0',
          marginLeft: isMobile ? 'auto' : '0',
          marginRight: isMobile ? 'auto' : '0',
          boxSizing: 'border-box'
        }}>
          <h2 style={{
            color: '#ff5722',
            marginBottom: '1rem',
            fontSize: '1.5rem'
          }}>
            Tabela de ROAS Ideal
          </h2>
          <p style={{
            textAlign: 'left',
            marginBottom: '10px',
            color: '#ccc'
          }}>
            Referência para definir seu <strong>Retorno sobre o Investimento em Anúncios (ROAS)</strong> desejado.
          </p>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '1rem',
            fontSize: '0.95rem'
          }}>
            <thead>
              <tr>
                <th style={{
                  backgroundColor: '#ff5722',
                  color: '#111',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  border: '1px solid #222',
                  padding: '10px'
                }}>Nível Estratégico</th>
                <th style={{
                  backgroundColor: '#ff5722',
                  color: '#111',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  border: '1px solid #222',
                  padding: '10px'
                }}>Faixa de ROAS</th>
                <th style={{
                  backgroundColor: '#ff5722',
                  color: '#111',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  border: '1px solid #222',
                  padding: '10px'
                }}>Foco Principal</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#1a1a1a' }}>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>Focado em Volume</td>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>3 a 7</td>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>Expandir vendas e alcance, priorizando crescimento.</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>Intermediário</td>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>7.1 a 9</td>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>Aperfeiçoar o retorno mantendo bom volume.</td>
              </tr>
              <tr style={{ backgroundColor: '#1a1a1a' }}>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>Estável</td>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>9.1 a 12</td>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>Garantir consistência e eficiência nas campanhas, com boa margem de lucro.</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>Alta Rentabilidade</td>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>12.1+</td>
                <td style={{ border: '1px solid #222', padding: '10px', textAlign: 'left' }}>Maximizar o retorno com controle de custos e alta performance.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Formulário */}
        <div style={{
          backgroundColor: '#111',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 0 10px rgba(255, 87, 34, 0.2)',
          width: isMobile ? '90%' : '380px',
          maxWidth: isMobile ? '500px' : 'none',
          marginBottom: isMobile ? '20px' : '0',
          marginLeft: isMobile ? 'auto' : '0',
          marginRight: isMobile ? 'auto' : '0',
          boxSizing: 'border-box'
        }}>
          <h2 style={{
            color: '#ff5722',
            marginBottom: '1rem',
            fontSize: '1.5rem'
          }}>
            Dados do Produto
          </h2>

          <label style={{ display: 'block', marginTop: '10px', fontSize: '0.9rem' }}>Nome do Produto *</label>
          <input
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder="Ex: Camiseta Premium"
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '4px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#222',
              color: '#fff',
              boxSizing: 'border-box'
            }}
          />

          <label style={{ display: 'block', marginTop: '10px', fontSize: '0.9rem' }}>Custo do Produto (R$) *</label>
          <input
            name="custoProduto"
            value={form.custoProduto}
            onChange={handleChange}
            placeholder="Ex: 15.00"
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '4px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#222',
              color: '#fff',
              boxSizing: 'border-box'
            }}
          />

          <label style={{ display: 'block', marginTop: '10px', fontSize: '0.9rem' }}>Custo por Unidade (R$) *</label>
          <input
            name="custoUnidade"
            value={form.custoUnidade}
            onChange={handleChange}
            placeholder="Ex: 5.00 (embalagem, etc)"
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '4px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#222',
              color: '#fff',
              boxSizing: 'border-box'
            }}
          />

          <label style={{ display: 'block', marginTop: '10px', fontSize: '0.9rem' }}>Margem Desejada (%) *</label>
          <input
            name="margem"
            value={form.margem}
            onChange={handleChange}
            placeholder="Ex: 30 (o que sobra no seu caixa)"
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '4px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#222',
              color: '#fff',
              boxSizing: 'border-box'
            }}
          />

          <label style={{ display: 'block', marginTop: '10px', fontSize: '0.9rem' }}>Comissão Shopee (%) *</label>
          <input
            name="comissao"
            value={form.comissao}
            onChange={handleChange}
            placeholder="Ex: 18 (comissão + taxa de transação)"
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '4px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#222',
              color: '#fff',
              boxSizing: 'border-box'
            }}
          />

          <label style={{ display: 'block', marginTop: '10px', fontSize: '0.9rem' }}>Impostos (%) *</label>
          <input
            name="impostos"
            value={form.impostos}
            onChange={handleChange}
            placeholder="Ex: 8 (Simples Nacional, etc)"
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '4px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#222',
              color: '#fff',
              boxSizing: 'border-box'
            }}
          />

          <label style={{ display: 'block', marginTop: '10px', fontSize: '0.9rem' }}>Outras Despesas (R$)</label>
          <input
            name="outrasDespesas"
            value={form.outrasDespesas}
            onChange={handleChange}
            placeholder="Ex: 2.50 (custo fixo por venda)"
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '4px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#222',
              color: '#fff',
              boxSizing: 'border-box'
            }}
          />

          <label style={{ display: 'block', marginTop: '10px', fontSize: '0.9rem' }}>Usa Tráfego Pago (CPA)?</label>
          <select
            name="usarCPA"
            value={form.usarCPA}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '4px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#222',
              color: '#fff',
              boxSizing: 'border-box'
            }}
          >
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>

          {form.usarCPA === 'sim' && (
            <div>
              <label style={{ display: 'block', marginTop: '10px', fontSize: '0.9rem' }}>ROAS Desejado *</label>
              <input
                name="roas"
                value={form.roas}
                onChange={handleChange}
                placeholder="Ex: 10 (Consulte a tabela ao lado)"
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#222',
                  color: '#fff',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <button
            onClick={calcularPreco}
            style={{
              marginTop: '15px',
              width: '100%',
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #ff5722, #ff7043)',
              color: 'white',
              transition: '0.3s'
            }}
          >
            Calcular Preço
          </button>
        </div>
        
        {/* Resultado */}
        {showResult && result && (
          <div style={{
            backgroundColor: '#0f0f0f',
            border: '1px solid #1b5e20',
            borderRadius: '12px',
            padding: '1.5rem',
            marginTop: isMobile ? '0' : '2rem',
            width: isMobile ? '90%' : '100%',
            maxWidth: '800px',
            boxSizing: 'border-box',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <h2 style={{
              color: '#ff5722',
              marginBottom: '1rem',
              fontSize: '1.5rem'
            }}>
              Resultado do Cálculo
            </h2>
            
            <div style={{
              fontSize: '1.8rem',
              fontWeight: 'bold',
              color: '#ff7043',
              backgroundColor: '#1b1b1b',
              padding: '0.8rem',
              textAlign: 'center',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              R$ {result.precoVenda.toFixed(2).replace('.', ',')}
            </div>
            
            <div>
              <p><strong>Custo Total (C0):</strong> R$ {result.custoTotal.toFixed(2).replace('.', ',')}</p>
              <p><strong>Comissão Shopee ({_toFloat(form.comissao).toFixed(2)}%):</strong> R$ {result.comissaoR.toFixed(2).replace('.', ',')}</p>
              <p><strong>Impostos ({_toFloat(form.impostos).toFixed(2)}%):</strong> R$ {result.impostosR.toFixed(2).replace('.', ',')}</p>
              <p><strong>CPA - Custo de Anúncio ({result.cpaPct.toFixed(2)}%):</strong> R$ {result.cpaR.toFixed(2).replace('.', ',')}</p>
              <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '1rem 0' }} />
              <p><strong>Lucro Desejado ({_toFloat(form.margem).toFixed(2)}%):</strong> R$ {result.lucro.toFixed(2).replace('.', ',')}</p>
            </div>

            <div style={{
              backgroundColor: result.usarCPA ? '#0d47a1' : '#0d47a1',
              padding: '1rem',
              textAlign: 'center',
              borderRadius: '10px',
              marginTop: '1rem'
            }}>
              {result.usarCPA ? (
                <div>
                  <strong style={{ fontSize: '1.2rem', display: 'block' }}>
                    ROAS Desejado: {result.roasDesejado.toFixed(2)}x
                  </strong>
                  <p>O Preço de Venda de R$ {result.precoVenda.toFixed(2).replace('.', ',')} resulta em um <strong>ROAS de {result.roasReal.toFixed(2)}x</strong>.</p>
                </div>
              ) : (
                <div>
                  <strong>Venda Orgânica</strong><br />
                  <span>Preço calculado sem custo de tráfego (CPA).</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



