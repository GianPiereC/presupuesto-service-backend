import { Model } from 'mongoose';
import { BaseMongoRepository } from './BaseMongoRepository';
import { Apu } from '../../../dominio/entidades/Apu';
import { RecursoApu } from '../../../dominio/entidades/RecursoApu';
import { IApuRepository } from '../../../dominio/repositorios/IApuRepository';
import { ApuDocument, ApuModel } from './schemas/ApuSchema';

export class ApuMongoRepository 
  extends BaseMongoRepository<Apu> 
  implements IApuRepository {
  
  constructor() {
    super(ApuModel as unknown as Model<any>);
  }

  protected toDomain(doc: ApuDocument | any): Apu {
    const docPlain = doc.toObject ? doc.toObject() : doc;
    
    // Mapear recursos embebidos - tolerante a estructura antigua
    const recursos = (docPlain.recursos || []).map((r: any) => {
      const cantidad = typeof r.cantidad === 'number' ? r.cantidad : 0;
      const desperdicio = typeof r.desperdicio_porcentaje === 'number' ? r.desperdicio_porcentaje : 0;
      const cantidadConDesperdicio = typeof r.cantidad_con_desperdicio === 'number' 
        ? r.cantidad_con_desperdicio 
        : cantidad * (1 + desperdicio / 100);
      const parcial = typeof r.parcial === 'number' ? r.parcial : 0;
      const orden = typeof r.orden === 'number' ? r.orden : 0;
      
      return new RecursoApu(
        r.id_recurso_apu || '',
        r.recurso_id || undefined,
        r.codigo_recurso || undefined,
        r.descripcion || '',
        r.unidad_medida || '',
        r.tipo_recurso || 'MATERIAL',
        r.id_precio_recurso ?? null,
        cantidad,
        desperdicio,
        cantidadConDesperdicio,
        parcial,
        orden,
        r.cuadrilla,
        r.id_partida_subpartida,
        r.precio_unitario_subpartida,
        r.tiene_precio_override,
        r.precio_override
      );
      
    });
    
    return new Apu(
      docPlain.id_apu,
      docPlain.id_partida,
      docPlain.id_presupuesto,
      docPlain.id_proyecto,
      docPlain.rendimiento || 1.0,
      docPlain.jornada || 8,
      docPlain.costo_materiales || 0,
      docPlain.costo_mano_obra || 0,
      docPlain.costo_equipos || 0,
      docPlain.costo_subcontratos || 0,
      docPlain.costo_directo || 0,
      recursos
    );
  }

  async obtenerPorPartida(id_partida: string): Promise<Apu | null> {
    const doc = await this.model.findOne({ id_partida });
    return doc ? this.toDomain(doc) : null;
  }

  async obtenerPorPresupuesto(id_presupuesto: string): Promise<Apu[]> {
    const docs = await this.model.find({ id_presupuesto });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorProyecto(id_proyecto: string): Promise<Apu[]> {
    const docs = await this.model.find({ id_proyecto });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorIdApu(id_apu: string): Promise<Apu | null> {
    const doc = await this.model.findOne({ id_apu });
    return doc ? this.toDomain(doc) : null;
  }

  override async findById(id: string): Promise<Apu | null> {
    return this.obtenerPorIdApu(id);
  }

  override async update(id: string, data: Partial<Apu>): Promise<Apu | null> {
    const updated = await this.model.findOneAndUpdate(
      { id_apu: id },
      { $set: data },
      { new: true, runValidators: true }
    );
    return updated ? this.toDomain(updated) : null;
  }

  override async delete(id: string): Promise<boolean> {
    const deleted = await this.model.findOneAndDelete({ id_apu: id });
    return !!deleted;
  }

  async agregarRecurso(id_apu: string, recurso: RecursoApu): Promise<Apu | null> {
    const recursoDoc: any = {
      id_recurso_apu: recurso.id_recurso_apu,
      recurso_id: recurso.recurso_id,
      codigo_recurso: recurso.codigo_recurso,
      descripcion: recurso.descripcion,
      unidad_medida: recurso.unidad_medida,
      tipo_recurso: recurso.tipo_recurso,
      id_precio_recurso: recurso.id_precio_recurso,
      cantidad: recurso.cantidad,
      desperdicio_porcentaje: recurso.desperdicio_porcentaje,
      cantidad_con_desperdicio: recurso.cantidad_con_desperdicio,
      parcial: recurso.parcial,
      orden: recurso.orden
    };
    
    if (recurso.cuadrilla !== undefined) {
      recursoDoc.cuadrilla = recurso.cuadrilla;
    }
    if (recurso.id_partida_subpartida !== undefined) {
      recursoDoc.id_partida_subpartida = recurso.id_partida_subpartida;
    }
    if (recurso.precio_unitario_subpartida !== undefined) {
      recursoDoc.precio_unitario_subpartida = recurso.precio_unitario_subpartida;
    }
    if (recurso.tiene_precio_override !== undefined) {
      recursoDoc.tiene_precio_override = recurso.tiene_precio_override;
    }
    if (recurso.precio_override !== undefined) {
      recursoDoc.precio_override = recurso.precio_override;
    }

    const updated = await this.model.findOneAndUpdate(
      { id_apu },
      { $push: { recursos: recursoDoc } },
      { new: true, runValidators: true }
    );

    if (!updated) return null;

    const apu = this.toDomain(updated);
    apu.calcularCostoDirecto();
    await this.saveCostos(id_apu, apu);
    return await this.obtenerPorIdApu(id_apu);
  }

  async actualizarRecurso(
    id_apu: string,
    id_recurso_apu: string,
    recurso: Partial<RecursoApu>
  ): Promise<Apu | null> {
    const updateFields: any = {};
    
    if (recurso.cantidad !== undefined) {
      updateFields['recursos.$.cantidad'] = recurso.cantidad;
    }
    if (recurso.desperdicio_porcentaje !== undefined) {
      updateFields['recursos.$.desperdicio_porcentaje'] = recurso.desperdicio_porcentaje;
      updateFields['recursos.$.cantidad_con_desperdicio'] = 
        (recurso.cantidad ?? 0) * (1 + recurso.desperdicio_porcentaje / 100);
    }
    if (recurso.id_precio_recurso !== undefined) {
      updateFields['recursos.$.id_precio_recurso'] = recurso.id_precio_recurso;
    }
    if (recurso.cuadrilla !== undefined) {
      updateFields['recursos.$.cuadrilla'] = recurso.cuadrilla;
    }
    if (recurso.parcial !== undefined) {
      updateFields['recursos.$.parcial'] = recurso.parcial;
    }
    if (recurso.id_partida_subpartida !== undefined) {
      updateFields['recursos.$.id_partida_subpartida'] = recurso.id_partida_subpartida;
    }
    if (recurso.precio_unitario_subpartida !== undefined) {
      updateFields['recursos.$.precio_unitario_subpartida'] = recurso.precio_unitario_subpartida;
    }
    if (recurso.tiene_precio_override !== undefined) {
      updateFields['recursos.$.tiene_precio_override'] = recurso.tiene_precio_override;
    }
    if (recurso.precio_override !== undefined) {
      updateFields['recursos.$.precio_override'] = recurso.precio_override;
    } else if (recurso.tiene_precio_override === false) {
      // Si se desactiva el override, asegurar que precio_override se elimine o se establezca en null
      updateFields['recursos.$.precio_override'] = null;
    }

    const updated = await this.model.findOneAndUpdate(
      { id_apu, 'recursos.id_recurso_apu': id_recurso_apu },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updated) return null;

    const apu = this.toDomain(updated);
    apu.calcularCostoDirecto();
    await this.saveCostos(id_apu, apu);
    return apu;
  }

  async eliminarRecurso(id_apu: string, id_recurso_apu: string): Promise<Apu | null> {
    const apuActual = await this.obtenerPorIdApu(id_apu);
    if (!apuActual) return null;

    const recursoAEliminar = apuActual.recursos.find(r => r.id_recurso_apu === id_recurso_apu);
    if (!recursoAEliminar) return null;

    const updated = await this.model.findOneAndUpdate(
      { id_apu },
      { $pull: { recursos: { id_recurso_apu } } },
      { new: true, runValidators: true }
    );

    if (!updated) return null;

    const apu = this.toDomain(updated);
    apu.calcularCostoDirecto();
    await this.saveCostos(id_apu, apu);
    return apu;
  }

  private async saveCostos(id_apu: string, apu: Apu): Promise<void> {
    await this.model.findOneAndUpdate(
      { id_apu },
      {
        $set: {
          costo_materiales: apu.costo_materiales,
          costo_mano_obra: apu.costo_mano_obra,
          costo_equipos: apu.costo_equipos,
          costo_subcontratos: apu.costo_subcontratos,
          costo_directo: apu.costo_directo
        }
      }
    );
  }
}


