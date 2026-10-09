/**
 * Profile content for Daniel Vorcaro and the people he talked to.
 * Investigation sections with links to public reporting.
 *
 * Link format: {text}[url]
 * - External: {text}[https://...]
 * - Internal actions: {text}[action:contact-martha], {text}[action:profile-dv], {text}[action:search:term]
 *
 * Adding a contact profile for a new leak: write a `<NAME>_PROFILE` below and
 * register it in CONTACT_PROFILES under its conversation id. Conversations with
 * no entry render the contact drawer without an investigation section.
 *
 * `action:search:` terms must actually appear in that conversation's search
 * index — see scripts/split_data.py.
 */

export const VORCARO_PROFILE = {
  name: 'Daniel Vorcaro',
  avatar: '/assets/avatar-dv.jpg',
  phone: '+55 31 9XXXX-XXXX',
  sections: [
    {
      title: null,
      paragraphs: [
        { text: '{Daniel Bueno Vorcaro}[https://en.wikipedia.org/wiki/Daniel_Vorcaro], nascido em 6 de outubro de 1983 em Belo Horizonte, é um empresário brasileiro que atuava nos setores financeiro, imobiliário, saúde e varejo. Filho de Henrique Vorcaro, corretor de imóveis, e neto de Serafim Vorcaro, imigrante italiano e pastor protestante, a família é ligada à Igreja Batista da Lagoinha. Formado em Administração com MBA pelo IBMEC (2007), Vorcaro chegou a apresentar um programa gospel na Rede Super entre 2008 e 2009.' },
        { text: 'Em 2018, adquiriu o Banco Máxima de Saul Sabbá em parceria com os irmãos Conte e, em 2021, rebatizou a instituição como Banco Master. Sob sua gestão, o patrimônio líquido do banco cresceu de R$200 milhões para R$4,7 bilhões entre 2019 e 2024, e a carteira de crédito saltou de R$1,4 bilhão para R$40 bilhões.' },
      ],
    },
    {
      title: 'O Escândalo',
      paragraphs: [
        { text: 'O que veio a público como o {maior escândalo bancário da história do Brasil}[https://pt.wikipedia.org/wiki/Esc%C3%A2ndalo_do_Banco_Master] começou a se formar ainda em 2025, quando o banco crescia de forma acelerada com estruturas financeiras opacas. Investigações do Ministério Público Federal apontam que o banco utilizou uma empresa chamada "Tirreno", supostamente criada como fachada, para fabricar créditos fictícios que foram vendidos ao Banco de Brasília (BRB).' },
        { text: 'Em 17 de novembro de 2025, horas após o Banco Central ordenar a liquidação extrajudicial do Banco Master, Vorcaro foi {detido pela Polícia Federal no Aeroporto de Guarulhos}[https://www.brasildefato.com.br/2026/03/13/banco-master-a-reconstrucao-completa-de-como-uma-fraude-capturou-a-republica/] enquanto tentava embarcar em seu jato particular Falcon 7X com destino a Dubai, via Malta.' },
        { text: 'A {Operação Compliance Zero}[https://www.otempo.com.br/economia/2026/3/4/entenda-o-caso-do-banco-master-que-levou-daniel-vorcaro-a-prisao-pela-segunda-vez], deflagrada pela Polícia Federal, teve três fases. A terceira fase, em 4 de março de 2026, levou à {segunda prisão de Vorcaro}[https://www.jpn.up.pt/2026/03/16/quem-e-daniel-vorcaro-perguntas-e-respostas-sobre-o-escandalo-do-banco-master/], desta vez por indícios de ameaças a jornalistas, monitoramento ilegal e obstrução de justiça.' },
      ],
    },
    {
      title: 'As Conversas Vazadas',
      paragraphs: [
        { text: 'Em março de 2026, após a perícia nos celulares apreendidos de Vorcaro, {mensagens de WhatsApp trocadas com sua então namorada}[https://www.cnnbrasil.com.br/politica/veja-todas-as-conversas-de-vorcaro-que-vazaram-hoje-para-a-imprensa/] {Martha Graeff}[action:contact-martha] foram vazadas para a imprensa. Nas conversas, Vorcaro recebia informações confidenciais sobre investigações em andamento, comemorava reuniões com o presidente Lula e três ministros, e se vangloriava de sua proximidade com a alta cúpula do poder.' },
        { text: 'As mensagens também revelam que Vorcaro chamou o ex-presidente Bolsonaro de "idiota" após uma postagem sobre o Banco Master, e descreveu André Esteves, do BTG Pactual, com termos como "ardiloso" e "cínico". Os diálogos íntimos do casal {viralizaram nas redes sociais}[https://ndmais.com.br/justica/vorcaro-momolada-peleleca-conversas-martha-graeff/] por conta da linguagem afetiva com apelidos como "{colação}[action:search:colação]" e "{peleleca}[action:search:peleleca]", que dominaram a internet.' },
      ],
    },
    {
      title: 'Delação Premiada',
      paragraphs: [
        { text: 'Em 19 de março de 2026, Vorcaro assinou um {termo de confidencialidade com a PGR e a PF para iniciar um acordo de delação premiada}[https://www.cnnbrasil.com.br/politica/entenda-processo-de-delacao-premiada-que-vorcaro-podera-fazer-com-pf-e-pgr/]. A estimativa é que a delação aponte o envolvimento de até 15 nomes da política. As investigações também revelaram {conexões com autoridades dos Três Poderes}[https://www.metropoles.com/colunas/igor-gadelha/delacao-de-vorcaro-e-marcada-por-desconfianca-e-disputa-entre-pf-e-pgr].' },
      ],
    },
  ],
};

export const MARTHA_PROFILE = {
  about: '💕',
  sections: [
    {
      title: 'Sobre Martha Graeff',
      paragraphs: [
        { text: '{Martha Graeff}[https://www.infomoney.com.br/politica/martha-graeff-saiba-quem-e-a-ex-noiva-de-vorcaro-nao-localizada-para-depor-em-cpis/], nascida em 23 de agosto de 1985 em Porto Alegre, é empresária, ex-modelo e influenciadora digital. Mora nos Estados Unidos há cerca de 20 anos e atualmente vive em Miami. Acumula mais de 710 mil seguidores no Instagram.' },
        { text: 'Teve uma {passagem como repórter do Domingão do Faustão em 2011}[https://ndmais.com.br/justica/quem-e-martha-graeff-namorada-de-vorcaro/]. É cofundadora da marca de bem-estar Happy Aging e fundou a ONG Bazaar for Good. Em novembro de 2024, foi {capa da revista Forbes Life}[https://www.metropoles.com/celebridades/quem-e-martha-graeff-influenciadora-e-namorada-de-vorcaro].' },
      ],
    },
    {
      title: 'Relação com Vorcaro e as Conversas Vazadas',
      paragraphs: [
        { text: 'Martha e {Daniel Vorcaro}[action:profile-dv] {ficaram noivos em 2024 durante um evento na Itália}[https://timesbrasil.com.br/empresas-e-negocios/martha-graeff-quem-e-a-influenciadora-ligada-a-daniel-vorcaro/]. As conversas de WhatsApp, {extraídas do celular apreendido de Vorcaro}[https://www.gazetadopovo.com.br/ideias/vazamento-mensagens-vorcaro-processo/], tornaram-se o centro de enorme repercussão pública.' },
        { text: 'Em conversas mais tensas, {Martha admitiu ter sido amante de Vorcaro por seis meses}[https://ndmais.com.br/justica/fui-amante-pra-nada-martha-graeff-admite-em-mensagens-que-foi-amante-de-daniel-vorcaro/] antes de assumirem publicamente a relação. Martha {classificou a exposição como "grave violência"}[https://ndmais.com.br/justica/martha-graeff-quebra-o-silencio-sobre-mensagens-vazadas/]. Foi convocada para depor na {CPMI do INSS e na CPI do Crime Organizado}[https://istoe.com.br/martha-graeff-cpi-vorcaro], mas até o momento não foi localizada.' },
      ],
    },
  ],
};

export const MORAES_PROFILE = {
  about: 'Ocupado',
  ephemeral: '24 horas',
  sections: [
    {
      title: 'Sobre Alexandre de Moraes',
      paragraphs: [
        { text: '{Alexandre de Moraes}[https://ndmais.com.br/politica/quem-e-alexandre-de-moraes/], nascido em 13 de dezembro de 1968 em São Paulo, é ministro do Supremo Tribunal Federal desde 2017. Formado, doutor e livre-docente pela Faculdade de Direito do Largo de São Francisco (USP), foi promotor de Justiça, secretário de Segurança Pública de São Paulo e ministro da Justiça de Michel Temer — que o {indicou ao STF}[https://portal.stf.jus.br/textos/verTexto.asp?servico=bibliotecaConsultaProdutoBibliotecaPastaMinistro&pagina=AlexandreMoraesPrincipal] na vaga aberta pela morte de Teori Zavascki.' },
        { text: 'Presidiu o Tribunal Superior Eleitoral entre 2022 e 2024 e assumiu a vice-presidência do STF em setembro de 2025. É o ministro mais exposto da corte: relator do inquérito das fake news, dos atos de 8 de janeiro e da ação penal contra Jair Bolsonaro. É casado com a advogada {Viviane Barci de Moraes}[https://www.gazetadopovo.com.br/republica/por-que-as-acoes-do-escritorio-da-esposa-de-moraes-cresceram-500percent-no-stf/], sócia-diretora do escritório Barci de Moraes — o mesmo que aparece nos contratos com o Banco Master.' },
      ],
    },
    {
      title: 'O Relatório da PF',
      paragraphs: [
        { text: 'Em 1º de setembro de 2026, o ministro {André Mendonça derrubou o sigilo}[https://www.poder360.com.br/poder-justica/mendonca-retira-sigilo-de-acao-sobre-vorcaro-e-moraes/] da IPJ-A nº 3298613/2026 — 218 páginas produzidas pela Polícia Federal a partir do iPhone 17 Pro apreendido de {Daniel Vorcaro}[action:profile-dv] na Operação Compliance Zero. O relatório havia sido entregue em 27 de agosto, em resposta à ordem de Mendonça para identificar os integrantes da suposta rede de influência do banqueiro, inclusive detentores de foro privilegiado.' },
        { text: 'É esse documento que originou esta conversa. Diferente do vazamento com {Martha Graeff}[action:contact-martha], aqui não há um export de WhatsApp: o conteúdo foi reconstruído pela perícia e as mensagens abaixo saíram, uma a uma, das páginas do laudo. {Leia as íntegras dos documentos}[https://www.poder360.com.br/poder-justica/leia-as-integras-de-documentos-que-revelam-relacao-de-moraes-com-vorcaro/].' },
        { text: 'A PF é explícita ao delimitar o próprio trabalho: não fez diligências investigativas contra magistrados ou membros do Ministério Público, e o relatório {não conclui que Moraes cometeu crime}[https://www.congressoemfoco.com.br/noticia/121853/relatorio-da-pf-indica-sequencia-de-contatos-entre-vorcaro-e-moraes]. Juristas ouvidos pela imprensa também {apontaram uso político}[https://www.brasildefato.com.br/2026/09/01/entenda-o-caso-moraes-e-vorcaro-juristas-veem-uso-politico-e-crise-de-credibilidade/] na divulgação do material.' },
      ],
    },
    {
      title: 'As 52 Notas',
      paragraphs: [
        { text: 'O contato foi salvo como "Alexandre de Moraes BRASILIA" em dezembro de 2023, depois que o ex-ministro Fábio Faria compartilhou o número com Vorcaro. Em 17 de setembro de 2025, o chat passou a apagar tudo automaticamente a cada 24 horas.' },
        { text: 'Vorcaro então adotou um método: escrevia no bloco de notas do iPhone, tirava um print e mandava a imagem em visualização única — que some depois de aberta. A PF {reconstruiu o padrão}[https://www.cnnbrasil.com.br/blogs/jussara-soares/politica/como-a-pf-rastreou-as-mensagens-de-vorcaro-a-contato-atribuido-a-moraes/] cruzando os logs do sistema com os PDFs temporários que o iOS gera a cada captura de tela, e recuperou 52 notas enviadas entre 28 de outubro e 17 de novembro de 2025. As respostas do outro lado eram igualmente efêmeras e continuam ilegíveis.' },
        { text: 'O tom é de pedido de socorro e de proteção. Vorcaro relata que "{a turma do banco central}[action:search:banco central]" estava sob pressão da PF e do MP, pede para "reforçar com {Andrei}[action:search:Andrei] e Paulo" — em referência ao diretor-geral da PF e ao procurador-geral da República — e repete que só não pode haver "{sacanagem}[action:search:sacanagem]", palavra que aparece nove vezes.' },
        { text: 'Dois dias antes de ser preso, pergunta: "{Acha que segunda ja tenho que estar fora?}[action:search:estar fora]". Pede ainda um encontro com o presidente do Banco Central — "tentar que o {Galipolo}[action:search:Galipolo] me receba" — e insiste em saber se dava para "{bloquear}[action:search:bloquear]" a operação. Depois de um encontro presencial em 14 de novembro, escreve: "{tenho gratidao da minha vida a você}[action:search:gratidao]".' },
      ],
    },
    {
      title: 'Os Contratos com o Escritório Barci de Moraes',
      paragraphs: [
        { text: 'Em janeiro de 2024, Viviane Barci de Moraes enviou a Vorcaro a minuta de um contrato de prestação de serviços. O acordo previa 36 parcelas mensais de R$ 3 milhões líquidos — R$ 108 milhões líquidos, R$ 131,3 milhões brutos. Somados a um segundo contrato de R$ 50 milhões firmado em 2025, a PF {contabilizou R$ 208 milhões}[https://www.poder360.com.br/poder-justica/pf-encontra-contratos-de-r-208-mi-entre-vorcaro-e-barci-de-moraes/] entre o banqueiro e o escritório.' },
        { text: 'Os metadados do arquivo da minuta, reproduzidos no laudo, trazem como autor Guilherme Benazzi e, no campo "Última modificação por", o nome "Ministro Alexandre de Moraes".' },
        { text: 'Nas conversas internas do banco, Vorcaro trata esse pagamento como intocável. Chama o contrato de "o mais importante que temos", manda pagar "sem nota" e "do jeito que for", cobra a diretoria quando atrasa e, em 2025, ordena que ninguém mais tenha acesso ao documento. Parte do segundo contrato foi quitada com cotas de um jato Legacy 650 e de um helicóptero EC 155 B1.' },
        { text: 'Em nota, o escritório afirmou que o setor de compliance consultou o ministro sobre impedimentos legais antes da contratação e que, como ele nunca julgou caso envolvendo o Banco Master, o contrato foi assinado e os serviços prestados regularmente.' },
      ],
    },
    {
      title: 'O Fórum Jurídico de Londres',
      paragraphs: [
        { text: 'O relatório também descreve o I Fórum Jurídico Brasil de Ideias, realizado em Londres em abril de 2024 e bancado pelo Banco Master sem aparecer como realizador — "ideal nos convites nao sair o Banco como realizador do evento", escreve Vorcaro. As mensagens mostram {Moraes participando da montagem do evento}[https://www.metropoles.com/colunas/demetrio-vecchioli/dialogos-mostram-que-vorcaro-e-moraes-montaram-evento-juntos]: convidando pessoalmente outros ministros por WhatsApp, aprovando a lista de convidados, vetando nomes e reclamando da organização.' },
        { text: '"Deixa eu aprovar com alexandre", diz Vorcaro à equipe de marketing. Sobre um nome vetado: "Alexandre morre se vc fizer isso. Alias nos mata". Vorcaro chegou a pedir a um jornalista que incluísse na matéria que os ministros se reuniram em privado com o ex-primeiro-ministro Tony Blair.' },
        { text: 'A segunda edição, prevista para 2025, foi cancelada. Nas tratativas dela aparecem o procurador-geral {Paulo Gonet}[https://www.poder360.com.br/poder-justica/gonet-sobre-evento-com-vorcaro-que-tenha-charuto-e-macallan/] — cujo filho pediu para viajar com o grupo, com despesas pagas — e o diretor-geral da PF Andrei Rodrigues, que pediu convite formal para encaixar a viagem na agenda institucional.' },
      ],
    },
    {
      title: 'Repercussão',
      paragraphs: [
        { text: 'Mendonça formalizou a exigência de que a deliberação sobre o caso ocorra em {sessão pública e presencial}[https://ndmais.com.br/justica/mendonca-exige-sessao-publica-stf-mensagens-vorcaro-moraes/] do STF. Na oposição, senadores retomaram a pressão por impeachment e o líder Rogério Marinho anunciou novo pedido contra o ministro.' },
        { text: 'Até a publicação desta página, nem Moraes, nem Viviane Barci, nem a PGR, nem a defesa de Vorcaro haviam se manifestado sobre o conteúdo do relatório além da nota do escritório.' },
      ],
    },
  ],
};

/**
 * The other people in the report.
 *
 * Each one gets the same treatment: who they are, what they did in this case,
 * and a link into their own conversation. Where the press has not identified
 * someone — the drivers, the back-office staff — the report itself is the only
 * source, and the profile says so rather than inventing a biography.
 */
export const OTHER_PROFILES = {
  'fabio-faria': {
    about: 'Careca 19:30',
    sections: [{
      title: 'Fábio Faria',
      paragraphs: [
        { text: 'Ex-ministro das Comunicações do governo Bolsonaro (2020–2022), publicitário e ex-deputado federal pelo Rio Grande do Norte. É genro de Silvio Santos, casado com Patrícia Abravanel.' },
        { text: 'A PF o descreve como {o elo entre Vorcaro e o ministro}[https://www.cnnbrasil.com.br/blogs/jussara-soares/politica/fabio-faria-intermediou-contatos-entre-moraes-e-vorcaro-diz-pf/] {Alexandre de Moraes}[action:contact:alexandre-de-moraes]. Em dezembro de 2023 levou o banqueiro a um primeiro encontro e {compartilhou o telefone}[action:search@fabio-faria:contato] que Vorcaro salvaria como "Alexandre de Moraes BRASILIA". Depois disso passou a marcar os jantares, cuidar da logística e transmitir recados — sempre chamando o ministro de "Alex" ou "{careca}[action:search@fabio-faria:careca]", às vezes só pelo emoji de homem careca.' },
        { text: 'Também acompanhou a assinatura do contrato entre o Banco Master e o escritório da mulher do ministro ("{O careca não pode atrasar}[action:search@fabio-faria:careca não pode atrasar]", cobrou quando o pagamento atrasou) e as tratativas do fórum de Londres. {Não é alvo da investigação}[https://www.cartacapital.com.br/politica/fabio-faria-aparece-como-ponte-entre-vorcaro-e-moraes-em-mensagens-divulgadas-pela-pf/].' },
      ],
    }],
  },

  'vivi-moraes': {
    about: 'Barci de Moraes Sociedade de Advogados',
    sections: [{
      title: 'Viviane Barci de Moraes',
      paragraphs: [
        { text: 'Advogada, sócia-diretora do escritório Barci de Moraes, no Itaim Bibi, onde dois dos três filhos que teve com {Alexandre de Moraes}[action:contact:alexandre-de-moraes] também figuram como sócios. {Formada pela UNIP}[https://www.cnnbrasil.com.br/politica/quem-e-viviane-barci-de-moraes/], atua em direito constitucional, administrativo, penal e empresarial. Em 2025 foi incluída nas sanções americanas contra o marido.' },
        { text: 'É a contraparte dos contratos que a PF encontrou no celular de Vorcaro. Em 11 de janeiro de 2024 ela mesma {enviou a minuta}[action:search@vivi-moraes:MINUTA] pelo WhatsApp — 36 parcelas de R$ 3 milhões líquidos, R$ 108 milhões no total. Nos metadados do arquivo, o campo "Última modificação por" traz "Ministro Alexandre de Moraes".' },
        { text: 'Somados a um segundo contrato de R$ 50 milhões, a PF {contabilizou R$ 208 milhões}[https://www.poder360.com.br/poder-justica/pf-encontra-contratos-de-r-208-mi-entre-vorcaro-e-barci-de-moraes/]. Parte seria paga com cotas de um jato e um helicóptero; perguntada pela {Prime You}[action:contact:marcos-prime] se estava gostando de usar as aeronaves, {respondeu "estamos gostando muito"}[https://www.metropoles.com/colunas/andreza-matais/viviane-barci-de-moraes-a-vorcaro-estamos-gostando-muito]. Em nota, o escritório afirmou que o compliance consultou o ministro antes da contratação e que a negociação das aeronaves nunca foi concluída.' },
      ],
    }],
  },

  'ciro-soares': {
    about: 'Estou indo no PG agora',
    sections: [{
      title: 'Ciro Soares',
      paragraphs: [
        { text: 'Ciro Rocha Soares, advogado baiano. No relatório aparece como {uma das peças mais próximas de Vorcaro}[https://www.bnews.com.br/noticias/crime-e-justica-bahia/charuto-macallan-e-portas-abertas-ciro-soares-surge-como-peca-chave-de-vorcaro-em-relatorio-da-pf.html] nas articulações de bastidor com os tribunais superiores e o Ministério Público.' },
        { text: 'É por ele que o procurador-geral da República, {Paulo Gonet}[https://www.poder360.com.br/poder-brasil/pgr-pediu-a-vorcaro-para-bancar-ida-do-filho-para-londres-diz-pf/], entra na história: Ciro encaminhava mensagens e fotos do PGR ao banqueiro, avisou que "{o Gonet mandou msg pra vc}[action:search@ciro-soares:Gonet mandou]" e, em março de 2025, perguntou se "{o filho dele pode ir com a gente para Londres}[action:search@ciro-soares:filho dele]". Vorcaro respondeu "Obvio ne". Em abril de 2024 já contava ter pedido ao PGR que convencesse um candidato a desistir de uma eleição interna do MP — "{acabei de ligar para ele, ele vai desistir}[action:search@ciro-soares:desistir]".' },
        { text: 'Também repassou o recado de que a comitiva esperava "{charuto e macalan}[action:search@ciro-soares:macalan]" em Londres. Gonet {pediu a nulidade do relatório}[https://www.brasilemfolhas.com.br/2026/09/gonet-pede-nulidade-de-relatorio-da-pf-sobre-banqueiro-e-moraes/].' },
      ],
    }],
  },

  'marcio-conjur': {
    about: 'Consultor Jurídico',
    sections: [{
      title: 'Márcio Chaer',
      paragraphs: [
        { text: 'Jornalista e advogado, fundador e diretor da {Consultor Jurídico (ConJur)}[https://www.poder360.com.br/poder-justica/moraes-ajudou-a-organizar-evento-superexclusivo-de-vorcaro-em-londres/], veículo especializado em cobertura do Judiciário. Foi responsável por montar os painéis do fórum jurídico de Londres, em abril de 2024, bancado pelo Banco Master.' },
        { text: 'Salvo como "Marcio Conjur" na agenda de Vorcaro, é ele quem relata o trabalho de convencimento dos ministros: "{O Ministro Alexandre realmente mandou whatsApp para os colegas}[action:search@marcio-conjur:mandou whatsApp]", escreveu, contando que Gilmar Mendes recebeu o convite e que Luís Felipe Salomão iria "de qualquer forma" porque "{o Xandão nunca nega fogo}[action:search@marcio-conjur:nega fogo]". Reproduziu no chat a mensagem que Moraes enviou aos colegas convidando para o evento.' },
        { text: 'Vorcaro respondeu que o "{ideal nos convites nao sair o Banco como realizador}[action:search@marcio-conjur:realizador do evento]" — e Chaer concordou: "Sem dúvida". Foi também por ele que passou o {convite ao diretor-geral da PF}[action:search@marcio-conjur:andrei PF], Andrei Rodrigues, com "todas as despesas bancadas por nós".' },
      ],
    }],
  },

  'geraldo-brazil-journal': {
    about: 'Brazil Journal',
    sections: [{
      title: 'Geraldo Samor',
      paragraphs: [
        { text: 'Jornalista, fundador do {Brazil Journal}[https://braziljournal.com/], veículo de economia e negócios com forte penetração na Faria Lima. Ex-repórter da Veja e do Wall Street Journal.' },
        { text: 'A conversa com Vorcaro é curta e reveladora do que o banqueiro esperava da imprensa. Em 26 de abril de 2024, dia seguinte ao debate com Tony Blair em Londres, Vorcaro pede que a matéria mencione que "{antes do meu debate com o tony Blair, os 3 ministros do STF se reuniram privadamente}[action:search@geraldo-brazil-journal:Blair]" com o ex-primeiro-ministro — e diz explicitamente que "{Alexandre pediu}[action:search@geraldo-brazil-journal:Alexandre pediu]". O jornalista pede esclarecimento sobre o que exatamente deveria ser publicado.' },
        { text: 'Meses depois, um fundo controlado por {Fabiano Zettel}[action:contact:fabiano-zettel], cunhado de Vorcaro, {comprou 49,9% do Brazil Journal}[https://www.brasil247.com/midia/cunhado-de-vorcaro-investiu-em-participacao-acionaria-no-brazil-journal-a-biblia-da-faria-lima/]. Samor afirma ser sócio apenas de Flávio Carneiro, nega ligação com Vorcaro ou com o Master e diz manter independência editorial.' },
      ],
    }],
  },

  'fabiano-zettel': {
    about: 'Preso desde março',
    sections: [{
      title: 'Fabiano Zettel',
      paragraphs: [
        { text: 'Empresário, cunhado de Daniel Vorcaro. Foi {o maior doador das campanhas de Bolsonaro e Tarcísio}[https://www.poder360.com.br/poder-justica/saiba-o-que-e-conhecido-e-quem-ja-foi-alvo-da-pf-no-caso-master-2/] em 2022 e comprou, por meio de um fundo, {49,9% do Brazil Journal}[https://www.brasil247.com/midia/cunhado-de-vorcaro-investiu-em-participacao-acionaria-no-brazil-journal-a-biblia-da-faria-lima/] — o veículo dirigido por {Geraldo Samor}[action:contact:geraldo-brazil-journal].' },
        { text: 'Está preso desde março de 2026, alvo da Operação Compliance Zero.' },
        { text: 'No trecho que o relatório reproduz, em 8 de fevereiro de 2024, Vorcaro cobra dele o {contrato assinado com o escritório Barci de Moraes}[action:search@fabiano-zettel:BARCI] e pergunta quando venceria a primeira parcela. Zettel responde que era "{até o 5 dia útil}[action:search@fabiano-zettel:dia útil]" e que já havia passado — o pagamento entrou no fluxo naquele mesmo dia.' },
      ],
    }],
  },

  'diretor-paulo-sergio-bacen': {
    about: 'Ex-diretor de Fiscalização do BC',
    sections: [{
      title: 'Paulo Sérgio Neves de Souza',
      paragraphs: [
        { text: 'Economista, foi {diretor de Fiscalização do Banco Central}[https://timesbrasil.com.br/empresas-e-negocios/quem-e-paulo-sergio-neves-souza-ex-diretor-banco-central-preso-caso-master/] entre 2019 e 2023, na gestão de Roberto Campos Neto. Foi ele quem assinou a autorização para Vorcaro comprar o Banco Máxima — a operação que deu origem ao Banco Master.' },
        { text: 'Depois de deixar o BC, virou alvo da própria Compliance Zero: a PF apura {se atuava como consultor informal do banqueiro}[https://www.infomoney.com.br/brasil/ex-diretor-do-bc-e-alvo-da-pf-em-mesma-operacao-que-prendeu-vorcaro/], repassando informações sobre fiscalizações e procedimentos internos do órgão que regulava o Master. Foi preso e afastado por decisão do ministro André Mendonça.' },
        { text: 'O trecho no relatório é de 19 de março de 2025, num único dia: depois de uma ligação, Vorcaro escreve "{To com Moraes aqui rsrs}[action:search@diretor-paulo-sergio-bacen:Moraes aqui]". Na mesma noite dizia a {Martha Graeff}[action:contact:martha-graeff] a mesma coisa — "To com mi jstro aqui".' },
      ],
    }],
  },

  'leo-palhares': {
    about: 'Está sob controle',
    sections: [{
      title: 'Leonardo Palhares',
      paragraphs: [
        { text: 'Advogado, atuava para Vorcaro na estruturação de contratos. É dele o desenho jurídico do {segundo acordo com o escritório Barci de Moraes}[https://exame.com/brasil/esposa-de-moraes-tinha-contrato-com-outra-empresa-de-vorcaro-diz-pf/] — R$ 50 milhões em honorários pela Viking Participações, dos quais R$ 40 milhões seriam quitados com cotas de um jato Legacy 650 e de um helicóptero EC 155 B1.' },
        { text: 'As mensagens mostram a preocupação central dele não sendo o risco jurídico, mas o de imagem. Ao propor dois modelos de transferência, escreve que prefere entregar os ativos de uma vez porque isso tira Vorcaro do "{risco reputacional}[action:search@leo-palhares:risco reputacional]" de "não sabemos quem usando os ativos que estão em seu nome". Vorcaro corta: "{Os ativos sao deles}[action:search@leo-palhares:ativos sao deles]. Ja".' },
        { text: 'Também registra o entrave societário: o escritório "{não pode ser parte do contrato, não pode ter participação em empresas}[action:search@leo-palhares:participação em empresas]", e por isso buscavam uma estrutura alternativa. Meses depois, tranquiliza o banqueiro: "{Está sob controle}[action:search@leo-palhares:sob controle]".' },
      ],
    }],
  },

  'marcos-prime': {
    about: 'Prime You',
    sections: [{
      title: 'Marcus Matta',
      paragraphs: [
        { text: 'CEO e fundador da {Prime You}[https://www.cnnbrasil.com.br/politica/pf-vorcaro-negociou-cotas-de-jatinho-com-esposa-de-moraes/], empresa de compartilhamento de bens de luxo — e sócia de Vorcaro. O relatório da PF grafa o nome como "MARCOS DA MATA"; no celular estava salvo como "Marcos Prime".' },
        { text: 'É quem operava, na prática, as cotas de aeronave oferecidas ao escritório da mulher do ministro. Enviou a Vorcaro a {tabela de preços}[action:search@marcos-prime:Legacy] — US$ 5,5 milhões pela cota do Legacy 650, US$ 1,3 milhão pela do EC 155 B1 — e pediu para repassá-la a "ela", {Viviane Barci de Moraes}[action:contact:vivi-moraes].' },
        { text: 'Em julho de 2025 confirma que as aeronaves já estavam liberadas e em uso: "{Já usaram aviões e helicópteros}[action:search@marcos-prime:aviões e helicópteros]". Não cobrava a parte variável por causa da "{mudança de contrato de Barci para a outra empresa deles}[action:search@marcos-prime:mudança de contrato]". Encaminhou ainda o print da própria conversa com Viviane, em que ela responde "{estamos gostando muito}[action:search@marcos-prime:gostando muito]".' },
      ],
    }],
  },

  'thatiane-prime': {
    about: 'Verificando as possibilidades…',
    sections: [{
      title: 'Thatiane Garcia',
      paragraphs: [
        { text: 'Da Prime You, a empresa de aviação executiva sócia de Vorcaro. Cuidava da agenda dos voos e da produção dos eventos do banqueiro. Salva no celular como "Thatiane Prime".' },
        { text: 'A conversa abre em dezembro de 2023, com a montagem do almoço em Campos do Jordão para "{convidados ultra vips}[action:search@thatiane-prime:ultra vips]" — nove pessoas e quatro seguranças, com cantor e cavalos, a "{experiencia completa}[action:search@thatiane-prime:experiencia completa]". O convidado era o ministro Alexandre de Moraes.' },
        { text: 'Fecha em agosto de 2025 mostrando a prioridade das aeronaves. Precisando de um avião para Roraima, Vorcaro é avisado de que a única saída seria remanejar o voo já reservado para o escritório Barci. Ele desiste: "{Nao deixe de atender barci}[action:search@thatiane-prime:atender barci]. Pode manter o dele. Vou ver outra forma".' },
      ],
    }],
  },

  'ana-matos-mkt': {
    about: 'Deixa comigo',
    sections: [{
      title: 'Ana Matos',
      paragraphs: [
        { text: 'Trabalhava no marketing de Vorcaro e coordenou o Fórum Jurídico Londres Brasil de Ideias, apresentado formalmente pelo Grupo Voto e {bancado pelo Banco Master}[https://www.metropoles.com/colunas/demetrio-vecchioli/dialogos-mostram-que-vorcaro-e-moraes-montaram-evento-juntos].' },
        { text: 'É a conversa que melhor mostra o grau de controle do ministro sobre o evento. Vorcaro barra o envio de convites — "{Deixa eu aprovar com alexandre}[action:search@ana-matos-mkt:aprovar com alexandre]" — e Ana responde, sobre a programação, que "{segui todas as recomendações que vieram do Ministro}[action:search@ana-matos-mkt:vieram do Ministro]", inclusive nomes novos que não estavam na lista original. Sobre um convidado sugerido: "{Alexandre morre se vc fizer isso}[action:search@ana-matos-mkt:Alexandre morre]".' },
        { text: 'Ela também organiza o convite formal que o {diretor-geral da PF}[action:search@ana-matos-mkt:Andrei PF] precisava "para entrar agenda institucional dele", emite a passagem aérea do ministro a pedido do assessor dele, atende ao pedido de convite para a {filha de Moraes}[action:search@ana-matos-mkt:Giuliana] e, em julho de 2025, conta ter passado "{o dia aqui com Vivi Moraes e o ministro fechando o programa}[action:search@ana-matos-mkt:Vivi Moraes e o ministro]". Quando o evento é cobrado, Vorcaro avisa: "{Alexandre reclamou MUITO}[action:search@ana-matos-mkt:reclamou MUITO]".' },
      ],
    }],
  },

  'angelo-silva': {
    about: 'Preso na Compliance Zero',
    sections: [{
      title: 'Ângelo Antônio Ribeiro da Silva',
      paragraphs: [
        { text: 'Ex-sócio e tesoureiro do Banco Master. Teve a {prisão preventiva decretada}[https://www.poder360.com.br/poder-justica/alem-de-vorcaro-ex-socio-e-3-diretores-do-banco-master-sao-presos/] em 18 de novembro de 2025, na mesma leva que levou Vorcaro e outros diretores.' },
        { text: 'É por ele que passam as cobranças mais duras sobre o contrato do escritório da mulher do ministro. Em março de 2024, ao descobrir o atraso: "{Nao pagaram barci de moraes}[action:search@angelo-silva:Nao pagaram barci]. Nao to entendendo isso. Contrato mais importantw que temos. Te pedi pra nao falhar. Surreal. Vamos ter problemas". Vinte minutos depois o comprovante de R$ 3.422.268,14 estava no chat.' },
        { text: 'Ângelo responde que iriam "{pagar antecipado e depois pegamos a NF}[action:search@angelo-silva:pagar antecipado]". Em abril de 2025, Vorcaro pede que ele recolha o contrato: "{Ninguem ter acesso}[action:search@angelo-silva:Ninguem ter acesso]".' },
      ],
    }],
  },

  'alberto-felix': {
    about: 'Tesouraria — Banco Master',
    sections: [{
      title: 'Alberto Felix de Oliveira Neto',
      paragraphs: [
        { text: 'Superintendente executivo de Tesouraria do Banco Master. Também teve {prisão preventiva decretada}[https://www.congressoemfoco.com.br/noticia/113985/veja-quem-sao-os-executivos-do-banco-master-presos-pela-pf] na Operação Compliance Zero.' },
        { text: 'Em julho de 2025, com o banco já apertado, apresenta a Vorcaro R$ 42 milhões em contas atrasadas e propõe pagar só R$ 15 milhões naquele dia. A resposta define a ordem de prioridade: "{Paga 15 e inclui o barci moraes}[action:search@alberto-felix:inclui o barci]".' },
        { text: 'Em outubro, ao saber que o pagamento ao escritório saiu por Pix, Vorcaro reage: "{Mas nao faz barci pix ne}[action:search@alberto-felix:barci pix]". Alberto responde que foi para os mesmos dados da TED. "{Nao e bom}[action:search@alberto-felix:Nao e bom]", encerra o banqueiro.' },
      ],
    }],
  },

  'romy-banco-master': {
    about: 'Financeiro — Banco Master',
    sections: [{
      title: 'Romy',
      paragraphs: [
        { text: 'Trabalhava no financeiro do Banco Master e executava os pagamentos. Não é figura pública e não foi identificada pela imprensa: a única fonte sobre ela é o próprio relatório.' },
        { text: 'A conversa dura três minutos, em 15 de março de 2024, e é uma das mais citadas do relatório. Vorcaro instrui: "{esse barci moraes por favor nao deixe atrasar um dia}[action:search@romy-banco-master:nao deixe atrasar], coloca no seu controle. É o pgto mais importante que temos". Ela responde que já estava fazendo "neste instante".' },
        { text: 'Ele completa: "{Pode pagar sempre, sem nota}[action:search@romy-banco-master:sem nota]. Do jeito que for". Três minutos depois ela envia o comprovante. A frase virou {manchete quando o sigilo caiu}[https://ndmais.com.br/justica/vorcaro-cobrou-pagamento-a-mulher-de-moraes-sem-atrasos/].' },
      ],
    }],
  },

  'ana-claudia-financeiro': {
    about: 'Financeiro — Viking',
    sections: [{
      title: 'Ana Claudia',
      paragraphs: [
        { text: 'Do financeiro da Viking Participações, a empresa de Vorcaro que assinou o segundo contrato com o escritório Barci de Moraes. Não é figura pública; a única fonte é o relatório.' },
        { text: 'São quatro mensagens de 24 de julho de 2025, e todas dizem a mesma coisa. Ela encaminha a Fatura de Prestação de Serviços nº 01 do escritório — quatro parcelas, R$ 22,8 milhões líquidos, vencimento em 31 de julho — e avisa que "{Palhares está pedindo para pagar essa fatura}[action:search@ana-claudia-financeiro:Palhares está pedindo]" e que "{é prioridade}[action:search@ana-claudia-financeiro:prioridade]".' },
        { text: 'O Palhares em questão é {Leonardo Palhares}[action:contact:leo-palhares], o advogado que estruturou o acordo.' },
      ],
    }],
  },

  'leo-serrano': {
    about: 'Produção de eventos',
    sections: [{
      title: 'Leandro Serrano Giunchetti',
      paragraphs: [
        { text: 'Produtor dos eventos de Vorcaro e cavaleiro de hipismo. Salvo no celular como "Leo Serrano Giunchetti".' },
        { text: 'A conversa é de abril de 2024, na preparação de Londres, e o tom dele diz muito sobre quem estava sendo recebido. Pede orientação porque era a primeira vez que fazia um evento "{mais coorporativo}[action:search@leo-serrano:coorporativo]" para o banqueiro e que envolvia "{esse bando de gente importante e sensivel}[action:search@leo-serrano:gente importante]" — diferente dos eventos "só de diversão", em que se arriscava sozinho.' },
        { text: 'Detalha então a hierarquia do transporte: dois casais por V-Class para os convidados comuns, e "{os ministros mais sensiveis tipo Alexandre, Tofolli}[action:search@leo-serrano:mais sensiveis]" com um casal por S-Class.' },
      ],
    }],
  },

  'luiz-renno': {
    about: 'Estamos mantendo reservado',
    sections: [{
      title: 'Luiz Rennó',
      paragraphs: [
        { text: 'Empresário mineiro do círculo de Vorcaro. Aparece uma única vez no relatório, em 19 de abril de 2024, mas o trecho é dos mais diretos sobre como o fórum de Londres era vendido.' },
        { text: 'Vorcaro oferece a ida a ele e a um sócio: "{Semana que vem estou fazendo um evento super exclusivo com alexandre de moraes em londres}[action:search@luiz-renno:super exclusivo]". Manda o convite digital do Grupo Voto e pede discrição — "{Pede pra ele nao passar adiante}[action:search@luiz-renno:passar adiante]. Estamos mantendo reservado".' },
        { text: 'E explica o critério de quem entra: "{Concorrente dele nao vai pq nao se da c alexandre}[action:search@luiz-renno:Concorrente dele]". O evento foi {financiado pelo Banco Master}[https://www.poder360.com.br/poder-justica/vorcaro-do-banco-master-financiou-eventos-com-ministros-do-stf/] sem aparecer como realizador.' },
      ],
    }],
  },

  'stella-vorcaro': {
    about: 'Família',
    sections: [{
      title: 'Stella Vorcaro',
      paragraphs: [
        { text: 'Da família do banqueiro. Não é figura pública e não responde por nada no caso — aparece no relatório por duas mensagens que a PF usou apenas para datar um encontro.' },
        { text: 'Em 5 de novembro de 2024, depois de uma chamada de 46 segundos, Vorcaro escreve: "{To com alexandre moraes}[action:search@stella-vorcaro:alexandre moraes] 😂".' },
        { text: 'É o mesmo padrão que a perícia encontrou nas conversas com {Martha Graeff}[action:contact:martha-graeff] e com o {diretor do Banco Central}[action:contact:diretor-paulo-sergio-bacen]: o banqueiro anunciando a pessoas próximas, em tempo real, que estava com o ministro. Foi assim que a PF conseguiu {mapear ao menos seis encontros presenciais}[https://www.brasilemfolhas.com.br/2026/09/pf-identifica-seis-reunioes-privadas-entre-moraes-e-dono-de-banco/].' },
      ],
    }],
  },

  'michael': {
    about: 'Campos do Jordão',
    sections: [{
      title: 'Michael',
      paragraphs: [
        { text: 'Trabalhava na operação do hotel de Vorcaro em Campos do Jordão. Não é figura pública; a única fonte é o relatório.' },
        { text: 'Toda a conversa é de 30 de dezembro de 2023, o dia do almoço para o ministro. Vorcaro acompanha minuto a minuto e orienta a não parecer forçado: "{Nao precisa ficar indo em todos locais dentro dacasa}[action:search@michael:forçado] pra nao ficar forçado demais. Deixa ser bem natural".' },
        { text: 'À noite, Michael relata o incidente: um funcionário tirou foto com o convidado e trocou telefone. Vorcaro reage mal — "{Isso nao podia ne}[action:search@michael:nao podia]" — até saber quem tinha pedido. Michael explica que "{o ministro pediu para tirar fotos com todos}[action:search@michael:pediu para tirar fotos]", e o banqueiro recua: "{Mas se foi o ministro que pediu tudo bem}[action:search@michael:foi o ministro que pediu]".' },
      ],
    }],
  },

  'gustavo-motorista': {
    about: 'Motorista — São Paulo',
    sections: [{
      title: 'Gustavo',
      paragraphs: [
        { text: 'Motorista de Vorcaro em São Paulo. Não é figura pública; a única fonte é o relatório.' },
        { text: 'As seis mensagens são de 21 de dezembro de 2023 — o dia do primeiro encontro, intermediado por {Fábio Faria}[action:contact:fabio-faria]. A segurança do anfitrião pediu o modelo e a placa do carro para autorizar a entrada na garagem, e é Gustavo quem confirma os dados: "{Range Rover Vogue}[action:search@gustavo-motorista:Range Rover]".' },
        { text: 'Em seguida Vorcaro repassa o endereço — "{Tucumã 99}[action:search@gustavo-motorista:Tucumã]" — e avisa: "Vamos nesse endereço agora".' },
      ],
    }],
  },

  'motorista-brasilia-sidney': {
    about: 'Brasília',
    sections: [{
      title: 'Sidney',
      paragraphs: [
        { text: 'Motorista e caseiro de Vorcaro em Brasília. Não é figura pública; a única fonte é o relatório.' },
        { text: 'A conversa é de 26 de fevereiro de 2025 e tem uma linha só que importa. Às 14h04, Sidney avisa: "{Min Alexandre chegou}[action:search@motorista-brasilia-sidney:Min Alexandre chegou]".' },
        { text: 'À noite, com mais convidados na porta, Vorcaro orienta onde acomodá-los: "{Poe na varanda}[action:search@motorista-brasilia-sidney:varanda]". A mensagem das 14h04 é uma das que permitiram à PF datar os encontros na casa do banqueiro.' },
      ],
    }],
  },

  'dv-self': {
    about: 'Mensagens salvas',
    sections: [{
      title: 'Daniel Vorcaro para ele mesmo',
      paragraphs: [
        { text: 'Não é um contato: é a conversa que o WhatsApp abre para a pessoa consigo mesma, usada como bloco de rascunho.' },
        { text: 'Tem uma mensagem só, de 13 de maio de 2025 — o {contrato da Viking Participações}[action:search@dv-self:VIKING], que ele salvou para si e, horas depois, encaminhou a {Leonardo Palhares}[action:contact:leo-palhares]. É o segundo contrato com o escritório Barci de Moraes, o que seria pago com o jato e o helicóptero.' },
        { text: 'O padrão de escrever para si antes de enviar é o mesmo que a perícia identificou nas 52 notas ao {ministro}[action:contact:alexandre-de-moraes] — com a diferença de que ali o intermediário era o aplicativo Notas e uma captura de tela.' },
      ],
    }],
  },
};

/**
 * Contact profiles by conversation id. A conversation without an entry simply
 * renders no investigation section.
 */
export const CONTACT_PROFILES = {
  'martha-graeff': MARTHA_PROFILE,
  'alexandre-de-moraes': MORAES_PROFILE,
  ...OTHER_PROFILES,
};

/** @returns {object|null} the profile for a conversation id, if there is one. */
export function getContactProfile(conversationId) {
  return CONTACT_PROFILES[conversationId] || null;
}

export const SOURCES = [
  { label: 'Wikipedia (EN) — Daniel Vorcaro', url: 'https://en.wikipedia.org/wiki/Daniel_Vorcaro' },
  { label: 'Wikipedia (PT) — Escândalo do Banco Master', url: 'https://pt.wikipedia.org/wiki/Esc%C3%A2ndalo_do_Banco_Master' },
  { label: 'Brasil de Fato — Reconstrução completa da fraude', url: 'https://www.brasildefato.com.br/2026/03/13/banco-master-a-reconstrucao-completa-de-como-uma-fraude-capturou-a-republica/' },
  { label: 'CNN Brasil — Todas as conversas vazadas', url: 'https://www.cnnbrasil.com.br/politica/veja-todas-as-conversas-de-vorcaro-que-vazaram-hoje-para-a-imprensa/' },
  { label: 'CNN Brasil — Processo de delação premiada', url: 'https://www.cnnbrasil.com.br/politica/entenda-processo-de-delacao-premiada-que-vorcaro-podera-fazer-com-pf-e-pgr/' },
  { label: 'Gazeta do Povo — Vazamento e impacto no processo', url: 'https://www.gazetadopovo.com.br/ideias/vazamento-mensagens-vorcaro-processo/' },
  { label: 'ND Mais — Quem é Martha Graeff', url: 'https://ndmais.com.br/justica/quem-e-martha-graeff-namorada-de-vorcaro/' },
  { label: 'ND Mais — Conversas improváveis do casal', url: 'https://ndmais.com.br/justica/vorcaro-momolada-peleleca-conversas-martha-graeff/' },
  { label: 'InfoMoney — Ex-noiva não localizada para CPIs', url: 'https://www.infomoney.com.br/politica/martha-graeff-saiba-quem-e-a-ex-noiva-de-vorcaro-nao-localizada-para-depor-em-cpis/' },
  { label: 'O Tempo — Segunda prisão de Vorcaro', url: 'https://www.otempo.com.br/economia/2026/3/4/entenda-o-caso-do-banco-master-que-levou-daniel-vorcaro-a-prisao-pela-segunda-vez' },
  { label: 'Poder360 — Íntegras dos documentos que revelam a relação de Moraes com Vorcaro', url: 'https://www.poder360.com.br/poder-justica/leia-as-integras-de-documentos-que-revelam-relacao-de-moraes-com-vorcaro/' },
  { label: 'Poder360 — Mendonça retira o sigilo da ação', url: 'https://www.poder360.com.br/poder-justica/mendonca-retira-sigilo-de-acao-sobre-vorcaro-e-moraes/' },
  { label: 'Poder360 — PF encontra contratos de R$ 208 mi com o escritório Barci de Moraes', url: 'https://www.poder360.com.br/poder-justica/pf-encontra-contratos-de-r-208-mi-entre-vorcaro-e-barci-de-moraes/' },
  { label: 'Poder360 — Vorcaro pediu a Moraes encontro com Galípolo', url: 'https://www.poder360.com.br/poder-justica/vorcaro-pediu-a-moraes-encontro-com-galipolo-para-resolver-tudo/' },
  { label: 'CNN Brasil — Como a PF rastreou as mensagens de Vorcaro', url: 'https://www.cnnbrasil.com.br/blogs/jussara-soares/politica/como-a-pf-rastreou-as-mensagens-de-vorcaro-a-contato-atribuido-a-moraes/' },
  { label: 'Congresso em Foco — Sequência de contatos entre Vorcaro e Moraes', url: 'https://www.congressoemfoco.com.br/noticia/121853/relatorio-da-pf-indica-sequencia-de-contatos-entre-vorcaro-e-moraes' },
  { label: 'Metrópoles — Diálogos mostram Vorcaro e Moraes montando evento juntos', url: 'https://www.metropoles.com/colunas/demetrio-vecchioli/dialogos-mostram-que-vorcaro-e-moraes-montaram-evento-juntos' },
  { label: 'Brasil de Fato — Entenda o caso Moraes e Vorcaro', url: 'https://www.brasildefato.com.br/2026/09/01/entenda-o-caso-moraes-e-vorcaro-juristas-veem-uso-politico-e-crise-de-credibilidade/' },
  { label: 'ND Mais — Mendonça exige sessão pública no STF', url: 'https://ndmais.com.br/justica/mendonca-exige-sessao-publica-stf-mensagens-vorcaro-moraes/' },
  { label: 'ND Mais — Quem é Alexandre de Moraes', url: 'https://ndmais.com.br/politica/quem-e-alexandre-de-moraes/' },
];

export const CREDITS = 'Projeto feito por {Rafael Bressan}[https://linkedin.com/in/rafaelbressan] com Claude Code. {Código-fonte no GitHub}[https://github.com/rafaelbressan/masterzap]. As informações aqui compiladas são de domínio público, extraídas de reportagens jornalísticas e fontes abertas. Este projeto não tem vinculação com nenhuma das partes envolvidas.';

/**
 * Parse inline links in text. Format: {link text}[url]
 * - External URLs → <a href="url" target="_blank">
 * - action: URLs → <a href="#" data-action="...">
 */
export function parseLinks(text) {
  // `code` — a path, a header name, a status — set apart in monospace.
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  return text.replace(/\{([^}]+)\}\[([^\]]+)\]/g, (_, linkText, url) => {
    if (url.startsWith('action:')) {
      return `<span data-action="${url}" class="profile-action-link">${linkText}</span>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener">${linkText}</a>`;
  });
}
