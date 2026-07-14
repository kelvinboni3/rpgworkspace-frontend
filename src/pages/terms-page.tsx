import { LegalPageShell, LegalSection } from "@/components/legal-page-shell";

const CONTACT_EMAIL = "kelvin.bonifacio2014@gmail.com";

export function TermsPage() {
  return (
    <LegalPageShell title="Termos de Uso" updatedAt="14 de julho de 2026">
      <LegalSection title="1. Sobre o serviço">
        <p>
          O Aventurário é uma plataforma web para jogadores de RPG de mesa registrarem a
          história, as anotações e a jornada dos seus personagens, com recursos de
          organização em abas e blocos, inteligência artificial, ditado por voz,
          funcionamento offline, compartilhamento por link público e exportação de dados.
        </p>
        <p>
          Ao criar uma conta ou usar o Aventurário, você concorda com estes Termos de Uso
          e com a nossa Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection title="2. Conta">
        <p>
          Para usar o Aventurário você precisa criar uma conta com informações verdadeiras
          e manter a confidencialidade da sua senha. Você é responsável pela atividade
          realizada na sua conta.
        </p>
        <p>
          O serviço não é direcionado a menores de 13 anos. Se você tem menos de 18 anos,
          a contratação da assinatura paga deve ser feita com o consentimento de um
          responsável legal.
        </p>
      </LegalSection>

      <LegalSection title="3. Assinatura, teste grátis e pagamento">
        <p>
          O Aventurário oferece um período de teste grátis de 7 dias, sem necessidade de
          cartão de crédito. Após o teste, a continuidade do uso completo (criação e
          edição de personagens, recursos de IA) exige a assinatura mensal, atualmente de
          R$ 14,90 por mês.
        </p>
        <p>
          Os pagamentos são processados pela Stripe, e nós não armazenamos os dados do seu
          cartão. Você pode cancelar a assinatura a qualquer momento; o acesso permanece
          ativo até o fim do período já pago, sem cobranças seguintes.
        </p>
        <p>
          O preço da assinatura pode ser ajustado no futuro. Assinantes ativos serão
          avisados com antecedência antes de qualquer mudança de valor.
        </p>
      </LegalSection>

      <LegalSection title="4. Seu conteúdo">
        <p>
          Tudo o que você escreve ou envia ao Aventurário (personagens, diários,
          anotações, imagens) continua sendo seu. Você nos concede apenas a licença
          técnica necessária para hospedar, processar e exibir esse conteúdo dentro do
          serviço, conforme as suas configurações.
        </p>
        <p>
          O compartilhamento público de uma ficha só acontece quando você mesmo ativa o
          link público — e apenas as abas que você marcar como públicas ficam visíveis.
          Você pode desativar o link a qualquer momento.
        </p>
        <p>
          Você pode exportar o seu diário completo em Markdown a qualquer momento, sem
          custo adicional.
        </p>
      </LegalSection>

      <LegalSection title="5. Recursos de inteligência artificial">
        <p>
          Alguns recursos (estruturar anotações, recap de sessão, retrospectiva de
          campanha) enviam o texto envolvido para processamento por um provedor de IA
          (Anthropic), exclusivamente para gerar o resultado que você pediu.
        </p>
        <p>
          Conteúdo gerado por IA pode conter imprecisões — revise antes de aceitar as
          sugestões. O uso dos recursos de IA está sujeito a limites razoáveis por
          usuário, para manter o serviço saudável para todos.
        </p>
      </LegalSection>

      <LegalSection title="6. Uso aceitável">
        <p>Ao usar o Aventurário, você concorda em não:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>usar o serviço para atividade ilegal ou para armazenar conteúdo ilegal;</li>
          <li>tentar acessar contas ou dados de outros usuários;</li>
          <li>
            sobrecarregar, interferir ou tentar contornar as proteções técnicas do
            serviço;
          </li>
          <li>revender ou redistribuir o serviço sem autorização.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Disponibilidade e garantias">
        <p>
          O Aventurário é fornecido &quot;como está&quot;. Trabalhamos para manter o
          serviço disponível e seguro — incluindo cópias de segurança diárias — mas não
          garantimos disponibilidade ininterrupta nem ausência de erros. Na máxima medida
          permitida pela lei, nossa responsabilidade fica limitada ao valor pago por você
          nos últimos 12 meses.
        </p>
      </LegalSection>

      <LegalSection title="8. Encerramento">
        <p>
          Você pode parar de usar o serviço e solicitar a exclusão da sua conta a qualquer
          momento pelo e-mail de contato. Podemos suspender ou encerrar contas que violem
          estes termos, avisando quando possível.
        </p>
      </LegalSection>

      <LegalSection title="9. Alterações destes termos">
        <p>
          Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas na
          plataforma ou por e-mail antes de entrarem em vigor. A data da última
          atualização está sempre indicada no topo desta página.
        </p>
      </LegalSection>

      <LegalSection title="10. Lei aplicável e contato">
        <p>
          Estes termos são regidos pelas leis da República Federativa do Brasil. Dúvidas,
          solicitações ou reclamações: <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
