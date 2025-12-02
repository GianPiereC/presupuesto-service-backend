import { Infraestructura } from '../../dominio/entidades/Infraestructura';
import { IInfraestructuraRepository } from '../../dominio/repositorios/IInfraestructuraRepository';
import { BaseService } from './BaseService';

export class InfraestructuraService extends BaseService<Infraestructura> {
  private readonly infraestructuraRepository: IInfraestructuraRepository;

  constructor(repository: IInfraestructuraRepository) {
    super(repository);
    this.infraestructuraRepository = repository;
  }

  async obtenerTodas(): Promise<Infraestructura[]> {
    return await this.infraestructuraRepository.listInfraestructuras();
  }

  async obtenerPorId(id: string): Promise<Infraestructura | null> {
    return await this.infraestructuraRepository.getInfraestructuraById(id);
  }
}

