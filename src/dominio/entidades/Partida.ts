/**
 * Entidad de dominio: Partida
 */
export type EstadoPartida = 'Activa' | 'Inactiva';

export class Partida {
  constructor(
    public readonly id_partida: string,
    public readonly id_presupuesto: string,
    public readonly id_proyecto: string,
    public id_titulo: string,
    public id_partida_padre: string | null,
    public nivel_partida: number,
    public numero_item: string,
    public descripcion: string,
    public unidad_medida: string,
    public metrado: number,
    public precio_unitario: number,
    public parcial_partida: number,
    public orden: number,
    public estado: EstadoPartida
  ) {}
  
  /**
   * Verifica si es una partida principal (sin padre)
   */
  get esPrincipal(): boolean {
    return this.id_partida_padre === null;
  }
  
  /**
   * Verifica si es una subpartida
   */
  get esSubpartida(): boolean {
    return this.id_partida_padre !== null;
  }
  
  /**
   * Calcula el parcial de la partida
   */
  calcularParcial(): number {
    return this.metrado * this.precio_unitario;
  }
}

