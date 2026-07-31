import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Política de privacidade | SoIZI",
  description: "Como a SoIZI trata dados pessoais e conteúdo inserido na plataforma.",
};

const sections = [
  { id: "controladora", title: "Controladora e escopo" },
  { id: "dados", title: "Dados tratados" },
  { id: "finalidades", title: "Finalidades e bases" },
  { id: "conteudo", title: "Dados inseridos pelo usuário" },
  { id: "compartilhamento", title: "Compartilhamento" },
  { id: "retencao", title: "Retenção e eliminação" },
  { id: "seguranca", title: "Segurança" },
  { id: "direitos", title: "Direitos do titular" },
  { id: "cookies", title: "Cookies e armazenamento local" },
  { id: "atualizacoes", title: "Atualizações e contato" },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Privacidade"
      title="Como tratamos dados pessoais na SoIZI"
      description="Esta política explica quais dados podem ser tratados para operar a conta, proteger o serviço e entregar as ferramentas de rotulagem, além dos cuidados do usuário com dados de terceiros."
      sections={sections}
    >
      <p className="mt-0 text-muted-foreground">
        A SoIZI adota a Lei Geral de Proteção de Dados Pessoais (LGPD) como referência para transparência, segurança e exercício de direitos. O tratamento deve ser limitado ao necessário para as finalidades informadas e às obrigações legais aplicáveis.
      </p>

      <section id="controladora" className="mt-10">
        <h2>1. Controladora e escopo</h2>
        <p>
          <strong>Controladora:</strong> SoIZI Food Solution, nome comercial utilizado no produto. A razão social, CNPJ, endereço e canal oficial do encarregado devem ser preenchidos nesta página antes da publicação definitiva.
        </p>
        <p>
          Esta política se aplica ao site, ao painel autenticado, às funcionalidades de tabelas, ingredientes, fichas técnicas, exportações, integrações e demais recursos disponibilizados pela SoIZI.
        </p>
      </section>

      <section id="dados" className="mt-10">
        <h2>2. Dados tratados</h2>
        <p>Dependendo do recurso utilizado, podemos tratar:</p>
        <ul>
          <li><strong>Cadastro e contato:</strong> nome, e-mail, empresa, telefone e documento informado voluntariamente.</li>
          <li><strong>Acesso e segurança:</strong> senha em formato protegido, autenticação em dois fatores, tokens de sessão, registros de acesso, endereço IP tratado conforme os controles de segurança e informações do dispositivo/navegador.</li>
          <li><strong>Conteúdo operacional:</strong> ingredientes, formulações, tabelas, fichas técnicas, documentos enviados, dados de fornecedores, configurações e exportações.</li>
          <li><strong>Uso do serviço:</strong> organização ativa, permissões, módulos, eventos de segurança, limites de requisição e informações necessárias para suporte e auditoria.</li>
        </ul>
        <p>
          Não solicite nem insira dados pessoais sensíveis ou dados de terceiros quando eles não forem necessários para a finalidade do produto. Se a operação exigir esse tratamento, o usuário deve avaliar a base legal, os avisos e as medidas adequadas antes do envio.
        </p>
      </section>

      <section id="finalidades" className="mt-10">
        <h2>3. Finalidades e bases legais</h2>
        <ul>
          <li>criar e administrar a conta, autenticar o usuário e entregar o serviço contratado, com fundamento na execução de contrato ou de procedimentos preliminares;</li>
          <li>salvar, calcular, exibir, editar e exportar o conteúdo solicitado pelo usuário, conforme a execução do serviço;</li>
          <li>prevenir fraude, abuso, acessos indevidos e incidentes, com fundamento em legítimo interesse, segurança e cumprimento de obrigação legal, quando aplicável;</li>
          <li>atender solicitações, suporte, auditorias, obrigações fiscais, regulatórias ou ordens de autoridade;</li>
          <li>enviar comunicação operacional necessária à conta; e</li>
          <li>realizar análises de produto ou comunicações de marketing somente quando houver configuração, base legal e, quando exigido, consentimento ou opção de recusa adequada.</li>
        </ul>
        <p>
          A base legal específica pode variar conforme o contexto, o tipo de dado, o plano e a relação entre a SoIZI, a organização contratante e o titular.
        </p>
      </section>

      <section id="conteudo" className="mt-10">
        <h2>4. Dados inseridos pelo usuário</h2>
        <p>
          Em relação aos dados de clientes, fornecedores, colaboradores ou terceiros inseridos na plataforma, a organização e o usuário devem definir sua finalidade, base legal, transparência, permissões de acesso e prazo de retenção. A SoIZI tratará esse conteúdo para prestar as funções solicitadas e conforme as instruções legítimas recebidas, sem que isso dispense as responsabilidades do usuário como agente de tratamento quando aplicável.
        </p>
        <p>
          O usuário deve evitar dados pessoais em campos de ingredientes, tabelas e documentos quando eles não forem necessários, além de remover ou anonimizar informações antes do upload sempre que possível.
        </p>
      </section>

      <section id="compartilhamento" className="mt-10">
        <h2>5. Compartilhamento</h2>
        <p>Podemos compartilhar dados na medida necessária com:</p>
        <ul>
          <li>provedores de hospedagem, banco de dados, armazenamento, e-mail, autenticação, observabilidade e segurança;</li>
          <li>provedores escolhidos pelo usuário para login, consulta de dados alimentares ou processamento automatizado, quando o recurso for acionado;</li>
          <li>membros e administradores da organização, conforme as permissões configuradas; e</li>
          <li>autoridades públicas, órgãos reguladores, assessores ou terceiros quando houver obrigação legal, ordem válida ou necessidade de proteger direitos.</li>
        </ul>
        <p>
          Alguns provedores podem processar dados fora do Brasil. Nesses casos, a transferência deverá observar a legislação aplicável, os contratos e as salvaguardas adequadas ao contexto.
        </p>
      </section>

      <section id="retencao" className="mt-10">
        <h2>6. Retenção e eliminação</h2>
        <p>
          Mantemos dados pelo tempo necessário para cumprir as finalidades desta política, manter a conta e os registros de segurança, atender obrigações legais e exercer direitos. O usuário pode solicitar encerramento da conta e eliminação dos dados, observadas cópias de segurança, prazos legais, prevenção a fraude e outras hipóteses permitidas pela LGPD.
        </p>
        <p>
          O usuário deve manter cópia própria dos documentos e exportações importantes antes de solicitar a exclusão da conta.
        </p>
      </section>

      <section id="seguranca" className="mt-10">
        <h2>7. Segurança</h2>
        <p>
          Aplicamos medidas técnicas e administrativas compatíveis com o risco, incluindo autenticação, controle de acesso, proteção de credenciais, limites de requisição, registros de segurança e segregação de dados por usuário ou organização. Nenhum serviço conectado à Internet elimina completamente o risco de incidente.
        </p>
        <p>
          Usuários devem usar senhas únicas, habilitar a autenticação em dois fatores quando disponível, limitar permissões e comunicar suspeitas de incidente pelo canal oficial que será informado na publicação definitiva.
        </p>
      </section>

      <section id="direitos" className="mt-10">
        <h2>8. Direitos do titular</h2>
        <p>
          O titular pode solicitar confirmação da existência de tratamento, acesso, correção, informação sobre compartilhamentos, revisão de decisões automatizadas quando aplicável e eliminação, portabilidade ou revogação de consentimento nas hipóteses e limites da LGPD.
        </p>
        <p>
          Para exercer direitos, informe o pedido, a conta relacionada e os elementos necessários para confirmar sua identidade. O canal do controlador/encarregado deve ser preenchido antes da publicação definitiva desta política. A resposta observará os prazos e requisitos legais; algumas solicitações podem ser limitadas por obrigação de retenção ou por direitos de terceiros.
        </p>
      </section>

      <section id="cookies" className="mt-10">
        <h2>9. Cookies e armazenamento local</h2>
        <p>
          A plataforma utiliza cookies estritamente necessários para sessão, autenticação, segurança, organização ativa e funcionamento de componentes. Também pode utilizar armazenamento local do navegador para preferências de idioma, tema, escala da interface e rascunhos ou estados de trabalho, conforme o recurso usado.
        </p>
        <p>
          Cookies e tecnologias não essenciais, como medição de audiência ou marketing, somente devem ser ativados conforme a configuração vigente e a base legal aplicável. O navegador permite bloquear ou apagar esses recursos, mas isso pode encerrar sessões ou alterar preferências.
        </p>
      </section>

      <section id="atualizacoes" className="mt-10">
        <h2>10. Atualizações e contato</h2>
        <p>
          Podemos atualizar esta política para refletir mudanças no produto, nos provedores ou na legislação. Alterações relevantes serão comunicadas por meio adequado e indicarão a nova data de vigência.
        </p>
        <p>
          <strong>Canal de privacidade:</strong> preencher o e-mail oficial do controlador ou do encarregado, além da razão social, CNPJ e endereço, antes da publicação definitiva. Não use o canal da ANPD como substituto do contato direto com o controlador.
        </p>
        <p>
          Para conhecer as regras de uso e a responsabilidade sobre as tabelas, consulte os <a href="/termos-de-uso">Termos e condições de uso</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
