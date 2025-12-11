"use client";

import { useEffect, useState, useMemo } from "react";
import { useGetClientsQuery } from "@/lib/api";
import { useDispatch, useSelector } from "react-redux";
import { selectClient, selectSelectedClientId, setClients } from "@/features/clients/clientSlice";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Client } from "@/types";

export function ClientSelector() {
  const { data: response, isLoading, error } = useGetClientsQuery({
    page: 1, // ✅ Mudança: Buscar da página 1
    pageSize: 1000 // ✅ Mudança: Aumentar pageSize para buscar mais clientes
  });
  const selectedClientId = useSelector(selectSelectedClientId);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Garantir que clients seja sempre um array
  const clients = Array.isArray(response?.data) ? response.data : [];
  

  
  // Os clientes já vêm ordenados alfabeticamente do backend
  const selectedClient = clients.find(client => client.id === selectedClientId);

  useEffect(() => {
    if (clients.length > 0) {
      dispatch(setClients(clients));
    }
  }, [clients, dispatch]);

  const handleClientSelect = (clientId: string) => {
   
    dispatch(selectClient(clientId === selectedClientId ? "" : clientId));
    setOpen(false);
  };

  // Função para normalizar texto para busca (remove acentos e converte para lowercase)
  const normalizeText = (text: string) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  // Filtrar clientes baseado na busca
  const filteredClients = useMemo(() => {
    if (!searchValue.trim()) {
      return clients;
    }

    const normalizedSearch = normalizeText(searchValue);
    console.log(' Buscando com termo normalizado:', normalizedSearch);

    return clients.filter(client => {
      const clientSearchText = normalizeText(`${client.name} ${client.ownerName}`);
      const matches = clientSearchText.includes(normalizedSearch);
  
      return matches;
    });
  }, [clients, searchValue]);

  console.log(' Clientes filtrados:', {
    searchValue,
    totalClients: clients.length,
    filteredClients: filteredClients.length,
    filteredNames: filteredClients.map(c => c.name)
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading || clients.length === 0}
        >
          {selectedClient
            ? `${selectedClient.name} (${selectedClient.ownerName})`
            : "Selecione um cliente..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" side="bottom" align="start">
        <Command>
          <CommandInput 
            placeholder="Buscar cliente..." 
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {filteredClients.map((client: Client) => {
                const searchValue = normalizeText(`${client.name} ${client.ownerName}`);
              
                
                return (
                  <CommandItem
                    key={client.id}
                    value={searchValue}
                    onSelect={() => handleClientSelect(client.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedClientId === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {client.ownerName}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}