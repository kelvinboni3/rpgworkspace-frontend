import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { paths } from "@/routes/paths";
import { AuthService } from "@/services/auth-service";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const resetPasswordMutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      AuthService.resetPassword({ token: token!, newPassword: values.newPassword }),
  });

  const onSubmit: SubmitHandler<ResetPasswordFormValues> = (values) => {
    resetPasswordMutation.mutate(values);
  };

  if (!token) {
    return (
      <AuthShell title="Redefinir senha" description="Link de recuperação inválido.">
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>Esse link está incompleto. Peça um novo link de recuperação.</span>
        </div>
        <p className="text-muted-foreground mt-6 text-center text-sm">
          <Link to={paths.forgotPassword} className="text-primary font-medium hover:underline">
            Pedir novo link
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Redefinir senha" description="Escolha uma nova senha para sua conta.">
      {resetPasswordMutation.isSuccess ? (
        <>
          <div className="border-primary/30 bg-primary/5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <CircleCheck className="text-primary mt-0.5 size-4 shrink-0" />
            <span>Senha redefinida com sucesso.</span>
          </div>
          <p className="text-muted-foreground mt-6 text-center text-sm">
            <Link to={paths.login} className="text-primary font-medium hover:underline">
              Entrar agora
            </Link>
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {resetPasswordMutation.isError && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {extractErrorMessage(resetPasswordMutation.error, "Não foi possível redefinir a senha.", {
                  "This reset link is invalid or has expired.":
                    "Esse link de recuperação é inválido ou expirou. Peça um novo.",
                })}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova senha</Label>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-destructive text-sm">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="shadow-glow w-full"
            disabled={resetPasswordMutation.isPending}
          >
            {resetPasswordMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Redefinindo...
              </>
            ) : (
              "Redefinir senha"
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
