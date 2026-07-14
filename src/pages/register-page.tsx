import { Loader2, TriangleAlert } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router";
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

const registerSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome"),
    email: z.email("Informe um e-mail válido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      AuthService.register({
        name: values.name,
        email: values.email,
        password: values.password,
      }),
    onSuccess: (data) => {
      authStore.setSession(data.accessToken, {
        id: data.userId,
        name: data.name,
        email: data.email,
        defaultCharacterId: data.defaultCharacterId,
      });
      navigate(paths.characters, { replace: true });
    },
  });

  const onSubmit: SubmitHandler<RegisterFormValues> = (values) => {
    registerMutation.mutate(values);
  };

  return (
    <AuthShell
      title="Crie sua conta"
      description="Monte seu workspace e comece a organizar sua campanha."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {registerMutation.isError && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {extractErrorMessage(registerMutation.error, "Não foi possível criar sua conta.", {
                "E-mail already in use.": "Este e-mail já está em uso.",
              })}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Como podemos te chamar"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-destructive text-sm">{errors.name.message}</p>
          )}
        </div>

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
          <Label htmlFor="password">Senha</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-destructive text-sm">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
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
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Já tem uma conta?{" "}
        <Link to={paths.login} className="text-primary font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
