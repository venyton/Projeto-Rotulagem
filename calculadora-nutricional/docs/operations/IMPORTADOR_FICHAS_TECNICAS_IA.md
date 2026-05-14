# Importador Inteligente de Fichas Técnicas

Este guia cobre a primeira versão do importador de fichas técnicas por IA. O fluxo usa Gemini API no servidor, grava a extração como pendente de revisão e só cria um `CustomIngredient` depois da aprovação humana.

## Configuração

Crie uma chave no Google AI Studio:

- Acesse: https://aistudio.google.com/apikey
- Crie ou selecione um projeto.
- Copie a chave para o `.env` local.

Variáveis:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
TECHNICAL_SHEET_MAX_FILE_SIZE_MB=20
TECHNICAL_SHEET_MAX_BATCH_FILES=5
```

`GEMINI_MODEL` fica configurável para trocar para `gemini-2.5-flash-lite` ou outro modelo compatível sem mexer no código.

## Banco

Preferencialmente, rodar pelas migrations Prisma:

```bash
npx prisma format --schema=./prisma/schema.prisma
npx prisma migrate deploy --schema=./prisma/schema.prisma
npx prisma generate --schema=./prisma/schema.prisma
```

Para DBA ou execucao manual, a ordem dos SQL esta em:

```text
docs/database/sql/README.md
```

A migration adiciona:

- `TechnicalDocument`
- `TechnicalSheetExtraction`
- `ExtractedNutrient`
- `ExtractedAllergen`
- `ExtractedTechnicalField`
- campos de rastreabilidade em `CustomIngredient`
- `sugarAdded` no snapshot de `TableItem`

## Escopo extraído

O MVP salva no banco relacional o que é necessário para revisão, criação do `CustomIngredient` e auditoria técnica da ficha. O JSON canônico completo também fica preservado em `TechnicalDocument.extractedJson`.

Campos técnicos encontrados com frequência em fichas de fornecedores são salvos em `ExtractedTechnicalField`, uma tabela flexível por categoria:

- códigos `INS` e `CAS`
- categoria/classificação legal, registro ANVISA, MAPA e SIF
- função tecnológica de aditivos e coadjuvantes
- lactose como declaração própria
- características sensoriais
- especificações físico-químicas
- especificações microbiológicas
- contaminantes, metais pesados, pesticidas, micotoxinas e aflatoxinas
- origem, origem animal, lote e rastreabilidade
- transporte, distribuição, peso líquido e material de embalagem
- certificações e declarações como BPF, APPCC/HACCP, Kosher, Halal, vegano e orgânico
- advertências específicas como sulfitos, corantes e fenilalanina/aspartame

Esses campos aparecem na revisão como informação técnica adicional, mas não viram automaticamente dados do ingrediente nutricional. O `CustomIngredient` continua enxuto e focado em cálculo/rotulagem.

## Como testar

1. Suba o projeto.
2. Entre no dashboard com usuário autenticado.
3. Abra `Ingredientes`.
4. Clique em `Importar ficha técnica com IA`.
5. Envie um ou mais PDFs/imagens. O processamento roda em fila, um arquivo por vez.
6. Abra `Fichas técnicas importadas`.
7. Revise produto, glúten, ingredientes, alergênicos e nutrientes.
8. Clique em `Aprovar e salvar como ingrediente`.
9. Confira em `Meus Ingredientes`.

O ingrediente aprovado fica com:

- `sourceType = "AI_TECHNICAL_SHEET"`
- `sourceDocumentId`
- `sourceExtractionId`

## Limitações do MVP

- Não há OCR local.
- Não usa Google Document AI.
- Não treina modelo próprio.
- A IA pode errar leitura de PDF ruim, tabela torta, imagem borrada ou texto escaneado.
- Documento com baixa confiança fica marcado para revisão.
- A IA não substitui revisão técnica.
- Não existe uma ficha técnica universal obrigatória para todos os alimentos e ingredientes. As obrigações vêm de normas por tema e por categoria de produto.

## Segurança

- `GEMINI_API_KEY` nunca vai para o frontend.
- Todas as chamadas ao Gemini rodam em server actions/services.
- Sem chave, o sistema retorna: `AI provider is not configured. Configure GEMINI_API_KEY.`
- Arquivos aceitos: PDF, PNG, JPEG e WEBP.
- Tamanho máximo padrão por arquivo: 20 MB.
- Lote padrão: até 5 arquivos por envio, para reduzir risco de cota e timeout.

## Referências oficiais

- API keys: https://ai.google.dev/gemini-api/docs/api-key
- SDK JavaScript/TypeScript: https://ai.google.dev/gemini-api/docs/quickstart
- Files API e PDF: https://ai.google.dev/gemini-api/docs/document-processing
- Structured outputs: https://ai.google.dev/gemini-api/docs/structured-output
- Modelos Gemini: https://ai.google.dev/gemini-api/docs/models/gemini
- Anvisa - rotulagem de alimentos: https://www.gov.br/anvisa/pt-br/assuntos/alimentos/rotulagem
- Anvisa - rotulagem nutricional, RDC 429/2020 e IN 75/2020: https://www.gov.br/anvisa/pt-br/assuntos/alimentos/rotulagem/rotulagem-nutricional
- Anvisa - lactose: https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2017/rotulagem-de-lactose-em-alimentos-tem-regra-publicada
- Anvisa - contaminantes e padrões microbiológicos: https://www.gov.br/anvisa/pt-br/assuntos/alimentos/contaminantes
- Anvisa - aditivos e coadjuvantes: https://www.gov.br/anvisa/pt-br/setorregulado/regularizacao/alimentos/aditivos-alimentares
- MAPA - produtos de origem animal e rotulagem: https://www.gov.br/agricultura/pt-br/assuntos/inspecao/produtos-animal/empresario/registro-de-produtos-rotulagem
