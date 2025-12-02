import { Departamento } from '../../dominio/entidades/Departamento';
import { IDepartamentoRepository } from '../../dominio/repositorios/IDepartamentoRepository';
import { BaseService } from './BaseService';

export class DepartamentoService extends BaseService<Departamento> {
  private readonly departamentoRepository: IDepartamentoRepository;

  constructor(repository: IDepartamentoRepository) {
    super(repository);
    this.departamentoRepository = repository;
  }

  async listDepartamentos(esNuevoFormato?: boolean): Promise<Departamento[]> {
    return await this.departamentoRepository.listDepartamentos(esNuevoFormato);
  }

  async getDepartamento(id_departamento: string): Promise<Departamento | null> {
    return await this.departamentoRepository.getDepartamento(id_departamento);
  }
}

