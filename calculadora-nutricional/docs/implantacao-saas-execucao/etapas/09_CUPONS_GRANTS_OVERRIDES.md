# Etapa 09 — Cupons, grants e overrides

## Estado

DONE

## Objetivo

Implementar exceções comerciais sem alterar versões e preços publicados nem
confundir desconto financeiro com capability.

## Entregas concluídas

- [x] cupom normalizado único, draft/ativação, validade, planos e limites;
- [x] redemption com snapshot monetário e vínculo a tenant/subscription;
- [x] lock transacional contra corrida e duplo resgate;
- [x] desconto percentual/fixo calculado somente em centavos;
- [x] checkout e webhooks usam o valor efetivo persistido;
- [x] commercial grant agrupado com origem, motivo, ator e expiração;
- [x] grant efetivo integrado ao resolvedor central;
- [x] override explícito com precedência, motivo, validade e auditoria;
- [x] risco de concessões permanentes visível e confirmado;
- [x] UI administrativa e campo opcional no checkout do cliente;
- [x] migrations, testes concorrentes, regressão financeira e gate visual.

## Resultado

Cupom afeta somente o valor do contrato. Grant fornece feature sem mudar
cobrança. Override continua sendo a fonte de maior precedência. Falha definitiva
de checkout revoga o redemption; resultado remoto ambíguo o preserva para
reconciliação. Cancelamento/expiração libera o uso novamente.

`GATE: APROVADO` no escopo local. A Etapa 11 adicionará step-up temporário às
ações HIGH; até lá elas permanecem protegidas por permission, confirmação,
motivo e auditoria, sem exposição ao Application Plane.
