import { IBaseRepository } from './IBaseRepository';
import { Presupuesto } from '../entidades/Presupuesto';

export interface IPresupuestoRepository extends IBaseRepository<Presupuesto> {
  obtenerPorProyecto(id_proyecto: string): Promise<Presupuesto[]>;
  obtenerPorIdPresupuesto(id_presupuesto: string): Promise<Presupuesto | null>;
  obtenerPorGrupoVersion(id_grupo_version: string): Promise<Presupuesto[]>;
  eliminarGrupoCompleto(id_grupo_version: string): Promise<boolean>;
}

