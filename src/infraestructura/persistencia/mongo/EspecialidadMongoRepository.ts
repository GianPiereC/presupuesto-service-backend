import { Model } from 'mongoose';
import { BaseMongoRepository } from './BaseMongoRepository';
import { Especialidad } from '../../../dominio/entidades/Especialidad';
import { IEspecialidadRepository } from '../../../dominio/repositorios/IEspecialidadRepository';
import { EspecialidadModel } from './schemas/EspecialidadSchema';

export class EspecialidadMongoRepository extends BaseMongoRepository<Especialidad> implements IEspecialidadRepository {
  constructor() {
    super(EspecialidadModel as unknown as Model<any>);
  }

  /**
   * Convierte un documento de MongoDB a entidad Especialidad
   */
  protected override toDomain(doc: any): Especialidad {
    const docPlain = doc.toObject ? doc.toObject() : doc;
    return new Especialidad(
      docPlain.id_especialidad,
      docPlain.nombre,
      docPlain.descripcion
    );
  }

  /**
   * Obtiene una especialidad por su id_especialidad
   */
  async obtenerPorIdEspecialidad(id_especialidad: string): Promise<Especialidad | null> {
    const doc = await EspecialidadModel.findOne({ id_especialidad }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Actualiza usando id_especialidad en lugar de _id
   */
  override async update(id_especialidad: string, data: Partial<Especialidad>): Promise<Especialidad | null> {
    const updated = await EspecialidadModel.findOneAndUpdate(
      { id_especialidad },
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    return updated ? this.toDomain(updated) : null;
  }

  /**
   * Elimina usando id_especialidad en lugar de _id
   */
  override async delete(id_especialidad: string): Promise<boolean> {
    const deleted = await EspecialidadModel.findOneAndDelete({ id_especialidad });
    return !!deleted;
  }
}

