import { LegalPageShell, LegalSection } from "@/components/legal-page-shell";

const CONTACT_EMAIL = "kelvin.bonifacio2014@gmail.com";

export function PrivacyPage() {
  return (
    <LegalPageShell title="Política de Privacidade" updatedAt="14 de julho de 2026">
      <LegalSection title="1. Quem somos">
        <p>
          Esta política explica como o Aventurário (aventurario.tech) coleta, usa e
          protege os seus dados pessoais, em conformidade com a Lei Geral de Proteção de
          Dados (LGPD, Lei nº 13.709/2018). Para qualquer assunto de privacidade, fale com
          a gente: <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="2. Quais dados coletamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Dados de conta:</strong> nome, e-mail e
            senha (armazenada apenas como hash criptográfico — nunca em texto puro).
          </li>
          <li>
            <strong className="text-foreground">Seu conteúdo:</strong> personagens,
            diários, anotações e imagens que você cria ou envia.
          </li>
          <li>
            <strong className="text-foreground">Dados de pagamento:</strong> o pagamento é
            processado pela Stripe; não armazenamos números de cartão, apenas os
            identificadores da sua assinatura (status, plano, datas).
          </li>
          <li>
            <strong className="text-foreground">Registros técnicos:</strong> logs básicos
            de acesso (como endereço IP e horário), usados para segurança e diagnóstico.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Para que usamos os dados">
        <ul className="list-disc space-y-1 pl-5">
          <li>prestar o serviço: guardar e exibir seus diários e personagens;</li>
          <li>
            processar recursos de IA que você aciona (o texto envolvido é enviado à
            Anthropic apenas para gerar o resultado pedido);
          </li>
          <li>enviar e-mails transacionais (confirmações, redefinição de senha);</li>
          <li>processar a cobrança da assinatura;</li>
          <li>manter o serviço seguro e diagnosticar problemas.</li>
        </ul>
        <p>Não vendemos os seus dados e não enviamos marketing sem o seu consentimento.</p>
      </LegalSection>

      <LegalSection title="4. Com quem compartilhamos">
        <p>
          Compartilhamos dados apenas com os operadores necessários para o serviço
          funcionar:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Stripe</strong> — processamento de
            pagamentos;
          </li>
          <li>
            <strong className="text-foreground">Anthropic</strong> — processamento de IA
            sob demanda (recursos que você aciona);
          </li>
          <li>
            <strong className="text-foreground">Resend</strong> — envio de e-mails
            transacionais;
          </li>
          <li>
            <strong className="text-foreground">Hostinger</strong> — hospedagem dos
            servidores (localizados no Brasil);
          </li>
          <li>
            <strong className="text-foreground">Backblaze</strong> — armazenamento externo
            das cópias de segurança diárias;
          </li>
          <li>
            <strong className="text-foreground">Google (Analytics)</strong> — métricas de
            audiência do site (ver seção 6).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Link público de personagem">
        <p>
          Por padrão, todo o seu conteúdo é privado. Se você ativar o link público de uma
          ficha, apenas o cartão do personagem e as abas que você marcar como públicas
          ficam acessíveis a quem tiver o link. Você pode desativar o link a qualquer
          momento, e ele deixa de funcionar imediatamente.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies e armazenamento local">
        <p>
          Usamos o armazenamento local do navegador (localStorage) para manter a sua
          sessão e a preferência de tema.
        </p>
        <p>
          Também usamos o <strong className="text-foreground">Google Analytics</strong>{" "}
          para entender, de forma agregada, como as pessoas chegam e usam o site (páginas
          visitadas, origem do acesso, tipo de dispositivo). Ele utiliza cookies e
          identificadores próprios do Google para isso. Não enviamos ao Google o conteúdo
          dos seus diários nem seus dados de conta. Você pode bloquear esses cookies nas
          configurações do navegador ou com extensões de privacidade — o Aventurário
          continua funcionando normalmente.
        </p>
        <p>
          Se adicionarmos outras ferramentas de análise ou publicidade, esta política será
          atualizada antes.
        </p>
      </LegalSection>

      <LegalSection title="7. Retenção e exclusão">
        <p>
          Mantemos seus dados enquanto a sua conta existir. Cópias de segurança diárias
          são mantidas por período limitado e expiram automaticamente no ciclo de
          retenção. Para excluir a sua conta e os dados associados, envie um pedido para o
          e-mail de contato — atenderemos no prazo da LGPD.
        </p>
      </LegalSection>

      <LegalSection title="8. Seus direitos (LGPD)">
        <p>Você pode, a qualquer momento, solicitar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>confirmação e acesso aos dados que temos sobre você;</li>
          <li>correção de dados incompletos ou desatualizados;</li>
          <li>exclusão dos seus dados;</li>
          <li>
            portabilidade — a exportação do seu diário em Markdown está disponível
            diretamente no app, sem precisar pedir;
          </li>
          <li>revogação de consentimentos.</li>
        </ul>
        <p>
          Basta escrever para{" "}
          <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="9. Segurança">
        <p>
          Adotamos medidas técnicas adequadas: senhas armazenadas com hash bcrypt, tráfego
          criptografado (HTTPS/TLS), acesso restrito à infraestrutura e cópias de
          segurança diárias. Nenhum sistema é 100% seguro, mas levamos a proteção dos seus
          diários a sério.
        </p>
      </LegalSection>

      <LegalSection title="10. Alterações desta política">
        <p>
          Esta política pode ser atualizada. Mudanças relevantes serão comunicadas na
          plataforma ou por e-mail. A data da última atualização está indicada no topo da
          página.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
