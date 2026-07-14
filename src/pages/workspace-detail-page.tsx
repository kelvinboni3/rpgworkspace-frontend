import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Compass,
  Loader2,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useParams } from "react-router";
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
import { CampaignService, type Campaign } from "@/services/campaign-service";
import { WorkspaceService } from "@/services/workspace-service";
import {
  WORKSPACE_ROLE_LABELS,
  WorkspaceMemberService,
  WorkspaceRole,
} from "@/services/workspace-member-service";
import { authStore } from "@/store/auth-store";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const createCampaignSchema = z.object({
  name: z.string().min(2, "Dê um nome à campanha").max(100),
  systemName: z.string().max(100).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

type CreateCampaignValues = z.infer<typeof createCampaignSchema>;

export function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const currentUserId = authStore.getUser()?.id;
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const workspaceQuery = useQuery({
    queryKey: ["workspaces", workspaceId],
    queryFn: () => WorkspaceService.getById(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const membersQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "members"],
    queryFn: () => WorkspaceMemberService.getAllByWorkspace(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const campaignsQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "campaigns"],
    queryFn: () => CampaignService.getAllByWorkspace(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const currentMember = membersQuery.data?.find((member) => member.userId === currentUserId);
  const isOwnerOrMaster =
    currentMember?.role === WorkspaceRole.Owner || currentMember?.role === WorkspaceRole.Master;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCampaignValues>({ resolver: zodResolver(createCampaignSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreateCampaignValues) =>
      CampaignService.create(workspaceId!, {
        name: values.name,
        description: values.description || null,
        systemName: values.systemName || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "campaigns"] });
      reset();
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateCampaignValues> = (values) => {
    createMutation.mutate(values);
  };

  if (!workspaceId) return null;

  const campaigns = campaignsQuery.data ?? [];

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col gap-6">
      <div>
        <Link
          to={paths.gmWorkspaces}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Todos os workspaces
        </Link>

        {workspaceQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Carregando workspace...
          </div>
        ) : workspaceQuery.isError ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
            <TriangleAlert className="size-4 shrink-0" />
            {extractErrorMessage(workspaceQuery.error, "Não foi possível carregar este workspace.")}
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-bold">{workspaceQuery.data?.name}</h1>
                {currentMember && (
                  <span className="bg-accent/15 text-accent rounded-full px-2 py-0.5 text-xs font-medium">
                    {WORKSPACE_ROLE_LABELS[currentMember.role]}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                {workspaceQuery.data?.description || "Sem descrição."}
              </p>
            </div>
            {isOwnerOrMaster && (
              <Button className="shadow-glow" onClick={() => setIsCreating((current) => !current)}>
                <Plus className="size-4" />
                Nova campanha
              </Button>
            )}
          </div>
        )}
      </div>

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Criar campanha</CardTitle>
            <CardDescription>Uma nova história pra contar nesse workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar a campanha.")}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex.: A Sombra sobre Aethermoor"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-destructive text-sm">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemName">Sistema (opcional)</Label>
                <Input
                  id="systemName"
                  placeholder="Ex.: D&D 5e, Tormenta20..."
                  {...register("systemName")}
                />
                {errors.systemName && (
                  <p className="text-destructive text-sm">{errors.systemName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Do que se trata essa campanha?"
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

      {campaignsQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando campanhas...
        </div>
      ) : campaignsQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(campaignsQuery.error, "Não foi possível carregar as campanhas.")}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhuma campanha ainda</CardTitle>
            <CardDescription>
              {isOwnerOrMaster
                ? "Crie a primeira campanha desse workspace."
                : "Peça para o dono ou mestre criar a primeira campanha."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Link to={paths.campaign(campaign.id)} className="block">
      <Card className="glass-panel hover:border-primary/40 h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1">{campaign.name}</CardTitle>
            {campaign.systemName && (
              <span className="bg-secondary text-secondary-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
                {campaign.systemName}
              </span>
            )}
          </div>
          <CardDescription className="line-clamp-2">
            {campaign.description || "Sem descrição."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">
          <CalendarDays className="mr-1.5 size-3.5" />
          Criada em {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
        </CardFooter>
      </Card>
    </Link>
  );
}
