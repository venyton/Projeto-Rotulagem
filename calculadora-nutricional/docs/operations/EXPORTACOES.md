# Exportações de documentos

Atualizado em: 30/07/2026.

## Visão geral

O gerador de tabela nutricional possui uma Central de exportação organizada por
finalidade:

- **Rótulo nutricional**: imagem, pacote com imagem + Excel e SVG editável.
- **Documentos técnicos**: Memorial de cálculo e Ficha técnica.
- **Salvar projeto**: persistência da tabela e das configurações antes do
  download dos documentos técnicos.

## Documentos técnicos

Cada documento pode ser baixado em PDF ou XLSX:

| Documento | PDF | XLSX | Conteúdo principal |
| --- | --- | --- | --- |
| Memorial de cálculo | Sim | Sim | Identificação, parâmetros, formulação, contribuição por componente, micronutrientes, resultados consolidados e verificações |
| Ficha técnica | Sim | Sim | Identificação do produto, características físico-químicas, microbiológicas, contaminantes, matérias estranhas, nutrição, logística, revisões e aprovações |

O XLSX do Memorial contém somente a aba `Memorial de Cálculo`. A aba de
orientação interna ao programador não faz parte do arquivo entregue ao usuário.
O XLSX da Ficha técnica contém as abas `Ficha Técnica` e `Dados do Sistema`.

## Endpoint

Os quatro documentos são gerados pela rota protegida:

```text
GET /api/export/memorial?tableId=<id>&document=<tipo>&format=<formato>
```

Parâmetros aceitos:

```text
document=memorial    Memorial de cálculo
document=technical   Ficha técnica
format=pdf           Documento PDF
format=xlsx          Planilha XLSX
```

Exemplos:

```text
/api/export/memorial?tableId=abc&document=memorial&format=pdf
/api/export/memorial?tableId=abc&document=memorial&format=xlsx
/api/export/memorial?tableId=abc&document=technical&format=pdf
/api/export/memorial?tableId=abc&document=technical&format=xlsx
```

A rota valida o acesso ao módulo de exportações e o pertencimento da tabela ao
usuário autenticado. As respostas são privadas e não ficam em cache.

## Dados e rastreabilidade

- Os cálculos continuam usando as regras existentes de `calculateRecipe` e
  `calculatePreparedProduct`.
- Os valores exportados são materializados para leitura do usuário.
- Os campos obrigatórios do modelo são mantidos no documento, mesmo quando não
  há dado cadastrado.
- Campos ausentes são apresentados como `Não informado no cadastro`.
- O export não expõe fórmulas, fatores internos, referências de células ou a
  estrutura interna do banco nutricional.
- O Memorial mantém a contribuição por ingrediente e os resultados em 100 g/ml,
  porção e receita total quando aplicável.

## Arquivos principais

```text
src/app/api/export/memorial/route.ts
src/features/tables/components/TableGenerator.tsx
src/features/tables/domain/memorial.ts
src/lib/export/memorial-pdf.ts
src/lib/export/memorial-xlsx.ts
src/lib/export/technical-sheet-xlsx.ts
```

## Validação local

Na raiz de `calculadora-nutricional`:

```bash
npx tsc --noEmit --pretty false
npx eslint src/features/tables/components/TableGenerator.tsx
git diff --check
npm test
```
