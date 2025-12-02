import { IBaseRepository } from './IBaseRepository';
import { Titulo } from '../entidades/Titulo';

export interface ITituloRepository extends IBaseRepository<Titulo> {
  obtenerPorPresupuesto(id_presupuesto: string): Promise<Titulo[]>;
  obtenerPorProyecto(id_proyecto: string): Promise<Titulo[]>;
  obtenerPorIdTitulo(id_titulo: string): Promise<Titulo | null>;
  obtenerHijos(id_titulo_padre: string): Promise<Titulo[]>;
  obtenerPorPadre(id_titulo_padre: string | null): Promise<Titulo[]>;
  obtenerPorNumeroItemYProyecto(numero_item: string, id_proyecto: string, excludeId?: string): Promise<Titulo | null>;
}

