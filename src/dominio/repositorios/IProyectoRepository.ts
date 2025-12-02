import { IBaseRepository } from './IBaseRepository';
import { Proyecto } from '../entidades/Proyecto';

export interface IProyectoRepository extends IBaseRepository<Proyecto> {
  obtenerPorUsuario(id_usuario: string): Promise<Proyecto[]>;
  obtenerPorIdProyecto(id_proyecto: string): Promise<Proyecto | null>;
  obtenerProyectosConPresupuestos(): Promise<any[]>;
}

