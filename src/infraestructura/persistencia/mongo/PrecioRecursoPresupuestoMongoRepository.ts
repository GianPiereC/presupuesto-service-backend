import { Model } from 'mongoose';
import { BaseMongoRepository } from './BaseMongoRepository';
import { PrecioRecursoPresupuesto } from '../../../dominio/entidades/PrecioRecursoPresupuesto';
import { IPrecioRecursoPresupuestoRepository } from '../../../dominio/repositorios/IPrecioRecursoPresupuestoRepository';
import { PrecioRecursoPresupuestoDocument, PrecioRecursoPresupuestoModel } from './schemas/PrecioRecursoPresupuestoSchema';

export class PrecioRecursoPresupuestoMongoRepository 
  extends BaseMongoRepository<PrecioRecursoPresupuesto> 
  implements IPrecioRecursoPresupuestoRepository {
  
  constructor() {
    super(PrecioRecursoPresupuestoModel as unknown as Model<any>);
  }

  protected toDomain(doc: PrecioRecursoPresupuestoDocument | any): PrecioRecursoPresupuesto {
    const docPlain = doc.toObject ? doc.toObject() : doc;
    
    return new PrecioRecursoPresupuesto(
      docPlain.id_precio_recurso,
      docPlain.id_presupuesto,
      docPlain.recurso_id,
      docPlain.codigo_recurso,
      docPlain.descripcion,
      docPlain.unidad,
      docPlain.tipo_recurso,
      docPlain.precio,
      docPlain.fecha_actualizacion,
      docPlain.usuario_actualizo
    );
  }

  async obtenerPorPresupuesto(id_presupuesto: string): Promise<PrecioRecursoPresupuesto[]> {
    const docs = await this.model.find({ id_presupuesto }).sort({ codigo_recurso: 1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorPresupuestoYRecurso(
    id_presupuesto: string,
    recurso_id: string
  ): Promise<PrecioRecursoPresupuesto | null> {
    const doc = await this.model.findOne({ id_presupuesto, recurso_id });
    return doc ? this.toDomain(doc) : null;
  }

  async obtenerPorIdPrecioRecurso(id_precio_recurso: string): Promise<PrecioRecursoPresupuesto | null> {
    const doc = await this.model.findOne({ id_precio_recurso });
    return doc ? this.toDomain(doc) : null;
  }

  async findById(id: string): Promise<PrecioRecursoPresupuesto | null> {
    return this.obtenerPorIdPrecioRecurso(id);
  }

  async update(id: string, data: Partial<PrecioRecursoPresupuesto>): Promise<PrecioRecursoPresupuesto | null> {
    const updated = await this.model.findOneAndUpdate(
      { id_precio_recurso: id },
      { $set: data },
      { new: true, runValidators: true }
    );
    return updated ? this.toDomain(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.model.findOneAndDelete({ id_precio_recurso: id });
    return !!deleted;
  }
}
