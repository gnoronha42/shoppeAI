import { useState, useEffect } from 'react';
import { DashboardConfig, CalculatedMetrics } from '@/types/dashboard';

const defaultConfig: DashboardConfig = {
  gmvGeral: 45231,
  investimentoAds: 8500,
  ctrGeral: 3.2,
  numeroPedidos: 254,
  numeroVisitas: 12500,
  cpaMedio: 33.5
};

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedConfig = localStorage.getItem('dashboardConfig');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        setConfig(defaultConfig);
      }
    }
    setIsLoading(false);
  }, []);

  const updateConfig = (newConfig: Partial<DashboardConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    localStorage.setItem('dashboardConfig', JSON.stringify(updatedConfig));
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
    localStorage.setItem('dashboardConfig', JSON.stringify(defaultConfig));
  };

  const getCalculatedMetrics = (): CalculatedMetrics => {
    const roi = ((config.gmvGeral - config.investimentoAds) / config.investimentoAds) * 100;
    const taxaConversao = (config.numeroPedidos / config.numeroVisitas) * 100;
    const lucro = config.gmvGeral - config.investimentoAds;
    
    return {
      roi: roi.toFixed(1),
      taxaConversao: taxaConversao.toFixed(2),
      lucro: lucro.toFixed(2)
    };
  };

  return {
    config,
    updateConfig,
    resetConfig,
    getCalculatedMetrics,
    isLoading
  };
}

export type { DashboardConfig, CalculatedMetrics }; 