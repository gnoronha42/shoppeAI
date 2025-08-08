import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  is_completed?: boolean;
  completed_at?: string;
  execution_count?: number;
  last_analyst?: string;
  execution_history?: Array<{
    id: string;
    is_completed: boolean;
    completed_at: string | null;
    analyst_name: string | null;
    execution_count: number;
    created_at: string | null;
  }>;
}

interface ChecklistBlock {
  id: string;
  title: string;
  items: ChecklistItem[];
}

interface ClientChecklistProps {
  clientId: string;
  clientName: string; // novo campo
}

export function ClientChecklist({ clientId, clientName }: ClientChecklistProps) {
  const [blocks, setBlocks] = useState<ChecklistBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changedItems, setChangedItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Carregar checklist do backend
  useEffect(() => {
    setLoading(true);
    fetch(`/api/clientes/${clientId}/checklist`, {
        credentials: 'include', // Enviar cookies automaticamente
      })
      .then(async (res) => {
        if (!res.ok) throw new Error("Erro ao carregar checklist");
        const data = await res.json();
        setBlocks(data.blocks || []);
      })
      .catch(() => {
        toast({
          title: "Erro ao carregar checklist",
          description: "Não foi possível carregar os itens do checklist",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  // Marcar/desmarcar localmente
  const handleItemToggle = (blockId: string, itemId: string, isCompleted: boolean) => {
    setBlocks(blocks.map(block =>
      block.id === blockId
        ? {
          ...block,
          items: block.items.map(item =>
            item.id === itemId ? {
              ...item,
              is_completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : undefined
            } : item
          ),
        }
        : block
    ));
    setChangedItems(prev => ({ ...prev, [itemId]: isCompleted }));
  };

  // Salvar alterações no backend
  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = Object.entries(changedItems);
      if (changed.length === 0) {
        toast({ title: "Nada para salvar", description: "Nenhuma alteração foi feita.", variant: "default" });
        setSaving(false);
        return;
      }

      await Promise.all(
        changed.map(([itemId, isCompleted]) =>
          fetch(`/api/clientes/${clientId}/checklist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include', // Enviar cookies automaticamente
            body: JSON.stringify({ itemId, isCompleted }),
          })
        )
      );
      
      // Recarregar dados do checklist após salvar
      console.log('🔄 Recarregando dados do checklist...');
      const response = await fetch(`/api/clientes/${clientId}/checklist`, {
        credentials: 'include',
        cache: 'no-cache', // Evitar cache
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Dados recarregados:', data);
        setBlocks(data.blocks || []);
      } else {
        console.error('❌ Erro ao recarregar dados:', response.status);
      }
      
      toast({ title: "Checklist salvo!", description: "Progresso salvo com sucesso.", variant: "default" });
      setChangedItems({});
    } catch (error) {
      toast({ title: "Erro ao salvar", description: "Não foi possível salvar o checklist.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Filtrar blocos com pelo menos um item concluído (e manter apenas os itens concluídos)
  const filtrarBlocosComAlgumConcluido = (blocks: ChecklistBlock[]) => {
    return blocks
      .map(block => ({
        ...block,
        items: block.items.filter(item => item.is_completed === true)
      }))
      .filter(block => block.items.length > 0);
  };

  // Gerar markdown completo do checklist
  const generateChecklistMarkdown = () => {
    let md = `# ✅ CHECKLIST OPERACIONAL\n\n`;
    blocks.forEach((block, i) => {
      md += `## ${block.title}\n`;
      block.items.forEach((item, idx) => {
        md += `- [${item.is_completed ? "x" : " "}] ${item.title}\n`;
        if (item.description) md += `  - ${item.description}\n`;
      });
      md += `\n`;
    });
    return md;
  };

  // Gerar markdown apenas dos blocos com pelo menos um item concluído
  const generateCompletedChecklistMarkdown = (blocks: ChecklistBlock[], clientName: string) => {
    const completedBlocks = filtrarBlocosComAlgumConcluido(blocks);

    if (completedBlocks.length === 0) {
      return `# ✅ CHECKLIST OPERACIONAL - ITENS CONCLUÍDOS\n\n**Cliente:** ${clientName}\n\n*Nenhum item foi concluído ainda.*`;
    }

    let md = `# ✅ CHECKLIST OPERACIONAL - ITENS CONCLUÍDOS\n\n`;
    md += `**Cliente:** ${clientName}\n`;
    md += `**Data do Relatório:** ${new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n\n`;

    let totalConcluidos = 0;

    completedBlocks.forEach((block, i) => {
      md += `## ${block.title}\n`;
      md += `**Itens Concluídos:** ${block.items.length}\n\n`;

      block.items.forEach((item, idx) => {
        totalConcluidos++;
        const executionText = item.execution_count && item.execution_count > 1 
          ? ` (${item.execution_count}x)` 
          : '';
        
        md += `### ✓ ${item.title}${executionText}\n`;

        if (item.description) {
          md += `**Descrição:** ${item.description}\n\n`;
        }

        if (item.last_analyst) {
          md += `**Último Analista:** ${item.last_analyst}\n\n`;
        }

        if (item.completed_at) {
          const dataFormatada = new Date(item.completed_at).toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          md += `**✅ Última Execução:** ${dataFormatada}\n\n`;
        } else {
          md += `**✅ Status:** Concluído\n\n`;
        }

        // Adicionar histórico se houver múltiplas execuções
        if (item.execution_history && item.execution_history.length > 1) {
          md += `**📊 Histórico de Execuções:**\n`;
          item.execution_history.forEach((hist, histIdx) => {
            const histDataFormatada = hist.completed_at 
              ? new Date(hist.completed_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Data não informada';
            md += `- ${histIdx + 1}ª execução: ${hist.analyst_name || 'Analista não informado'} em ${histDataFormatada}\n`;
          });
          md += `\n`;
        }

        md += `---\n\n`;
      });
    });

    md += `## 📊 RESUMO EXECUTIVO\n\n`;
    md += `- **Total de Itens Concluídos:** ${totalConcluidos}\n`;
    md += `- **Blocos com Atividades Finalizadas:** ${completedBlocks.length}\n`;
    md += `- **Taxa de Progresso:** Blocos com pelo menos um item concluído\n\n`;

    return md;
  };

  // Gerar PDF completo
  const handleGeneratePDF = async () => {
    try {
      const markdown = generateChecklistMarkdown();
      const response = await fetch("https://analysis-micro.onrender.com/checklist-completed-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: blocks, // Envie os blocos completos
          clientName: "Cliente",
          markdown: markdown
        }),
      });
      if (!response.ok) throw new Error("Erro ao gerar PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `checklist_completo_Cliente.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "PDF gerado!", description: "Checklist completo baixado em PDF.", variant: "default" });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", description: "Não foi possível gerar o PDF do checklist.", variant: "destructive" });
    }
  };

  


  const calculateBlockProgress = (items: ChecklistItem[]) => {
    if (!items.length) return 0;
    const completed = items.filter(item => item.is_completed).length;
    return (completed / items.length) * 100;
  };

  const getTotalCompletedItems = () => {
    return blocks.reduce((total, block) => {
      return total + block.items.filter(item => item.is_completed).length;
    }, 0);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCompletedItems = getTotalCompletedItems();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist de Ações</CardTitle>
        <CardDescription>
          Acompanhe e gerencie as ações necessárias para esta conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-end">
          <Button onClick={handleSave} disabled={saving || Object.keys(changedItems).length === 0} className="bg-green-600 hover:bg-green-700 text-white">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button onClick={handleGeneratePDF} variant="outline">
            Gerar PDF
          </Button>
        </div>
        <Accordion type="single" collapsible className="space-y-4">
          {blocks.map(block => {
            const progress = calculateBlockProgress(block.items);
            return (
              <AccordionItem key={block.id} value={block.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between w-full">
                      <span>{block.title}</span>
                      <Badge variant={progress === 100 ? "default" : "outline"}>
                        {Math.round(progress)}% concluído
                      </Badge>
                    </div>
                    <Progress value={progress} className="mt-2" />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 mt-4">
                    {block.items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={item.id}
                          checked={item.is_completed}
                          onCheckedChange={(checked) =>
                            handleItemToggle(block.id, item.id, checked as boolean)
                          }
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={item.id}
                              className={`text-sm font-medium ${item.is_completed ? "line-through text-muted-foreground" : ""
                                }`}
                            >
                              {item.title}
                            </Label>
                            {item.execution_count && item.execution_count > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {item.execution_count}x
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                          {item.last_analyst && (
                            <p className="text-xs text-muted-foreground">
                              Último: {item.last_analyst}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
} 