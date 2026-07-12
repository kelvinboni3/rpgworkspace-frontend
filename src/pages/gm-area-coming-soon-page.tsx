import { Lock } from "lucide-react";
import { Link } from "react-router";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { paths } from "@/routes/paths";

export function GmAreaComingSoonPage() {
  return (
    <div className="animate-fade-in-up flex flex-1 items-center justify-center">
      <Card className="glass-panel border-dashed max-w-md">
        <CardHeader className="items-center text-center">
          <div className="bg-muted text-muted-foreground mb-2 flex size-12 items-center justify-center rounded-full">
            <Lock className="size-6" />
          </div>
          <CardTitle>Área do Mestre — em breve</CardTitle>
          <CardDescription>
            Workspaces, campanhas, NPCs e sessões estão migrando para cá. Por enquanto, quem já
            usa workspaces continua acessando tudo normalmente.
          </CardDescription>
          <Link
            to={paths.gmWorkspaces}
            className="text-muted-foreground hover:text-foreground mt-2 text-xs underline-offset-2 hover:underline"
          >
            Ver meus workspaces existentes
          </Link>
        </CardHeader>
      </Card>
    </div>
  );
}
