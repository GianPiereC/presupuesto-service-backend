import { Model } from 'mongoose';
import { BaseMongoRepository } from './BaseMongoRepository';
import { Titulo } from '../../../dominio/entidades/Titulo';
import { ITituloRepository } from '../../../dominio/repositorios/ITituloRepository';
import { TituloDocument, TituloModel } from './schemas/TituloSchema';

export class TituloMongoRepository extends BaseMongoRepository<Titulo> implements ITituloRepository {
  constructor() {
    super(TituloModel as unknown as Model<any>);
  }

  protected toDomain(doc: TituloDocument | any): Titulo {
    const docPlain = doc.toObject ? doc.toObject() : doc;
    
    return new Titulo(
      docPlain.id_titulo,
      docPlain.id_presupuesto,
      docPlain.id_proyecto,
      docPlain.id_titulo_padre || null,
      docPlain.nivel,
      docPlain.numero_item,
      docPlain.descripcion,
      docPlain.tipo,
      docPlain.orden,
      docPlain.total_parcial || 0
    );
  }

  async obtenerPorPresupuesto(id_presupuesto: string): Promise<Titulo[]> {
    const docs = await this.model.find({ id_presupuesto }).sort({ orden: 1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorProyecto(id_proyecto: string): Promise<Titulo[]> {
    const docs = await this.model.find({ id_proyecto }).sort({ orden: 1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorIdTitulo(id_titulo: string): Promise<Titulo | null> {
    const doc = await this.model.findOne({ id_titulo });
    return doc ? this.toDomain(doc) : null;
  }

  async obtenerHijos(id_titulo_padre: string): Promise<Titulo[]> {
    const docs = await this.model.find({ id_titulo_padre }).sort({ orden: 1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorPadre(id_titulo_padre: string | null): Promise<Titulo[]> {
    const query = id_titulo_padre === null 
      ? { id_titulo_padre: null }
      : { id_titulo_padre };
    const docs = await this.model.find(query).sort({ orden: 1 });
    return docs.map(doc => this.toDomain(doc));
  }

  override async findById(id: string): Promise<Titulo | null> {
    return this.obtenerPorIdTitulo(id);
  }

  override async update(id: string, data: Partial<Titulo>): Promise<Titulo | null> {
    const updated = await this.model.findOneAndUpdate(
      { id_titulo: id },
      { $set: data },
      { new: true, runValidators: true }
    );
    return updated ? this.toDomain(updated) : null;
  }

  override async delete(id: string): Promise<boolean> {
    const deleted = await this.model.findOneAndDelete({ id_titulo: id });
    return !!deleted;
  }

  async obtenerPorNumeroItemYProyecto(numero_item: string, id_proyecto: string, excludeId?: string): Promise<Titulo | null> {
    const query: any = { numero_item, id_proyecto };
    if (excludeId) {
      query.id_titulo = { $ne: excludeId };
    }
    const doc = await this.model.findOne(query);
    return doc ? this.toDomain(doc) : null;
  }

  async obtenerPorNumeroItemYPresupuesto(numero_item: string, id_presupuesto: string, excludeId?: string): Promise<Titulo | null> {
    const query: any = { numero_item, id_presupuesto };
    if (excludeId) {
      query.id_titulo = { $ne: excludeId };
    }
    const doc = await this.model.findOne(query);
    return doc ? this.toDomain(doc) : null;
  }
}

