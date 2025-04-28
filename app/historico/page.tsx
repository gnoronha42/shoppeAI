"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, FileSpreadsheet, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Mock data for reports
const reports = [
  {
    id: "1",
    clientId: "1",
    clientName: "Loja Fantástica",
    ownerName: "João Silva",
    type: "account",
    createdAt: "2025-04-10T14:30:00Z",
    size: "1.2 MB"
  },
  {
    id: "2",
    clientId: "2",
    clientName: "Moda Express",
    ownerName: "Maria Oliveira",
    type: "ads",
    createdAt: "2025-04-09T10:15:00Z",
    size: "2.5 MB"
  },
  {
    id: "3",
    clientId: "3",
    clientName: "Tech Solutions",
    ownerName: "Carlos Santos",
    type: "account",
    createdAt: "2025-04-05T16:45:00Z",
    size: "1.8 MB"
  },
  {
    id: "4",
    clientId: "1",
    clientName: "Loja Fantástica",
    ownerName: "João Silva",
    type: "ads",
    createdAt: "2025-04-01T09:20:00Z",
    size: "3.1 MB"
  },
  {
    id: "5",
    clientId: "2",
    clientName: "Moda Express",
    ownerName: "Maria Oliveira",
    type: "account",
    createdAt: "2025-03-28T13:10:00Z",
    size: "1.5 MB"
  }
];

export default function HistoricoPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const filteredReports = reports.filter(report => 
    report.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico</h1>
        <p className="text-muted-foreground">
          Acesse seus relatórios e análises anteriores
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou proprietário..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="account">Análise de Conta</TabsTrigger>
          <TabsTrigger value="ads">Análise de Ads</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Relatórios ({filteredReports.length})</CardTitle>
              <CardDescription>
                Histórico de todos os relatórios gerados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Link href={`/clientes/${report.clientId}`} className="hover:underline">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-orange-100 text-orange-800">
                                {report.clientName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{report.clientName}</p>
                              <p className="text-xs text-muted-foreground">{report.ownerName}</p>
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.type === "account" ? "outline" : "secondary"}>
                          {report.type === "account" ? "Conta" : "Anúncios"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(report.createdAt)}</TableCell>
                      <TableCell>{report.size}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredReports.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhum relatório encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Análises de Conta</CardTitle>
              <CardDescription>
                Histórico de relatórios de análise de conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports
                    .filter(report => report.type === "account")
                    .map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Link href={`/clientes/${report.clientId}`} className="hover:underline">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-orange-100 text-orange-800">
                                {report.clientName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{report.clientName}</p>
                              <p className="text-xs text-muted-foreground">{report.ownerName}</p>
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(report.createdAt)}</TableCell>
                      <TableCell>{report.size}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredReports.filter(report => report.type === "account").length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhuma análise de conta encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ads" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Análises de Anúncios</CardTitle>
              <CardDescription>
                Histórico de relatórios de análise de anúncios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports
                    .filter(report => report.type === "ads")
                    .map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Link href={`/clientes/${report.clientId}`} className="hover:underline">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-orange-100 text-orange-800">
                                {report.clientName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{report.clientName}</p>
                              <p className="text-xs text-muted-foreground">{report.ownerName}</p>
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(report.createdAt)}</TableCell>
                      <TableCell>{report.size}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredReports.filter(report => report.type === "ads").length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhuma análise de anúncios encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}