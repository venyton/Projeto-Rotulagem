# Dataset

Organizacao da pasta de dados do projeto.

## runtime/
Arquivos efetivamente usados por scripts do sistema (seed/inspecao).
- `runtime/tabela-taco.xlsx`
- `runtime/examples/grupos.xlsx`

Esses arquivos fazem parte do fluxo de desenvolvimento e nao devem ser removidos sem ajustar os scripts.

## reference/
Materiais de referencia (regulatorios, exemplos e assets de estudo).
Nao sao usados diretamente em runtime da aplicacao.

Subpastas:
- `reference/regulatory/` (PDFs)
- `reference/table-examples/` (planilhas de exemplo)
- `reference/assets/lupas/` (fontes visuais)

## Observacoes
- A aplicacao em runtime usa imagens finais em `public/images/lupa/`.
- Sempre que mover arquivos daqui, atualize os scripts em `scripts/`.
