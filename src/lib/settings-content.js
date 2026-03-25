/**
 * Settings/About content for the MasterWhats Settings drawer.
 * Uses {text}[action:search:term] for internal search links.
 */

export const SETTINGS_CONTENT = {
  sections: [
    {
      title: 'Sobre o Projeto',
      paragraphs: [
        { text: 'MasterWhats é um visualizador interativo das 65.772 mensagens de WhatsApp vazadas entre Daniel Vorcaro, ex-dono do Banco Master, e Martha Graeff. O projeto replica a interface do WhatsApp Web, permitindo navegar, buscar e explorar as conversas que abalaram a república.' },
        { text: 'Funcionalidades: busca com suporte a acentos, navegação por data com calendário, perfis com contexto investigativo, links internos que levam diretamente aos trechos citados pela imprensa, detalhes de mensagens individuais e interface responsiva.' },
      ],
    },
    {
      title: 'Contexto',
      paragraphs: [
        { text: 'O {vazamento das conversas}[https://ndmais.com.br/justica/vorcaro-momolada-peleleca-conversas-martha-graeff/] se tornou o centro de uma onda de memes nas redes sociais. A linguagem íntima do casal, com apelidos infantilizados como "{colação}[action:search:colação]" e "{peleleca}[action:search:peleleca]", alcançou o topo dos assuntos mais comentados. Em diversas mensagens, o casal troca a letra "R" pela "L", imitando o Cebolinha da Turma da Mônica — "{PALAAAAAAA AGOLAAAA}[action:search:PALAAAAA]".' },
        { text: 'As falas de Vorcaro revelam uma vida de extrema influência. Ele relatou ter dado um "{discurso}[action:search:discurso]" para "{ministros}[action:search:ministros]" do STF e STJ, descreveu jantares em um "{inner circle}[action:search:inner circle]" exclusivo, e se gabou de que o presidente do "{Banco Central}[action:search:banco central]" comentou sobre sua "{casa de Miami}[action:search:casa de Miami]". Martha reagia com admiração, chamando a vida dele de "{surreal}[action:search:surreal]".' },
      ],
    },
    {
      title: 'Destaques: Poder e Influência',
      paragraphs: [
        { text: '"{Fala que eu sou a anarquia do sistema}[action:search:anarquia do sistema]" — Vorcaro descrevendo a si mesmo após encontros com autoridades.' },
        { text: '"{Acredita que o presidente bacen ja falou da nossa casa}[action:search:bacen]" — o presidente do Banco Central comentando sobre a residência de Vorcaro em Miami.' },
        { text: '"{Acredita que um cara do middle east ofereceu 100mm de dolares}[action:search:middle east]" — oferta milionária por um barco.' },
        { text: '"{Vou ter que mudar urgente pra miami}[action:search:mudar urgente pra miami]" — planos de mudança às pressas.' },
      ],
    },
    {
      title: 'Destaques: Guerra com André Esteves',
      paragraphs: [
        { text: 'Vorcaro descreveu André Esteves do BTG Pactual como "{ardiloso}[action:search:ardiloso]" e relatou que a "{guerra com andre}[action:search:guerra com andre]" ficou exposta.' },
        { text: '"{Andre disse que era o maior banqueiro do mundo}[action:search:maior banqueiro]". Vorcaro afirmou ter "{provas de quase todas}[action:search:provas de quase todas]" as acusações contra políticos.' },
      ],
    },
    {
      title: 'Destaques: Política',
      paragraphs: [
        { text: '"{O pior de ontem foi ter o bolsonaro}[action:search:bolsonaro]" — Vorcaro chamou o ex-presidente de "{idiota}[action:search:idiota]" após uma postagem sobre o Banco Master.' },
        { text: 'Reuniões com "{Ciro}[action:search:ciro]" Nogueira, menções à "{Interpol}[action:search:Interpol]" e ao "{reporter da folha}[action:search:reporter da folha]" que ligou perguntando sobre o barco.' },
      ],
    },
    {
      title: 'Destaques: Linguagem Afetiva',
      paragraphs: [
        { text: '"{Mora no meu colação}[action:search:colação]" — apelido que aparece 26 vezes nas conversas.' },
        { text: '"{Peleleca vai estar cabelo branco e eu chupando}[action:search:peleleca]" — o termo que dominou as redes.' },
        { text: '"{O meu vc ja roubou pra sempre}[action:search:roubou pra sempre]" e "{querendo ficar horas no seu cangote}[action:search:cangote]" — declarações de Vorcaro.' },
        { text: '"{Abstinencia do meu amor}[action:search:abstinencia]" — Martha sobre a saudade. "Igual droga."' },
      ],
    },
    {
      title: 'Destaques: Conteúdo Íntimo',
      paragraphs: [
        { text: '"{Fiquei ali de amante pra nada?}[action:search:amante pra nada]" — Martha admitindo ter sido amante por 6 meses antes do casal assumir publicamente.' },
        { text: '"{Você dentro de mim devagarinho}[action:search:dentro de mim devagarinho]", "{Fico toda molhada só de pensar}[action:search:toda molhada]" e "{Não usei o brinquedo mas usei o dedo}[action:search:brinquedo mas usei o dedo]" — trechos íntimos que viralizaram.' },
      ],
    },
    {
      title: 'Destaques: Momentos Surreais',
      paragraphs: [
        { text: 'A palavra "{surreal}[action:search:surreal]" aparece 91 vezes nas conversas — é a expressão mais repetida pelo casal para descrever sua vida.' },
        { text: 'Vorcaro foi ao "{hospital}[action:search:hospital]" por questões emocionais, e o casal compartilhava gostos musicais como "{Gilsons}[action:search:Gilsons]" e "{Rubel}[action:search:Rubel]".' },
      ],
    },
  ],
};

export const SETTINGS_CREDITS = 'Projeto feito por Rafael Bressan com Claude Code. As informações aqui compiladas são de domínio público, extraídas de reportagens jornalísticas e fontes abertas.';
