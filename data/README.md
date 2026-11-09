# data/ — fontes e esquema

Tudo que o site mostra sai daqui. `npm run split-data` lê estes arquivos, **valida**
cada mensagem (`scripts/message_schema.py`) e falha o build se algo estiver fora do
esquema abaixo.

| Arquivo | Conteúdo |
|---|---|
| `sources.json` | Um registro por documento de origem. Toda mensagem aponta para um deles |
| `messages.json` | A conversa com Martha Graeff (export de WhatsApp) |
| `conversations/*.json` | Uma conversa por arquivo, geradas por `scripts/build_ipj_data.py` a partir de `ipj-3298613/` |
| `ipj-3298613/` | Transcrição do relatório da PF (ver o README de lá) |
| `source/` | Os PDFs de origem, versionados; o `sha256` em `sources.json` é conferido no build |

## Fontes — `sources.json`

```json
{
  "id": "ipj-a-3298613-2026",
  "kind": "laudo-pf",
  "titulo": "IPJ-A nº 3298613/2026 — NADIP/DFIN/CGRC/DICOR/PF",
  "orgao_ou_veiculo": "Polícia Federal",
  "data": "2026-08-27",
  "made_public": "2026-09-01",
  "how": "Como o material chegou ao público, numa frase.",
  "file": "data/source/….pdf",
  "url": "…", "download": "…", "archive_url": null,
  "sha256": "…", "pages": 218
}
```

- `kind`: `laudo-pf` · `peticao-stf` · `imprensa` · `vazamento` · `print` · `iped` · `fornecido`.
- `data`: `AAAA-MM-DD`, `AAAA-MM` ou `AAAA` — o quanto se sabe, sem inventar o resto.
- `file` + `sha256`: quando o documento está no repositório. O build recalcula o hash e falha se não bater.
- `archive_url`: cópia arquivada (Wayback Machine, archive.today) de uma matéria, para quando o link original cair.
- `nome` e `descricao` (opcionais): como os dados estruturados da página nomeiam o documento.

## Proveniência de cada mensagem

A conversa declara a fonte e o selo **padrão** em `metadata`:

```json
"metadata": { "source_id": "ipj-a-3298613-2026", "verification": "verificado", … }
```

Uma mensagem que veio de outro lugar declara a sua, e isso vale só para ela:

| Campo | Quando |
|---|---|
| `source_id` | A mensagem vem de uma fonte diferente da conversa |
| `source_page`, `source_figure` | Página e figura no documento (PDF) |
| `source_url` | Link direto para o trecho (matéria, post), quando existe |
| `verification` | O selo da mensagem, se diferente do da conversa |

O selo (`verification`):

| Valor | Quer dizer |
|---|---|
| `verificado` | Consta de documento oficial; página e figura citadas |
| `imprensa` | Publicado por veículo de imprensa; não consta de documento oficial |
| `nao-verificado` | Sem fonte verificável; pode estar incompleto ou adulterado |
| `reconstruido` | Texto reconstituído por terceiros; ordem ou trechos podem ter sido inferidos |

Fonte e selo efetivos de uma mensagem: os dela, senão os da conversa
(`provenance_of` em Python, `provenanceOf` em `scripts/lib/corpus.mjs`). O build
falha se algum `source_id` não existir em `sources.json` ou se um selo não estiver
na tabela. O export JSON grava em cada mensagem os valores já resolvidos.

### Campos de proveniência que aparecem em material de terceiros

Ao importar conversas de outras compilações, converter para o esquema acima — nunca
copiar o campo como veio:

| Encontrado | Vira |
|---|---|
| `source_page` / `source_figure` | igual |
| `source_cite` (texto livre com a página dentro) | um registro em `sources.json` + `source_id`, e `source_page` extraída do texto |
| `source_ref` | `source_id` (criando o registro) |
| `source: "screenshot" \| "press" \| "user_provided" \| "whatsapp_export"` | `source_id` de um registro de `kind` `print` · `imprensa` · `fornecido` · `vazamento` |
| `source_image` | `source_url` (se for link) ou registro `print` |
| `verified: true/false` | `verification` (`verificado` só com documento oficial citado) |
| `source_detail{…}` na conversa | um registro em `sources.json` + `metadata.source_id` |

## Mensagem

```json
{
  "id": 1,
  "timestamp": "2024-02-10T11:12:08",
  "date": "2024-02-10",
  "time": "11:12:08",
  "sender": "DV",
  "content": "…",
  "type": "text",
  "is_edited": false,
  "attachment": null,
  "urls": []
}
```

- **`id`**: inteiro, único na conversa e **estável**. É endereço: `/#/chat/<conversa>/msg/<id>`,
  `#msg-<id>` nas páginas estáticas, as citações do `llms.txt` e do `<noscript>`.
  Mensagem nova recebe id maior que o maior existente, mesmo que seja mais antiga.
  `tests/fixtures/message-ids.json` fixa cada id ao que a mensagem diz; o teste
  `message-ids` falha numa renumeração. Para registrar ids novos: `npm run ids:pin`
  (só acrescenta; recusa mudança ou sumiço). Correção de uma mensagem existente
  (remetente errado, erro de transcrição): `node scripts/message-ids.mjs --accept-changes`,
  e o diff do fixture mostra exatamente quais ids mudaram.
- **Horário**: hora local de Brasília, **sem offset** (`2024-02-10T11:12:08`, nunca
  `…-03:00`). O export acrescenta o fuso. Um importador que receba `-03:00` ou UTC
  passa a mensagem por `normalise_message()`.
- **Data parcial**: `date` guarda só o que se sabe — `2024-07`, `2024` ou `sem-data` — com
  `date_precision` (`month`, `year`, `none`) e `timestamp: null`. Nunca preencher um
  dia ou mês inventado.
- **Hora desconhecida**: `time: null` e `timestamp: null` (não `00:00:00`, não `??`).
- **`type`**: `text`, `image`, `video`, `audio`, `sticker`, `document`, `deleted`, `call`,
  `system`, `contact`, `link`, `location`, `image_view_once`.
- **`sender`**: `DV` para as mensagens de Vorcaro; do outro lado, um **nome limpo** — o nome
  do contato sem os sufixos e números que o celular guardou ("Ana Matos", não "Ana Matos
  Mkt"; "Fabiano Zettel", não "Fabiano Zettel 1"; "Geraldo", não "Geraldo Brazil Journal").
  É o que sai assinando o "Compartilhar texto", a info da mensagem e o export. O nome
  salvo fica em `metadata.participants` (e `saved_as`), e o nome real no perfil do contato.
