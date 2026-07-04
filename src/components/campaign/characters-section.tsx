import { useState } from "react";
import { Compass, Loader2, Plus, TriangleAlert, User } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { paths } from "@/routes/paths";
import {
  CHARACTER_STATUS_LABELS,
  CharacterService,
  CharacterStatus,
  type Character,
  type CharacterStatusValue,
} from "@/services/character-service";
import type { WorkspaceMember } from "@/services/workspace-member-service";
import { cn } from "@/utils/cn";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const createCharacterSchema = z.object({
  name: z.string().min(2, "Dê um nome ao personagem").max(100),
  race: z.string().max(100).optional().or(z.literal("")),
  class: z.string().max(100).optional().or(z.literal("")),
  level: z.number().int().min(1).max(100),
  status: z.number().int(),
  description: z.string().max(500).optional().or(z.literal("")),
});

type CreateCharacterValues = z.infer<typeof createCharacterSchema>;

const STATUS_BADGE_CLASS: Record<CharacterStatusValue, string> = {
  [CharacterStatus.Active]: "bg-primary/15 text-primary",
  [CharacterStatus.Inactive]: "bg-secondary text-secondary-foreground",
  [CharacterStatus.Dead]: "bg-destructive/15 text-destructive",
  [CharacterStatus.Retired]: "bg-accent/15 text-accent",
};

export function CharactersSection({
  campaignId,
  currentUserId,
  members,
  isOwnerOrMaster,
}: {
  campaignId: string;
  currentUserId?: string;
  members: WorkspaceMember[];
  isOwnerOrMaster: boolean;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const charactersQuery = useQuery({
    queryKey: ["campaigns", campaignId, "characters"],
    queryFn: () => CharacterService.getAllByCampaign(campaignId),
  });

  const characters = charactersQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCharacterValues>({ resolver: zodResolver(createCharacterSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreateCharacterValues) =>
      CharacterService.create(campaignId, {
        userId: currentUserId!,
        name: values.name,
        race: values.race || null,
        class: values.class || null,
        level: values.level,
        status: values.status as CharacterStatusValue,
        description: values.description || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "characters"] });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateCharacterValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    reset({
      name: "",
      race: "",
      class: "",
      level: 1,
      status: CharacterStatus.Active,
      description: "",
    });
    setIsCreating(true);
  };

  const userName = (userId: string) =>
    members.find((member) => member.userId === userId)?.userName ?? "Jogador";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button className="shadow-glow" onClick={openCreateForm} disabled={!currentUserId}>
          <Plus className="size-4" />
          Novo personagem
        </Button>
      </div>

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Criar personagem</CardTitle>
            <CardDescription>Sua ficha nessa campanha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar o personagem.")}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" placeholder="Ex.: Lyra Ventoescuro" {...register("name")} />
                {errors.name && (
                  <p className="text-destructive text-sm">{errors.name.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="race">Raça (opcional)</Label>
                  <Input id="race" placeholder="Ex.: Elfo" {...register("race")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Classe (opcional)</Label>
                  <Input id="class" placeholder="Ex.: Ladina" {...register("class")} />
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" {...register("status", { valueAsNumber: true })}>
                    {Object.entries(CHARACTER_STATUS_LABELS).map(([value, label]) => (
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
                  placeholder="Um breve histórico do personagem"
                  {...register("description")}
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
          {extractErrorMessage(charactersQuery.error, "Não foi possível carregar os personagens.")}
        </div>
      ) : characters.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhum personagem ainda</CardTitle>
            <CardDescription>Crie o seu pra começar a jogar nessa campanha.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              playerName={userName(character.userId)}
              isOwnCharacter={character.userId === currentUserId}
              canOpen={isOwnerOrMaster || character.userId === currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterCard({
  character,
  playerName,
  isOwnCharacter,
  canOpen,
}: {
  character: Character;
  playerName: string;
  isOwnCharacter: boolean;
  canOpen: boolean;
}) {
  const subtitle = [character.race, character.class].filter(Boolean).join(" · ");

  const card = (
    <Card className={cn("glass-panel", canOpen && "hover:border-primary/40 transition-colors")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{character.name}</CardTitle>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_BADGE_CLASS[character.status],
            )}
          >
            {CHARACTER_STATUS_LABELS[character.status]}
          </span>
        </div>
        <CardDescription className="line-clamp-2">
          {subtitle ? `Nível ${character.level} · ${subtitle}` : `Nível ${character.level}`}
        </CardDescription>
      </CardHeader>
      <CardFooter className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <User className="size-3.5" />
        {isOwnCharacter ? "Seu personagem" : playerName}
      </CardFooter>
    </Card>
  );

  return canOpen ? (
    <Link to={paths.character(character.id)} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
