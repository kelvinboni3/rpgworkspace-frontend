import { isAxiosError } from "axios";
import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionService } from "@/services/subscription-service";
import { extractErrorMessage } from "@/utils/api-error";

export function SubscriptionPage() {
  const subscriptionQuery = useQuery({
    queryKey: ["subscriptions", "me"],
    queryFn: SubscriptionService.getMine,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => SubscriptionService.startCheckout({ plan: "monthly" }),
    onSuccess: (session) => {
      window.location.assign(session.checkoutUrl);
    },
  });

  const isGatewayNotConfigured =
    isAxiosError(checkoutMutation.error) && checkoutMutation.error.response?.status === 501;

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col items-center justify-center gap-6 py-16">
      <Card className="glass-panel glow-ring w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CardTitle>Assinatura</CardTitle>
          <CardDescription>Personagens solo ilimitados, sem depender de mestre.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionQuery.isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Carregando status...
            </div>
          ) : subscriptionQuery.data?.isActive ? (
            <div className="border-primary/30 bg-primary/5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
              <CircleCheck className="text-primary size-4 shrink-0" />
              Assinatura ativa. Personagens ilimitados liberados.
            </div>
          ) : (
            <div className="text-muted-foreground rounded-lg border px-4 py-3 text-center text-sm">
              Você está no plano grátis (1 personagem solo). Assine para criar quantos quiser.
            </div>
          )}

          {checkoutMutation.isError && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {isGatewayNotConfigured
                ? "Pagamentos ainda não configurados. Volte em breve."
                : extractErrorMessage(checkoutMutation.error, "Não foi possível iniciar o checkout.")}
            </div>
          )}

          {!subscriptionQuery.data?.isActive && (
            <Button
              className="shadow-glow w-full"
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Assinar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
