export interface CimaDoc {
  tipo: number;
  url: string;
}

export interface CimaFoto {
  tipo: string;
  url: string;
}

export interface CimaVia {
  id: number;
  nombre: string;
}

export interface CimaEstado {
  aut: number;
  rev: number;
}

export interface CimaPrincipioActivo {
  id: number;
  codigo: string;
  nombre: string;
  cantidad: string;
  unidad: string;
  orden: number;
}

export interface CimaExcipiente {
  id: number;
  nombre: string;
  cantidad: string;
  unidad: string;
  orden: number;
}

export interface CimaAtc {
  codigo: string;
  nombre: string;
  nivel?: number;
}

export interface CimaPresentacion {
  cn: string;
  nombre: string;
  estado: CimaEstado;
  comerc: boolean;
  psum: boolean;
}

export interface CimaResultado {
  nregistro: string;
  nombre: string;
  labtitular: string;
  labcomercializador?: string;
  cpresc: string;
  receta: boolean;
  conduc: boolean;
  viasAdministracion: CimaVia[];
  fotos: CimaFoto[];
  docs: CimaDoc[];
  generico: boolean;
  triangulo?: boolean;
  psum?: boolean;
  notas?: boolean;
  biosimilar?: boolean;
  huerfano?: boolean;
  ema?: boolean;
  materialesInf?: boolean;
  comerc?: boolean;
  dosis?: string;
  formaFarmaceuticaSimplificada?: { id: number; nombre: string };
  pactivos?: string;
}

export interface CimaResponse {
  totalFilas: number;
  pagina: number;
  tamanioPagina: number;
  resultados: CimaResultado[];
}

export interface Medicamento {
  nombre: string;
  registro: string;
  laboratorio: string;
  laboratorioComercializador?: string;
  receta: boolean;
  conduc: boolean;
  cpresc: string;
  vias: string[];
  imagenUrl: string | null;
  prospectoUrl: string | null;
  fichaTecnicaUrl: string | null;
  generico: boolean;
  triangulo: boolean;
  psum: boolean;
  notas: boolean;
  biosimilar: boolean;
  huerfano: boolean;
  ema: boolean;
  materialesInf: boolean;
  comerc: boolean;
  dosis: string | null;
  formaFarmaceutica: string | null;
  pactivos: string | null;
  principiosActivos?: CimaPrincipioActivo[];
  excipientes?: CimaExcipiente[];
  atcs?: CimaAtc[];
  presentaciones?: CimaPresentacion[];
  estado?: CimaEstado;
}

export type FarmaView = 'search' | 'results' | 'detail';
