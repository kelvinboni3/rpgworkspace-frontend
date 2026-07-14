import { Loader2, TriangleAlert } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { paths } from "@/routes/paths";
import { AuthService } from "@/services/auth-service";
import { authStore } from "@/store/auth-store";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const explicitRedirect = (location.state as { from?: { pathname: string } } | null)?.from
    ?.pathname;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const loginMutation = useMutation({
    mutationFn: AuthService.login,
    onSuccess: (data) => {
      authStore.setSession(data.accessToken, {
        id: data.userId,
        name: data.name,
        email: data.email,
        defaultCharacterId: data.defaultCharacterId,
      });
      const redirectTo =
        explicitRedirect ??
        (data.defaultCharacterId ? paths.character(data.defaultCharacterId) : paths.characters);
      navigate(redirectTo, { replace: true });
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = (values) => {
    loginMutation.mutate(values);
  };

  return (
    <AuthShell
      title="Bem-vindo de volta"
      description="Entre para continuar sua campanha."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {loginMutation.isError && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {extractErrorMessage(loginMutation.error, "E-mail ou senha inválidos.", {
                "Invalid credentials.": "E-mail ou senha inválidos.",
              })}
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
          {errors.email && (
            <p className="text-destructive text-sm">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              to={paths.forgotPassword}
              className="text-muted-foreground hover:text-primary text-xs transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-destructive text-sm">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="shadow-glow w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Ainda não tem uma conta?{" "}
        <Link to={paths.register} className="text-primary font-medium hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}
