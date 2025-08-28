'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Save, TrendingUp, DollarSign, Target, RotateCcw, AlertCircle } from "lucide-react";
import { useDashboardConfig } from "@/hooks/use-dashboard-config";
import { toast } from "@/hooks/use-toast";

export default function ConfiguracoesPage() {
  const { config, updateConfig, resetConfig, getCalculatedMetrics } = useDashboardConfig();
  const [isEditing, setIsEditing] = useState(false);
  const [tempConfig, setTempConfig] = useState(config);

  const handleEdit = () => {
    setTempConfig(config);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateConfig(tempConfig);
    setIsEditing(false);
    toast({
      title: "Configurações salvas!",
      description: "Os valores do dashboard foram atualizados com sucesso.",
    });
  };

  const handleCancel = () => {
    setTempConfig(config);
    setIsEditing(false);
  };

  const handleReset = () => {
    resetConfig();
    setTempConfig(config);
    toast({
      title: "Configurações resetadas!",
      description: "Os valores foram restaurados para os padrões.",
    });
  };

  const handleInputChange = (field: keyof typeof config, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setTempConfig(prev => ({ ...prev, [field]: numValue }));
  };

  const metrics = getCalculatedMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações da sua plataforma e valores do dashboard
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              Configurações do Dashboard
            </CardTitle>
            <CardDescription>
              Configure os valores exibidos nos cards do dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gmvGeral">GMV Geral (R$)</Label>
                <Input
                  id="gmvGeral"
                  type="number"
                  value={tempConfig.gmvGeral}
                  onChange={(e) => handleInputChange('gmvGeral', e.target.value)}
                  disabled={!isEditing}
                  className="text-sm"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investimentoAds">Investimento ADS (R$)</Label>
                <Input
                  id="investimentoAds"
                  type="number"
                  value={tempConfig.investimentoAds}
                  onChange={(e) => handleInputChange('investimentoAds', e.target.value)}
                  disabled={!isEditing}
                  className="text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ctrGeral">CTR Geral (%)</Label>
                <Input
                  id="ctrGeral"
                  type="number"
                  step="0.1"
                  value={tempConfig.ctrGeral}
                  onChange={(e) => handleInputChange('ctrGeral', e.target.value)}
                  disabled={!isEditing}
                  className="text-sm"
                  placeholder="0.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroPedidos">Número de Pedidos</Label>
                <Input
                  id="numeroPedidos"
                  type="number"
                  value={tempConfig.numeroPedidos}
                  onChange={(e) => handleInputChange('numeroPedidos', e.target.value)}
                  disabled={!isEditing}
                  className="text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numeroVisitas">Número de Visitas</Label>
                <Input
                  id="numeroVisitas"
                  type="number"
                  value={tempConfig.numeroVisitas}
                  onChange={(e) => handleInputChange('numeroVisitas', e.target.value)}
                  disabled={!isEditing}
                  className="text-sm"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpaMedio">CPA Médio (R$)</Label>
                <Input
                  id="cpaMedio"
                  type="number"
                  step="0.1"
                  value={tempConfig.cpaMedio}
                  onChange={(e) => handleInputChange('cpaMedio', e.target.value)}
                  disabled={!isEditing}
                  className="text-sm"
                  placeholder="0.0"
                />
              </div>
            </div>

            {isEditing && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">Métricas calculadas automaticamente:</p>
                    <p>ROI: {metrics.roi}% | Taxa de Conversão: {metrics.taxaConversao}% | Lucro: R$ {metrics.lucro}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            {!isEditing ? (
              <Button onClick={handleEdit} className="w-full">
                <TrendingUp className="mr-2 h-4 w-4" />
                Editar Valores
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  Cancelar
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize a aparência da interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme">Tema Escuro</Label>
                <p className="text-sm text-muted-foreground">
                  Alterne entre o tema claro e escuro
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              API e Integrações
            </CardTitle>
            <CardDescription>
              Conecte-se a outras plataformas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="shopee-api">API Shopee</Label>
                <p className="text-sm text-muted-foreground">
                  Conectar à API oficial da Shopee
                </p>
              </div>
              <Switch id="shopee-api" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              Ações
            </CardTitle>
            <CardDescription>
              Gerencie suas configurações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="w-full"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar Valores Padrão
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}