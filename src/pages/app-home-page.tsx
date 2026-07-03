import { useState } from "react";
import { CalendarDays, Compass, Loader2, Plus, TriangleAlert } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paths } from "@/routes/paths";
import { WorkspaceService, type Workspace } from "@/services/workspace-service";
import { authStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Dê um nome ao workspace").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
});

type CreateWorkspaceValues = z.infer<typeof createWorkspaceSchema>;

export function AppHomePage() {
  const user = authStore.getUser();
  const firstName = user?.name?.split(" ")[0] ?? "aventureiro";
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: WorkspaceService.getAll,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWorkspaceValues>({ resolver: zodResolver(createWorkspaceSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreateWorkspaceValues) =>
      WorkspaceService.create({
        name: values.name,
        description: values.description || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      reset();
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateWorkspaceValues> = (values) => {
    createMutation.mutate(values);
  };

  const workspaces = workspacesQuery.data ?? [];

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold">Bem-vindo, {firstName}</h1>
          <p className="text-muted-foreground">Seus workspaces de campanha.</p>
        </div>
        <Button
          className="shadow-glow"
          onClick={() => setIsCreating((current) => !current)}
        >
          <Plus className="size-4" />
          Novo workspace
        </Button>
      </div>

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Criar workspace</CardTitle>
            <CardDescription>
              Um espaço para organizar campanhas com seu grupo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(
                      createMutation.error,
                      "Não foi possível criar o workspace.",
                    )}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex.: Crônicas de Aethermoor"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-destructive text-sm">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Do que se trata essa mesa?"
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-destructive text-sm">{errors.description.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreating(false)}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Criar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {workspacesQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando workspaces...
        </div>
      ) : workspacesQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(
            workspacesQuery.error,
            "Não foi possível carregar seus workspaces.",
          )}
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhum workspace por aqui ainda</CardTitle>
            <CardDescription>
              Crie o primeiro pra começar a organizar sua campanha.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceCard({
  workspace,
  currentUserId,
}: {
  workspace: Workspace;
  currentUserId?: string;
}) {
  const isOwner = workspace.ownerUserId === currentUserId;

  return (
    <Link to={paths.workspace(workspace.id)} className="block">
      <Card className="glass-panel hover:border-primary/40 h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1">{workspace.name}</CardTitle>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                isOwner ? "bg-accent/15 text-accent" : "bg-secondary text-secondary-foreground",
              )}
            >
              {isOwner ? "Dono" : "Membro"}
            </span>
          </div>
          <CardDescription className="line-clamp-2">
            {workspace.description || "Sem descrição."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">
          <CalendarDays className="mr-1.5 size-3.5" />
          Criado em {new Date(workspace.createdAt).toLocaleDateString("pt-BR")}
        </CardFooter>
      </Card>
    </Link>
  );
}
