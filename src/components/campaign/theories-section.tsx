import { useState } from "react";
import { Compass, Gauge, Loader2, Plus, TriangleAlert } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  THEORY_STATUS_LABELS,
  TheoryService,
  TheoryStatus,
  type Theory,
  type TheoryStatusValue,
} from "@/services/theory-service";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";
import { cn } from "@/utils/cn";

const createTheorySchema = z.object({
  title: z.string().min(2, "Dê um título à teoria").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  evidence: z.string().max(3000).optional().or(z.literal("")),
  confidence: z.number().int().min(0).max(100),
  status: z.number().int(),
});

type CreateTheoryValues = z.infer<typeof createTheorySchema>;

const STATUS_BADGE_CLASS: Record<TheoryStatusValue, string> = {
  [TheoryStatus.Active]: "bg-primary/15 text-primary",
  [TheoryStatus.Confirmed]: "bg-accent/15 text-accent",
  [TheoryStatus.Refuted]: "bg-destructive/15 text-destructive",
  [TheoryStatus.Archived]: "bg-secondary text-secondary-foreground",
};

export function TheoriesSection({ characterId }: { characterId: string }) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const theoriesQuery = useQuery({
    queryKey: ["characters", characterId, "theories"],
    queryFn: () => TheoryService.getAllByCharacter(characterId),
  });

  const theories = theoriesQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTheoryValues>({ resolver: zodResolver(createTheorySchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreateTheoryValues) =>
      TheoryService.create(characterId, {
        title: values.title,
        description: values.description || null,
        evidence: values.evidence || null,
        confidence: values.confidence,
        status: values.status as TheoryStatusValue,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId, "theories"] });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateTheoryValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    reset({
      title: "",
      description: "",
      evidence: "",
      confidence: 0,
      status: TheoryStatus.Active,
    });
    setIsCreating(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button className="shadow-glow" onClick={openCreateForm}>
          <Plus className="size-4" />
          Nova teoria
        </Button>
      </div>

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Registrar teoria</CardTitle>
            <CardDescription>Suas hipóteses e suspeitas sobre a trama.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar a teoria.")}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" placeholder="Ex.: O mercador é um espião" {...register("title")} />
                {errors.title && (
                  <p className="text-destructive text-sm">{errors.title.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" {...register("status", { valueAsNumber: true })}>
                    {Object.entries(THEORY_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confidence">Confiança (0-100)</Label>
                  <Input
                    id="confidence"
                    type="number"
                    min={0}
                    max={100}
                    className="sm:w-32"
                    {...register("confidence", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Do que se trata essa teoria?"
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evidence">Evidências (opcional)</Label>
                <Textarea
                  id="evidence"
                  placeholder="O que sustenta essa teoria?"
                  {...register("evidence")}
                />
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
                  Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {theoriesQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando teorias...
        </div>
      ) : theoriesQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(theoriesQuery.error, "Não foi possível carregar as teorias.")}
        </div>
      ) : theories.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhuma teoria ainda</CardTitle>
            <CardDescription>Registre a primeira hipótese do seu personagem.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {theories.map((theory) => (
            <TheoryCard key={theory.id} theory={theory} />
          ))}
        </div>
      )}
    </div>
  );
}

function TheoryCard({ theory }: { theory: Theory }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{theory.title}</CardTitle>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_BADGE_CLASS[theory.status],
            )}
          >
            {THEORY_STATUS_LABELS[theory.status]}
          </span>
        </div>
        {theory.description && (
          <CardDescription className="line-clamp-3 whitespace-pre-line">
            {theory.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardFooter className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Gauge className="size-3.5" />
        Confiança: {theory.confidence}%
      </CardFooter>
    </Card>
  );
}
