import { IBaseRepository } from './IBaseRepository';
import { PrecioRecursoPresupuesto } from '../entidades/PrecioRecursoPresupuesto';

export interface IPrecioRecursoPresupuestoRepository extends IBaseRepository<PrecioRecursoPresupuesto> {
  obtenerPorPresupuesto(id_presupuesto: string): Promise<PrecioRecursoPresupuesto[]>;
  obtenerPorPresupuestoYRecurso(
    id_presupuesto: string,
    recurso_id: string
  ): Promise<PrecioRecursoPresupuesto | null>;
  obtenerPorIdPrecioRecurso(id_precio_recurso: string): Promise<PrecioRecursoPresupuesto | null>;
}






