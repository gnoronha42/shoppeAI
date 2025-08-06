"use client";

import { useEffect, useState } from "react";
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
  const { data: response, isLoading } = useGetClientsQuery({
    page: 1,
    pageSize: 100 // Carregar mais clientes para o selector
  });
  const selectedClientId = useSelector(selectSelectedClientId);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  // Garantir que clients seja sempre um array
  const clients = Array.isArray(response?.data) ? response.data : [];
  
  // Os clientes já vêm ordenados alfabeticamente do backend
  const selectedClient = clients.find(client => client.id === selectedClientId);

  useEffect(() => {
    if (clients.length > 0) {
      dispatch(setClients(clients));
    }
  }, [clients, dispatch]);

  const handleClientSelect = (currentValue: string) => {
    dispatch(selectClient(currentValue === selectedClientId ? "" : currentValue));
    setOpen(false);
  };

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
          />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {clients.map((client: Client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.name} ${client.ownerName}`.toLowerCase()}
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
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}