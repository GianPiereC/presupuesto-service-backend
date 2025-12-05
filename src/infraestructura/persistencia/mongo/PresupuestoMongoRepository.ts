import { Model } from 'mongoose';
import { BaseMongoRepository } from './BaseMongoRepository';
import { Presupuesto } from '../../../dominio/entidades/Presupuesto';
import { IPresupuestoRepository } from '../../../dominio/repositorios/IPresupuestoRepository';
import { PresupuestoDocument, PresupuestoModel } from './schemas/PresupuestoSchema';
import { TituloMongoRepository } from './TituloMongoRepository';
import { PartidaMongoRepository } from './PartidaMongoRepository';
import { PrecioRecursoPresupuestoMongoRepository } from './PrecioRecursoPresupuestoMongoRepository';
import { ApuMongoRepository } from './ApuMongoRepository';

export class PresupuestoMongoRepository extends BaseMongoRepository<Presupuesto> implements IPresupuestoRepository {
  constructor() {
    super(PresupuestoModel as unknown as Model<any>);
  }

  protected toDomain(doc: PresupuestoDocument | any): Presupuesto {
    // Convertir documento de Mongoose a objeto plano si es necesario
    const docPlain = doc.toObject ? doc.toObject() : doc;
    
    // Función helper para normalizar valores que pueden ser objetos vacíos
    const normalizarValor = (val: any, defaultValue: any = undefined): any => {
      if (val === null || val === undefined) {
        return defaultValue;
      }
      // Si es un objeto vacío {}, retornar el valor por defecto
      if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) {
        return defaultValue;
      }
      return val;
    };

    // Normalizar campos que pueden venir como objetos vacíos desde MongoDB
    // Preservar null para estado (puede ser null, undefined, o un valor válido)
    // IMPORTANTE: Si docPlain.estado es null, preservarlo como null (no convertir a undefined)
    // Si no existe la propiedad, usar undefined
    let estadoNormalizado: any;
    if ('estado' in docPlain) {
      // La propiedad existe, preservar su valor (puede ser null, string, etc.)
      estadoNormalizado = docPlain.estado;
    } else {
      // La propiedad no existe en el documento
      estadoNormalizado = undefined;
    }
    
    const esActivoNormalizado = normalizarValor(docPlain.es_activo, false);
    const esInmutableNormalizado = normalizarValor(docPlain.es_inmutable, false);
    const faseNormalizada = normalizarValor(docPlain.fase, undefined);
    // version puede ser null (padre) o número (versión), mantener null si es null
    const versionNormalizada = docPlain.version !== undefined 
      ? docPlain.version  // Puede ser null o número
      : undefined;
    
    // Normalizar objetos anidados
    const estadoAprobacionNormalizado = normalizarValor(docPlain.estado_aprobacion, undefined);
    const aprobacionLicitacionNormalizada = normalizarValor(docPlain.aprobacion_licitacion, undefined);
    const aprobacionMetaNormalizada = normalizarValor(docPlain.aprobacion_meta, undefined);

    // Calcular es_padre: si está explícitamente definido, usarlo; si no, calcularlo
    const esPadreCalculado = docPlain.es_padre !== undefined && docPlain.es_padre !== null
      ? docPlain.es_padre
      : (versionNormalizada === null || versionNormalizada === undefined);

    const presupuesto = new Presupuesto(
      docPlain.id_presupuesto,
      docPlain.id_proyecto,
      docPlain.costo_directo,
      docPlain.fecha_creacion,
      docPlain.monto_igv,
      docPlain.monto_utilidad,
      docPlain.nombre_presupuesto,
      docPlain.parcial_presupuesto,
      docPlain.observaciones,
      docPlain.porcentaje_igv,
      docPlain.porcentaje_utilidad,
      docPlain.plazo,
      docPlain.ppto_base,
      docPlain.ppto_oferta,
      docPlain.total_presupuesto,
      docPlain.numeracion_presupuesto,
      // Nuevos campos (opcionales - compatibilidad con data antigua)
      normalizarValor(docPlain.id_grupo_version, undefined),
      faseNormalizada,
      versionNormalizada,
      normalizarValor(docPlain.descripcion_version, undefined),
      esPadreCalculado,
      normalizarValor(docPlain.id_presupuesto_base, undefined),
      normalizarValor(docPlain.id_presupuesto_licitacion, undefined),
      normalizarValor(docPlain.version_licitacion_aprobada, undefined),
      normalizarValor(docPlain.id_presupuesto_contractual, undefined),
      normalizarValor(docPlain.version_contractual_aprobada, undefined),
      normalizarValor(docPlain.id_presupuesto_meta_vigente, undefined), // FALTABA ESTE PARÁMETRO
      normalizarValor(docPlain.version_meta_vigente, undefined), // FALTABA ESTE PARÁMETRO
      esInmutableNormalizado,
      esActivoNormalizado,
      estadoNormalizado,
      estadoAprobacionNormalizado,
      aprobacionLicitacionNormalizada,
      aprobacionMetaNormalizada
    );
    
    return presupuesto;
  }

  async obtenerPorProyecto(id_proyecto: string): Promise<Presupuesto[]> {
    // Usar .lean() para obtener documentos planos y preservar null correctamente
    // Similar a como lo hace getPresupuestosPorFaseYEstado
    const docs = await PresupuestoModel.find({ id_proyecto }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorIdPresupuesto(id_presupuesto: string): Promise<Presupuesto | null> {
    const doc = await PresupuestoModel.findOne({ id_presupuesto });
    return doc ? this.toDomain(doc) : null;
  }

  override async findById(id: string): Promise<Presupuesto | null> {
    return this.obtenerPorIdPresupuesto(id);
  }

  override async create(data: Partial<Presupuesto>): Promise<Presupuesto> {
    // Si ya viene id_presupuesto en data, usarlo; si no, generar uno nuevo
    const id_presupuesto = data.id_presupuesto || await PresupuestoModel.generateNextId();
    const fecha_creacion = data.fecha_creacion || new Date().toISOString();
    
    const nuevoPresupuesto = await PresupuestoModel.create({
      ...data,
      id_presupuesto,
      fecha_creacion
    });
    return this.toDomain(nuevoPresupuesto);
  }

  override async update(id: string, data: Partial<Presupuesto>): Promise<Presupuesto | null> {
    const updated = await PresupuestoModel.findOneAndUpdate(
      { id_presupuesto: id },
      { $set: data },
      { new: true }
    );
    return updated ? this.toDomain(updated) : null;
  }

  override async delete(id: string): Promise<boolean> {
    const deleted = await PresupuestoModel.findOneAndDelete({ id_presupuesto: id });
    return !!deleted;
  }

  async obtenerPorGrupoVersion(id_grupo_version: string): Promise<Presupuesto[]> {
    const docs = await PresupuestoModel.find({ id_grupo_version });
    return docs.map(doc => this.toDomain(doc));
  }

  async eliminarGrupoCompleto(id_grupo_version: string): Promise<boolean> {
    try {
      // Obtener todos los presupuestos del grupo
      const presupuestos = await this.obtenerPorGrupoVersion(id_grupo_version);

      if (presupuestos.length === 0) {
        return false;
      }

      // Obtener todos los IDs de presupuesto para eliminar elementos relacionados
      const idsPresupuestos = presupuestos.map(p => p.id_presupuesto);

      // Eliminar APUs de todos los presupuestos del grupo
      const apuRepo = new ApuMongoRepository();
      for (const idPresupuesto of idsPresupuestos) {
        const apus = await apuRepo.obtenerPorPresupuesto(idPresupuesto);
        for (const apu of apus) {
          await apuRepo.delete(apu.id_apu);
        }
      }

      // Eliminar precios compartidos de todos los presupuestos del grupo
      const precioRepo = new PrecioRecursoPresupuestoMongoRepository();
      for (const idPresupuesto of idsPresupuestos) {
        const precios = await precioRepo.obtenerPorPresupuesto(idPresupuesto);
        for (const precio of precios) {
          await precioRepo.delete(precio.id_precio_recurso);
        }
      }

      // Para cada presupuesto, eliminar títulos y sus partidas
      const tituloRepo = new TituloMongoRepository();
      const partidaRepo = new PartidaMongoRepository();

      for (const presupuesto of presupuestos) {
        // Obtener títulos del presupuesto
        const titulos = await tituloRepo.obtenerPorPresupuesto(presupuesto.id_presupuesto);

        for (const titulo of titulos) {
          // Obtener y eliminar partidas del título
          const partidas = await partidaRepo.obtenerPorTitulo(titulo.id_titulo);
          for (const partida of partidas) {
            await partidaRepo.delete(partida.id_partida);
          }

          // Eliminar título
          await tituloRepo.delete(titulo.id_titulo);
        }
      }

      // Finalmente, eliminar todos los presupuestos del grupo
      const result = await PresupuestoModel.deleteMany({ id_grupo_version });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('[PresupuestoMongoRepository] Error eliminando grupo completo:', error);
      throw error;
    }
  }
}

