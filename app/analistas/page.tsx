"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, UserPlus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Analyst {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  last_login?: string;
  analyses_count: number;
  created_by_user?: {
    name: string;
  };
}

export default function AnalistasPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAnalyst, setNewAnalyst] = useState({
    name: "",
    email: "",
    password: "",
    role: "analyst" as "analyst" | "superuser" | "cliente",
  });
  const { toast } = useToast();

  
  const loadAnalysts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/analistas", {
        credentials: 'include', 
      });
      if (!response.ok) throw new Error("Erro ao carregar analistas");
      const data = await response.json();
      setAnalysts(data.data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os analistas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para criar novo analista
  const handleCreateAnalyst = async () => {
    try {
      setIsLoading(true);
      console.log('Enviando dados:', newAnalyst); // Log para debug

      const response = await fetch("/api/analistas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Enviar cookies automaticamente
        body: JSON.stringify(newAnalyst),
      });

      console.log('Status da resposta:', response.status); // Log para debug

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro detalhado:', errorData); // Log para debug
        throw new Error(errorData.error || "Erro ao criar analista");
      }

      const data = await response.json();
      console.log('Analista criado:', data); // Log para debug

      toast({
        title: "Sucesso",
        description: "Analista criado com sucesso",
      });

      setIsDialogOpen(false);
      setNewAnalyst({ name: "", email: "", password: "", role: "analyst" as const });
      loadAnalysts();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar analista",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para desativar/reativar analista
  const handleToggleAnalystStatus = async (id: string, currentlyActive: boolean) => {
    try {
      const response = await fetch(`/api/analistas?id=${id}`, {
        method: "DELETE",
        credentials: 'include', // Enviar cookies automaticamente
      });

      if (!response.ok) throw new Error("Erro ao alterar status do analista");

      const data = await response.json();
      
      toast({
        title: "Sucesso",
        description: data.message,
      });

      loadAnalysts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status do analista",
        variant: "destructive",
      });
    }
  };

  // Função para excluir análises do analista
  const handleDeleteAnalyses = async (id: string, analystName: string) => {
    try {
      const response = await fetch(`/api/analistas?id=${id}&action=delete_analyses`, {
        method: "DELETE",
        credentials: 'include', // Enviar cookies automaticamente
      });

      if (!response.ok) throw new Error("Erro ao excluir análises");

      const data = await response.json();
      
      toast({
        title: "Sucesso",
        description: data.message,
      });

      // Recarregar a lista para atualizar a contagem
      loadAnalysts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir análises",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadAnalysts();
  }, []);

  // Filtrar analistas baseado no termo de busca
  const filteredAnalysts = analysts.filter(analyst =>
    analyst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    analyst.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie analistas e super usuários do sistema
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Adicione um novo analista ou super usuário ao sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newAnalyst.name}
                  onChange={(e) =>
                    setNewAnalyst({ ...newAnalyst, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAnalyst.email}
                  onChange={(e) =>
                    setNewAnalyst({ ...newAnalyst, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAnalyst.password}
                  onChange={(e) =>
                    setNewAnalyst({ ...newAnalyst, password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Tipo de Usuário</Label>
                <Select
                  value={newAnalyst.role}
                  onValueChange={(value: "analyst" | "superuser" | "cliente") =>
                    setNewAnalyst({ ...newAnalyst, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analyst">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Analista</span>
                        <span className="text-xs text-muted-foreground">
                          Pode criar análises e gerenciar checklists
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="superuser">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Super Usuário</span>
                        <span className="text-xs text-muted-foreground">
                          Acesso total ao sistema, incluindo gestão de usuários
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cliente">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Cliente</span>
                        <span className="text-xs text-muted-foreground">
                          Acesso apenas à Calculadora 2026
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateAnalyst} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  `Criar ${newAnalyst.role === 'superuser' ? 'Super Usuário' : newAnalyst.role === 'cliente' ? 'Cliente' : 'Analista'}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            Lista de todos os usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Análises</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnalysts.map((analyst) => (
                  <TableRow key={analyst.id}>
                    <TableCell>{analyst.name}</TableCell>
                    <TableCell>{analyst.email}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          analyst.role === "superuser"
                            ? "bg-purple-100 text-purple-700"
                            : analyst.role === "cliente" || analyst.role === "inactive_cliente"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {analyst.role === "superuser"
                          ? "Super Usuário"
                          : analyst.role === "cliente" || analyst.role === "inactive_cliente"
                          ? analyst.role === "inactive_cliente"
                            ? "Cliente (Inativo)"
                            : "Cliente"
                          : "Analista"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          analyst.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {analyst.active ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{analyst.analyses_count}</span>
                        {analyst.analyses_count > 0 && analyst.role !== "cliente" && analyst.role !== "inactive_cliente" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Análises</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir todas as {analyst.analyses_count} análises de {analyst.name}? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAnalyses(analyst.id, analyst.name)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir Análises
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {analyst.last_login
                        ? format(new Date(analyst.last_login), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })
                        : "Nunca acessou"}
                    </TableCell>
                    <TableCell>{analyst.created_by_user?.name || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleToggleAnalystStatus(analyst.id, analyst.active)}
                      >
                        {analyst.active ? "Desativar" : "Reativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 