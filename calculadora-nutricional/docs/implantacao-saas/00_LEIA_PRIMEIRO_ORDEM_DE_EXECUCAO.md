# SoIZI Control Plane — ordem oficial de leitura e execução

**Data-base:** 25/08/2026  
**Status:** pacote de arquitetura e implementação  
**Destino:** Codex / equipe de desenvolvimento SoIZI  
**Documento canônico principal:** `01_PLANO_MESTRE_CONTROL_PLANE_SOIZI.md`

## 1. Regra de precedência

Antes de qualquer alteração, o agente deve ler:

1. a documentação canônica atual da arquitetura SoIZI (`Arquitetura e funcionamento completo do SoIZI`, atualização 25/08/2026);
2. este arquivo;
3. `01_PLANO_MESTRE_CONTROL_PLANE_SOIZI.md`;
4. os documentos auxiliares conforme a etapa executada;
5. a documentação oficial vigente das tecnologias, APIs, protocolos e padrões envolvidos.

Em caso de conflito:

1. **código + `prisma/schema.prisma` + migrations aplicadas no ambiente-alvo** definem o estado técnico real;
2. **documentação oficial vigente do fornecedor/protocolo** define o contrato externo;
3. `01_PLANO_MESTRE_CONTROL_PLANE_SOIZI.md` define a arquitetura-alvo do projeto;
4. documentos auxiliares detalham a implementação;
5. nenhum exemplo de blog, fórum, Stack Overflow, vídeo, snippet ou memória do modelo pode prevalecer sobre documentação oficial.

## 2. Regra absoluta: documentação oficial primeiro

É obrigatório pesquisar e registrar a documentação oficial **antes de implementar** qualquer integração, biblioteca, protocolo, mecanismo de autenticação, segurança, pagamento, webhook, migration relevante ou comportamento de infraestrutura.

O Codex NÃO deve:

- inventar endpoints;
- inferir payloads sem conferir a referência oficial;
- copiar snippets de terceiros como fonte de verdade;
- usar comportamento antigo de uma API porque “já conhece”;
- assumir que uma versão de biblioteca funciona como outra;
- implementar pagamentos em produção a partir de exemplos não homologados;
- criar abstração que contradiga o contrato oficial do fornecedor.

Quando não houver documentação oficial suficiente, o agente deve:

1. registrar a lacuna em `08_DIARIO_IMPLEMENTACAO_E_EVIDENCIAS.md`;
2. procurar especificação oficial do protocolo ou código-fonte/repositório oficial;
3. somente então propor implementação conservadora;
4. marcar claramente a decisão como **inferência técnica**, não como comportamento oficial;
5. adicionar teste de contrato que reduza o risco da inferência.

## 3. Ordem de implementação

A execução recomendada é:

1. **Etapa 0 — baseline, inventário e fontes oficiais**
2. **Etapa 1 — reconciliação segura do histórico de billing/migrations**
3. **Etapa 2 — fundação do Control Plane e IAM interno**
4. **Etapa 3 — catálogo: planos, versões, preços, módulos e features**
5. **Etapa 4 — motor de entitlements e limites**
6. **Etapa 5 — abstração de billing + Asaas Sandbox**
7. **Etapa 6 — checkout, assinatura e ciclo de cobrança**
8. **Etapa 7 — webhooks, idempotência e reconciliação**
9. **Etapa 8 — administração de organizações/clientes**
10. **Etapa 9 — cupons, descontos, cortesias e overrides**
11. **Etapa 10 — métricas SaaS, consumo e saúde por tenant**
12. **Etapa 11 — segurança privilegiada avançada e suporte controlado**
13. **Etapa 12 — hardening, E2E, homologação e rollout**
14. **Etapa futura — automação de tesouraria/transferência para Cora**

As etapas possuem gates. Não avançar quando o gate estiver vermelho.

## 4. Documentos do pacote

| Arquivo | Uso |
| --- | --- |
| `01_PLANO_MESTRE_CONTROL_PLANE_SOIZI.md` | Arquitetura canônica, escopo e plano completo. |
| `02_ARQUITETURA_DOMINIOS_E_MODELO_DADOS.md` | Domínios, entidades, invariantes e proposta de dados. |
| `03_BILLING_ASAAS_TESOURARIA_CORA.md` | Pagamentos, Asaas, webhooks, reconciliação e Cora. |
| `04_SEGURANCA_IAM_ADMIN_AUDITORIA.md` | IAM interno, privilégios, tenant isolation, auditoria e suporte. |
| `05_PLANOS_FEATURES_ENTITLEMENTS_LIMITES.md` | Catálogo, módulos, features, planos, versões, quotas e overrides. |
| `06_UX_ROTAS_PAGINAS_CONTROL_PLANE.md` | Rotas, páginas, fluxos e comportamento do painel. |
| `07_TESTES_MIGRACOES_HOMOLOGACAO_ROLLOUT.md` | Estratégia de migrations, testes, gates, sandbox e produção. |
| `08_DIARIO_IMPLEMENTACAO_E_EVIDENCIAS.md` | Registro obrigatório etapa a etapa. |
| `09_FONTES_OFICIAIS_E_POLITICA_DE_PESQUISA.md` | Fontes oficiais iniciais e protocolo de atualização. |

## 5. Regra de acompanhamento do desenvolvimento

Ao iniciar e ao concluir **cada etapa**, atualizar `08_DIARIO_IMPLEMENTACAO_E_EVIDENCIAS.md` com:

- data/hora;
- branch/commit-base;
- objetivo;
- documentação oficial consultada;
- estado encontrado antes da mudança;
- decisão arquitetural;
- arquivos alterados;
- migrations criadas;
- testes adicionados/executados;
- comandos executados;
- resultados;
- riscos;
- pendências;
- decisões que precisam de humano;
- próximo gate.

O diário deve registrar **decisões e evidências técnicas**, não pensamentos privados ou cadeia de raciocínio interna do agente.

## 6. Regra financeira

- **Asaas** será o PSP/provedor de billing inicial.
- **Cora** será a conta bancária de tesouraria/destino dos recebimentos.
- No MVP, a SoIZI **não automatiza movimentação de saldo para a Cora**.
- O pagamento deve ser abstraído por provider para permitir substituição futura.
- Checkout hospedado do Asaas é a preferência inicial para cartão recorrente, evitando que dados de cartão transitem pelo backend da SoIZI.
- Produção financeira somente após Sandbox, testes de contrato, webhook idempotente, reconciliação e gate humano.

## 7. Comando conceitual para o Codex

> Implemente o SoIZI Control Plane seguindo o documento principal e os auxiliares. Não trate o plano como uma única tarefa gigante. Execute etapa por etapa, pesquise a documentação oficial vigente antes de cada integração ou decisão dependente de fornecedor, atualize o diário de evidências, preserve compatibilidade e dados existentes, nunca use `prisma db push` em produção, nunca exponha segredos ou dados de cartão, e não avance para a próxima etapa enquanto os critérios de aceite e gates da etapa atual não estiverem satisfeitos.
