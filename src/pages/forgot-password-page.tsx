import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paths } from "@/routes/paths";
import { AuthService } from "@/services/auth-service";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const forgotPasswordSchema = z.object({
  email: z.email("Informe um e-mail válido"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const forgotPasswordMutation = useMutation({
    mutationFn: AuthService.forgotPassword,
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormValues> = (values) => {
    forgotPasswordMutation.mutate(values);
  };

  return (
    <AuthShell
      title="Esqueci minha senha"
      description="Informe seu e-mail e enviaremos um link para redefinir sua senha."
    >
      {forgotPasswordMutation.isSuccess ? (
        <div className="border-primary/30 bg-primary/5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
          <CircleCheck className="text-primary mt-0.5 size-4 shrink-0" />
          <span>Se esse e-mail estiver cadastrado, você receberá um link de recuperação em instantes.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {forgotPasswordMutation.isError && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {extractErrorMessage(forgotPasswordMutation.error, "Não foi possível enviar o e-mail.")}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              {...register("email")}
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <Button
            type="submit"
            size="lg"
            className="shadow-glow w-full"
            disabled={forgotPasswordMutation.isPending}
          >
            {forgotPasswordMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar link de recuperação"
            )}
          </Button>
        </form>
      )}

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Lembrou a senha?{" "}
        <Link to={paths.login} className="text-primary font-medium hover:underline">
          Voltar ao login
        </Link>
      </p>
    </AuthShell>
  );
}
