export interface Imagem {
  url: string;          // URL externa (https://...) ou data URI (data:image/...)
  tipo: 'principal' | 'detalhe' | 'galeria';
  legenda: string;
}

export interface AtributosRPG {
  FOR: number;
  DES: number;
  CAR: number;
  SAB: number;
  INT: number;
  CON: number;
}

export interface ModificadoresRPG {
  FOR?: string;
  DES?: string;
  CAR?: string;
  SAB?: string;
  INT?: string;
  CON?: string;
}

export interface Poder {
  id: string;
  nome: string;
  tier: number;
  descricao: string;
  efeitos: string[];
  pre_requisitos: string[];
  tipo: 'ativo' | 'passivo';
  cooldown: string | null;
}

export interface MetaDados {
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
  versao: number;
  publicado: boolean;
}

export interface Criatura {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string;
  tipo: 'criatura';
  categoria: string;
  raridade: string;
  ameaca: number;
  narrativa: {
    resumo: string;
    descricao_longa: string;
    lore: string;
    habitat: string;
    comportamento: string;
  };
  imagens: Imagem[];
  tatico: {
    nivel: number;
    atributos: AtributosRPG;
    modificadores: ModificadoresRPG;
    poderes: Poder[];
  };
  relacoes: {
    espacos: string[];
    personagens: string[];
    criaturas_relacionadas: string[];
  };
  meta: MetaDados;
}

export interface Espaco {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string;
  tipo: 'espaco';
  categoria: string;
  tags: string[];
  narrativa: {
    resumo: string;
    descricao_longa: string;
    historia: string;
    atmosfera: string;
    pontos_de_interesse: string[];
  };
  imagens: Imagem[];
  dados_mecanicos: {
    nivel_recomendado: string;
    dificuldade: string;
    tipo_terreno: string;
    modificadores_ambientais: string[];
  };
  relacoes: {
    criaturas: string[];
    personagens: string[];
    espacos_conectados: string[];
  };
  meta: MetaDados;
}

export interface Personagem {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string;
  tipo: 'personagem';
  categoria: string;
  alinhamento: string;
  faccao: string;
  narrativa: {
    resumo: string;
    biografia: string;
    personalidade: string;
    objetivos: string;
    segredos: string;
  };
  imagens: Imagem[];
  tatico: {
    nivel: number;
    classe: string;
    atributos: AtributosRPG;
    modificadores: ModificadoresRPG;
    poderes: Poder[];
  };
  relacoes: {
    espacos: string[];
    criaturas: string[];
    personagens_relacionados: string[];
  };
  meta: MetaDados;
}

export type Entidade = Criatura | Espaco | Personagem;
export type Colecao = 'criaturas' | 'espacos' | 'personagens';

export interface EntidadeComColecao extends Record<string, unknown> {
  id: string;
  nome: string;
  _colecao: Colecao;
}
