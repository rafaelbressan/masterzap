# Pet 15.497 — representação da PF sobre o RioPrevidência

Quarta fonte de dados do MasterWhats, ao lado do export das conversas com Martha
Graeff (`data/messages.json`), do relatório IPJ-A nº 3298613/2026
(`data/ipj-3298613/`) e da representação no Inq 5.026 (`data/inq-5026/`).

## Documento

| | |
|---|---|
| Documento | Representação da Polícia Federal ao STF sobre os aportes do RioPrevidência em letras financeiras do Banco Master e a relação de Daniel Vorcaro com o então governador Cláudio Castro |
| Referência | Pet 15.497 |
| PDF | **não localizado** |

O documento não foi encontrado em nenhum lugar público: não está no fork
`1uc4sm4theus/masterzap`, de onde vêm as mensagens, nem no Poder360, nem no acervo
Arkanto (<https://arkanto.company/vorcaro/>), que tem o Inq 5.026. Sem o PDF, as
mensagens não puderam ser conferidas contra o original. Por isso a conversa leva o
selo `nao-verificado`, e não `verificado`: o esquema (`scripts/message_schema.py`)
recusa `verificado` numa fonte sem o PDF no repositório. Se o documento aparecer,
ele entra em `data/source/` com o sha256, e cada mensagem é conferida e
promovida.

## O que entrou

A transcrição do fork, que cita a página de cada mensagem:

| Conversa | Mensagens | Páginas |
|---|---|---|
| `mauricio-quadrado` — Maurício Quadrado | 12 da representação + 10 do UOL | 38 |
| `marcelo-terra-firme` — Marcelo Terra Firme | 6 | 45 |
| `ricardo-gordo-siqueira-rodrigues` — Ricardo Siqueira Rodrigues | 30 | 28 a 62 |
| `augusto-lima` — Augusto Lima (salvo como "Augusto Ebal") | 36 da representação + 7 de outras fontes | 42 a 61 |

As 10 mensagens de fevereiro e maio de 2024 de Maurício Quadrado vêm da coluna de
Natália Portinari no UOL (13/11/2026), que cita um relatório da PF. Cada uma leva
`source_id: uol-portinari-2026-11-13` e o selo `imprensa`. Duas não têm horário na
reportagem (uma também não tem o dia): ficam com `ts: null` e a data que se sabe.

Sete mensagens da conversa de Augusto Lima não vêm da representação. Entram
também, cada uma com a fonte que o fork registrou e o selo que diz o quanto se
sabe:

- cinco citadas por matérias (Veja, CNN via Brasil 247, FOCO MT), selo `imprensa`.
  O fork não guardou o link das matérias;
- um trecho "fornecido pelo usuário", sem veículo: fonte anônima, selo
  `nao-verificado`;
- uma paráfrase, em que o fork descreve a mensagem sem o texto dela: selo
  `reconstruido`, com nota.

A representação cita também conversas que já tínhamos do relatório IPJ-A: Romy,
Leo Serrano e Luiz Rennó. Essas 108 linhas são acréscimos a elas (ver
"Acréscimos" em `data/README.md`): cada uma traz `after`, a mensagem que vem
antes dela no mesmo dia, e na tela leva o selo desta fonte. Quando o fork diz que
o trecho aparece em mais de uma página, a nota diz qual.

## `mensagens.jsonl`

Uma linha por mensagem, no formato de `data/inq-5026/mensagens.jsonl`, com `id`
explícito e estável. Horário local de Brasília, sem offset. Campos a mais:
`source_id` e `verification` numa linha de outra fonte, e `date` quando `ts` é
`null`.
