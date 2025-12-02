/**
 * Entidad de dominio: Presupuesto
 */
export type FasePresupuesto = 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META';
export type EstadoPresupuesto = 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'vigente';

export interface AprobacionLicitacion {
  aprobado: boolean;
  usuario_aprobador_id?: string;
  fecha_aprobacion?: string;
  comentario?: string;
  jerarquia_aprobacion?: number;
}

export interface AprobacionMeta {
  aprobado: boolean;
  usuario_aprobador_id?: string;
  fecha_aprobacion?: string;
  comentario?: string;
  es_version_final: boolean;
}

export interface EstadoAprobacion {
  tipo: 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | null;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | null;
  id_aprobacion?: string;
}

export class Presupuesto {
  constructor(
    public readonly id_presupuesto: string,
    public readonly id_proyecto: string,
    public costo_directo: number,
    public readonly fecha_creacion: string,
    public monto_igv: number,
    public monto_utilidad: number,
    public nombre_presupuesto: string,
    public parcial_presupuesto: number,
    public observaciones: string,
    public porcentaje_igv: number,
    public porcentaje_utilidad: number,
    public plazo: number,
    public ppto_base: number,
    public ppto_oferta: number,
    public total_presupuesto: number,
    public numeracion_presupuesto?: number,
    // ===== NUEVOS CAMPOS PARA VERSIONADO (OPCIONALES) =====
    public id_grupo_version?: string,
    public fase?: FasePresupuesto,
    public version?: number | null,  // null = padre, número = versión
    public descripcion_version?: string,  // Opcional: motivo de creación de la versión
    public es_padre?: boolean,  // Derivado: version === null
    public id_presupuesto_base?: string,
    public id_presupuesto_licitacion?: string,
    public version_licitacion_aprobada?: number,
    public id_presupuesto_contractual?: string,
    public version_contractual_aprobada?: number,
    public es_inmutable?: boolean,
    public es_activo?: boolean,
    public estado?: EstadoPresupuesto,
    public estado_aprobacion?: EstadoAprobacion,
    public aprobacion_licitacion?: AprobacionLicitacion,
    public aprobacion_meta?: AprobacionMeta
  ) {}
  
  /**
   * Método derivado: verifica si es una versión (no padre)
   */
  get esVersion(): boolean {
    return this.version !== null && !this.es_padre;
  }
}

