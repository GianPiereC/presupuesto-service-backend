import { Provincia } from '../../dominio/entidades/Provincia';
import { IProvinciaRepository } from '../../dominio/repositorios/IProvinciaRepository';
import { BaseService } from './BaseService';

export class ProvinciaService extends BaseService<Provincia> {
  private readonly provinciaRepository: IProvinciaRepository;

  constructor(repository: IProvinciaRepository) {
    super(repository);
    this.provinciaRepository = repository;
  }

  async listProvincias(): Promise<Provincia[]> {
    return await this.provinciaRepository.listProvincias();
  }

  async getProvincia(id_provincia: string): Promise<Provincia | null> {
    return await this.provinciaRepository.getProvincia(id_provincia);
  }

  async getProvinciasByDepartamento(id_departamento: string): Promise<Provincia[]> {
    return await this.provinciaRepository.getProvinciasByDepartamento(id_departamento);
  }
}

