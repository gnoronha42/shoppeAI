import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações da sua plataforma
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>
              Personalize a aparência da interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme">Tema Escuro</Label>
                <p className="text-sm text-muted-foreground">
                  Alterne entre o tema claro e escuro
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>
              Configure suas preferências de notificação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receber relatórios por email
                </p>
              </div>
              <Switch id="email-notifications" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="app-notifications">Notificações no Aplicativo</Label>
                <p className="text-sm text-muted-foreground">
                  Notificações sobre novos relatórios
                </p>
              </div>
              <Switch id="app-notifications" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API e Integrações</CardTitle>
            <CardDescription>
              Conecte-se a outras plataformas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="shopee-api">API Shopee</Label>
                <p className="text-sm text-muted-foreground">
                  Conectar à API oficial da Shopee
                </p>
              </div>
              <Switch id="shopee-api" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="google-analytics">Google Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Integrar com Google Analytics
                </p>
              </div>
              <Switch id="google-analytics" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Armazenamento de Dados</CardTitle>
            <CardDescription>
              Gerencie seus relatórios e arquivos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2">
                <Label>Uso de Armazenamento</Label>
                <p className="text-sm text-muted-foreground">
                  2.4 GB de 10 GB utilizados
                </p>
              </div>
              <div className="h-2 w-full bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-600 rounded-full" style={{ width: '24%' }}></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-delete">Exclusão Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Excluir relatórios após 90 dias
                </p>
              </div>
              <Switch id="auto-delete" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}