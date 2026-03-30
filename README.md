![MasterWhats — Conversas Vazadas de Daniel Vorcaro](public/assets/og-image.jpg)

# MasterWhats

> Visualizador interativo das 65.772 mensagens de WhatsApp vazadas entre Daniel Vorcaro (Banco Master) e Martha Graeff.

**[Acesse ao vivo: www.masterwhats.com.br](https://www.masterwhats.com.br/)**

---

Feito por **[Rafael Bressan](https://linkedin.com/in/rafaelbressan)** com **[Claude Code](https://claude.ai/code)**.


## Sobre o Projeto

Em março de 2026, mensagens de WhatsApp extraídas do celular apreendido de Daniel Vorcaro — ex-dono do Banco Master, preso pela Polícia Federal — foram vazadas para a imprensa. As 65.772 mensagens trocadas com sua então namorada Martha Graeff revelaram conexões com autoridades dos Três Poderes, apelidos carinhosos que viralizaram nas redes e detalhes do maior escândalo bancário da história do Brasil.

O MasterWhats transforma essas conversas em uma experiência de leitura no estilo WhatsApp Web: navegável, pesquisável e compartilhável.

### Origem do nome

O nome do repositório — **masterzap** — é uma referência ao projeto original [MasterZap](https://masterz4p.replit.app/), criado por **Lucas Matheus** no Replit com Grok. O MasterWhats foi construído a partir dessa inspiração, reimaginando a experiência com uma nova arquitetura e funcionalidades adicionais.

## Funcionalidades

- **Busca inteligente** — pesquisa com suporte a acentos e resultados em tempo real
- **Navegação por calendário** — salte para qualquer data entre fevereiro de 2024 e agosto de 2025
- **Compartilhamento via link direto** — clique com o botão direito em qualquer mensagem, copie o link e compartilhe. Quem clicar é levado direto para a mensagem exata na conversa — ideal para citar trechos específicos
- **Perfis investigativos** — biografia de Vorcaro e Martha com contexto e links para as reportagens
- **Menu de contexto** — copie texto, responda ou compartilhe qualquer mensagem
- **Links internos** — clique nos trechos citados pela imprensa e vá direto para a mensagem original
- **Totalmente responsivo** — experiência completa no celular e no desktop, um diferencial em relação ao [MasterZap](https://masterz4p.replit.app/) original

## Tecnologia

| Stack | Detalhe |
|-------|---------|
| **Frontend** | Vanilla JS — zero frameworks |
| **Build** | Vite |
| **Dados** | 65.772 mensagens divididas em arquivos JSON por data |
| **Carregamento** | Lazy loading com cache LRU por dia |
| **Deploy** | Vercel com headers de segurança (HSTS, CSP, X-Frame-Options) |
| **SEO** | Open Graph, Twitter Cards, JSON-LD, sitemap |

## Como Rodar Localmente

```bash
git clone https://github.com/rafaelbressan/masterzap.git
cd masterzap
npm install
npm run split-data    # Gera os arquivos JSON por data em public/data/
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
public/assets/        # Assets estáticos (favicon, background, SVGs)
data/                 # Dados originais (messages.json, index.json)
scripts/              # Scripts de build (split_data.py)
tests/unit/           # Testes unitários (Vitest)
tests/e2e/            # Testes E2E (Playwright)
```

## Limitações Conhecidas

- **Apenas mensagens de texto** — imagens, áudios, vídeos, stickers e documentos não foram incluídos no vazamento. As mensagens de mídia aparecem com placeholder indicando o tipo de conteúdo.
- **Uma conversa** — atualmente apenas as mensagens entre Vorcaro e Martha Graeff estão disponíveis. A arquitetura já suporta múltiplas conversas (veja o roadmap).

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
| Alta | Suporte a múltiplas conversas vazadas | Arquitetura pronta, ajustes no search e main.js |
| Alta | Cache de índice de busca por conversa | Módulo de busca usa estado global — precisa refatorar |
| Média | Busca cruzada entre conversas | Não iniciado |
| Média | Suporte a mídias (imagens, áudio, vídeo) | Aguardando disponibilidade do conteúdo |
| Média | Compartilhamento de intervalos de mensagens | Não iniciado |
| Baixa | Otimização para 100+ conversas (paginação, cache namespacing) | Não iniciado |

## Autor

Feito por **[Rafael Bressan](https://linkedin.com/in/rafaelbressan)** com **[Claude Code](https://claude.ai/code)**.

## Aviso Legal

As informações compiladas neste projeto são de domínio público, extraídas de reportagens jornalísticas e fontes abertas. Este projeto não tem vinculação com nenhuma das partes envolvidas.

---

## English Summary

**MasterWhats** is an interactive viewer for 65,772 leaked WhatsApp messages between Daniel Vorcaro (former owner of Banco Master, arrested by Brazil's Federal Police) and Martha Graeff. Built with vanilla JS and Vite, it features smart search with accent support, calendar navigation, direct message link sharing, investigative profiles, and a fully responsive WhatsApp Web-like interface optimized for mobile.

The repo name "masterzap" references the original [MasterZap](https://masterz4p.replit.app/) project by Lucas Matheus (built on Replit with Grok), which inspired this reimagined version.

**Contributions welcome** — new leaked conversations, media support, sharing improvements, and bug fixes. See the Roadmap section above. Only text messages are currently available; images, audio, and video were not part of the leak.

**[Live: www.masterwhats.com.br](https://www.masterwhats.com.br/)** | **Author: [Rafael Bressan](https://linkedin.com/in/rafaelbressan)**
