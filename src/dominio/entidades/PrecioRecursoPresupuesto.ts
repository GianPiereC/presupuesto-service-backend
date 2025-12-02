/**
 * Entidad de dominio: PrecioRecursoPresupuesto
 * Catálogo compartido de precios de recursos por presupuesto
 */

export type TipoRecursoPresupuesto = 'MATERIAL' | 'MANO_OBRA' | 'EQUIPO' | 'SUBCONTRATO';

export class PrecioRecursoPresupuesto {
  constructor(
    public readonly id_precio_recurso: string,
    public readonly id_presupuesto: string,
    public readonly recurso_id: string,
    public codigo_recurso: string,
    public descripcion: string,
    public unidad: string,
    public tipo_recurso: TipoRecursoPresupuesto,
    public precio: number,
    public fecha_actualizacion: string,
    public usuario_actualizo: string
  ) {}

  /**
   * Actualiza el precio
   */
  actualizarPrecio(nuevoPrecio: number, usuarioId: string): void {
    this.precio = nuevoPrecio;
    this.fecha_actualizacion = new Date().toISOString();
    this.usuario_actualizo = usuarioId;
  }
}


