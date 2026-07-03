import { Compass } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authStore } from "@/store/auth-store";

export function AppHomePage() {
  const user = authStore.getUser();
  const firstName = user?.name?.split(" ")[0] ?? "aventureiro";

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold">Bem-vindo, {firstName}</h1>
        <p className="text-muted-foreground">
          Seus workspaces e campanhas vão aparecer aqui.
        </p>
      </div>

      <Card className="glass-panel border-dashed">
        <CardHeader className="items-center text-center">
          <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
            <Compass className="size-6" />
          </div>
          <CardTitle>Nenhum workspace por aqui ainda</CardTitle>
          <CardDescription>
            A listagem e criação de workspaces é o próximo passo do projeto.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
