"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAddClientMutation, useUpdateClientMutation } from "@/lib/api";
import { useDispatch } from "react-redux";
import {
  addClient as addClientAction,
  updateClient as updateClientAction,
} from "@/features/clients/clientSlice";
import { Client } from "@/types";

const clientSchema = z.object({
  name: z.string().min(2, {
    message: "O nome da loja deve ter pelo menos 2 caracteres.",
  }),
  ownerName: z.string().min(2, {
    message: "O nome do proprietário deve ter pelo menos 2 caracteres.",
  }),
  shopUrl: z
    .string()
    .url({ message: "URL da loja inválida" })
    .optional()
    .or(z.literal("")),
  followers: z.coerce.number().int().nonnegative().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  registrationDate: z.string().optional(),
  productCount: z.coerce.number().int().nonnegative().optional(),
  responseRate: z.coerce.number().min(0).max(100).optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: Client;
  onSuccess?: () => void;
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const { toast } = useToast();
  const dispatch = useDispatch();
  const [addClient, { isLoading: isAddLoading }] = useAddClientMutation();
  const [updateClient, { isLoading: isUpdateLoading }] =
    useUpdateClientMutation();
  const isLoading = isAddLoading || isUpdateLoading;
  const isEditing = Boolean(client);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || "",
      ownerName: client?.ownerName || "",
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name || "",
        ownerName: client.ownerName || "",
      });
    }
  }, [client, form]);

  const onSubmit = async (data: ClientFormValues) => {
    try {
      if (isEditing && client) {
        // Atualizar cliente existente
        const updatedClient = await updateClient({
          id: client.id,
          ...data,
        }).unwrap();

        dispatch(updateClientAction(updatedClient));

        toast({
          title: "Cliente atualizado com sucesso!",
          description: `As informações de ${data.name} foram atualizadas.`,
          variant: "default",
        });
      } else {
        // Adicionar novo cliente
        const newClient = await addClient(data).unwrap();

        dispatch(addClientAction(newClient));

        toast({
          title: "Cliente cadastrado com sucesso!",
          description: `${data.name} foi adicionado à sua lista de clientes.`,
          variant: "default",
        });

        form.reset();
      }

      // Navegar para a aba de lista se a função de callback foi fornecida
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Erro ao processar cliente:", error);
      toast({
        title: isEditing
          ? "Erro ao atualizar cliente"
          : "Erro ao adicionar cliente",
        description:
          error?.data?.error || "Ocorreu um erro. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Loja</FormLabel>
                <FormControl>
                  <Input placeholder="Insira o nome da loja" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ownerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Proprietário</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Insira o nome do proprietário"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          disabled={isLoading}
        >
          {isLoading
            ? isEditing
              ? "Atualizando..."
              : "Adicionando..."
            : isEditing
            ? "Atualizar Cliente"
            : "Adicionar Cliente"}
        </Button>
      </form>
    </Form>
  );
}
