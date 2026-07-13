import { useState } from "react";
import { isAxiosError } from "axios";
import { Archive, CalendarDays, Compass, Loader2, Plus, TriangleAlert, UserRound } from "lucide-react";
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
import {
  CHARACTER_STATUS_LABELS,
  CharacterStatus,
  CharacterService,
  type Character,
} from "@/services/character-service";
import { SubscriptionService } from "@/services/subscription-service";
import { authStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const createSoloCharacterSchema = z.object({
  name: z.string().min(2, "Dê um nome ao personagem").max(100),
  race: z.string().max(100).optional().or(z.literal("")),
  class: z.string().max(100).optional().or(z.literal("")),
  level: z.number().int().min(1).max(100),
});

type CreateSoloCharacterValues = z.infer<typeof createSoloCharacterSchema>;

const FREE_SOLO_CHARACTER_LIMIT = 1;

export function MyCharactersPage() {
  const user = authStore.getUser();
  const firstName = user?.name?.split(" ")[0] ?? "aventureiro";
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const charactersQuery = useQuery({
    queryKey: ["characters", "mine"],
    queryFn: CharacterService.getMine,
  });

  const subscriptionQuery = useQuery({
    queryKey: ["subscriptions", "me"],
    queryFn: SubscriptionService.getMine,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSoloCharacterValues>({
    resolver: zodResolver(createSoloCharacterSchema),
    defaultValues: { level: 1 },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateSoloCharacterValues) =>
      CharacterService.createSolo({
        name: values.name,
        race: values.race || null,
        class: values.class || null,
        level: values.level,
        status: CharacterStatus.Active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions", "me"] });
      reset({ level: 1 });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateSoloCharacterValues> = (values) => {
    createMutation.mutate(values);
  };

  const characters = charactersQuery.data ?? [];
  const activeCharacters = characters.filter((c) => c.status !== CharacterStatus.Retired);
  const archivedCharacters = characters.filter((c) => c.status === CharacterStatus.Retired);
  const soloCharacterCount = characters.filter((c) => c.campaignId === null).length;
  const hasReachedFreeLimit =
    !subscriptionQuery.data?.isActive && soloCharacterCount >= FREE_SOLO_CHARACTER_LIMIT;

  const isSubscriptionRequired =
    isAxiosError(createMutation.error) && createMutation.error.response?.status === 402;

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold">Bem-vindo, {firstName}</h1>
          <p className="text-muted-foreground">Seus personagens.</p>
        </div>
        <Button className="shadow-glow" onClick={() => setIsCreating((current) => !current)}>
          <Plus className="size-4" />
          Novo personagem
        </Button>
      </div>

      {!isCreating && hasReachedFreeLimit && (
        <div className="border-primary/30 bg-primary/5 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
          <span>
            Você já usou seu personagem solo grátis. Assine para criar personagens ilimitados.
          </span>
          <Button asChild size="sm" variant="outline">
            <Link to={paths.subscription}>Assinar</Link>
          </Button>
        </div>
      )}

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Criar personagem</CardTitle>
            <CardDescription>Um personagem seu, sem precisar de mestre ou campanha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm">
                  <span className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    {isSubscriptionRequired
                      ? "Você já usou seu personagem solo grátis. Assine para criar mais."
                      : extractErrorMessage(
                          createMutation.error,
                          "Não foi possível criar o personagem.",
                        )}
                  </span>
                  {isSubscriptionRequired && (
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link to={paths.subscription}>Assinar</Link>
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" placeholder="Ex.: Aeryn Duskwalker" {...register("name")} />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="race">Raça (opcional)</Label>
                  <Input id="race" placeholder="Ex.: Elfo" {...register("race")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Classe (opcional)</Label>
                  <Input id="class" placeholder="Ex.: Ladino" {...register("class")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Nível</Label>
                  <Input
                    id="level"
                    type="number"
                    min={1}
                    max={100}
                    {...register("level", { valueAsNumber: true })}
                  />
                  {errors.level && (
                    <p className="text-destructive text-sm">{errors.level.message}</p>
                  )}
                </div>
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

      {charactersQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando personagens...
        </div>
      ) : charactersQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(charactersQuery.error, "Não foi possível carregar seus personagens.")}
        </div>
      ) : characters.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhum personagem por aqui ainda</CardTitle>
            <CardDescription>Crie o primeiro pra começar sua jornada.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeCharacters.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>

          {archivedCharacters.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-muted-foreground flex items-center gap-1.5 text-sm font-semibold">
                <Archive className="size-4" />
                Arquivo
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archivedCharacters.map((character) => (
                  <CharacterCard key={character.id} character={character} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CharacterCard({ character }: { character: Character }) {
  const isSolo = character.campaignId === null;

  return (
    <Link to={paths.character(character.id)} className="block">
      <Card className="glass-panel hover:border-primary/40 h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 flex items-center gap-2">
              <UserRound className="text-muted-foreground size-4 shrink-0" />
              {character.name}
            </CardTitle>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                isSolo ? "bg-accent/15 text-accent" : "bg-secondary text-secondary-foreground",
              )}
            >
              {isSolo ? "Solo" : "Campanha"}
            </span>
          </div>
          <CardDescription className="line-clamp-2">
            {[`Nível ${character.level}`, character.race, character.class]
              .filter(Boolean)
              .join(" · ")}
            {" · "}
            {CHARACTER_STATUS_LABELS[character.status]}
          </CardDescription>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">
          <CalendarDays className="mr-1.5 size-3.5" />
          Criado em {new Date(character.createdAt).toLocaleDateString("pt-BR")}
        </CardFooter>
      </Card>
    </Link>
  );
}
