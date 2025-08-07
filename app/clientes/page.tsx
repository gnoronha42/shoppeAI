"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Loader2, Plus, User, Search } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<string>("lista");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const { hasPermission, user } = useAuth();
  
  // Adicionar logs para debugar
  useEffect(() => {
    console.log('=== DEBUG PERMISSÕES CLIENTE ===');
    console.log('Usuário:', user);
    console.log('hasPermission create_clients:', hasPermission('create_clients'));
    console.log('hasPermission view_clients:', hasPermission('view_clients'));
  }, [user, hasPermission]);

  const { data: response, isLoading, error } = useGetClientsQuery({
    page,
    pageSize: CLIENTS_PER_PAGE,
    search: searchTerm
  });

  // Garantir que clients seja sempre um array
  const clients = Array.isArray(response?.data) ? response.data : [];
  const { total = 0, totalPages = 0 } = response?.meta || {};
  const currentPage = response?.meta?.page || 1;
  const pageSize = response?.meta?.pageSize || CLIENTS_PER_PAGE;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  useEffect(() => {
    if (clients && clients.length > 0) {
      dispatch(setClients(clients));
    }
  }, [clients, dispatch]);

  // Resetar para primeira página quando buscar
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const navigateToClientDetails = (clientId: string) => {
    router.push(`/clientes/${clientId}`);
  };

  const handleClientFormSuccess = () => {
    setActiveTab("lista");
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">
          Gerencie os clientes da sua plataforma
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
       
        
        <TabsContent value="lista" className="space-y-6 mt-6">
          {/* Campo de busca */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar clientes..."
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
                {searchTerm && ` para "${searchTerm}"`}
              </span>
              {totalPages > 1 && (
                <span>Página {currentPage} de {totalPages}</span>
              )}
            </div>
          )}

          {/* Lista de clientes */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="col-span-full text-center py-10">
                <p className="text-red-500">Erro ao carregar clientes</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="col-span-full text-center py-10">
                {searchTerm ? (
                  <div>
                    <p className="text-muted-foreground mb-2">
                      Nenhum cliente encontrado para "{searchTerm}"
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchTerm("")}
                    >
                      Limpar busca
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
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
                        <AvatarFallback className="bg-orange-100 text-orange-800">
                          {client.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{client.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          <User className="inline h-3 w-3 mr-1" />
                          {client.ownerName}
                        </p>
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
        </TabsContent>
        
        <TabsContent value="cadastro" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cadastrar Novo Cliente</CardTitle>
              <CardDescription>
                Adicione informações do cliente para gerenciar análises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientForm onSuccess={handleClientFormSuccess} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 