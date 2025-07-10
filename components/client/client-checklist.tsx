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
}

interface ChecklistBlock {
  id: string;
  title: string;
  items: ChecklistItem[];
}

interface ClientChecklistProps {
  clientId: string;
}

export function ClientChecklist({ clientId }: ClientChecklistProps) {
  const [blocks, setBlocks] = useState<ChecklistBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changedItems, setChangedItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Carregar checklist do backend
  useEffect(() => {
    setLoading(true);
    fetch(`/api/clientes/${clientId}/checklist`)
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
              item.id === itemId ? { ...item, is_completed: isCompleted } : item
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
      // Salvar cada item alterado
      await Promise.all(
        changed.map(([itemId, isCompleted]) =>
          fetch(`/api/clientes/${clientId}/checklist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId, isCompleted }),
          })
        )
      );
      toast({ title: "Checklist salvo!", description: "Progresso salvo com sucesso.", variant: "default" });
      setChangedItems({});
    } catch (error) {
      toast({ title: "Erro ao salvar", description: "Não foi possível salvar o checklist.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Gerar markdown do checklist
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

  // Gerar PDF
  const handleGeneratePDF = async () => {
    try {
      const markdown = generateChecklistMarkdown();
      const clientName = blocks[0]?.items[0]?.title ? "Cliente" : ""; // Ajuste se quiser pegar o nome real
      const response = await fetch("/api/analises/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, clientName, analysisType: "checklist" }),
      });
      if (!response.ok) throw new Error("Erro ao gerar PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `checklist_${clientName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "PDF gerado!", description: "Checklist baixado em PDF.", variant: "default" });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", description: "Não foi possível gerar o PDF do checklist.", variant: "destructive" });
    }
  };

  const calculateBlockProgress = (items: ChecklistItem[]) => {
    if (!items.length) return 0;
    const completed = items.filter(item => item.is_completed).length;
    return (completed / items.length) * 100;
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
                          <Label
                            htmlFor={item.id}
                            className={`text-sm font-medium ${
                              item.is_completed ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {item.title}
                          </Label>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">
                              {item.description}
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