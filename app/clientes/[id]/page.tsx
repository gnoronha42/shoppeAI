"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, BarChart, FileSpreadsheet } from "lucide-react";
import { useGetClientQuery, useGetClientReportsQuery } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientDetailsPage() {


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Detalhes do Cliente</h1>
        <p className="text-muted-foreground">
          Visualize informações e relatórios do cliente
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-orange-100 text-orange-800 text-xl">
                {/* {client.name.substring(0, 2).toUpperCase()} */}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">teste</CardTitle>
              <CardDescription className="text-lg">
                teste
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relatórios (0)</CardTitle>
          <CardDescription>
            Histórico de relatórios gerados para este cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
              {/* {reports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum relatório foi gerado ainda para este cliente.
                </p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">
                        Relatório de {report.type === "account" ? "Conta" : "Anúncios"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(report.createdAt), "PPpp", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant={report.type === "account" ? "outline" : "secondary"}>
                      {report.type === "account" ? "Conta" : "Anúncios"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <BarChart className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )} */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}