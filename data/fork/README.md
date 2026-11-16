# Conversas do fork 1uc4sm4theus/masterzap

Conversas que o fork tem e o MasterWhats não tinha. A regra é ter tudo o que o
fork tem, sem exceção. Fica de fora só o que não é do Vorcaro: os grampos do
Lula (`roberto-teixeira`).

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `conversas.json` | Uma entrada por conversa: o contato (`name`), como estava salvo (`saved_as`), o telefone, a fonte padrão (`source_id`) e o selo padrão (`verification`) |
| `mensagens.jsonl` | Uma linha por mensagem, no formato de `data/inq-5026/mensagens.jsonl`, com `id` explícito e estável |

## Fonte e selo

A fonte é a que o próprio fork registra. Cada conversa tem uma fonte padrão em
`data/sources.json` (`fork-<conversa>`), cujo `how` cita a descrição do fork
entre « ». A linha de outra origem traz `source_id` e `verification` próprios
(por exemplo, uma matéria citada dentro de uma conversa de prints).

| O que o fork registra | Selo |
|---|---|
| Print com marca d'água de veículo (Poder360, piauí, Arkanto), matéria citada | `imprensa` |
| Documento oficial sem o PDF (IPJ-A 270/276, relatório citado), atribuição ao IPJ-A 3298613 sem página | `nao-verificado` |
| Trecho "fornecido pelo usuário", sem veículo; ou nenhuma origem registrada | `nao-verificado` (fonte anônima) |
| Paráfrase, ou resumo feito pelo fork (`summary`) | `reconstruido` |

## Datas e horários

- Hora que o fork preencheu sem saber (`timestamp_placeholder`, `time_unknown`) fica
  desconhecida: `ts: null`.
- Data aproximada (`date_approx`, `date_placeholder`) fica só com o mês.
- O resto vai como o fork transcreveu, com as notas dele na `note` da mensagem.

## Tipos

`summary` vira aviso (`system`), `attachment` vira `document`, `forward` vira texto
encaminhado, `emoji` vira texto. Uma resposta (`reply_to_id`, `quoted`) vira
citação: o build acha a mensagem citada na conversa ou usa o autor que o fork dá.

## O que ainda não entrou

- Os grupos `g001`–`g004`: a tela ainda não mostra conversa em grupo.
- Os exports completos (Ana Matos, Flávio Carneiro, Fred Kachar, Lilian Tahan).
- As mensagens que o fork acrescentou a conversas que já existiam aqui:
  acrescentar a uma conversa existente ainda não é suportado pelo build.
