# Canal do MasterWhats

O canal na aba "Atualizações" do app: o que não é mensagem de ninguém, mas o
material cita (por ora, os voos). É do site, não do Vorcaro, e cada publicação
traz o selo da sua fonte, como as mensagens.

## `posts.json`

Uma publicação por voo, em ordem de data:

- `date` (`AAAA-MM-DD`, ou `AAAA-MM` quando o dia não é conhecido), `date_end`
  para uma viagem de vários dias, e `date_label`, a data como a fonte escreve.
- `legs`: as paradas, cada uma com `place` (o nome no mapa), `query` (o que o
  app de mapas do leitor procura: o aeroporto pelo nome), `lat`/`lng`, `time`
  quando a fonte dá a hora, e `approx` quando a fonte só dá a região
  ("Flórida", "Croácia"). As coordenadas são dos aeroportos (ou do centro da
  região), postas aqui; o resto vem da fonte.
- `mode`: `route` (um traçado da primeira à última parada), `places` (lugares
  sem ordem de voo, só os alfinetes) ou `none` (sem lugar: só o texto).
- `prefix`: a matrícula do avião, que o app procura nas conversas ("O PP-NLR
  aparece em 3 mensagens").
- `passengers`, `note`, `status` ("Cancelado", "Não realizado").
- `source_id` e `verification`, como nas mensagens.
- `fork`: o que a fonte escreveu (bloco, data, avião, trajeto), sem mudança.

Os 24 voos vêm da tela de voos do fork 1uc4sm4theus/masterzap, mais a viagem a
Courchevel e o trecho cancelado de novembro de 2025. O fork não dá a fonte de
cada trecho, por isso todos levam `fork-voos` e o selo "não verificado".

## Build

`scripts/build_channel.mjs`, depois de `split_data.py`, escreve
`public/data/canal.json`: acrescenta a cada voo quantas mensagens citam o
avião (contadas com a busca do próprio app, a mesma que o botão abre) e quais
passageiros têm conversa aqui. Recusa uma fonte que não exista e uma parada
sem coordenadas.

O mapa é desenhado pelo site (`src/lib/flight-map.js`) sobre o contorno do
mundo do Natural Earth (`public/assets/maps/world-50m.json`, do pacote
world-atlas); o navegador do leitor não pede nada a serviço de mapas.
