# Conversas do fork 1uc4sm4theus/masterzap

Conversas que o fork tem e o MasterWhats não tinha. A regra é ter tudo o que o
fork tem, sem exceção. Fica de fora só o que não é do Vorcaro: os grampos do
Lula (`roberto-teixeira`).

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `conversas.json` | Uma entrada por conversa: o contato (`name`), como estava salvo (`saved_as`), o telefone, a fonte padrão (`source_id`), o selo padrão (`verification`) e, quando a observação padrão não serve, `note` (as conversas completas dos exports) |
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
- Dentro de um dia, a ordem é a do fork: uma mensagem sem hora fica onde ele a pôs
  (onde está no print), e não no começo do dia. O índice por dia usa o menor e o
  maior id do dia, então a ordem na tela não precisa seguir os ids.

## Ids

Uma mensagem guarda o id para sempre. Ao reconverter o fork, a mensagem que já
estava aqui (mesma conversa, data, remetente e texto) fica com o id que tinha, e
a nova recebe o próximo. Linhas idênticas guardam os ids na ordem.

## Nome e anexos

- `saved_as` é o nome salvo no celular. Quando o fork guardou ali o nome do
  arquivo (`acm-neto`), fica o nome da pessoa: aquilo não é nome salvo.
- Um anexo que o fork descreve como objeto vira o nome do arquivo (`filename`/`name`),
  e a descrição vai para a nota.

## Tipos

`summary` vira aviso (`system`), `attachment` vira `document`, `forward` vira texto
encaminhado, `emoji` vira texto. Uma resposta (`reply_to_id`, `quoted`) vira
citação: o build acha a mensagem citada na conversa ou usa o autor que o fork dá.

## Acréscimos a conversas que já existiam

O fork também acrescentou mensagens a 11 conversas que já tínhamos de outras
fontes (Moraes, Ciro Soares, Fábio Faria, Luiz Rennó e outras). As de 10 delas
estão em `mensagens.jsonl`, com o `conv` da conversa existente, que não aparece
em `conversas.json`; as da Romy vêm todas da Pet 15.497 e estão só em
`data/pet-15497/`. Cada linha traz `source_id` e `verification` próprios e
`after`, a mensagem que vem antes dela no mesmo dia, na ordem do fork (ver
"Acréscimos" em `data/README.md`). As que citam a representação da Pet 15.497
estão em `data/pet-15497/`.

- Fonte: a que o fork registra na linha (`source_cite`, `source_ref`, `source`).
  Sem nenhuma, vale o que o fork diz da conversa, como fonte anônima
  (`fork-<conversa>-capturas-de-tela-sem-origem-registrada…`).
- Mensagens reconstruídas do banco de busca do WhatsApp (ChatSearchV5f, palavras
  embaralhadas e ordem deduzida) ficam `reconstruido`.
- Uma chamada ou aviso sem lado (o fork não diz quem ligou) vira aviso no meio
  da conversa.
- Quando a mensagem respondida não está na conversa e o fork não diz quem a
  escreveu, o autor vem do contexto, com nota; se o contexto não decide, a
  citação vai para a nota e a bolha fica sem ela.
- O horário que só tem hora e minuto, ou segundos ilegíveis, fica com `:00` e
  nota.

## Exportações completas (IPED)

Quatro conversas inteiras, de exportações HTML de ferramenta forense (IPED) que
o fork recebeu sem dizer de quem nem onde foram publicadas (os HTML não estão no
fork): Ana Matos (13.940 acrescentadas às 99 do laudo), Flávio Carneiro (8.799),
Fred Kachar (2.022) e Lilian Tahan (912). Fonte `iped-<conversa>`, selo
`nao-verificado`; uma linha com fonte melhor fica com ela (as do laudo seguem
verificadas; as quatro do Flávio citadas pela BBC News Brasil são `imprensa`).

- Formatos que o app desenha: contato vira `[cartão de contato] Nome — telefone`,
  localização `[localização] Latitude: … / Longitude: … — lugar`, documento
  `[anexo] título`; mídia sem arquivo fica sem texto ("Foto", "Áudio").
- Reações ficam em `reactions` ([{emoji, by}]) nos dados e no export; a bolha
  ainda não as desenha.
- Os dados pessoais vão como o fork tem: ele tarjou CPFs e e-mails na Ana Matos e
  telefones no Fred Kachar.
- O export da Ana Matos termina em 03/09/2025 com "[Chat continua...]".

## Grupos

Os quatro grupos do fork (Macallan, Ciro Daniel Fábio Hugo, Reunião semanal,
Master), 20 mensagens publicadas pela imprensa (UOL; o Macallan, pela Veja, que
o próprio trecho cita). Em `conversas.json`, um grupo traz `members` (todos menos
o dono do celular) e `group` (quem criou, configurações); as mensagens nomeiam
quem escreveu. O app desenha o grupo como o WhatsApp: nome e foto de quem
escreve na primeira bolha de cada sequência, a lista de membros no cabeçalho e
no "Info do grupo".

## Áudios

Quatro gravações do fork tocam nas mensagens de áudio a que pertencem
(`audio_src`, arquivos em `public/audio/`, sem os metadados): Flávio Bolsonaro
(msg 4, Metrópoles), Nikolas Ferreira (msg 3; os metadados do arquivo creditam
a rádio Itatiaia), Walfrido Warde (msg 5; os metadados creditam a Veja, no X,
e a mensagem passou a levar essa fonte e o selo de imprensa) e André Valadão
(msgs 30 e 31, o mesmo arquivo: o fork tinha duas cópias idênticas). A duração
vai em `duration`. O áudio da Lagoinha veio sem transcrição; a das msgs 30 e 31
foi feita aqui (Whisper large-v3, revisada na escuta) e leva
`transcribed_by: "MasterWhats"`, que a bolha mostra ("transcrição do
MasterWhats"). Ficaram fora, por escopo, o áudio de Lula e Dilma e o de Silas
Malafaia, que fala com Bolsonaro (anistia, a carta de Trump) e não com Vorcaro.
