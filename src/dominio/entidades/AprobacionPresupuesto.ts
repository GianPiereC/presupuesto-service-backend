/**
 * Entidad de dominio: AprobacionPresupuesto
 */
export type TipoAprobacion = 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | 'NUEVA_VERSION_META';
export type EstadoAprobacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';

export class AprobacionPresupuesto {
  constructor(
    public readonly id_aprobacion: string,
    public readonly id_presupuesto: string,
    public readonly id_proyecto: string,
    public readonly tipo_aprobacion: TipoAprobacion,
    public readonly usuario_solicitante_id: string,
    public estado: EstadoAprobacion,
    public readonly fecha_solicitud: string,
    public id_grupo_version?: string,
    public usuario_aprobador_id?: string,
    public fecha_aprobacion?: string,
    public fecha_rechazo?: string,
    public fecha_vencimiento?: string,
    public comentario_solicitud?: string,
    public comentario_aprobacion?: string,
    public comentario_rechazo?: string,
    public nivel_jerarquia?: number,
    public requiere_multiple_aprobacion?: boolean,
    public orden_aprobacion?: number,
    public version_presupuesto?: number,
    public monto_presupuesto?: number,
    public es_urgente?: boolean
  ) {}

  /**
   * Verifica si la aprobación está pendiente
   */
  get estaPendiente(): boolean {
    return this.estado === 'PENDIENTE';
  }

  /**
   * Verifica si la aprobación está aprobada
   */
  get estaAprobada(): boolean {
    return this.estado === 'APROBADO';
  }

  /**
   * Verifica si la aprobación está rechazada
   */
  get estaRechazada(): boolean {
    return this.estado === 'RECHAZADO';
  }

  /**
   * Verifica si es aprobación de Licitación a Contractual
   */
  get esLicitacionAContractual(): boolean {
    return this.tipo_aprobacion === 'LICITACION_A_CONTRACTUAL';
  }

  /**
   * Verifica si es aprobación de Contractual a Meta
   */
  get esContractualAMeta(): boolean {
    return this.tipo_aprobacion === 'CONTRACTUAL_A_META';
  }

  /**
   * Aprobar la solicitud
   */
  aprobar(usuario_aprobador_id: string, comentario?: string): void {
    if (this.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden aprobar solicitudes pendientes');
    }
    this.estado = 'APROBADO';
    this.usuario_aprobador_id = usuario_aprobador_id;
    this.fecha_aprobacion = new Date().toISOString();
    if (comentario) {
      this.comentario_aprobacion = comentario;
    }
  }

  /**
   * Rechazar la solicitud
   */
  rechazar(usuario_aprobador_id: string, comentario: string): void {
    if (this.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden rechazar solicitudes pendientes');
    }
    this.estado = 'RECHAZADO';
    this.usuario_aprobador_id = usuario_aprobador_id;
    this.fecha_rechazo = new Date().toISOString();
    this.comentario_rechazo = comentario;
  }

  /**
   * Cancelar la solicitud
   */
  cancelar(): void {
    if (this.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden cancelar solicitudes pendientes');
    }
    this.estado = 'CANCELADO';
  }
}

