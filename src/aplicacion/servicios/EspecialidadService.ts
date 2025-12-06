import { Especialidad } from '../../dominio/entidades/Especialidad';
import { IEspecialidadRepository } from '../../dominio/repositorios/IEspecialidadRepository';
import { BaseService } from './BaseService';
import { EspecialidadModel } from '../../infraestructura/persistencia/mongo/schemas/EspecialidadSchema';
import { ValidationException } from '../../dominio/exceptions/DomainException';

export class EspecialidadService extends BaseService<Especialidad> {
  private readonly especialidadRepository: IEspecialidadRepository;

  constructor(especialidadRepository: IEspecialidadRepository) {
    super(especialidadRepository);
    this.especialidadRepository = especialidadRepository;
  }

  async obtenerTodos(): Promise<Especialidad[]> {
    return await this.especialidadRepository.list();
  }

  async obtenerPorId(id_especialidad: string): Promise<Especialidad | null> {
    return await this.especialidadRepository.obtenerPorIdEspecialidad(id_especialidad);
  }

  async crear(data: { nombre: string; descripcion: string }): Promise<Especialidad> {
    if (!data.nombre || !data.descripcion) {
      throw new ValidationException('Nombre y descripción son requeridos');
    }

    const id_especialidad = await EspecialidadModel.generateNextId();
    
    const nuevaEspecialidad = await this.especialidadRepository.create({
      id_especialidad,
      nombre: data.nombre,
      descripcion: data.descripcion
    } as Partial<Especialidad>);

    return nuevaEspecialidad;
  }

  async actualizar(id_especialidad: string, data: { nombre?: string; descripcion?: string }): Promise<Especialidad | null> {
    return await this.especialidadRepository.update(id_especialidad, data as Partial<Especialidad>);
  }

  async eliminar(id_especialidad: string): Promise<boolean> {
    return await this.especialidadRepository.delete(id_especialidad);
  }
}





