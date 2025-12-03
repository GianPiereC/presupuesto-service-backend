import { Model } from 'mongoose';
import { BaseMongoRepository } from './BaseMongoRepository';
import { Infraestructura } from '../../../dominio/entidades/Infraestructura';
import { IInfraestructuraRepository } from '../../../dominio/repositorios/IInfraestructuraRepository';
import { InfraestructuraModel } from './schemas/InfraestructuraSchema';

export class InfraestructuraMongoRepository extends BaseMongoRepository<Infraestructura> implements IInfraestructuraRepository {
  constructor() {
    super(InfraestructuraModel as unknown as Model<any>);
  }

  /**
   * Convierte un documento MongoDB a entidad de dominio
   */
  protected toDomain(doc: any): Infraestructura {
    return {
      _id: doc._id?.toString(),
      id: doc.id_infraestructura,
      id_infraestructura: doc.id_infraestructura,
      nombre_infraestructura: doc.nombre_infraestructura,
      tipo_infraestructura: doc.tipo_infraestructura,
      descripcion: doc.descripcion,
    };
  }

  /**
   * Obtiene una infraestructura por su id_infraestructura
   */
  async obtenerPorIdInfraestructura(id_infraestructura: string): Promise<Infraestructura | null> {
    const doc = await this.model.findOne({ id_infraestructura });
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Busca por id_infraestructura en lugar de _id
   */
  override async findById(id: string): Promise<Infraestructura | null> {
    return this.obtenerPorIdInfraestructura(id);
  }

  /**
   * Lista todas las infraestructuras
   */
  async listInfraestructuras(): Promise<Infraestructura[]> {
    const docs = await this.model.find().lean();
    return docs.map(doc => this.toDomain(doc));
  }

  /**
   * Obtiene una infraestructura por ID
   */
  async getInfraestructuraById(id: string): Promise<Infraestructura | null> {
    return this.obtenerPorIdInfraestructura(id);
  }

  /**
   * Crea una nueva infraestructura generando el ID automáticamente
   */
  override async create(data: Partial<Infraestructura>): Promise<Infraestructura> {
    const id_infraestructura = await InfraestructuraModel.generateNextId();
    const nuevaInfraestructura = await InfraestructuraModel.create({
      ...data,
      id_infraestructura,
    });
    return this.toDomain(nuevaInfraestructura);
  }

  /**
   * Actualiza una infraestructura por id_infraestructura
   */
  override async update(id: string, data: Partial<Infraestructura>): Promise<Infraestructura | null> {
    const updated = await this.model.findOneAndUpdate(
      { id_infraestructura: id },
      { $set: data },
      { new: true }
    );
    return updated ? this.toDomain(updated) : null;
  }

  /**
   * Elimina una infraestructura por id_infraestructura
   */
  override async delete(id: string): Promise<boolean> {
    const deleted = await this.model.findOneAndDelete({ id_infraestructura: id });
    return !!deleted;
  }
}

