import { isAxiosError } from "axios";
import { CircleCheck, Clock, Loader2, TriangleAlert } from "lucide-react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SubscriptionService,
  SubscriptionStatus,
  trialDaysLeft,
} from "@/services/subscription-service";
import { extractErrorMessage } from "@/utils/api-error";

export function SubscriptionPage() {
  const [searchParams] = useSearchParams();
  const checkoutResult = searchParams.get("checkout");

  const subscriptionQuery = useQuery({
    queryKey: ["subscriptions", "me"],
    queryFn: SubscriptionService.getMine,
    // Voltando do Stripe, o webhook pode levar alguns segundos — refaz a consulta até ativar.
    refetchInterval: (query) =>
      checkoutResult === "success" && !query.state.data?.isActive ? 3000 : false,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => SubscriptionService.startCheckout({ plan: "monthly" }),
    onSuccess: (session) => {
      window.location.assign(session.checkoutUrl);
    },
  });

  const isGatewayNotConfigured =
    isAxiosError(checkoutMutation.error) && checkoutMutation.error.response?.status === 501;

  const subscription = subscriptionQuery.data;
  const daysLeft = trialDaysLeft(subscription);
  const isPaidOrGranted =
    subscription?.isActive &&
    (subscription.status === SubscriptionStatus.Active || subscription.manualOverride);
  const isTrialing = subscription?.isActive && !isPaidOrGranted;
  const isExpired = subscription != null && !subscription.isActive;

  const waitingActivation = checkoutResult === "success" && !subscription?.isActive;

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col items-center justify-center gap-6 py-16">
      <Card className="glass-panel glow-ring w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CardTitle>Assinatura</CardTitle>
          <CardDescription>
            R$ 14,90/mês · personagens ilimitados, IA e diário completo. Cancele quando quiser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkoutResult === "canceled" && (
            <div className="text-muted-foreground rounded-lg border px-4 py-3 text-center text-sm">
              Checkout cancelado. Nada foi cobrado.
            </div>
          )}

          {waitingActivation && (
            <div className="border-primary/30 bg-primary/5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
              <Loader2 className="text-primary size-4 shrink-0 animate-spin" />
              Pagamento confirmado! Ativando sua assinatura...
            </div>
          )}

          {subscriptionQuery.isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Carregando status...
            </div>
          ) : isPaidOrGranted ? (
            <div className="border-primary/30 bg-primary/5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
              <CircleCheck className="text-primary size-4 shrink-0" />
              Assinatura ativa. Personagens ilimitados liberados.
            </div>
          ) : isTrialing ? (
            <div className="border-primary/30 bg-primary/5 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
              <Clock className="text-primary mt-0.5 size-4 shrink-0" />
              <span>
                {daysLeft === 1
                  ? "Último dia do seu período de teste."
                  : `Período de teste: faltam ${daysLeft ?? "-"} dias.`}{" "}
                Os recursos de IA (estruturar anotações, recap, retrospectiva) são exclusivos da
                assinatura.
              </span>
            </div>
          ) : isExpired ? (
            <div className="border-destructive/30 bg-destructive/10 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
              <TriangleAlert className="text-destructive size-4 shrink-0" />
              Seu período de teste terminou. Assine para continuar criando e editando personagens.
            </div>
          ) : null}

          {checkoutMutation.isError && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {isGatewayNotConfigured
                ? "Pagamentos ainda não configurados. Volte em breve."
                : extractErrorMessage(checkoutMutation.error, "Não foi possível iniciar o checkout.")}
            </div>
          )}

          {!isPaidOrGranted && !waitingActivation && (
            <Button
              className="shadow-glow w-full"
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Assinar por R$ 14,90/mês
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
