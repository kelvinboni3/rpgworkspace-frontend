import { useState } from "react";
import { Award, Compass, Loader2, Lock, Plus, TriangleAlert } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
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
import {
  QUEST_STATUS_LABELS,
  QuestService,
  QuestStatus,
  type Quest,
  type QuestStatusValue,
} from "@/services/quest-service";
import { cn } from "@/utils/cn";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const createQuestSchema = z.object({
  title: z.string().min(2, "Dê um título à quest").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  status: z.number().int(),
  reward: z.string().max(500).optional().or(z.literal("")),
  isPrivate: z.boolean(),
});

type CreateQuestValues = z.infer<typeof createQuestSchema>;

const STATUS_BADGE_CLASS: Record<QuestStatusValue, string> = {
  [QuestStatus.NotStarted]: "bg-secondary text-secondary-foreground",
  [QuestStatus.InProgress]: "bg-primary/15 text-primary",
  [QuestStatus.Completed]: "bg-accent/15 text-accent",
  [QuestStatus.Failed]: "bg-destructive/15 text-destructive",
  [QuestStatus.Abandoned]: "bg-secondary text-secondary-foreground",
};

export function QuestsSection({
  campaignId,
  isOwnerOrMaster,
}: {
  campaignId: string;
  isOwnerOrMaster: boolean;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const questsQuery = useQuery({
    queryKey: ["campaigns", campaignId, "quests"],
    queryFn: () => QuestService.getAllByCampaign(campaignId),
  });

  const quests = questsQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateQuestValues>({ resolver: zodResolver(createQuestSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreateQuestValues) =>
      QuestService.create(campaignId, {
        title: values.title,
        description: values.description || null,
        status: values.status as QuestStatusValue,
        reward: values.reward || null,
        isPrivate: values.isPrivate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "quests"] });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateQuestValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    reset({
      title: "",
      description: "",
      status: QuestStatus.NotStarted,
      reward: "",
      isPrivate: false,
    });
    setIsCreating(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {isOwnerOrMaster && (
        <div className="flex justify-end">
          <Button className="shadow-glow" onClick={openCreateForm}>
            <Plus className="size-4" />
            Nova quest
          </Button>
        </div>
      )}

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Criar quest</CardTitle>
            <CardDescription>Uma missão, objetivo ou gancho narrativo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar a quest.")}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" placeholder="Ex.: O Chamado da Torre" {...register("title")} />
                  {errors.title && (
                    <p className="text-destructive text-sm">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    className="sm:w-44"
                    {...register("status", { valueAsNumber: true })}
                  >
                    {Object.entries(QUEST_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Do que se trata essa quest?"
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward">Recompensa (opcional)</Label>
                <Input id="reward" placeholder="Ex.: 200 moedas de ouro" {...register("reward")} />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary size-4"
                  {...register("isPrivate")}
                />
                Visível apenas para Owner/Master
              </label>

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

      {questsQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando quests...
        </div>
      ) : questsQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(questsQuery.error, "Não foi possível carregar as quests.")}
        </div>
      ) : quests.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhuma quest ainda</CardTitle>
            <CardDescription>
              {isOwnerOrMaster
                ? "Crie a primeira quest dessa campanha."
                : "O mestre ainda não criou nenhuma quest visível."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest }: { quest: Quest }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 flex items-center gap-1.5">
            {quest.isPrivate && <Lock className="text-muted-foreground size-3.5 shrink-0" />}
            {quest.title}
          </CardTitle>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_BADGE_CLASS[quest.status],
            )}
          >
            {QUEST_STATUS_LABELS[quest.status]}
          </span>
        </div>
        <CardDescription className="line-clamp-2">
          {quest.description || "Sem descrição."}
        </CardDescription>
      </CardHeader>
      {quest.reward && (
        <CardFooter className="text-muted-foreground flex items-center text-xs">
          <Award className="mr-1.5 size-3.5" />
          {quest.reward}
        </CardFooter>
      )}
    </Card>
  );
}
