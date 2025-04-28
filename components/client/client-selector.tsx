"use client";

import { useEffect } from "react";
import { useGetClientsQuery } from "@/lib/api";
import { useDispatch, useSelector } from "react-redux";
import { selectClient, selectSelectedClientId, setClients } from "@/features/clients/clientSlice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Client } from "@/types";

export function ClientSelector() {
  const { data: clients = [], isLoading } = useGetClientsQuery();
  const selectedClientId = useSelector(selectSelectedClientId);
  const dispatch = useDispatch();

  useEffect(() => {
    if (clients.length > 0) {
      dispatch(setClients(clients));
    }
  }, [clients, dispatch]);

  const handleClientChange = (value: string) => {
    dispatch(selectClient(value));
  };

  return (
    <Select
      disabled={isLoading || clients.length === 0}
      value={selectedClientId || ""}
      onValueChange={handleClientChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione um cliente" />
      </SelectTrigger>
      <SelectContent>
        {clients.map((client: Client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.name} ({client.ownerName})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}