import { Distrito } from '../../dominio/entidades/Distrito';
import { IDistritoRepository } from '../../dominio/repositorios/IDistritoRepository';
import { BaseService } from './BaseService';

export class DistritoService extends BaseService<Distrito> {
  private readonly distritoRepository: IDistritoRepository;

  constructor(repository: IDistritoRepository) {
    super(repository);
    this.distritoRepository = repository;
  }

  async listDistritos(): Promise<Distrito[]> {
    return await this.distritoRepository.listDistritos();
  }

  async getDistrito(id_distrito: string): Promise<Distrito | null> {
    return await this.distritoRepository.getDistrito(id_distrito);
  }

  async getDistritosByProvincia(id_provincia: string): Promise<Distrito[]> {
    return await this.distritoRepository.getDistritosByProvincia(id_provincia);
  }
}

