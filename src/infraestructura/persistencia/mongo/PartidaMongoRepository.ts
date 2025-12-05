import { Model } from 'mongoose';
import { BaseMongoRepository } from './BaseMongoRepository';
import { Partida } from '../../../dominio/entidades/Partida';
import { IPartidaRepository } from '../../../dominio/repositorios/IPartidaRepository';
import { PartidaDocument, PartidaModel } from './schemas/PartidaSchema';

export class PartidaMongoRepository extends BaseMongoRepository<Partida> implements IPartidaRepository {
  constructor() {
    super(PartidaModel as unknown as Model<any>);
  }

  protected toDomain(doc: PartidaDocument | any): Partida {
    const docPlain = doc.toObject ? doc.toObject() : doc;
    
    return new Partida(
      docPlain.id_partida,
      docPlain.id_presupuesto,
      docPlain.id_proyecto,
      docPlain.id_titulo,
      docPlain.id_partida_padre || null,
      docPlain.nivel_partida,
      docPlain.numero_item,
      docPlain.descripcion,
      docPlain.unidad_medida,
      docPlain.metrado || 0,
      docPlain.precio_unitario || 0,
      docPlain.parcial_partida || 0,
      docPlain.orden,
      docPlain.estado || 'Activa'
    );
  }

  async obtenerPorPresupuesto(id_presupuesto: string): Promise<Partida[]> {
    const docs = await this.model.find({ id_presupuesto }).sort({ orden: 1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorProyecto(id_proyecto: string): Promise<Partida[]> {
    const docs = await this.model.find({ id_proyecto }).sort({ orden: 1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorIdPartida(id_partida: string): Promise<Partida | null> {
    const doc = await this.model.findOne({ id_partida });
    return doc ? this.toDomain(doc) : null;
  }

  async obtenerPorTitulo(id_titulo: string): Promise<Partida[]> {
    const docs = await this.model.find({ id_titulo }).sort({ orden: 1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPrincipalesPorTitulo(id_titulo: string): Promise<Partida[]> {
    const docs = await this.model.find({ 
      id_titulo, 
      id_partida_padre: null 
    }).sort({ orden: 1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerSubpartidas(id_partida_padre: string): Promise<Partida[]> {
    const docs = await this.model.find({ id_partida_padre }).sort({ orden: 1 });
    return docs.map(doc => this.toDomain(doc));
  }

  override async findById(id: string): Promise<Partida | null> {
    return this.obtenerPorIdPartida(id);
  }

  override async update(id: string, data: Partial<Partida>): Promise<Partida | null> {
    const updated = await this.model.findOneAndUpdate(
      { id_partida: id },
      { $set: data },
      { new: true, runValidators: true }
    );
    return updated ? this.toDomain(updated) : null;
  }

  override async delete(id: string): Promise<boolean> {
    const deleted = await this.model.findOneAndDelete({ id_partida: id });
    return !!deleted;
  }
}

