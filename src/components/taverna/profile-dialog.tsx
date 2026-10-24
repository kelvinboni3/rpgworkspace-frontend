import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TavernaDialog } from "@/components/taverna/taverna-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommunityService, communityKeys, type CommunityMe } from "@/services/community-service";
import { extractErrorMessage } from "@/utils/api-error";

type ProfileDialogProps = {
  me: CommunityMe;
  onClose: () => void;
};

export function ProfileDialog({ me, onClose }: ProfileDialogProps) {
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState(me.nickname ?? "");

  const mutation = useMutation({
    mutationFn: () => CommunityService.updateMe(nickname.trim() || null),
    onSuccess: (updated) => {
      queryClient.setQueryData(communityKeys.me, updated);
      void queryClient.invalidateQueries({ queryKey: communityKeys.members });
      onClose();
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <TavernaDialog title="Seu perfil na Taverna" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="taverna-nickname">Apelido</Label>
          <Input
            id="taverna-nickname"
            value={nickname}
            maxLength={50}
            placeholder={me.name}
            onChange={(event) => setNickname(event.target.value)}
            autoFocus
          />
          <p className="text-muted-foreground text-xs">
            Como o grupo te vê aqui. Em branco, usa o nome da sua conta ({me.name}).
          </p>
        </div>
        {mutation.error && <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </TavernaDialog>
  );
}
