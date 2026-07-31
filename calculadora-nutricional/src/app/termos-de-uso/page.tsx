import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Termos e condições de uso | SoIZI",
  description: "Regras de acesso e uso da plataforma SoIZI.",
};

const sections = [
  { id: "objeto", title: "Objeto e escopo" },
  { id: "conta", title: "Conta e acesso" },
  { id: "tabelas", title: "Tabelas e responsabilidade do usuário" },
  { id: "fontes", title: "Fontes, automações e revisão" },
  { id: "conteudo", title: "Conteúdo do usuário" },
  { id: "uso-aceitavel", title: "Uso aceitável" },
  { id: "planos", title: "Planos e condições comerciais" },
  { id: "propriedade", title: "Propriedade intelectual" },
  { id: "disponibilidade", title: "Disponibilidade e alterações" },
  { id: "responsabilidade", title: "Responsabilidade e limites" },
  { id: "encerramento", title: "Suspensão e encerramento" },
  { id: "lei", title: "Lei aplicável e contato" },
];

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Termos de uso"
      title="Termos e condições para usar a SoIZI"
      description="Estas regras organizam o acesso à plataforma, o uso das ferramentas de rotulagem e a responsabilidade de cada parte sobre os dados e materiais utilizados."
      sections={sections}
    >
      <p className="mt-0 text-muted-foreground">
        Ao criar uma conta, acessar ou usar a SoIZI, você declara que leu estas condições e que possui capacidade e autorização para contratar e operar a conta. Se você utiliza a plataforma em nome de uma empresa, declara também que pode vinculá-la a estas condições.
      </p>

      <section id="objeto" className="mt-10">
        <h2>1. Objeto e escopo</h2>
        <p>
          A SoIZI é uma plataforma de apoio operacional para organizar ingredientes, formulações, fichas técnicas, cálculos nutricionais, pré-visualizações e exportações relacionadas à rotulagem de alimentos. A plataforma oferece ferramentas, referências e automações para apoiar o trabalho do usuário; ela não substitui análise técnica, regulatória, jurídica, laboratorial ou a aprovação final do responsável pelo produto.
        </p>
        <p>
          A utilização da plataforma não representa certificação, homologação ou garantia de que um produto, tabela, rótulo, alegação ou processo atende a todas as normas aplicáveis ao caso concreto.
        </p>
      </section>

      <section id="conta" className="mt-10">
        <h2>2. Conta e acesso</h2>
        <ul>
          <li>Forneça informações verdadeiras, completas e atualizadas no cadastro.</li>
          <li>Mantenha sua senha, fatores de autenticação e convites de organização em sigilo.</li>
          <li>Avise a SoIZI imediatamente se suspeitar de acesso não autorizado.</li>
          <li>Você responde pelas atividades feitas com sua conta, salvo quando demonstrado que o evento não decorreu de sua ação ou omissão.</li>
          <li>O administrador da organização pode conceder ou retirar permissões de outros membros conforme a configuração do workspace.</li>
        </ul>
      </section>

      <section id="tabelas" className="mt-10">
        <h2>3. Tabelas e responsabilidade do usuário</h2>
        <p>
          A tabela nutricional, a formulação, os ingredientes, as quantidades, as porções, as medidas caseiras, os alertas, as alegações e os demais dados inseridos, selecionados ou aprovados na conta são de responsabilidade do usuário ou da organização que os utiliza.
        </p>
        <p>
          Cabe ao usuário conferir, antes de salvar, exportar, imprimir, publicar ou colocar um produto no mercado, pelo menos: a identidade e a origem dos ingredientes; a formulação efetivamente produzida; unidades e conversões; porções; fatores de rendimento; alérgenos; declarações obrigatórias; alegações; público e categoria do produto; regras de rotulagem aplicáveis; atualidade das referências; e a aprovação profissional ou empresarial necessária.
        </p>
        <p>
          A SoIZI não assume a responsabilidade pelo conteúdo da tabela, pela composição ou segurança do alimento, pela decisão de comercialização, pela aprovação de arte, pelo protocolo perante órgão público ou por prejuízos decorrentes do uso de dados não revisados pelo usuário. Esta regra não afasta responsabilidades que a legislação não permita excluir ou limitar.
        </p>
      </section>

      <section id="fontes" className="mt-10">
        <h2>4. Fontes, automações e revisão</h2>
        <p>
          Bases públicas, dados importados, integrações de terceiros, modelos oficiais, leitura de documentos e recursos automatizados podem conter desatualizações, omissões ou erros. Um resultado calculado ou exportado deve ser tratado como material de trabalho até que seja conferido por pessoa responsável.
        </p>
        <p>
          Quando utilizar uma fonte externa, inclusive consulta de produtos, IA ou importação de ficha técnica, o usuário deve verificar a fonte, a data, a unidade, a correspondência com o produto real e a permissão para utilização dos dados. A existência de uma referência na plataforma não significa endosso, garantia de precisão ou validação do produto.
        </p>
      </section>

      <section id="conteudo" className="mt-10">
        <h2>5. Conteúdo do usuário</h2>
        <p>
          O usuário mantém os direitos que possuir sobre suas formulações, tabelas, documentos, marcas e demais materiais enviados. Ele concede à SoIZI apenas as permissões necessárias para hospedar, processar, exibir, calcular, fazer backup e exportar esse conteúdo para prestar as funcionalidades solicitadas.
        </p>
        <p>
          O usuário declara que possui os direitos, autorizações e bases legais necessários para inserir o conteúdo e que não enviará material ilícito, malicioso, enganoso ou que viole segredo comercial, propriedade intelectual, privacidade ou direitos de terceiros.
        </p>
      </section>

      <section id="uso-aceitavel" className="mt-10">
        <h2>6. Uso aceitável</h2>
        <p>É proibido usar a SoIZI para:</p>
        <ul>
          <li>violar a lei, direitos de terceiros ou regras de órgãos reguladores;</li>
          <li>introduzir código malicioso, tentar burlar autenticação, limites ou controles de acesso;</li>
          <li>acessar ou exportar dados de outra conta sem autorização;</li>
          <li>sobrecarregar, copiar em massa, fazer engenharia reversa ou explorar a plataforma fora das permissões contratadas; ou</li>
          <li>produzir conteúdo que deliberadamente induza consumidores ou autoridades a erro.</li>
        </ul>
      </section>

      <section id="planos" className="mt-10">
        <h2>7. Planos e condições comerciais</h2>
        <p>
          Quando houver plano pago, preço, limite, período de teste, renovação, cancelamento e forma de cobrança, essas condições serão apresentadas antes da contratação e poderão ser complementadas por proposta, pedido ou contrato específico. O usuário deve conferir o plano, os limites e os dados de cobrança antes de confirmar.
        </p>
        <p>
          Cancelamentos, reembolsos, alterações de plano e tratamento de falhas de cobrança observarão a oferta realizada, o contrato aplicável e os direitos previstos na legislação. Nenhuma condição desta página elimina direitos obrigatórios do consumidor.
        </p>
      </section>

      <section id="propriedade" className="mt-10">
        <h2>8. Propriedade intelectual</h2>
        <p>
          A SoIZI, sua marca, software, interface, textos, componentes, modelos e materiais próprios pertencem à SoIZI ou a seus licenciantes. O acesso à plataforma concede uma licença limitada, não exclusiva, revogável e não transferível para usar o serviço durante a relação contratual, sem transferência de titularidade.
        </p>
        <p>
          Marcas, bases, documentos e referências de terceiros permanecem sujeitos às respectivas licenças e condições de uso.
        </p>
      </section>

      <section id="disponibilidade" className="mt-10">
        <h2>9. Disponibilidade e alterações</h2>
        <p>
          A SoIZI pode corrigir falhas, atualizar cálculos, adaptar modelos, alterar funcionalidades ou interromper temporariamente o serviço para manutenção, segurança ou exigência legal. Serão adotadas medidas razoáveis de comunicação quando uma alteração relevante exigir ação do usuário.
        </p>
        <p>
          O usuário deve manter cópias dos materiais que considere essenciais e não depender da plataforma como único repositório de documentos críticos. Exportações e backups não substituem a governança documental da organização.
        </p>
      </section>

      <section id="responsabilidade" className="mt-10">
        <h2>10. Responsabilidade e limites</h2>
        <p>
          A SoIZI responde pela prestação do serviço nos limites previstos em lei e no contrato aplicável. Não responde por decisões tomadas exclusivamente pelo usuário, dados fornecidos pelo usuário ou terceiros, indisponibilidade de provedores externos, falhas de conexão, uso incompatível, ausência de revisão ou fatos fora de seu controle razoável.
        </p>
        <p>
          Nenhuma disposição destes termos deve ser interpretada como autorização para excluir dolo, culpa quando a lei impuser responsabilidade, danos a consumidores, deveres de segurança, direitos de titulares de dados ou qualquer outra responsabilidade legalmente irrenunciável.
        </p>
      </section>

      <section id="encerramento" className="mt-10">
        <h2>11. Suspensão e encerramento</h2>
        <p>
          A conta poderá ser suspensa ou encerrada quando houver solicitação do usuário, inadimplemento, violação destas condições, risco de segurança, determinação legal ou necessidade de proteger a plataforma e terceiros. Sempre que possível e adequado, a SoIZI informará o motivo e orientará sobre a exportação dos dados disponíveis.
        </p>
      </section>

      <section id="lei" className="mt-10">
        <h2>12. Lei aplicável e contato</h2>
        <p>
          Estes termos são interpretados conforme as leis brasileiras, respeitados os direitos inderrogáveis do usuário. Eventuais controvérsias serão tratadas pelo foro competente segundo a legislação aplicável.
        </p>
        <p>
          <strong>Identificação da fornecedora e canal jurídico:</strong> preencher razão social, CNPJ, endereço e e-mail oficial antes da publicação definitiva desta página. O canal de suporte exibido na plataforma não deve ser substituído por um endereço inventado ou não monitorado.
        </p>
        <p>
          Para questões de proteção de dados, consulte também a <a href="/politica-de-privacidade">Política de Privacidade</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
