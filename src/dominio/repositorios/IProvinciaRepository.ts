import { Provincia } from '../entidades/Provincia';
import { IBaseRepository } from './IBaseRepository';

export interface IProvinciaRepository extends IBaseRepository<Provincia> {
  listProvincias(): Promise<Provincia[]>;
  getProvincia(id_provincia: string): Promise<Provincia | null>;
  getProvinciasByDepartamento(id_departamento: string): Promise<Provincia[]>;
}

