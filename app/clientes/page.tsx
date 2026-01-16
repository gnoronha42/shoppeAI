"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ClientForm } from "@/components/client/client-form";
import { useGetClientsQuery } from "@/lib/api";
import { Loader2, Plus, User, Search, ShoppingBag, Video } from "lucide-react";
import { useDispatch } from "react-redux";
import { setClients } from "@/features/clients/clientSlice";
import { Client } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const CLIENTS_PER_PAGE = 10;

export default function ClientesPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<string>("shopee"); // Padrão shopee
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const { hasPermission, user } = useAuth();
  
  // Passar a plataforma para a query. Se estiver na aba cadastro, não importa muito, mas mantemos shopee.
  const platformFilter = activeTab === 'cadastro' ? 'shopee' : activeTab;

  const { data: response, isLoading, error } = useGetClientsQuery({
    page,
    pageSize: CLIENTS_PER_PAGE,
    search: debouncedSearchTerm,
    platform: platformFilter
  });

  // Garantir que clients seja sempre um array
  const clients = Array.isArray(response?.data) ? response.data : [];
  const { total = 0, totalPages = 0 } = response?.meta || {};
  const currentPage = response?.meta?.page || 1;
  const pageSize = response?.meta?.pageSize || CLIENTS_PER_PAGE;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Debounce do termo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Aguarda 500ms após parar de digitar

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (clients && clients.length > 0) {
      dispatch(setClients(clients));
    }
  }, [clients, dispatch]);

  // Resetar para primeira página quando buscar ou trocar aba
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, activeTab]);
  
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const navigateToClientDetails = useCallback((clientId: string) => {
    router.push(`/clientes/${clientId}`);
  }, [router]);

  const handleClientFormSuccess = useCallback(() => {
    setActiveTab("shopee"); // Voltar para shopee após cadastro
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const ClientList = useMemo(() => (
    <div className="space-y-6 mt-6">
          {/* Campo de busca */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Buscar clientes ${activeTab === 'shopee' ? 'Shopee' : 'TikTok'}...`}
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-8"
              />
            </div>
            {(user?.role === 'superuser' || user?.role === 'admin') && (
              <Button 
                variant="outline"
                onClick={() => setActiveTab("cadastro")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            )}
          </div>

          {/* Informações da busca/paginação */}
          {!isLoading && !error && (
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>
                {clients.length === 0 
                  ? "Nenhum cliente encontrado" 
                  : `Mostrando ${startIndex + 1}-${Math.min(endIndex, total)} de ${total} cliente${total !== 1 ? 's' : ''}`
                }
                {debouncedSearchTerm && ` para "${debouncedSearchTerm}"`}
              </span>
              {totalPages > 1 && (
                <span>Página {currentPage} de {totalPages}</span>
              )}
            </div>
          )}

          {/* Lista de clientes */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full flex justify-center  py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="col-span-full text-center py-10">
                <p className="text-red-500">Erro ao carregar clientes</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="col-span-full text-center py-10">
                {debouncedSearchTerm ? (
                  <div>
                    <p className="text-muted-foreground mb-2">
                      Nenhum cliente encontrado para "{debouncedSearchTerm}"
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm("");
                        setDebouncedSearchTerm("");
                      }}
                    >
                      Limpar busca
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted-foreground">Nenhum cliente {activeTab === 'shopee' ? 'Shopee' : 'TikTok'} cadastrado</p>
                    {(user?.role === 'superuser' || user?.role === 'admin') && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setActiveTab("cadastro")}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Cadastrar Cliente
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              clients.map((client: Client) => (
                <Card 
                  key={client.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigateToClientDetails(client.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={`${activeTab === 'tiktok' ? 'bg-black text-white' : 'bg-orange-100 text-orange-800'}`}>
                          {client.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{client.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          <User className="inline h-3 w-3 mr-1" />
                          {client.ownerName}
                        </p>
                        {/* Indicador visual extra se necessário */}
                        {/* <Badge variant="secondary" className="mt-1 text-xs">
                          {activeTab === 'tiktok' ? 'TikTok' : 'Shopee'}
                        </Badge> */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                          handlePageChange(currentPage - 1);
                        }
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(pageNum);
                        }}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) {
                          handlePageChange(currentPage + 1);
                        }
                      }}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
    </div>
  ), [
    isLoading,
    error,
    clients,
    searchTerm,
    debouncedSearchTerm,
    activeTab,
    user,
    startIndex,
    endIndex,
    total,
    totalPages,
    currentPage,
    handlePageChange,
    navigateToClientDetails,
    handleSearchChange
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">
          Gerencie os clientes da sua plataforma
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="shopee" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Shopee
          </TabsTrigger>
          <TabsTrigger value="tiktok" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            TikTok
          </TabsTrigger>
          <TabsTrigger value="cadastro" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="shopee">
          {ClientList}
        </TabsContent>

        <TabsContent value="tiktok">
          {ClientList}
        </TabsContent>
        
        <TabsContent value="cadastro" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cadastrar Novo Cliente</CardTitle>
              <CardDescription>
                Adicione informações do cliente para gerenciar análises. 
                Certifique-se de escolher a plataforma correta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Nota: O formulário de cliente precisa ser atualizado para aceitar 'platform' ou ser passado como prop */}
              {/* Como não tenho acesso ao arquivo do formulário, vou assumir que ele pode ser adaptado ou que o usuário vai editar */}
              <div className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-md text-sm">
                Nota: Ao cadastrar, defina a plataforma desejada se o formulário permitir, ou ele será criado como padrão.
              </div>
              <ClientForm onSuccess={handleClientFormSuccess} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
