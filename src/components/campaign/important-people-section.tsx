import { useState } from "react";
import { CalendarDays, Compass, Loader2, Plus, TriangleAlert } from "lucide-react";
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
  EVALUATION_LEVEL_LABELS,
  EvaluationLevel,
  IMPORTANT_PERSON_TYPE_LABELS,
  ImportantPersonService,
  ImportantPersonType,
  type EvaluationLevelValue,
  type ImportantPerson,
  type ImportantPersonTypeValue,
} from "@/services/important-person-service";
import { cn } from "@/utils/cn";
import { formatDateOnly } from "@/utils/date";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const createImportantPersonSchema = z.object({
  name: z.string().min(2, "Dê um nome à pessoa").max(100),
  type: z.number().int(),
  firstImpression: z.string().max(1000).optional().or(z.literal("")),
  analysis: z.string().max(2000).optional().or(z.literal("")),
  trustLevel: z.number().int(),
  riskLevel: z.number().int(),
  utilityLevel: z.number().int(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  lastContactAt: z.string().optional().or(z.literal("")),
});

type CreateImportantPersonValues = z.infer<typeof createImportantPersonSchema>;

const EVALUATION_BADGE_CLASS: Record<EvaluationLevelValue, string> = {
  [EvaluationLevel.None]: "bg-secondary text-secondary-foreground",
  [EvaluationLevel.Low]: "bg-secondary text-secondary-foreground",
  [EvaluationLevel.Medium]: "bg-primary/15 text-primary",
  [EvaluationLevel.High]: "bg-accent/15 text-accent",
  [EvaluationLevel.Critical]: "bg-destructive/15 text-destructive",
};

export function ImportantPeopleSection({ characterId }: { characterId: string }) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const peopleQuery = useQuery({
    queryKey: ["characters", characterId, "important-people"],
    queryFn: () => ImportantPersonService.getAllByCharacter(characterId),
  });

  const people = peopleQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateImportantPersonValues>({
    resolver: zodResolver(createImportantPersonSchema),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateImportantPersonValues) =>
      ImportantPersonService.create(characterId, {
        name: values.name,
        type: values.type as ImportantPersonTypeValue,
        firstImpression: values.firstImpression || null,
        analysis: values.analysis || null,
        trustLevel: values.trustLevel as EvaluationLevelValue,
        riskLevel: values.riskLevel as EvaluationLevelValue,
        utilityLevel: values.utilityLevel as EvaluationLevelValue,
        notes: values.notes || null,
        lastContactAt: values.lastContactAt ? new Date(values.lastContactAt).toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["characters", characterId, "important-people"],
      });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateImportantPersonValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    reset({
      name: "",
      type: ImportantPersonType.Other,
      firstImpression: "",
      analysis: "",
      trustLevel: EvaluationLevel.None,
      riskLevel: EvaluationLevel.None,
      utilityLevel: EvaluationLevel.None,
      notes: "",
      lastContactAt: "",
    });
    setIsCreating(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button className="shadow-glow" onClick={openCreateForm}>
          <Plus className="size-4" />
          Nova pessoa
        </Button>
      </div>

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Registrar pessoa importante</CardTitle>
            <CardDescription>Contatos, aliados e ameaças relevantes para seu personagem.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar o registro.")}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Ex.: Capitã Vell" {...register("name")} />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select id="type" className="sm:w-56" {...register("type", { valueAsNumber: true })}>
                    {Object.entries(IMPORTANT_PERSON_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="trustLevel">Confiança</Label>
                  <Select id="trustLevel" {...register("trustLevel", { valueAsNumber: true })}>
                    {Object.entries(EVALUATION_LEVEL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskLevel">Risco</Label>
                  <Select id="riskLevel" {...register("riskLevel", { valueAsNumber: true })}>
                    {Object.entries(EVALUATION_LEVEL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="utilityLevel">Utilidade</Label>
                  <Select id="utilityLevel" {...register("utilityLevel", { valueAsNumber: true })}>
                    {Object.entries(EVALUATION_LEVEL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastContactAt">Último contato (opcional)</Label>
                <Input id="lastContactAt" type="date" className="sm:w-40" {...register("lastContactAt")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstImpression">Primeira impressão (opcional)</Label>
                <Textarea
                  id="firstImpression"
                  placeholder="Como foi o primeiro encontro?"
                  {...register("firstImpression")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="analysis">Análise (opcional)</Label>
                <Textarea
                  id="analysis"
                  placeholder="O que você concluiu sobre essa pessoa?"
                  {...register("analysis")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Anotações adicionais"
                  {...register("notes")}
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

      {peopleQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando pessoas...
        </div>
      ) : peopleQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(peopleQuery.error, "Não foi possível carregar as pessoas.")}
        </div>
      ) : people.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhuma pessoa registrada ainda</CardTitle>
            <CardDescription>Registre o primeiro contato do seu personagem.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <ImportantPersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}

function ImportantPersonCard({ person }: { person: ImportantPerson }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{person.name}</CardTitle>
          <span className="bg-secondary text-secondary-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
            {IMPORTANT_PERSON_TYPE_LABELS[person.type]}
          </span>
        </div>
        {person.firstImpression && (
          <CardDescription className="line-clamp-2 whitespace-pre-line">
            {person.firstImpression}
          </CardDescription>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              EVALUATION_BADGE_CLASS[person.trustLevel],
            )}
          >
            Confiança: {EVALUATION_LEVEL_LABELS[person.trustLevel]}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              EVALUATION_BADGE_CLASS[person.riskLevel],
            )}
          >
            Risco: {EVALUATION_LEVEL_LABELS[person.riskLevel]}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              EVALUATION_BADGE_CLASS[person.utilityLevel],
            )}
          >
            Utilidade: {EVALUATION_LEVEL_LABELS[person.utilityLevel]}
          </span>
        </div>
      </CardHeader>
      {person.lastContactAt && (
        <CardFooter className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CalendarDays className="size-3.5" />
          Último contato: {formatDateOnly(person.lastContactAt)}
        </CardFooter>
      )}
    </Card>
  );
}
