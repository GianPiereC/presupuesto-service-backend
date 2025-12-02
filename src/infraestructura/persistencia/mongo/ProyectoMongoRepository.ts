import { Model } from 'mongoose';
import { BaseMongoRepository } from './BaseMongoRepository';
import { Proyecto } from '../../../dominio/entidades/Proyecto';
import { IProyectoRepository } from '../../../dominio/repositorios/IProyectoRepository';
import { ProyectoDocument, ProyectoModel } from './schemas/ProyectoSchema';
import { PaginationInput, PaginationResult, FilterInput, SearchInput } from '../../../dominio/valueObjects/Pagination';

export class ProyectoMongoRepository extends BaseMongoRepository<Proyecto> implements IProyectoRepository {
  constructor() {
    super(ProyectoModel as unknown as Model<any>);
  }

  /**
   * Sobrescribe campos por defecto para búsqueda en proyectos
   */
  protected override getDefaultSearchFields(): string[] {
    return ['nombre_proyecto', 'cliente', 'empresa', 'id_proyecto', 'estado'];
  }

  /**
   * Sobrescribe listPaginated para usar fecha_creacion como sortBy por defecto
   */
  override async listPaginated(pagination: PaginationInput): Promise<PaginationResult<Proyecto>> {
    const { page = 1, limit = 10, sortBy = 'fecha_creacion', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [docs, total] = await Promise.all([
      this.model.find().sort(sort).skip(skip).limit(limit),
      this.model.countDocuments()
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map(doc => this.toDomain(doc)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Sobrescribe listWithFilters para usar fecha_creacion como sortBy por defecto
   */
  override async listWithFilters(filters: FilterInput, pagination?: PaginationInput): Promise<PaginationResult<Proyecto>> {
    const { page = 1, limit = 10, sortBy = 'fecha_creacion', sortOrder = 'desc' } = pagination || {};
    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const query = this.buildFilterQuery(filters);

    const [docs, total] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(limit),
      this.model.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map(doc => this.toDomain(doc)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Sobrescribe search para usar fecha_creacion como sortBy por defecto
   */
  override async search(search: SearchInput, pagination?: PaginationInput): Promise<PaginationResult<Proyecto>> {
    const { page = 1, limit = 10, sortBy = 'fecha_creacion', sortOrder = 'desc' } = pagination || {};
    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    if (!search.query) {
      return this.listPaginated(pagination || {});
    }

    const searchQuery = this.buildSearchQuery(search);

    const [docs, total] = await Promise.all([
      this.model.find(searchQuery).sort(sort).skip(skip).limit(limit),
      this.model.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map(doc => this.toDomain(doc)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  protected toDomain(doc: ProyectoDocument): Proyecto {
    return new Proyecto(
      doc.id_proyecto,
      doc.id_usuario,
      doc.id_infraestructura,
      doc.nombre_proyecto,
      doc.id_departamento,
      doc.id_provincia,
      doc.id_distrito,
      doc.id_localidad,
      doc.total_proyecto,
      doc.estado,
      doc.fecha_creacion,
      doc.fecha_ultimo_calculo,
      doc.cliente,
      doc.empresa,
      doc.plazo,
      doc.ppto_base,
      doc.ppto_oferta,
      doc.jornada
    );
  }

  async obtenerPorUsuario(id_usuario: string): Promise<Proyecto[]> {
    const docs = await ProyectoModel.find({ id_usuario });
    return docs.map(doc => this.toDomain(doc));
  }

  async obtenerPorIdProyecto(id_proyecto: string): Promise<Proyecto | null> {
    const doc = await ProyectoModel.findOne({ id_proyecto });
    return doc ? this.toDomain(doc) : null;
  }

  async obtenerProyectosConPresupuestos(): Promise<any[]> {
    return await ProyectoModel.aggregate([
      {
        $lookup: {
          from: 'presupuesto',
          localField: 'id_proyecto',
          foreignField: 'id_proyecto',
          as: 'presupuestos'
        }
      }
    ]);
  }

  override async findById(id: string): Promise<Proyecto | null> {
    return this.obtenerPorIdProyecto(id);
  }

  override async create(data: Partial<Proyecto>): Promise<Proyecto> {
    const id_proyecto = await ProyectoModel.generateNextId();
    const nuevoProyecto = await ProyectoModel.create({
      ...data,
      id_proyecto,
      fecha_creacion: new Date().toISOString()
    });
    return this.toDomain(nuevoProyecto);
  }

  override async update(id: string, data: Partial<Proyecto>): Promise<Proyecto | null> {
    const updated = await ProyectoModel.findOneAndUpdate(
      { id_proyecto: id },
      { $set: data },
      { new: true }
    );
    return updated ? this.toDomain(updated) : null;
  }

  override async delete(id: string): Promise<boolean> {
    const deleted = await ProyectoModel.findOneAndDelete({ id_proyecto: id });
    return !!deleted;
  }
}

