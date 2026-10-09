/**
 * The legal notice, in one place.
 *
 * Everything the site says about what it is, where its material comes from,
 * what it does and does not claim, and how to ask for a correction or a
 * removal. The full text is a page of its own (#/legal, /legal); the short
 * form goes wherever the site hands content to someone — the About drawer,
 * the exports, the API page, llms.txt, the README.
 *
 * Plain Portuguese on purpose. This is a draft for a lawyer to review, not a
 * substitute for one; the legal references are the ones commonly invoked for
 * this kind of publication in Brazil and are named so that a reviewer can
 * check each.
 *
 * Same link format as the other content files: {text}[https://…].
 */

export const LEGAL_VERSION = '2026-09-03';
export const LEGAL_CONTACT = 'https://github.com/rafaelbressan/masterzap/issues';

/** One paragraph, for footers and credits. */
export const LEGAL_SHORT = 'O MasterWhats é um projeto pessoal de visualização de dados, sem fins comerciais e sem vínculo com nenhuma das pessoas, empresas ou instituições citadas. Reproduz material que já era público — reportagens e um documento oficial cujo sigilo foi levantado judicialmente — e não atesta a veracidade dos fatos narrados nas mensagens. Transcrições podem conter erros; pedidos de correção ou remoção são atendidos. {Aviso legal completo}[https://www.masterwhats.com.br/legal].';

export const LEGAL_INTRO = {
  title: 'Aviso legal',
  sub: `O que este site é, de onde vem o material e o que ele não afirma · versão de ${LEGAL_VERSION}`,
};

export const LEGAL_SECTIONS = [
  {
    title: 'O que este site é',
    paragraphs: [
      { text: 'O MasterWhats é um projeto pessoal, feito como passatempo, de visualização de dados e experimentação técnica: uma interface no estilo do WhatsApp Web para ler, buscar e citar um conjunto de mensagens que se tornou público no caso do Banco Master. É mantido por uma pessoa física, Rafael Bressan, sem equipe, sem patrocínio e sem qualquer receita — não há anúncios, assinaturas, venda de dados ou cobrança de qualquer natureza.' },
      { text: 'O site não é um veículo de imprensa, não é parte em nenhum processo e não tem vínculo — profissional, comercial, político ou pessoal — com Daniel Vorcaro, com o Banco Master, com as pessoas que aparecem nas conversas, com os órgãos públicos, escritórios de advocacia, empresas, partidos ou instituições mencionados, nem com a Meta ou o WhatsApp, cuja interface serve apenas de inspiração visual. "MasterWhats" não é um produto de nenhuma dessas partes.' },
    ],
  },
  {
    title: 'De onde vem o material',
    paragraphs: [
      { text: 'Todo o conteúdo reproduz material que já era público no momento em que foi incorporado ao site, e que o site não obteve por meios próprios nem de fontes reservadas. São duas origens: as mensagens divulgadas pela imprensa em março de 2026, a partir de conversas extraídas de aparelhos apreendidos pela Polícia Federal; e o relatório de análise da Polícia Federal (IPJ-A nº 3298613/2026) cujo sigilo foi levantado por decisão do Supremo Tribunal Federal em 1º de setembro de 2026, transcrito a partir das imagens que compõem o documento.' },
      { text: 'Cada conversa informa sua origem. As mensagens do relatório citam a página e a figura do documento de onde foram lidas, e o próprio documento é identificado por seu hash, para que qualquer pessoa confira a transcrição contra a fonte. As informações de contexto nos perfis vêm de reportagens públicas, citadas com link.' },
      { text: 'O site se apoia na liberdade de expressão e no direito de acesso à informação garantidos pela Constituição (art. 5º, IV, IX e XIV), e no caráter público de documentos judiciais cujo sigilo foi levantado. Não publica nada que esteja sob sigilo.' },
    ],
  },
  {
    title: 'Veracidade: o que o site não afirma',
    paragraphs: [
      { text: 'O site não afirma que os fatos narrados nas mensagens são verdadeiros. Ele reproduz, com a maior fidelidade possível, o que consta do material público — o que alguém escreveu a alguém, não o que de fato aconteceu. Uma mensagem é evidência de que foi escrita, não do seu conteúdo.' },
      { text: 'As transcrições do relatório da Polícia Federal foram feitas manualmente, a partir de imagens, e podem conter erros de leitura, omissões, trocas de remetente e imprecisões de data e hora. Os placeholders de mídia — foto, áudio, documento, localização — indicam que algo existiu e não foi recuperado; o conteúdo dessas mídias não faz parte do material público e não é reproduzido.' },
      { text: 'Os títulos, resumos, "destaques" e perfis são leitura editorial do autor sobre o material e sobre a cobertura da imprensa, e não conclusões sobre condutas. O índice de pessoas citadas é construído por apelidos e pode atribuir uma menção à pessoa errada; cada página diz por qual apelido cada menção foi encontrada.' },
      { text: 'Nada aqui constitui acusação, imputação de crime ou juízo sobre a conduta de quem quer que seja. Todas as pessoas citadas são presumidas inocentes (Constituição, art. 5º, LVII). A própria Polícia Federal ressalva, no relatório, que não realizou diligências contra magistrados e que o documento não conclui pela prática de crime. O site reproduz essa ressalva e a mantém.' },
    ],
  },
  {
    title: 'O que o site faz com o material',
    paragraphs: [
      { text: 'Organiza, indexa e exibe. Não altera o teor das mensagens, não acrescenta mensagens, não atribui a ninguém o que não consta do material. Onde uma leitura foi necessária — uma imagem de visualização única recuperada pela perícia, uma nota de bloco de notas — a interface diz o que era e de onde veio.' },
      { text: 'Os dados são oferecidos em formatos abertos (JSON, Markdown, uma API estática e um servidor MCP) para leitura, pesquisa e verificação. Quem usa esses formatos é responsável pelo uso que faz deles e está sujeito a este mesmo aviso.' },
    ],
  },
  {
    title: 'Dados pessoais',
    paragraphs: [
      { text: 'O site trata dados pessoais de terceiros — nomes, números de telefone, mensagens — que já constavam de material público: reportagens e um documento oficial de acesso público. O tratamento tem finalidade informativa e de interesse público, no exercício da liberdade de expressão e de acesso à informação, e invoca, no que se aplique, as hipóteses da Lei Geral de Proteção de Dados para dados tornados manifestamente públicos e para finalidades informativas e jornalísticas (Lei 13.709/2018, art. 7º, § 4º, e art. 4º, II, "a"). Nenhum dado é vendido, cedido ou usado para outra finalidade.' },
      { text: 'Números de telefone aparecem exatamente como constam do documento público, e só neles. Pessoas sem função pública que apareçam no material e queiram ter dados seus removidos ou contextualizados podem pedir pelo canal abaixo; o pedido será atendido com brevidade.' },
      { text: 'Sobre quem visita: o site não usa cookies de rastreamento, não tem login e não coleta dados de visitantes além do que o provedor de hospedagem registra para operar o serviço e de uma métrica agregada de audiência, sem identificação individual. O que o site guarda no seu navegador — conversas já lidas, preferências — fica no seu aparelho e não é enviado a lugar nenhum.' },
    ],
  },
  {
    title: 'Correção, contextualização e remoção',
    paragraphs: [
      { text: `Se você é citado no material e entende que uma transcrição está errada, que falta contexto, ou que um trecho deve ser removido, escreva pelo canal de contato ({issues do projeto}[${LEGAL_CONTACT}]) identificando a conversa e a mensagem — cada mensagem tem um número, "msg n", e um link. Pedidos fundamentados são atendidos com brevidade, e a correção fica registrada no histórico público do projeto.` },
      { text: 'O direito de resposta, nos termos da Lei 13.188/2015, é assegurado no que couber a um projeto sem natureza jornalística. Decisões judiciais que determinem a remoção de conteúdo são cumpridas.' },
    ],
  },
  {
    title: 'Responsabilidade',
    paragraphs: [
      { text: 'O site é oferecido como está, sem garantia de exatidão, completude ou atualidade. O autor não responde por decisões tomadas com base no que aqui se lê, nem pelo uso que terceiros façam dos dados, da API, dos exports ou do servidor MCP. Como provedor de aplicação, o autor observa o regime do Marco Civil da Internet (Lei 12.965/2014), inclusive o art. 19, e remove conteúdo mediante ordem judicial específica.' },
      { text: 'Este aviso pode mudar; a versão vigente é a publicada nesta página, com sua data. Lei aplicável: a brasileira; foro: o do domicílio do autor, no Brasil, salvo disposição legal em contrário.' },
    ],
  },
  {
    title: 'Código e marcas',
    paragraphs: [
      { text: 'O código-fonte é público no {GitHub}[https://github.com/rafaelbressan/masterzap], sob a licença ali indicada. "WhatsApp" e a identidade visual associada pertencem à Meta Platforms, Inc.; o site não é afiliado, patrocinado nem endossado por ela. O nome "MasterWhats" é um trocadilho e não indica relação com o Banco Master.' },
    ],
  },
];

export const LEGAL_CREDITS = `Aviso legal, versão de ${LEGAL_VERSION}. Dúvidas e pedidos: {issues do projeto}[${LEGAL_CONTACT}].`;
