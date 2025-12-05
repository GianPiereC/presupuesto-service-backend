export type TipoRecursoApu = 'MATERIAL' | 'MANO_OBRA' | 'EQUIPO' | 'SUBCONTRATO';

export class RecursoApu {
  constructor(
    public readonly id_recurso_apu: string,
    public readonly recurso_id: string | undefined,  // Opcional si es subpartida
    public codigo_recurso: string | undefined,  // Opcional si es subpartida
    public descripcion: string,
    public unidad_medida: string,
    public tipo_recurso: TipoRecursoApu,
    public id_precio_recurso: string | null,
    public cantidad: number,
    public desperdicio_porcentaje: number,
    public cantidad_con_desperdicio: number,
    public parcial: number,
    public orden: number,
    public cuadrilla?: number,
    public id_partida_subpartida?: string,  // Opcional: ID de partida si es subpartida
    public precio_unitario_subpartida?: number,  // Opcional: Precio unitario de subpartida
    public tiene_precio_override?: boolean,  // Indica si este recurso usa precio único
    public precio_override?: number  // Precio único (solo se usa si tiene_precio_override = true)
  ) {}

  // Función helper para truncar a 4 decimales (para cuadrilla y cantidad)
  // @ts-ignore - Método reservado para uso futuro
  private truncateToFour(_num: number): number {
    return Math.round(_num * 10000) / 10000;
  }

  // Función helper para redondear a 2 decimales (para PU y parciales)
  private roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
  }

  calcularParcial(precio: number, rendimiento?: number, jornada?: number): number {
    switch (this.tipo_recurso) {
      case 'MATERIAL':
        return this.roundToTwo(this.cantidad_con_desperdicio * precio);
      
      case 'MANO_OBRA': {
        // Fórmula correcta para MANO DE OBRA:
        // Parcial_MO = (1 / Rendimiento) × Jornada × Cuadrilla × Precio_Hora
        // O también: Parcial_MO = Cantidad × Precio_Hora (donde Cantidad = (Jornada × Cuadrilla) / Rendimiento)
        if (!rendimiento || rendimiento <= 0 || !jornada || jornada <= 0) {
          return 0;
        }
        const cuadrillaValue = this.cuadrilla || 1;
        // Parcial_MO = (1 / Rendimiento) × Jornada × Cuadrilla × Precio_Hora
        return this.roundToTwo((1 / rendimiento) * jornada * cuadrillaValue * precio);
      }
      
      case 'EQUIPO': {
        // Si la unidad es "%mo", el cálculo se hace en el frontend basándose en la sumatoria de HH de MANO_OBRA
        // Este método no tiene acceso a esa información, así que se maneja en el servicio
        // Si la unidad es "hm" (horas hombre), usar cálculo con cuadrilla (similar a MANO_OBRA)
        if (this.unidad_medida === 'hm' || this.unidad_medida?.toLowerCase() === 'hm') {
          if (!rendimiento || rendimiento <= 0 || !jornada || jornada <= 0) {
            return 0;
          }
          const cuadrillaValue = this.cuadrilla || 1;
          // Parcial = (1 / Rendimiento) × Jornada × Cuadrilla × Precio_Hora
          return this.roundToTwo((1 / rendimiento) * jornada * cuadrillaValue * precio);
        }
        
        // Para otras unidades (excepto "%mo" que se maneja en el servicio): cálculo simple cantidad × precio
        // Nota: "%mo" requiere suma de parciales de MANO_OBRA, se maneja en ApuService
        return this.roundToTwo(this.cantidad * precio);
      }
      
      case 'SUBCONTRATO':
        return this.roundToTwo(this.cantidad * precio);
      
      default:
        return this.roundToTwo(this.cantidad_con_desperdicio * precio);
    }
  }

  actualizarCantidad(
    nuevaCantidad: number, 
    nuevoDesperdicio: number = this.desperdicio_porcentaje,
    precio: number,
    rendimiento?: number,
    jornada?: number
  ): void {
    this.cantidad = nuevaCantidad;
    this.desperdicio_porcentaje = nuevoDesperdicio;
    this.cantidad_con_desperdicio = nuevaCantidad * (1 + nuevoDesperdicio / 100);
    this.parcial = this.calcularParcial(precio, rendimiento, jornada);
  }
}


