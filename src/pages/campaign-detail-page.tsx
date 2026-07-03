import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Compass,
  Hash,
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
import { Select } from "@/components/ui/select";
import { paths } from "@/routes/paths";
import { CampaignService } from "@/services/campaign-service";
import {
  SESSION_STATUS_LABELS,
  SessionService,
  SessionStatus,
  type Session,
  type SessionStatusValue,
} from "@/services/session-service";
import { WorkspaceMemberService, WorkspaceRole } from "@/services/workspace-member-service";
import { authStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";
import { formatDateOnly } from "@/utils/date";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const createSessionSchema = z.object({
  title: z.string().min(2, "Dê um título à sessão").max(200),
  number: z.number().int().min(1, "Número deve ser maior que zero"),
  date: z.string().min(1, "Informe a data"),
  summary: z.string().max(2000).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  status: z.number().int(),
});

type CreateSessionValues = z.infer<typeof createSessionSchema>;

const STATUS_BADGE_CLASS: Record<SessionStatusValue, string> = {
  [SessionStatus.Planned]: "bg-secondary text-secondary-foreground",
  [SessionStatus.Completed]: "bg-accent/15 text-accent",
  [SessionStatus.Canceled]: "bg-destructive/15 text-destructive",
};

export function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const currentUserId = authStore.getUser()?.id;
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const campaignQuery = useQuery({
    queryKey: ["campaigns", campaignId],
    queryFn: () => CampaignService.getById(campaignId!),
    enabled: Boolean(campaignId),
  });

  const workspaceId = campaignQuery.data?.workspaceId;

  const membersQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "members"],
    queryFn: () => WorkspaceMemberService.getAllByWorkspace(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const sessionsQuery = useQuery({
    queryKey: ["campaigns", campaignId, "sessions"],
    queryFn: () => SessionService.getAllByCampaign(campaignId!),
    enabled: Boolean(campaignId),
  });

  const currentMember = membersQuery.data?.find((member) => member.userId === currentUserId);
  const isOwnerOrMaster =
    currentMember?.role === WorkspaceRole.Owner || currentMember?.role === WorkspaceRole.Master;

  const sessions = sessionsQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSessionValues>({ resolver: zodResolver(createSessionSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreateSessionValues) =>
      SessionService.create(campaignId!, {
        title: values.title,
        number: values.number,
        date: new Date(values.date).toISOString(),
        summary: values.summary || null,
        notes: values.notes || null,
        status: values.status as SessionStatusValue,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "sessions"] });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateSessionValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    reset({
      title: "",
      number: sessions.length + 1,
      date: new Date().toISOString().slice(0, 10),
      summary: "",
      notes: "",
      status: SessionStatus.Planned,
    });
    setIsCreating(true);
  };

  if (!campaignId) return null;

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col gap-6">
      <div>
        {workspaceId && (
          <Link
            to={paths.workspace(workspaceId)}
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Voltar ao workspace
          </Link>
        )}

        {campaignQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Carregando campanha...
          </div>
        ) : campaignQuery.isError ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
            <TriangleAlert className="size-4 shrink-0" />
            {extractErrorMessage(campaignQuery.error, "Não foi possível carregar esta campanha.")}
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-bold">{campaignQuery.data?.name}</h1>
                {campaignQuery.data?.systemName && (
                  <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                    {campaignQuery.data.systemName}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                {campaignQuery.data?.description || "Sem descrição."}
              </p>
            </div>
            {isOwnerOrMaster && (
              <Button className="shadow-glow" onClick={openCreateForm}>
                <Plus className="size-4" />
                Nova sessão
              </Button>
            )}
          </div>
        )}
      </div>

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Registrar sessão</CardTitle>
            <CardDescription>Uma sessão jogada (ou planejada) dessa campanha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar a sessão.")}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" placeholder="Ex.: A fuga da masmorra" {...register("title")} />
                  {errors.title && (
                    <p className="text-destructive text-sm">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    type="number"
                    min={1}
                    className="sm:w-24"
                    {...register("number", { valueAsNumber: true })}
                  />
                  {errors.number && (
                    <p className="text-destructive text-sm">{errors.number.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input id="date" type="date" className="sm:w-40" {...register("date")} />
                  {errors.date && (
                    <p className="text-destructive text-sm">{errors.date.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select id="status" {...register("status", { valueAsNumber: true })}>
                  {Object.entries(SESSION_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Resumo (opcional)</Label>
                <Input id="summary" placeholder="O que aconteceu?" {...register("summary")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas do mestre (opcional)</Label>
                <Input id="notes" placeholder="Anotações privadas" {...register("notes")} />
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

      {sessionsQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando sessões...
        </div>
      ) : sessionsQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(sessionsQuery.error, "Não foi possível carregar as sessões.")}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhuma sessão registrada</CardTitle>
            <CardDescription>
              {isOwnerOrMaster
                ? "Registre a primeira sessão dessa campanha."
                : "O mestre ainda não registrou nenhuma sessão."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: Session }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{session.title}</CardTitle>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_BADGE_CLASS[session.status],
            )}
          >
            {SESSION_STATUS_LABELS[session.status]}
          </span>
        </div>
        <CardDescription className="line-clamp-2">
          {session.summary || "Sem resumo."}
        </CardDescription>
      </CardHeader>
      <CardFooter className="text-muted-foreground flex items-center gap-4 text-xs">
        <span className="flex items-center">
          <Hash className="mr-1 size-3.5" />
          {session.number}
        </span>
        <span className="flex items-center">
          <CalendarDays className="mr-1.5 size-3.5" />
          {formatDateOnly(session.date)}
        </span>
      </CardFooter>
    </Card>
  );
}
