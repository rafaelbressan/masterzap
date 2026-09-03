/**
 * Settings/About content for the MasterWhats Settings drawer.
 *
 * Link format, same as profile-content.js:
 * - External: {text}[https://...]
 * - Search the open conversation: {text}[action:search:term]
 * - Search a specific one: {text}[action:search@conversation-id:term]
 * - Open a contact drawer: {text}[action:contact:conversation-id]
 *
 * Structure: the project sections come first, then one "O vazamento…" block per
 * leak, newest first, each followed by its own "Destaques" sections. A new leak
 * slots in as another block — nothing above it needs rewriting.
 */

export const SETTINGS_CONTENT = {
  sections: [
    {
      title: 'Sobre o Projeto',
      paragraphs: [
        { text: 'MasterWhats é um visualizador das conversas extraídas dos celulares apreendidos de Daniel Vorcaro, ex-dono do Banco Master, na Operação Compliance Zero. São 66.387 mensagens em 24 conversas, de dezembro de 2023 a novembro de 2025 — navegáveis, pesquisáveis e compartilháveis no estilo WhatsApp Web.' },
        { text: 'O material chegou ao público em dois momentos, por caminhos diferentes: o vazamento das conversas com Martha Graeff, em março de 2026, e o relatório da Polícia Federal sobre os contatos com o ministro Alexandre de Moraes, cujo sigilo caiu em setembro de 2026. Cada conversa traz, no perfil do contato, quem é a pessoa e o que aquele material revela.' },
        { text: 'Busca com suporte a acentos e resultados em tempo real. Calendário para navegar por data. Compartilhamento por link direto — quem clicar cai na mensagem exata. Menu de contexto em cada mensagem. Responsivo no desktop e no celular.' },
      ],
    },

    // ── Vazamento 2: relatório da PF sobre Alexandre de Moraes ──
    {
      title: 'O relatório sobre Alexandre de Moraes',
      paragraphs: [
        { text: 'Em 1º de setembro de 2026, o ministro {André Mendonça derrubou o sigilo}[https://www.poder360.com.br/poder-justica/mendonca-retira-sigilo-de-acao-sobre-vorcaro-e-moraes/] da IPJ-A nº 3298613/2026 — 218 páginas em que a Polícia Federal reconstrói, a partir do iPhone apreendido de Vorcaro, sua relação com o ministro {Alexandre de Moraes}[action:contact:alexandre-de-moraes] e com outras autoridades.' },
        { text: 'Não é um export de WhatsApp: as mensagens estavam em imagens dentro do laudo e foram transcritas uma a uma. Vorcaro escrevia no bloco de notas do iPhone, tirava um print e enviava em visualização única — a PF {recuperou 52 dessas notas}[https://www.cnnbrasil.com.br/blogs/jussara-soares/politica/como-a-pf-rastreou-as-mensagens-de-vorcaro-a-contato-atribuido-a-moraes/] cruzando logs do sistema. As respostas do outro lado eram igualmente efêmeras e continuam ilegíveis.' },
        { text: 'A PF ressalva que não fez diligências contra magistrados e que o relatório não conclui pela prática de crime. Juristas também {apontaram uso político}[https://www.brasildefato.com.br/2026/09/01/entenda-o-caso-moraes-e-vorcaro-juristas-veem-uso-politico-e-crise-de-credibilidade/] na divulgação.' },
      ],
    },
    {
      title: 'Destaques: O Pedido de Socorro',
      paragraphs: [
        { text: '"{Acha que segunda ja tenho que estar fora?}[action:search@alexandre-de-moraes:estar fora]" — dois dias antes de ser preso no aeroporto.' },
        { text: '"{É importante reforçar com Andrei e Paulo pra nao deixar ninguem de baixo fazer uma sacanagem}[action:search@alexandre-de-moraes:Andrei]" — em referência ao diretor-geral da PF e ao procurador-geral da República. A palavra "{sacanagem}[action:search@alexandre-de-moraes:sacanagem]" aparece nove vezes.' },
        { text: '"{Conseguiu bloquear a maldade e sacanagem?}[action:search@alexandre-de-moraes:bloquear]" e "{tentar que o Galipolo me receba}[action:search@alexandre-de-moraes:Galipolo]" — pedidos de intervenção junto ao Banco Central.' },
        { text: '"{Voce sabe que tenho gratidao da minha vida a você}[action:search@alexandre-de-moraes:gratidao]" — depois de um encontro presencial, três dias antes da prisão.' },
      ],
    },
    {
      title: 'Destaques: Contratos e Eventos',
      paragraphs: [
        { text: 'A PF {contabilizou R$ 208 milhões}[https://www.poder360.com.br/poder-justica/pf-encontra-contratos-de-r-208-mi-entre-vorcaro-e-barci-de-moraes/] em contratos entre o Banco Master e o escritório Barci de Moraes, da esposa do ministro. Nos metadados da minuta, o campo "Última modificação por" traz "Ministro Alexandre de Moraes".' },
        { text: '"{É o pgto mais importante que temos}[action:search@romy-banco-master:mais importante]" e "{Pode pagar sempre, sem nota}[action:search@romy-banco-master:sem nota]" — Vorcaro à diretoria, sobre o contrato do escritório.' },
        { text: '"{Alexandre morre se vc fizer isso}[action:search@ana-matos-mkt:Alexandre morre]" — sobre um convidado vetado no {fórum jurídico de Londres}[https://www.metropoles.com/colunas/demetrio-vecchioli/dialogos-mostram-que-vorcaro-e-moraes-montaram-evento-juntos], bancado pelo banco sem aparecer como realizador.' },
        { text: '"{O Gonet perguntou se o filho dele pode ir com a gente para Londres?}[action:search@ciro-soares:filho dele]" — o procurador-geral aparece nas tratativas do evento, {charuto e Macallan}[https://www.poder360.com.br/poder-justica/gonet-sobre-evento-com-vorcaro-que-tenha-charuto-e-macallan/] inclusos.' },
      ],
    },

    // ── Vazamento 1: conversas com Martha Graeff ──
    {
      title: 'O vazamento das conversas com Martha Graeff',
      paragraphs: [
        { text: 'Em março de 2026, {as conversas de Vorcaro com a então noiva}[https://ndmais.com.br/justica/vorcaro-momolada-peleleca-conversas-martha-graeff/] {Martha Graeff}[action:contact:martha-graeff] vazaram para a imprensa — 65.772 mensagens que viraram o centro de uma onda de memes. A linguagem íntima do casal, com apelidos como "{colação}[action:search@martha-graeff:colação]" e "{peleleca}[action:search@martha-graeff:peleleca]", alcançou o topo dos assuntos mais comentados. Em várias mensagens eles trocam o "R" pelo "L", imitando o Cebolinha — "{PALAAAAAAA AGOLAAAA}[action:search@martha-graeff:PALAAAAA]".' },
        { text: 'Por trás do meme, as falas revelam uma vida de influência. Vorcaro relatou ter dado um "{discurso}[action:search@martha-graeff:discurso]" para "{ministros}[action:search@martha-graeff:ministros]" do STF e do STJ, descreveu jantares em um "{inner circle}[action:search@martha-graeff:inner circle]" exclusivo e se gabou de que o presidente do "{Banco Central}[action:search@martha-graeff:banco central]" comentou sobre sua "{casa de Miami}[action:search@martha-graeff:casa de Miami]". Martha reagia chamando a vida dele de "{surreal}[action:search@martha-graeff:surreal]".' },
      ],
    },
    {
      title: 'Destaques: Poder e Influência',
      paragraphs: [
        { text: '"{Fala que eu sou a anarquia do sistema}[action:search@martha-graeff:anarquia do sistema]" — Vorcaro descrevendo a si mesmo após encontros com autoridades.' },
        { text: '"{Acredita que o presidente bacen ja falou da nossa casa}[action:search@martha-graeff:bacen]" — o presidente do Banco Central comentando sobre a residência de Vorcaro em Miami.' },
        { text: '"{Acredita que um cara do middle east ofereceu 100mm de dolares}[action:search@martha-graeff:middle east]" — oferta milionária por um barco.' },
        { text: '"{Vou ter que mudar urgente pra miami}[action:search@martha-graeff:mudar urgente pra miami]" — planos de mudança às pressas.' },
      ],
    },
    {
      title: 'Destaques: Guerra com André Esteves',
      paragraphs: [
        { text: 'Vorcaro descreveu André Esteves do BTG Pactual como "{ardiloso}[action:search@martha-graeff:ardiloso]" e relatou que a "{guerra com andre}[action:search@martha-graeff:guerra com andre]" ficou exposta.' },
        { text: '"{Andre disse que era o maior banqueiro do mundo}[action:search@martha-graeff:maior banqueiro]". Vorcaro afirmou ter "{provas de quase todas}[action:search@martha-graeff:provas de quase todas]" as acusações contra políticos.' },
      ],
    },
    {
      title: 'Destaques: Política',
      paragraphs: [
        { text: '"{O pior de ontem foi ter o bolsonaro}[action:search@martha-graeff:bolsonaro]" — Vorcaro chamou o ex-presidente de "{idiota}[action:search@martha-graeff:idiota]" após uma postagem sobre o Banco Master.' },
        { text: 'Reuniões com "{Ciro}[action:search@martha-graeff:ciro]" Nogueira, menções à "{Interpol}[action:search@martha-graeff:Interpol]" e ao "{reporter da folha}[action:search@martha-graeff:reporter da folha]" que ligou perguntando sobre o barco.' },
      ],
    },
    {
      title: 'Destaques: Linguagem Afetiva',
      paragraphs: [
        { text: '"{Mora no meu colação}[action:search@martha-graeff:colação]" — apelido que aparece 26 vezes nas conversas.' },
        { text: '"{Peleleca vai estar cabelo branco e eu chupando}[action:search@martha-graeff:peleleca]" — o termo que dominou as redes.' },
        { text: '"{O meu vc ja roubou pra sempre}[action:search@martha-graeff:roubou pra sempre]" e "{querendo ficar horas no seu cangote}[action:search@martha-graeff:cangote]" — declarações de Vorcaro.' },
        { text: '"{Abstinencia do meu amor}[action:search@martha-graeff:abstinencia]" — Martha sobre a saudade. "Igual droga."' },
      ],
    },
    {
      title: 'Destaques: Conteúdo Íntimo',
      paragraphs: [
        { text: '"{Fiquei ali de amante pra nada?}[action:search@martha-graeff:amante pra nada]" — Martha admitindo ter sido amante por 6 meses antes do casal assumir publicamente.' },
        { text: '"{Você dentro de mim devagarinho}[action:search@martha-graeff:dentro de mim devagarinho]", "{Fico toda molhada só de pensar}[action:search@martha-graeff:toda molhada]" e "{Não usei o brinquedo mas usei o dedo}[action:search@martha-graeff:brinquedo mas usei o dedo]" — trechos íntimos que viralizaram.' },
      ],
    },
    {
      title: 'Destaques: Momentos Surreais',
      paragraphs: [
        { text: 'A palavra "{surreal}[action:search@martha-graeff:surreal]" aparece 91 vezes nas conversas — é a expressão mais repetida pelo casal para descrever sua vida.' },
        { text: 'Vorcaro foi ao "{hospital}[action:search@martha-graeff:hospital]" por questões emocionais, e o casal compartilhava gostos musicais como "{Gilsons}[action:search@martha-graeff:Gilsons]" e "{Rubel}[action:search@martha-graeff:Rubel]".' },
      ],
    },
  ],
};

import { LEGAL_SHORT } from './legal-content.js';

export const SETTINGS_CREDITS = 'Projeto feito por {Rafael Bressan}[https://linkedin.com/in/rafaelbressan] com Claude Code. {Código-fonte no GitHub}[https://github.com/rafaelbressan/masterzap]. As informações aqui compiladas são de domínio público, extraídas de reportagens jornalísticas e de documentos cujo sigilo foi levantado judicialmente.';

/** The legal notice, short form, as the last section of the About drawer. */
SETTINGS_CONTENT.sections.push({ title: 'Aviso legal', paragraphs: [{ text: LEGAL_SHORT }] });
