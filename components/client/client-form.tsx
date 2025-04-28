"use client";

import { useState } from "react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAddClientMutation } from "@/lib/api";

const clientSchema = z.object({
  name: z.string().min(2, {
    message: "O nome da loja deve ter pelo menos 2 caracteres.",
  }),
  ownerName: z.string().min(2, {
    message: "O nome do proprietário deve ter pelo menos 2 caracteres.",
  }),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export function ClientForm() {
  const [addClient, { isLoading }] = useAddClientMutation();
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      ownerName: "",
    },
  });

  const onSubmit = async (data: ClientFormValues) => {
    try {
      await addClient(data).unwrap();
      toast.success("Cliente adicionado com sucesso!", {
        description: `${data.name} foi adicionado à sua lista de clientes.`,
      });
      form.reset();
    } catch (error) {
      toast.error("Erro ao adicionar cliente", {
        description: "Ocorreu um erro. Por favor, tente novamente.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Input placeholder="Insira o nome do proprietário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          disabled={isLoading}
        >
          {isLoading ? "Adicionando..." : "Adicionar Cliente"}
        </Button>
      </form>
    </Form>
  );
}