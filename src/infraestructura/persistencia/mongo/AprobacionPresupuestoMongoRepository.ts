import { Model } from 'mongoose';
import { BaseMongoRepository } from './BaseMongoRepository';
import { AprobacionPresupuesto } from '../../../dominio/entidades/AprobacionPresupuesto';
import { IAprobacionPresupuestoRepository } from '../../../dominio/repositorios/IAprobacionPresupuestoRepository';
import { AprobacionPresupuestoDocument, AprobacionPresupuestoModel } from './schemas/AprobacionPresupuestoSchema';

export class AprobacionPresupuestoMongoRepository extends BaseMongoRepository<AprobacionPresupuesto> implements IAprobacionPresupuestoRepository {
  constructor() {
    super(AprobacionPresupuestoModel as unknown as Model<any>);
  }

  protected toDomain(doc: AprobacionPresupuestoDocument | any): AprobacionPresupuesto {
    const docPlain = doc.toObject ? doc.toObject() : doc;
    
    return new AprobacionPresupuesto(
      docPlain.id_aprobacion,
      docPlain.id_presupuesto,
      docPlain.id_proyecto,
      docPlain.tipo_aprobacion,
      docPlain.usuario_solicitante_id,
      docPlain.estado,
      docPlain.fecha_solicitud,
      docPlain.id_grupo_version,
      docPlain.usuario_aprobador_id,
      docPlain.fecha_aprobacion,
      docPlain.fecha_rechazo,
      docPlain.fecha_vencimiento,
      docPlain.comentario_solicitud,
      docPlain.comentario_aprobacion,
      docPlain.comentario_rechazo,
      docPlain.nivel_jerarquia,
      docPlain.requiere_multiple_aprobacion,
      docPlain.orden_aprobacion,
      docPlain.version_presupuesto,
      docPlain.monto_presupuesto,
      docPlain.es_urgente
    );
  }

  async obtenerPorId(id_aprobacion: string): Promise<AprobacionPresupuesto | null> {
    const doc = await AprobacionPresupuestoModel.findOne({ id_aprobacion });
    return doc ? this.toDomain(doc) : null;
  }

  async obtenerPorPresupuesto(id_presupuesto: string): Promise<AprobacionPresupuesto[]> {
    const docs = await AprobacionPresupuestoModel.find({ id_presupuesto }).sort({ fecha_solicitud: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorProyecto(id_proyecto: string): Promise<AprobacionPresupuesto[]> {
    const docs = await AprobacionPresupuestoModel.find({ id_proyecto }).sort({ fecha_solicitud: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPendientesPorAprobador(usuario_aprobador_id: string): Promise<AprobacionPresupuesto[]> {
    const docs = await AprobacionPresupuestoModel.find({
      usuario_aprobador_id,
      estado: 'PENDIENTE'
    }).sort({ fecha_solicitud: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPendientes(): Promise<AprobacionPresupuesto[]> {
    const docs = await AprobacionPresupuestoModel.find({ estado: 'PENDIENTE' }).sort({ fecha_solicitud: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async crear(data: Partial<AprobacionPresupuesto>): Promise<AprobacionPresupuesto> {
    return this.create(data);
  }

  override async create(data: Partial<AprobacionPresupuesto>): Promise<AprobacionPresupuesto> {
    const id_aprobacion = data.id_aprobacion || await AprobacionPresupuestoModel.generateNextId();
    const fecha_solicitud = data.fecha_solicitud || new Date().toISOString();
    
    const nuevaAprobacion = await AprobacionPresupuestoModel.create({
      ...data,
      id_aprobacion,
      fecha_solicitud,
      estado: data.estado || 'PENDIENTE'
    });
    
    return this.toDomain(nuevaAprobacion);
  }

  async actualizar(id_aprobacion: string, datos: Partial<AprobacionPresupuesto>): Promise<AprobacionPresupuesto | null> {
    const actualizado = await AprobacionPresupuestoModel.findOneAndUpdate(
      { id_aprobacion },
      { $set: datos },
      { new: true, runValidators: true }
    );
    return actualizado ? this.toDomain(actualizado) : null;
  }

  async eliminar(id_aprobacion: string): Promise<boolean> {
    const resultado = await AprobacionPresupuestoModel.findOneAndDelete({ id_aprobacion });
    return !!resultado;
  }
}

