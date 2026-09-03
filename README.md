![MasterWhats — Conversas Vazadas de Daniel Vorcaro](public/assets/og-image.jpg)

# MasterWhats

> Visualizador interativo das 66.387 mensagens de WhatsApp extraídas dos celulares apreendidos de Daniel Vorcaro (Banco Master), em 24 conversas — de Martha Graeff a Alexandre de Moraes.

**[Acesse ao vivo: www.masterwhats.com.br](https://www.masterwhats.com.br/)**

---

Feito por **[Rafael Bressan](https://linkedin.com/in/rafaelbressan)** com **[Claude Code](https://claude.ai/code)**.


## Sobre o Projeto

As mensagens vêm dos celulares apreendidos de Daniel Vorcaro — ex-dono do Banco Master, preso pela Polícia Federal em novembro de 2025 — e chegaram ao público em dois momentos, por caminhos diferentes:

- **Março de 2026 — as conversas com Martha Graeff.** 65.772 mensagens trocadas com a então noiva vazaram para a imprensa e revelaram conexões com autoridades dos Três Poderes, apelidos que viralizaram nas redes e detalhes do maior escândalo bancário da história do Brasil.
- **Setembro de 2026 — o relatório da PF sobre Alexandre de Moraes.** Caiu o sigilo da IPJ-A nº 3298613/2026, em que a Polícia Federal reconstrói, a partir do iPhone de Vorcaro, seus contatos com o ministro do STF e outras 22 pessoas. Não é um export de WhatsApp: as mensagens estavam em imagens dentro do laudo e foram transcritas uma a uma — veja [`data/ipj-3298613/README.md`](data/ipj-3298613/README.md).

O MasterWhats transforma essas conversas em uma experiência de leitura no estilo WhatsApp Web: navegável, pesquisável e compartilhável. Cada contato tem um perfil que explica quem é a pessoa, o que o material revela e de onde vem a informação. Um novo vazamento entra como mais uma conversa.

### Origem do nome

O nome do repositório — **masterzap** — é uma referência ao projeto original [MasterZap](https://www.reddit.com/r/brasil/s/xQeqrG27p8), criado por **Lucas Matheus** no Replit com Grok. O MasterWhats foi construído a partir dessa inspiração, reimaginando a experiência com uma nova arquitetura e funcionalidades adicionais.

## Funcionalidades

- **Busca inteligente** — pesquisa com suporte a acentos e resultados em tempo real
- **Navegação por calendário** — salte para qualquer data entre fevereiro de 2024 e agosto de 2025
- **Compartilhamento via link direto** — clique com o botão direito em qualquer mensagem, copie o link e compartilhe. Quem clicar é levado direto para a mensagem exata na conversa — ideal para citar trechos específicos
- **Perfis investigativos** — biografia de Vorcaro e Martha com contexto e links para as reportagens
- **Menu de contexto** — copie texto, responda ou compartilhe qualquer mensagem
- **Links internos** — clique nos trechos citados pela imprensa e vá direto para a mensagem original
- **Totalmente responsivo** — experiência completa no celular e no desktop, um diferencial em relação ao [MasterZap](https://www.reddit.com/r/brasil/s/xQeqrG27p8) original

## Tecnologia

| Stack | Detalhe |
|-------|---------|
| **Frontend** | Vanilla JS — zero frameworks |
| **Build** | Vite |
| **Dados** | 66.387 mensagens em 24 conversas, divididas em arquivos JSON por data |
| **Carregamento** | Lazy loading com cache LRU por dia |
| **Deploy** | Vercel com headers de segurança (HSTS, CSP, X-Frame-Options) |
| **SEO** | Open Graph, Twitter Cards, JSON-LD, sitemap |

## Como Rodar Localmente

```bash
git clone https://github.com/rafaelbressan/masterzap.git
cd masterzap
npm install
npm run split-data    # Gera os arquivos JSON por data em public/data/
npm run export        # Gera o export limpo (Markdown, JSON, zip) em public/export/
npm run prerender     # Depois do vite build: páginas /chat/<id>, llms-full.txt e sitemap em dist/
npm run dev           # Inicia o servidor de desenvolvimento
```

### Outros comandos

```bash
npm run build         # Build de produção
npm run preview       # Preview do build
npm run test          # Testes unitários (Vitest)
npm run test:e2e      # Testes E2E (Playwright)
```

## Estrutura do Projeto

```
src/                  # Código-fonte (styles, lib, components)
public/data/          # Dados por data (gitignored, gerado por split-data)
public/export/        # Export limpo por conversa e completo (gitignored, gerado por export)
public/assets/        # Assets estáticos (favicon, background, SVGs)
data/                 # Dados originais (messages.json, index.json)
scripts/              # Scripts de build (split_data.py)
tests/unit/           # Testes unitários (Vitest)
tests/e2e/            # Testes E2E (Playwright)
```

## Exportar os dados

Tudo que o site mostra sai limpo, sem precisar do site:

- **Por conversa** — no menu `⋮` de cada chat, "Exportar (.md)" ou "Exportar (.json)".
- **Tudo** — no menu `⋮` da lista de conversas, "Exportar tudo (.zip)": os 24 pares `.md`/`.json` mais um `README.md`.
- **Por URL** — `/export/masterwhats-<conversa>.md`, `/export/masterwhats-<conversa>.json`, `/export/masterwhats.md`, `/export/masterwhats.json`, `/export/masterwhats-export.zip`.

O `.md` se explica sozinho: proveniência (fonte, documento e seu sha256, período, fuso), quem é o contato com fontes, e as mensagens dia a dia — as do relatório da PF citam `laudo p. N, fig. M`. O `.json` traz os mesmos metadados e perfil, mais todas as mensagens com os campos originais e `timestamp` com fuso (`-03:00`). Gerado no build por `scripts/export.mjs`, que importa os perfis do próprio app para não descolar.

## API e MCP

Os mesmos arquivos do site com nome estável — `/api/v1/…` — servidos da CDN, sem chave e sem limite; são `rewrites` no `vercel.json` gerados de **uma tabela** (`src/lib/api-routes.js`) que também alimenta a página `/api`, o `llms.txt` e o servidor MCP. O MCP (`api/mcp.js`, `mcp-handler`, Streamable HTTP, sem auth) tem cota por cliente pra ninguém consumir o dia do site sozinho. Os consolidados vão pro GitHub Releases (`scripts/publish-bulk.sh`). Tudo explicado em `⋮ → API/MCP` no app ou em https://www.masterwhats.com.br/api.

## Limitações Conhecidas

- **Apenas mensagens de texto** — imagens, áudios, vídeos, stickers e documentos não foram incluídos nos vazamentos. As mensagens de mídia aparecem com placeholder indicando o tipo de conteúdo.
- **Conversas do relatório da PF são trechos** — exceto a de Alexandre de Moraes, as outras 22 aparecem no laudo apenas nos pontos que a PF citou; a conversa completa não consta do documento.

Se novas mídias ou conversas se tornarem públicas, o projeto está preparado para incorporá-las.

## Contribua

Pull requests são bem-vindos! Algumas formas de contribuir:

- **Correções e melhorias** — bugs, acessibilidade, performance
- **Novas conversas vazadas** — se outros diálogos se tornarem públicos, o sistema de dados suporta expansão
- **Mídias** — se imagens, áudios ou documentos forem disponibilizados, há espaço para integrá-los
- **Funcionalidades de compartilhamento** — novas formas de citar e compartilhar trechos
- **Insights e análises** — visualizações, estatísticas, destaques automáticos

O projeto usa **Vitest** para testes unitários e **Playwright** para testes E2E. Rode `npm run test` antes de abrir um PR.

## Roadmap

A arquitetura já está ~80% preparada para escalar. O `DataStore` é agnóstico por conversa, o router suporta `#/chat/{conversationId}` para qualquer diálogo, e o sidebar renderiza uma lista dinâmica.

| Prioridade | Item | Status |
|------------|------|--------|
| Alta | Suporte a múltiplas conversas vazadas | Feito — 24 conversas de duas fontes |
| Alta | Cache de índice de busca por conversa | Feito — cache por conversa |
| Média | Busca cruzada entre conversas | Não iniciado |
| Média | Suporte a mídias (imagens, áudio, vídeo) | Aguardando disponibilidade do conteúdo |
| Média | Compartilhamento de intervalos de mensagens | Não iniciado |
| Baixa | Otimização para 100+ conversas (paginação, cache namespacing) | Não iniciado |

## Aviso Legal

O MasterWhats é um projeto pessoal de visualização de dados, sem fins comerciais e sem vínculo com nenhuma das pessoas, empresas ou instituições citadas. Reproduz material que já era público — reportagens e um documento oficial cujo sigilo foi levantado judicialmente — e não atesta a veracidade dos fatos narrados nas mensagens. Transcrições podem conter erros; pedidos de correção ou remoção são atendidos pelas issues. Texto completo, com as referências legais: https://www.masterwhats.com.br/legal (fonte única em `src/lib/legal-content.js`).

---

## English Summary

**MasterWhats** is an interactive viewer for 66,387 WhatsApp messages recovered from the seized phones of Daniel Vorcaro (former owner of Banco Master, arrested by Brazil's Federal Police), across 24 conversations: the leaked exchanges with Martha Graeff and the Federal Police report on his contacts with Supreme Court Justice Alexandre de Moraes, unsealed in September 2026. Built with vanilla JS and Vite, it features smart search with accent support, calendar navigation, direct message link sharing, investigative profiles, and a fully responsive WhatsApp Web-like interface optimized for mobile.

The repo name "masterzap" references the original [MasterZap](https://www.reddit.com/r/brasil/s/xQeqrG27p8) project by Lucas Matheus (built on Replit with Grok), which inspired this reimagined version.

**Contributions welcome** — new leaked conversations, media support, sharing improvements, and bug fixes. See the Roadmap section above. Only text messages are currently available; images, audio, and video were not part of the leaks.

**[Live: www.masterwhats.com.br](https://www.masterwhats.com.br/)** | **Author: [Rafael Bressan](https://linkedin.com/in/rafaelbressan)**
