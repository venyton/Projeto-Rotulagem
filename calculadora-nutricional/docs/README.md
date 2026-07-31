# Indice da documentacao

Atualizado em: 30/07/2026.

## Leitura principal

- `system/documentacao_completa_sistema.md`: mapa geral do produto, fluxos, banco, paginas, APIs e pontos de atencao.
- `architecture/estrutura-do-projeto.md`: estrutura atual das pastas e responsabilidades.
- `architecture/organizacao-aplicada-e-justificativa.md`: por que a organizacao foi aplicada desse jeito.

## Operacao

- `operations/DEPLOY.md`: publicacao e variaveis principais.
- `operations/EXPORTACOES.md`: documentos técnicos, formatos, endpoint e validação local.
- `operations/LOCAL_DATABASE.md`: banco PostgreSQL local isolado e comandos de runtime.
- `operations/MELHORIAS-APLICADAS-2026-07-30.md`: registro desta rodada de hardening, testes e operacao.
- `operations/IMPORTADOR_FICHAS_TECNICAS_IA.md`: uso e configuracao do importador por IA.
- `operations/PERSISTENCIA_UI_TABELA_BANCO_2026-04-30.md`: persistencia do estado completo da tela de tabela.

## Banco

- `database/sql/README.md`: ordem de execucao manual dos SQL.
- `database/sql/001_technical_sheet_imports.sql`
- `database/sql/002_technical_sheet_technical_fields.sql`
- `database/sql/003_enterprise_label_projects.sql`
- `database/sql/902_table_item_source.sql`
- `database/sql/900_generated_table_ui_state_dynamic_schema.sql`
- `database/sql/901_generated_table_ui_state_fixed_schema.sql`

## Referencias

- `references/formatacao-tabela-nutricional/FORMATACAO_DA_TABELA_NUTRICIONAL.docx`: material de referencia para formatacao da tabela nutricional.
- `Banco de Fichas/`: banco documental de fichas tecnicas.
- `image/`: imagens usadas em documentacao.

## Trabalho operacional

- `documento-de-commits.md`: comandos sugeridos para separar commits do estado atual do Git.
- `reports/`: relatorios locais de build, lint e validacoes. Nao usar como fonte canonica.
