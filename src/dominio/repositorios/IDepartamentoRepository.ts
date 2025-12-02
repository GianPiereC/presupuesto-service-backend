import { Departamento } from '../entidades/Departamento';
import { IBaseRepository } from './IBaseRepository';

export interface IDepartamentoRepository extends IBaseRepository<Departamento> {
  listDepartamentos(esNuevoFormato?: boolean): Promise<Departamento[]>;
  getDepartamento(id_departamento: string): Promise<Departamento | null>;
}

