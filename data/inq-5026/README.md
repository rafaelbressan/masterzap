# Inq 5.026 — representação da PF (Pet 16.032)

Terceira fonte de dados do MasterWhats, ao lado do export das conversas com Martha
Graeff (`data/messages.json`) e do relatório IPJ-A nº 3298613/2026
(`data/ipj-3298613/`).

## Documento

| | |
|---|---|
| Documento | Representação por medidas cautelares (monitoramento de ERBs e acesso a registros de chamadas) |
| Referência | INQ 5026, PET 16.032/DF |
| Unidade | CINQ/CGRC/DICOR/PF |
| Destinatário | Ministro André Mendonça |
| Data | 09/06/2026 |
| PDF | `data/source/Inq-5026-Representacao-PF-2026-06-09.pdf` (versionado no repo) — 98 páginas, sha256 `974533fa…5851f7af` |

O PDF é a cópia publicada pelo acervo Arkanto
(<https://arkanto.company/vorcaro/>), com a marca d'água dele em cada página. O
documento trata dos benefícios ligados ao senador Jaques Wagner e reproduz prints
da extração do celular de Daniel Vorcaro.

## O que foi transcrito

Só as conversas do celular de Vorcaro que o documento reproduz em print:

| Página | Conversa | Mensagens |
|---|---|---|
| 63 | `berg` — "Berg", José Alfredo Berg Filho (telefone tarjado no documento) | 14, de 11/09/2024 |

Como no IPJ-A, o texto das mensagens está dentro da imagem, então a transcrição é
manual. O print tem resolução baixa: quando um dígito fica entre duas leituras, a
mensagem leva uma `note` dizendo isso.

A página 64 cita mais mensagens da mesma conversa ("Algum que ninguém conheça",
"E tira o avião rápido de lá"...), mas só no texto corrido, sem horário nem print;
ficaram de fora. As demais conversas do documento são do celular de outras
pessoas.

## `mensagens.jsonl`

Uma linha por mensagem, no formato de `data/ipj-3298613/mensagens.jsonl`, com
`id` explícito: a mensagem guarda o mesmo id para sempre, e uma nova recebe o
maior id da conversa mais um, mesmo que seja mais antiga. Horário local de
Brasília, sem o `-03:00` que o print mostra.
