import { useState } from "react";
import { Compass, Loader2, Plus, TriangleAlert } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DossierEntry } from "@/components/dossier/dossier-entry";
import { PlayerNoteService, type PlayerNote } from "@/services/player-note-service";
import { SessionService } from "@/services/session-service";
import { extractErrorMessage } from "@/utils/api-error";
import { formatDateOnly } from "@/utils/date";
import { zodResolver } from "@/utils/form";

const createPlayerNoteSchema = z.object({
  title: z.string().min(2, "Dê um título à nota").max(200),
  content: z.string().min(1, "Escreva o conteúdo da nota").max(5000),
  sessionId: z.string().optional().or(z.literal("")),
});

type CreatePlayerNoteValues = z.infer<typeof createPlayerNoteSchema>;

export function PlayerNotesSection({
  characterId,
  campaignId,
}: {
  characterId: string;
  campaignId: string;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ["characters", characterId, "notes"],
    queryFn: () => PlayerNoteService.getAllByCharacter(characterId),
  });

  const sessionsQuery = useQuery({
    queryKey: ["campaigns", campaignId, "sessions"],
    queryFn: () => SessionService.getAllByCampaign(campaignId),
  });

  const notes = notesQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePlayerNoteValues>({ resolver: zodResolver(createPlayerNoteSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreatePlayerNoteValues) =>
      PlayerNoteService.create(characterId, {
        title: values.title,
        content: values.content,
        sessionId: values.sessionId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId, "notes"] });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreatePlayerNoteValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    reset({ title: "", content: "", sessionId: "" });
    setIsCreating(true);
  };

  const sessionLabel = (sessionId: string | null) => {
    if (!sessionId) return null;
    const session = sessions.find((s) => s.id === sessionId);
    return session ? `#${session.number} — ${session.title}` : null;
  };

  const effectiveDate = (note: PlayerNote) => {
    const session = note.sessionId ? sessions.find((s) => s.id === note.sessionId) : undefined;
    return session ? session.date : note.createdAt;
  };

  const displayDate = (note: PlayerNote) => {
    const session = note.sessionId ? sessions.find((s) => s.id === note.sessionId) : undefined;
    return session
      ? formatDateOnly(session.date)
      : new Date(note.createdAt).toLocaleDateString("pt-BR");
  };

  const diaryEntries = [...notes].sort(
    (a, b) => new Date(effectiveDate(a)).getTime() - new Date(effectiveDate(b)).getTime(),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button className="shadow-glow" onClick={openCreateForm}>
          <Plus className="size-4" />
          Nova nota
        </Button>
      </div>

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Escrever nota</CardTitle>
            <CardDescription>Suas anotações privadas dessa campanha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar a nota.")}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" placeholder="Ex.: Suspeitas sobre o mercador" {...register("title")} />
                  {errors.title && (
                    <p className="text-destructive text-sm">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionId">Sessão (opcional)</Label>
                  <Select id="sessionId" className="sm:w-56" {...register("sessionId")}>
                    <option value="">Nenhuma</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        #{session.number} — {session.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo</Label>
                <Textarea
                  id="content"
                  placeholder="O que você quer registrar?"
                  {...register("content")}
                />
                {errors.content && (
                  <p className="text-destructive text-sm">{errors.content.message}</p>
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
                  Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {notesQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando notas...
        </div>
      ) : notesQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(notesQuery.error, "Não foi possível carregar as notas.")}
        </div>
      ) : notes.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhuma nota ainda</CardTitle>
            <CardDescription>Registre a primeira anotação do seu personagem.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {diaryEntries.map((note, index) => (
            <DossierEntry
              key={note.id}
              title={note.title}
              defaultOpen={index === 0}
              badge={
                sessionLabel(note.sessionId) ? (
                  <span className="border-border/60 dossier-meta border px-2 py-0.5 text-[11px]">
                    {sessionLabel(note.sessionId)}
                  </span>
                ) : undefined
              }
              meta={displayDate(note)}
            >
              <p className="whitespace-pre-line text-sm">{note.content}</p>
            </DossierEntry>
          ))}
        </div>
      )}
    </div>
  );
}
