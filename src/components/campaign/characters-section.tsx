import { useState } from "react";
import {
  Compass,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  User,
} from "lucide-react";
import { useForm, type FieldErrors, type SubmitHandler, type UseFormRegister } from "react-hook-form";
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
import { PasswordInput } from "@/components/ui/password-input";
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

const characterFieldsSchema = z.object({
  name: z.string().min(2, "Dê um nome ao personagem").max(100),
  race: z.string().max(100).optional().or(z.literal("")),
  class: z.string().max(100).optional().or(z.literal("")),
  level: z.number().int().min(1).max(100),
  status: z.number().int(),
  description: z.string().max(500).optional().or(z.literal("")),
});

type CharacterFieldsValues = z.infer<typeof characterFieldsSchema>;

const createCharacterWithAccountSchema = z.object({
  playerName: z.string().min(2, "Informe o nome do jogador").max(100),
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  characterName: z.string().min(2, "Dê um nome ao personagem").max(100),
  race: z.string().max(100).optional().or(z.literal("")),
  class: z.string().max(100).optional().or(z.literal("")),
  level: z.number().int().min(1).max(100),
  status: z.number().int(),
  description: z.string().max(500).optional().or(z.literal("")),
});

type CreateCharacterWithAccountValues = z.infer<typeof createCharacterWithAccountSchema>;

const STATUS_BADGE_CLASS: Record<CharacterStatusValue, string> = {
  [CharacterStatus.Active]: "bg-primary/15 text-primary",
  [CharacterStatus.Inactive]: "bg-secondary text-secondary-foreground",
  [CharacterStatus.Dead]: "bg-destructive/15 text-destructive",
  [CharacterStatus.Retired]: "bg-accent/15 text-accent",
};

function CharacterFieldsFragment({
  register,
  errors,
}: {
  register: UseFormRegister<CharacterFieldsValues>;
  errors: FieldErrors<CharacterFieldsValues>;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" placeholder="Ex.: Lyra Ventoescuro" {...register("name")} />
        {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
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
    </>
  );
}

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
  const [isCreatingWithAccount, setIsCreatingWithAccount] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const charactersQuery = useQuery({
    queryKey: ["campaigns", campaignId, "characters"],
    queryFn: () => CharacterService.getAllByCampaign(campaignId),
  });

  const characters = charactersQuery.data ?? [];

  const invalidateCharacters = () =>
    queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "characters"] });

  const closeAllForms = () => {
    setIsCreating(false);
    setIsCreatingWithAccount(false);
    setEditingCharacterId(null);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CharacterFieldsValues>({ resolver: zodResolver(characterFieldsSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CharacterFieldsValues) =>
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
      invalidateCharacters();
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CharacterFieldsValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    closeAllForms();
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

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<CharacterFieldsValues>({ resolver: zodResolver(characterFieldsSchema) });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CharacterFieldsValues }) =>
      CharacterService.update(id, {
        name: values.name,
        race: values.race || null,
        class: values.class || null,
        level: values.level,
        status: values.status as CharacterStatusValue,
        description: values.description || null,
      }),
    onSuccess: () => {
      invalidateCharacters();
      setEditingCharacterId(null);
    },
  });

  const onSubmitEdit: SubmitHandler<CharacterFieldsValues> = (values) => {
    if (editingCharacterId) updateMutation.mutate({ id: editingCharacterId, values });
  };

  const openEditForm = (character: Character) => {
    closeAllForms();
    resetEditForm({
      name: character.name,
      race: character.race ?? "",
      class: character.class ?? "",
      level: character.level,
      status: character.status,
      description: character.description ?? "",
    });
    setEditingCharacterId(character.id);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CharacterService.remove(id),
    onSuccess: () => invalidateCharacters(),
  });

  const handleDeleteCharacter = (character: Character) => {
    if (
      window.confirm(
        `Excluir o personagem "${character.name}"? Essa ação não pode ser desfeita e apaga todo o diário dele.`,
      )
    ) {
      deleteMutation.mutate(character.id);
    }
  };

  const {
    register: registerWithAccount,
    handleSubmit: handleSubmitWithAccount,
    reset: resetWithAccountForm,
    formState: { errors: withAccountErrors },
  } = useForm<CreateCharacterWithAccountValues>({
    resolver: zodResolver(createCharacterWithAccountSchema),
  });

  const createWithAccountMutation = useMutation({
    mutationFn: (values: CreateCharacterWithAccountValues) =>
      CharacterService.createWithAccount(campaignId, {
        playerName: values.playerName,
        email: values.email,
        password: values.password,
        characterName: values.characterName,
        race: values.race || null,
        class: values.class || null,
        level: values.level,
        status: values.status as CharacterStatusValue,
        description: values.description || null,
      }),
    onSuccess: () => {
      invalidateCharacters();
      setIsCreatingWithAccount(false);
    },
  });

  const onSubmitWithAccount: SubmitHandler<CreateCharacterWithAccountValues> = (values) => {
    createWithAccountMutation.mutate(values);
  };

  const openCreateWithAccountForm = () => {
    closeAllForms();
    resetWithAccountForm({
      playerName: "",
      email: "",
      password: "",
      characterName: "",
      race: "",
      class: "",
      level: 1,
      status: CharacterStatus.Active,
      description: "",
    });
    setIsCreatingWithAccount(true);
  };

  const userName = (userId: string) =>
    members.find((member) => member.userId === userId)?.userName ?? "Jogador";

  return (
    <div className="flex flex-col gap-6">
      {isOwnerOrMaster && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={openCreateWithAccountForm}>
            <KeyRound className="size-4" />
            Criar personagem para jogador
          </Button>
          <Button className="shadow-glow" onClick={openCreateForm}>
            <Plus className="size-4" />
            Novo personagem
          </Button>
        </div>
      )}

      {isCreatingWithAccount && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Criar personagem e login pro jogador</CardTitle>
            <CardDescription>
              Cria uma conta nova já vinculada a este personagem. Compartilhe o e-mail e a senha
              com o jogador — ao entrar, ele cai direto na ficha do personagem.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitWithAccount(onSubmitWithAccount)} noValidate className="space-y-4">
              {createWithAccountMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createWithAccountMutation.error, "Não foi possível criar o personagem.", {
                      "E-mail already in use.": "Esse e-mail já está em uso.",
                    })}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="playerName">Nome do jogador</Label>
                  <Input
                    id="playerName"
                    placeholder="Ex.: Ana Souza"
                    {...registerWithAccount("playerName")}
                  />
                  {withAccountErrors.playerName && (
                    <p className="text-destructive text-sm">{withAccountErrors.playerName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-email">E-mail de acesso</Label>
                  <Input
                    id="account-email"
                    type="email"
                    placeholder="jogador@exemplo.com"
                    {...registerWithAccount("email")}
                  />
                  {withAccountErrors.email && (
                    <p className="text-destructive text-sm">{withAccountErrors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-password">Senha</Label>
                  <PasswordInput
                    id="account-password"
                    placeholder="••••••••"
                    {...registerWithAccount("password")}
                  />
                  {withAccountErrors.password && (
                    <p className="text-destructive text-sm">{withAccountErrors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="border-border/60 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="characterName">Nome do personagem</Label>
                  <Input
                    id="characterName"
                    placeholder="Ex.: Lyra Ventoescuro"
                    {...registerWithAccount("characterName")}
                  />
                  {withAccountErrors.characterName && (
                    <p className="text-destructive text-sm">{withAccountErrors.characterName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="wa-race">Raça (opcional)</Label>
                  <Input id="wa-race" placeholder="Ex.: Elfo" {...registerWithAccount("race")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wa-class">Classe (opcional)</Label>
                  <Input id="wa-class" placeholder="Ex.: Ladina" {...registerWithAccount("class")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wa-level">Nível</Label>
                  <Input
                    id="wa-level"
                    type="number"
                    min={1}
                    max={100}
                    {...registerWithAccount("level", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wa-status">Status</Label>
                  <Select id="wa-status" {...registerWithAccount("status", { valueAsNumber: true })}>
                    {Object.entries(CHARACTER_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-description">Descrição (opcional)</Label>
                <Input
                  id="wa-description"
                  placeholder="Um breve histórico do personagem"
                  {...registerWithAccount("description")}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreatingWithAccount(false)}
                  disabled={createWithAccountMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createWithAccountMutation.isPending}>
                  {createWithAccountMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Criar personagem e login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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

              <CharacterFieldsFragment register={register} errors={errors} />

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

      {editingCharacterId && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Editar personagem</CardTitle>
            <CardDescription>Ajuste os dados iniciais desse personagem.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitEdit(onSubmitEdit)} noValidate className="space-y-4">
              {updateMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(updateMutation.error, "Não foi possível salvar o personagem.")}
                  </span>
                </div>
              )}

              <CharacterFieldsFragment register={registerEdit} errors={editErrors} />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingCharacterId(null)}
                  disabled={updateMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Salvar
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
            <CardDescription>
              {isOwnerOrMaster
                ? "Crie o primeiro personagem pra começar a jogar nessa campanha."
                : "Peça pro mestre criar seu personagem nessa campanha."}
            </CardDescription>
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
              canManage={isOwnerOrMaster || character.userId === currentUserId}
              onEdit={() => openEditForm(character)}
              onDelete={() => handleDeleteCharacter(character)}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === character.id}
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
  canManage,
  onEdit,
  onDelete,
  isDeleting,
}: {
  character: Character;
  playerName: string;
  isOwnCharacter: boolean;
  canOpen: boolean;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const subtitle = [character.race, character.class].filter(Boolean).join(" · ");

  const card = (
    <Card className={cn("glass-panel h-full", canOpen && "hover:border-primary/40 transition-colors")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 pr-14">
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

  return (
    <div className="relative">
      {canOpen ? (
        <Link to={paths.character(character.id)} className="block h-full">
          {card}
        </Link>
      ) : (
        card
      )}

      {canManage && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            title="Editar personagem"
            aria-label="Editar personagem"
            className="bg-background/70 text-muted-foreground hover:text-foreground rounded-md p-1.5 backdrop-blur-sm transition-colors"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            title="Excluir personagem"
            aria-label="Excluir personagem"
            className="bg-background/70 text-muted-foreground hover:text-destructive rounded-md p-1.5 backdrop-blur-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
