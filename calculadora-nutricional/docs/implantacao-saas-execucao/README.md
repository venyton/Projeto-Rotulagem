# Execução da implantação SaaS

Esta pasta registra o estado operacional da implantação definida em
`docs/implantacao-saas/`. A especificação normativa descreve o que construir;
esta trilha demonstra como cada etapa foi executada e validada.

Consulte primeiro `STATUS.md`. Ele informa a etapa atual, o último gate, os
bloqueios e uma única próxima ação objetiva. As etapas seguem a ordem fixa de 00
a 12 e só avançam após `GATE: APROVADO`.

- `FONTES_OFICIAIS.md`: documentação oficial consultada e decisões sustentadas;
- `DECISOES.md`: decisões arquiteturais verificáveis;
- `RISCOS_E_PENDENCIAS.md`: riscos, bloqueios e decisões externas;
- `CHANGELOG_IMPLEMENTACAO.md`: mudanças efetivamente concluídas;
- `etapas/`: estado, checklist, testes e resultado de cada etapa;
- `evidencias/`: provas concisas dos gates.

Para retomar, leia os documentos normativos 00 e 01, o protocolo determinístico,
este README e `STATUS.md`; depois confirme branch, HEAD e working tree e execute
somente a ação objetiva registrada.
