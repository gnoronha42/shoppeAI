"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientForm } from "@/components/client/client-form";
import { useGetClientsQuery } from "@/lib/api";
import { Loader2, Plus, User } from "lucide-react";
import { useDispatch } from "react-redux";
import { setClients } from "@/features/clients/clientSlice";

export default function ClientesPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { data: clients = [], isLoading, error } = useGetClientsQuery();
  const [activeTab, setActiveTab] = useState<string>("lista");
  
  useEffect(() => {
    if (clients && clients.length > 0) {
      dispatch(setClients(clients));
    }
  }, [clients, dispatch]);
  
  const navigateToClientDetails = (clientId: string) => {
    router.push(`/clientes/${clientId}`);
  };

  const handleClientFormSuccess = () => {
    setActiveTab("lista");
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
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="lista">Lista de Clientes</TabsTrigger>
          <TabsTrigger value="cadastro">Cadastrar Cliente</TabsTrigger>
        </TabsList>
        
        <TabsContent value="lista" className="space-y-6 mt-6">
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
                <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab("cadastro")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Cliente
                </Button>
              </div>
            ) : (
              clients.map((client) => (
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