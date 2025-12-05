/**
 * Entidad de dominio: Apu
 * Representa el Análisis de Precio Unitario de una partida
 */

import { RecursoApu } from './RecursoApu';

export class Apu {
  constructor(
    public readonly id_apu: string,
    public readonly id_partida: string,
    public readonly id_presupuesto: string,
    public readonly id_proyecto: string,
    public rendimiento: number,
    public jornada: number,
    public costo_materiales: number,
    public costo_mano_obra: number,
    public costo_equipos: number,
    public costo_subcontratos: number,
    public costo_directo: number,
    public recursos: RecursoApu[]
  ) {}

  /**
   * Calcula el costo directo sumando todos los costos por tipo
   * Redondea a 2 decimales para mantener consistencia con PU y parciales
   * Incluye subpartidas en el cálculo
   */
  calcularCostoDirecto(): number {
    this.costo_materiales = Math.round(this.recursos
      .filter(r => r.tipo_recurso === 'MATERIAL' && !r.id_partida_subpartida)
      .reduce((sum, r) => sum + r.parcial, 0) * 100) / 100;

    this.costo_mano_obra = Math.round(this.recursos
      .filter(r => r.tipo_recurso === 'MANO_OBRA')
      .reduce((sum, r) => sum + r.parcial, 0) * 100) / 100;

    this.costo_equipos = Math.round(this.recursos
      .filter(r => r.tipo_recurso === 'EQUIPO')
      .reduce((sum, r) => sum + r.parcial, 0) * 100) / 100;

    this.costo_subcontratos = Math.round(this.recursos
      .filter(r => r.tipo_recurso === 'SUBCONTRATO')
      .reduce((sum, r) => sum + r.parcial, 0) * 100) / 100;

    // Las subpartidas se suman al costo directo pero no a los costos por tipo
    const costo_subpartidas = Math.round(this.recursos
      .filter(r => r.id_partida_subpartida)
      .reduce((sum, r) => sum + r.parcial, 0) * 100) / 100;

    this.costo_directo = Math.round((this.costo_materiales + 
                        this.costo_mano_obra + 
                        this.costo_equipos + 
                        this.costo_subcontratos +
                        costo_subpartidas) * 100) / 100;

    return this.costo_directo;
  }

  /**
   * Agrega un recurso al APU
   */
  agregarRecurso(recurso: RecursoApu): void {
    this.recursos.push(recurso);
    this.recursos.sort((a, b) => a.orden - b.orden);
    this.calcularCostoDirecto();
  }

  /**
   * Actualiza un recurso existente
   * Nota: Para recalcular parciales con precios actualizados, usar métodos que incluyan precios del lookup
   */
  actualizarRecurso(id_recurso_apu: string, recursoActualizado: Partial<RecursoApu>): void {
    const index = this.recursos.findIndex(r => r.id_recurso_apu === id_recurso_apu);
    if (index !== -1) {
      this.recursos[index] = { ...this.recursos[index], ...recursoActualizado } as RecursoApu;
      // Nota: actualizarCantidad requiere precios del lookup, se manejará externamente
      // Si se actualiza cantidad o desperdicio, el parcial debe recalcularse con precios del lookup
      this.calcularCostoDirecto();
    }
  }

  /**
   * Elimina un recurso del APU
   */
  eliminarRecurso(id_recurso_apu: string): void {
    this.recursos = this.recursos.filter(r => r.id_recurso_apu !== id_recurso_apu);
    this.calcularCostoDirecto();
  }

  /**
   * Obtiene el siguiente orden para un nuevo recurso
   */
  obtenerSiguienteOrden(): number {
    if (this.recursos.length === 0) return 1;
    return Math.max(...this.recursos.map(r => r.orden)) + 1;
  }
}


