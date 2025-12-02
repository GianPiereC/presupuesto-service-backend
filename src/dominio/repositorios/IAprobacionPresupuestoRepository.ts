import { AprobacionPresupuesto } from '../entidades/AprobacionPresupuesto';

export interface IAprobacionPresupuestoRepository {
  crear(aprobacion: Partial<AprobacionPresupuesto>): Promise<AprobacionPresupuesto>;
  create(aprobacion: Partial<AprobacionPresupuesto>): Promise<AprobacionPresupuesto>;
  obtenerPorId(id_aprobacion: string): Promise<AprobacionPresupuesto | null>;
  obtenerPorPresupuesto(id_presupuesto: string): Promise<AprobacionPresupuesto[]>;
  obtenerPorProyecto(id_proyecto: string): Promise<AprobacionPresupuesto[]>;
  obtenerPendientesPorAprobador(usuario_aprobador_id: string): Promise<AprobacionPresupuesto[]>;
  obtenerPendientes(): Promise<AprobacionPresupuesto[]>;
  actualizar(id_aprobacion: string, datos: Partial<AprobacionPresupuesto>): Promise<AprobacionPresupuesto | null>;
  eliminar(id_aprobacion: string): Promise<boolean>;
}

