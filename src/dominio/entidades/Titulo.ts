/**
 * Entidad de dominio: Título
 */
export type TipoTitulo = 'TITULO' | 'SUBTITULO';

export class Titulo {
  constructor(
    public readonly id_titulo: string,
    public readonly id_presupuesto: string,
    public readonly id_proyecto: string,
    public id_titulo_padre: string | null,
    public nivel: number,
    public numero_item: string,
    public descripcion: string,
    public tipo: TipoTitulo,
    public orden: number,
    public total_parcial: number
  ) {}
  
  /**
   * Verifica si es un título raíz (sin padre)
   */
  get esRaiz(): boolean {
    return this.id_titulo_padre === null;
  }
  
  /**
   * Verifica si es un subtítulo (nivel > 1)
   */
  get esSubtitulo(): boolean {
    return this.tipo === 'SUBTITULO' || this.nivel > 1;
  }
}

