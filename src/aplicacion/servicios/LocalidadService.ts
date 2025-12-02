import { Localidad } from '../../dominio/entidades/Localidad';
import { ILocalidadRepository } from '../../dominio/repositorios/ILocalidadRepository';
import { BaseService } from './BaseService';

export class LocalidadService extends BaseService<Localidad> {
  private readonly localidadRepository: ILocalidadRepository;

  constructor(repository: ILocalidadRepository) {
    super(repository);
    this.localidadRepository = repository;
  }

  async listLocalidades(): Promise<Localidad[]> {
    return await this.localidadRepository.listLocalidades();
  }

  async getLocalidad(id_localidad: string): Promise<Localidad | null> {
    return await this.localidadRepository.getLocalidad(id_localidad);
  }

  async getLocalidadesByDistrito(id_distrito: string): Promise<Localidad[]> {
    return await this.localidadRepository.getLocalidadesByDistrito(id_distrito);
  }
}

