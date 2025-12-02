import mongoose from 'mongoose';
import { TituloService } from './TituloService';
import { PartidaService } from './PartidaService';
import { RecalculoTotalesService } from './RecalculoTotalesService';
import { Titulo } from '../../dominio/entidades/Titulo';
import { Partida } from '../../dominio/entidades/Partida';
import { TituloModel } from '../../infraestructura/persistencia/mongo/schemas/TituloSchema';
import { PartidaModel } from '../../infraestructura/persistencia/mongo/schemas/PartidaSchema';
import { ApuModel } from '../../infraestructura/persistencia/mongo/schemas/ApuSchema';
import { TituloMongoRepository } from '../../infraestructura/persistencia/mongo/TituloMongoRepository';
import { PartidaMongoRepository } from '../../infraestructura/persistencia/mongo/PartidaMongoRepository';
import { ValidationException } from '../../dominio/exceptions/DomainException';

export interface TituloCreateInput {
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo_padre?: string | null;
  nivel: number;
  numero_item: string;
  descripcion: string;
  tipo: 'TITULO' | 'SUBTITULO';
  orden: number;
  total_parcial?: number;
  temp_id?: string;
}

export interface TituloUpdateInput {
  id_titulo: string;
  id_titulo_padre?: string | null;
  nivel?: number;
  numero_item?: string;
  descripcion?: string;
  tipo?: 'TITULO' | 'SUBTITULO';
  orden?: number;
  total_parcial?: number;
}

export interface PartidaCreateInput {
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo: string;
  id_partida_padre?: string | null;
  nivel_partida: number;
  numero_item: string;
  codigo_partida: string;
  descripcion: string;
  unidad_medida: string;
  metrado: number;
  precio_unitario: number;
  parcial_partida?: number;
  orden: number;
  estado?: 'Activa' | 'Inactiva';
  temp_id?: string;
}

export interface PartidaUpdateInput {
  id_partida: string;
  id_titulo?: string;
  id_partida_padre?: string | null;
  nivel_partida?: number;
  numero_item?: string;
  codigo_partida?: string;
  descripcion?: string;
  unidad_medida?: string;
  metrado?: number;
  precio_unitario?: number;
  parcial_partida?: number;
  orden?: number;
  estado?: 'Activa' | 'Inactiva';
}

export interface BatchEstructuraInput {
  titulosCrear: TituloCreateInput[];
  partidasCrear: PartidaCreateInput[];
  titulosActualizar: TituloUpdateInput[];
  partidasActualizar: PartidaUpdateInput[];
  titulosEliminar: string[];
  partidasEliminar: string[];
}

export interface BatchEstructuraResponse {
  success: boolean;
  message?: string;
  titulosCreados: Titulo[];
  partidasCreadas: Partida[];
  titulosActualizados: Titulo[];
  partidasActualizadas: Partida[];
  titulosEliminados: string[];
  partidasEliminadas: string[];
}

export class EstructuraBatchService {
  constructor(
    private readonly tituloService: TituloService,
    private readonly partidaService: PartidaService,
    private readonly tituloRepository: TituloMongoRepository,
    private readonly partidaRepository: PartidaMongoRepository,
    private readonly recalculoTotalesService?: RecalculoTotalesService
  ) {}

  /**
   * Convierte un documento de MongoDB a entidad Titulo
   */
  private toDomainTitulo(doc: any): Titulo {
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

  /**
   * Convierte un documento de MongoDB a entidad Partida
   */
  private toDomainPartida(doc: any): Partida {
    const docPlain = doc.toObject ? doc.toObject() : doc;
    return new Partida(
      docPlain.id_partida,
      docPlain.id_presupuesto,
      docPlain.id_proyecto,
      docPlain.id_titulo,
      docPlain.id_partida_padre || null,
      docPlain.nivel_partida,
      docPlain.numero_item,
      docPlain.codigo_partida,
      docPlain.descripcion,
      docPlain.unidad_medida,
      docPlain.metrado || 0,
      docPlain.precio_unitario || 0,
      docPlain.parcial_partida || 0,
      docPlain.orden,
      docPlain.estado || 'Activa'
    );
  }

  /**
   * Ejecuta todas las operaciones en una transacción de MongoDB
   * Si alguna falla, hace rollback de todas
   * Si las transacciones no están disponibles, ejecuta con rollback manual
   */
  async ejecutarBatch(input: BatchEstructuraInput): Promise<BatchEstructuraResponse> {
    try {
      // Intentar usar transacciones primero
      return await this.ejecutarBatchConTransaccion(input);
    } catch (error: any) {
      // Si el error es porque no hay replica set, usar método sin transacciones
      if (error.message?.includes('Transaction numbers are only allowed on a replica set') ||
          error.message?.includes('not a replica set') ||
          error.code === 20) {
        return await this.ejecutarBatchSinTransaccion(input);
      }
      // Si es otro error, relanzarlo
      throw error;
    }
  }

  /**
   * Ejecuta batch con transacciones de MongoDB
   */
  private async ejecutarBatchConTransaccion(input: BatchEstructuraInput): Promise<BatchEstructuraResponse> {
    const session = await mongoose.startSession();
    
    const resultado: BatchEstructuraResponse = {
      success: false,
      titulosCreados: [],
      partidasCreadas: [],
      titulosActualizados: [],
      partidasActualizadas: [],
      titulosEliminados: [],
      partidasEliminadas: [],
    };

    try {
      await session.withTransaction(async () => {
      // Mapeo de IDs temporales a IDs reales
      const mapeoIdsTitulos: Map<string, string> = new Map();
      const mapeoIdsPartidas: Map<string, string> = new Map();

      // 1. Crear títulos (en orden: primero padres, luego hijos)
      const titulosParaCrear = [...input.titulosCrear];
      const titulosCreados = new Set<string>();

      while (titulosParaCrear.length > 0) {
        let progreso = false;
        for (let i = titulosParaCrear.length - 1; i >= 0; i--) {
          const tituloInput = titulosParaCrear[i];
          const idPadre = tituloInput.id_titulo_padre;

          // Si no tiene padre o el padre ya existe o ya fue creado
          const puedeCrear = !idPadre ||
            !idPadre.startsWith('temp_') ||
            titulosCreados.has(idPadre) ||
            mapeoIdsTitulos.has(idPadre);

          if (puedeCrear) {
            const idPadreReal = idPadre && mapeoIdsTitulos.has(idPadre)
              ? mapeoIdsTitulos.get(idPadre)!
              : idPadre;

            const tituloData: Partial<Titulo> = {
              id_presupuesto: tituloInput.id_presupuesto,
              id_proyecto: tituloInput.id_proyecto,
              id_titulo_padre: idPadreReal || null,
              nivel: tituloInput.nivel,
              numero_item: tituloInput.numero_item,
              descripcion: tituloInput.descripcion,
              tipo: tituloInput.tipo,
              orden: tituloInput.orden,
              total_parcial: tituloInput.total_parcial || 0,
            };

            // Generar ID si no existe
            if (!tituloData.id_titulo) {
              tituloData.id_titulo = await TituloModel.generateNextId();
            }

            // Validar unicidad de numero_item por proyecto
            if (tituloData.numero_item && tituloData.id_proyecto) {
              const existente = await TituloModel.findOne({
                numero_item: tituloData.numero_item,
                id_proyecto: tituloData.id_proyecto
              }).session(session);
              if (existente) {
                throw new ValidationException(
                  `Ya existe un título con el número de item "${tituloData.numero_item}" en este proyecto`,
                  'numero_item'
                );
              }
            }

            // Crear usando el modelo directamente con la sesión
            const nuevoTituloDoc = await TituloModel.create([tituloData], { session });
            const nuevoTitulo = this.toDomainTitulo(nuevoTituloDoc[0]);
            
            if (tituloInput.temp_id) {
              mapeoIdsTitulos.set(tituloInput.temp_id, nuevoTitulo.id_titulo);
            }
            
            resultado.titulosCreados.push(nuevoTitulo);
            titulosCreados.add(tituloInput.temp_id || nuevoTitulo.id_titulo);
            titulosParaCrear.splice(i, 1);
            progreso = true;
          }
        }

        if (!progreso && titulosParaCrear.length > 0) {
          throw new Error('Error: No se pueden crear algunos títulos debido a referencias circulares');
        }
      }

      // 2. Crear partidas (actualizar referencias a títulos nuevos)
      for (const partidaInput of input.partidasCrear) {
        let idTituloReal = partidaInput.id_titulo;
        if (mapeoIdsTitulos.has(partidaInput.id_titulo)) {
          idTituloReal = mapeoIdsTitulos.get(partidaInput.id_titulo)!;
        }

        const partidaData: Partial<Partida> = {
          id_presupuesto: partidaInput.id_presupuesto,
          id_proyecto: partidaInput.id_proyecto,
          id_titulo: idTituloReal,
          id_partida_padre: partidaInput.id_partida_padre || null,
          nivel_partida: partidaInput.nivel_partida,
          numero_item: partidaInput.numero_item,
          codigo_partida: partidaInput.codigo_partida,
          descripcion: partidaInput.descripcion,
          unidad_medida: partidaInput.unidad_medida,
          metrado: partidaInput.metrado,
          precio_unitario: partidaInput.precio_unitario,
          parcial_partida: partidaInput.parcial_partida || (partidaInput.metrado * partidaInput.precio_unitario),
          orden: partidaInput.orden,
          estado: partidaInput.estado || 'Activa',
        };

        // Generar ID si no existe
        if (!partidaData.id_partida) {
          partidaData.id_partida = await PartidaModel.generateNextId();
        }

        // Validar unicidad de codigo_partida por proyecto
        if (partidaData.codigo_partida && partidaData.id_proyecto) {
          const existente = await PartidaModel.findOne({
            codigo_partida: partidaData.codigo_partida,
            id_proyecto: partidaData.id_proyecto
          }).session(session);
          if (existente) {
            throw new ValidationException(
              `Ya existe una partida con el código "${partidaData.codigo_partida}" en este proyecto`,
              'codigo_partida'
            );
          }
        }

        // Crear usando el modelo directamente con la sesión
        const nuevaPartidaDoc = await PartidaModel.create([partidaData], { session });
        const nuevaPartida = this.toDomainPartida(nuevaPartidaDoc[0]);
        
        if (partidaInput.temp_id) {
          mapeoIdsPartidas.set(partidaInput.temp_id, nuevaPartida.id_partida);
        }
        
        resultado.partidasCreadas.push(nuevaPartida);
      }

      // 3. Actualizar títulos
      for (const tituloInput of input.titulosActualizar) {
        const cambios: Partial<Titulo> = {};
        if (tituloInput.descripcion !== undefined) cambios.descripcion = tituloInput.descripcion;
        if (tituloInput.id_titulo_padre !== undefined) {
          const idPadreReal = tituloInput.id_titulo_padre && mapeoIdsTitulos.has(tituloInput.id_titulo_padre)
            ? mapeoIdsTitulos.get(tituloInput.id_titulo_padre)!
            : tituloInput.id_titulo_padre;
          cambios.id_titulo_padre = idPadreReal;
        }
        if (tituloInput.orden !== undefined) cambios.orden = tituloInput.orden;
        if (tituloInput.nivel !== undefined) cambios.nivel = tituloInput.nivel;
        if (tituloInput.numero_item !== undefined) cambios.numero_item = tituloInput.numero_item;
        if (tituloInput.tipo !== undefined) cambios.tipo = tituloInput.tipo;
        if (tituloInput.total_parcial !== undefined) cambios.total_parcial = tituloInput.total_parcial;

        // Validar unicidad de numero_item por proyecto si se está actualizando
        if (tituloInput.numero_item !== undefined) {
          const tituloActual = await TituloModel.findOne({ id_titulo: tituloInput.id_titulo }).session(session);
          if (tituloActual) {
            const id_proyecto = tituloActual.id_proyecto;
            const existente = await TituloModel.findOne({
              numero_item: tituloInput.numero_item,
              id_proyecto: id_proyecto,
              id_titulo: { $ne: tituloInput.id_titulo }
            }).session(session);
            if (existente) {
              throw new ValidationException(
                `Ya existe otro título con el número de item "${tituloInput.numero_item}" en este proyecto`,
                'numero_item'
              );
            }
          }
        }

        if (Object.keys(cambios).length > 0) {
          // Actualizar usando el modelo directamente con la sesión
          const tituloDoc = await TituloModel.findOneAndUpdate(
            { id_titulo: tituloInput.id_titulo },
            { $set: cambios },
            { new: true, session }
          );
          if (tituloDoc) {
            const tituloActualizado = this.toDomainTitulo(tituloDoc);
            resultado.titulosActualizados.push(tituloActualizado);
          }
        }
      }

      // 4. Actualizar partidas
      for (const partidaInput of input.partidasActualizar) {
        const cambios: Partial<Partida> = {};
        if (partidaInput.descripcion !== undefined) cambios.descripcion = partidaInput.descripcion;
        if (partidaInput.id_titulo !== undefined) {
          const idTituloReal = mapeoIdsTitulos.has(partidaInput.id_titulo)
            ? mapeoIdsTitulos.get(partidaInput.id_titulo)!
            : partidaInput.id_titulo;
          cambios.id_titulo = idTituloReal;
        }
        if (partidaInput.id_partida_padre !== undefined) cambios.id_partida_padre = partidaInput.id_partida_padre;
        if (partidaInput.orden !== undefined) cambios.orden = partidaInput.orden;
        if (partidaInput.metrado !== undefined) cambios.metrado = partidaInput.metrado;
        if (partidaInput.precio_unitario !== undefined) cambios.precio_unitario = partidaInput.precio_unitario;
        if (partidaInput.unidad_medida !== undefined) cambios.unidad_medida = partidaInput.unidad_medida;
        if (partidaInput.nivel_partida !== undefined) cambios.nivel_partida = partidaInput.nivel_partida;
        if (partidaInput.numero_item !== undefined) cambios.numero_item = partidaInput.numero_item;
        if (partidaInput.codigo_partida !== undefined) cambios.codigo_partida = partidaInput.codigo_partida;
        if (partidaInput.estado !== undefined) cambios.estado = partidaInput.estado;
        if (partidaInput.parcial_partida !== undefined) cambios.parcial_partida = partidaInput.parcial_partida;

        // Validar unicidad de codigo_partida por proyecto si se está actualizando
        if (partidaInput.codigo_partida !== undefined) {
          const partidaActual = await PartidaModel.findOne({ id_partida: partidaInput.id_partida }).session(session);
          if (partidaActual) {
            const id_proyecto = partidaActual.id_proyecto;
            const existente = await PartidaModel.findOne({
              codigo_partida: partidaInput.codigo_partida,
              id_proyecto: id_proyecto,
              id_partida: { $ne: partidaInput.id_partida }
            }).session(session);
            if (existente) {
              throw new ValidationException(
                `Ya existe otra partida con el código "${partidaInput.codigo_partida}" en este proyecto`,
                'codigo_partida'
              );
            }
          }
        }

        if (Object.keys(cambios).length > 0) {
          // Actualizar usando el modelo directamente con la sesión
          const partidaDoc = await PartidaModel.findOneAndUpdate(
            { id_partida: partidaInput.id_partida },
            { $set: cambios },
            { new: true, session }
          );
          if (partidaDoc) {
            const partidaActualizada = this.toDomainPartida(partidaDoc);
            resultado.partidasActualizadas.push(partidaActualizada);
          }
        }
      }

      // 5. Obtener información de títulos antes de eliminar (para recalcular después)
      const titulosAEliminarInfo: Array<{ id_titulo: string; id_titulo_padre: string | null; id_presupuesto: string }> = [];
      for (const id_titulo of input.titulosEliminar) {
        const titulo = await TituloModel.findOne({ id_titulo }).session(session);
        if (titulo) {
          titulosAEliminarInfo.push({
            id_titulo: titulo.id_titulo,
            id_titulo_padre: titulo.id_titulo_padre || null,
            id_presupuesto: titulo.id_presupuesto
          });
        }
      }

      // Eliminar títulos recursivamente (dentro de la transacción)
      const eliminarTituloRecursivo = async (id_titulo: string): Promise<void> => {
        // Obtener hijos del título
        const hijos = await TituloModel.find({ id_titulo_padre: id_titulo }).session(session);
        // Eliminar hijos recursivamente
        for (const hijo of hijos) {
          await eliminarTituloRecursivo(hijo.id_titulo);
        }
        // Eliminar todas las partidas asociadas a este título
        const partidas = await PartidaModel.find({ id_titulo }).session(session);
        for (const partida of partidas) {
          await eliminarPartidaRecursiva(partida.id_partida);
        }
        // Eliminar el título
        await TituloModel.deleteOne({ id_titulo }).session(session);
      };

      // Función auxiliar para eliminar partidas recursivamente
      const eliminarPartidaRecursiva = async (id_partida: string): Promise<void> => {
        // Obtener subpartidas
        const subpartidas = await PartidaModel.find({ id_partida_padre: id_partida }).session(session);
        // Eliminar subpartidas recursivamente
        for (const subpartida of subpartidas) {
          await eliminarPartidaRecursiva(subpartida.id_partida);
        }

        // Eliminar APUs asociados a esta partida antes de eliminar la partida
        await ApuModel.deleteMany({ id_partida }).session(session);

        // Eliminar la partida directamente (dentro de la sesión)
        await PartidaModel.deleteOne({ id_partida }).session(session);
      };

      // Eliminar títulos
      for (const id_titulo of input.titulosEliminar) {
        const titulo = await TituloModel.findOne({ id_titulo }).session(session);
        if (titulo) {
          await eliminarTituloRecursivo(id_titulo);
          resultado.titulosEliminados.push(id_titulo);
        }
      }

      // 6. Obtener información de partidas antes de eliminar (para recalcular después)
      const partidasAEliminarInfo: Array<{ id_partida: string; id_titulo: string; id_presupuesto: string }> = [];
      for (const id_partida of input.partidasEliminar) {
        const partida = await PartidaModel.findOne({ id_partida }).session(session);
        if (partida) {
          partidasAEliminarInfo.push({
            id_partida: partida.id_partida,
            id_titulo: partida.id_titulo,
            id_presupuesto: partida.id_presupuesto
          });
        }
      }

      // Eliminar partidas
      for (const id_partida of input.partidasEliminar) {
        const partida = await PartidaModel.findOne({ id_partida }).session(session);
        if (partida) {
          await eliminarPartidaRecursiva(id_partida);
          resultado.partidasEliminadas.push(id_partida);
        }
      }

      // Si todo fue exitoso, la transacción se confirma automáticamente
      resultado.success = true;
      resultado.message = 'Cambios guardados exitosamente';
      });
      
      // Recalcular totales de todos los títulos afectados después de la transacción
      // Recopilar títulos únicos afectados
      const titulosAfectados = new Set<string>();
      const presupuestosAfectados = new Set<string>();
      
      // Títulos creados/actualizados
      for (const titulo of [...resultado.titulosCreados, ...resultado.titulosActualizados]) {
        if (titulo.id_titulo && titulo.id_presupuesto) {
          titulosAfectados.add(titulo.id_titulo);
          presupuestosAfectados.add(titulo.id_presupuesto);
          // Si tiene padre, también recalcular el padre
          if (titulo.id_titulo_padre) {
            titulosAfectados.add(titulo.id_titulo_padre);
          }
        }
      }
      
      // Partidas creadas/actualizadas
      for (const partida of [...resultado.partidasCreadas, ...resultado.partidasActualizadas]) {
        if (partida.id_titulo && partida.id_presupuesto) {
          titulosAfectados.add(partida.id_titulo);
          presupuestosAfectados.add(partida.id_presupuesto);
        }
      }
      
      // Para títulos eliminados, agregar el padre a la lista de afectados
      for (const info of titulosAEliminarInfo) {
        if (info.id_titulo_padre) {
          titulosAfectados.add(info.id_titulo_padre);
        }
        presupuestosAfectados.add(info.id_presupuesto);
      }
      
      // Para partidas eliminadas, agregar el título a la lista de afectados
      for (const info of partidasAEliminarInfo) {
        titulosAfectados.add(info.id_titulo);
        presupuestosAfectados.add(info.id_presupuesto);
      }
      
      // Recalcular totales de títulos únicos afectados
      if (this.recalculoTotalesService && titulosAfectados.size > 0) {
        for (const id_titulo of titulosAfectados) {
          try {
            const titulo = await this.tituloService.obtenerPorId(id_titulo);
            if (titulo && titulo.id_presupuesto) {
              await this.recalculoTotalesService.recalcularTotalesAscendentes(
                id_titulo,
                titulo.id_presupuesto
              );
            }
          } catch (error) {
            console.error('[EstructuraBatchService] Error al recalcular totales:', error);
            // Continuar con otros títulos
          }
        }
      }
      
      return resultado;
    } catch (error: any) {
      // Si hay error, la transacción se hace rollback automáticamente
      resultado.success = false;
      resultado.message = error.message || 'Error al guardar los cambios';
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Ejecuta batch sin transacciones (para MongoDB standalone)
   * Implementa rollback manual si algo falla
   */
  private async ejecutarBatchSinTransaccion(input: BatchEstructuraInput): Promise<BatchEstructuraResponse> {
    const resultado: BatchEstructuraResponse = {
      success: false,
      titulosCreados: [],
      partidasCreadas: [],
      titulosActualizados: [],
      partidasActualizadas: [],
      titulosEliminados: [],
      partidasEliminadas: [],
    };

    // Almacenar operaciones realizadas para rollback
    const operacionesRollback: Array<() => Promise<void>> = [];
    const titulosCreadosIds: string[] = [];
    const partidasCreadasIds: string[] = [];

    try {
      // Mapeo de IDs temporales a IDs reales
      const mapeoIdsTitulos: Map<string, string> = new Map();
      const mapeoIdsPartidas: Map<string, string> = new Map();

      // 1. Crear títulos (en orden: primero padres, luego hijos)
      const titulosParaCrear = [...input.titulosCrear];
      const titulosCreados = new Set<string>();

      while (titulosParaCrear.length > 0) {
        let progreso = false;
        for (let i = titulosParaCrear.length - 1; i >= 0; i--) {
          const tituloInput = titulosParaCrear[i];
          const idPadre = tituloInput.id_titulo_padre;

          const puedeCrear = !idPadre ||
            !idPadre.startsWith('temp_') ||
            titulosCreados.has(idPadre) ||
            mapeoIdsTitulos.has(idPadre);

          if (puedeCrear) {
            const idPadreReal = idPadre && mapeoIdsTitulos.has(idPadre)
              ? mapeoIdsTitulos.get(idPadre)!
              : idPadre;

            const tituloData: Partial<Titulo> = {
              id_presupuesto: tituloInput.id_presupuesto,
              id_proyecto: tituloInput.id_proyecto,
              id_titulo_padre: idPadreReal || null,
              nivel: tituloInput.nivel,
              numero_item: tituloInput.numero_item,
              descripcion: tituloInput.descripcion,
              tipo: tituloInput.tipo,
              orden: tituloInput.orden,
              total_parcial: tituloInput.total_parcial || 0,
            };

            if (!tituloData.id_titulo) {
              tituloData.id_titulo = await TituloModel.generateNextId();
            }

            const nuevoTituloDoc = await TituloModel.create(tituloData);
            const nuevoTitulo = this.toDomainTitulo(nuevoTituloDoc);
            
            // Guardar para rollback
            titulosCreadosIds.push(nuevoTitulo.id_titulo);
            operacionesRollback.push(async () => {
              await TituloModel.deleteOne({ id_titulo: nuevoTitulo.id_titulo });
            });
            
            if (tituloInput.temp_id) {
              mapeoIdsTitulos.set(tituloInput.temp_id, nuevoTitulo.id_titulo);
            }
            
            resultado.titulosCreados.push(nuevoTitulo);
            titulosCreados.add(tituloInput.temp_id || nuevoTitulo.id_titulo);
            titulosParaCrear.splice(i, 1);
            progreso = true;
          }
        }

        if (!progreso && titulosParaCrear.length > 0) {
          throw new Error('Error: No se pueden crear algunos títulos debido a referencias circulares');
        }
      }

      // 2. Crear partidas
      for (const partidaInput of input.partidasCrear) {
        let idTituloReal = partidaInput.id_titulo;
        if (mapeoIdsTitulos.has(partidaInput.id_titulo)) {
          idTituloReal = mapeoIdsTitulos.get(partidaInput.id_titulo)!;
        }

        const partidaData: Partial<Partida> = {
          id_presupuesto: partidaInput.id_presupuesto,
          id_proyecto: partidaInput.id_proyecto,
          id_titulo: idTituloReal,
          id_partida_padre: partidaInput.id_partida_padre || null,
          nivel_partida: partidaInput.nivel_partida,
          numero_item: partidaInput.numero_item,
          codigo_partida: partidaInput.codigo_partida,
          descripcion: partidaInput.descripcion,
          unidad_medida: partidaInput.unidad_medida,
          metrado: partidaInput.metrado,
          precio_unitario: partidaInput.precio_unitario,
          parcial_partida: partidaInput.parcial_partida || (partidaInput.metrado * partidaInput.precio_unitario),
          orden: partidaInput.orden,
          estado: partidaInput.estado || 'Activa',
        };

        if (!partidaData.id_partida) {
          partidaData.id_partida = await PartidaModel.generateNextId();
        }

        const nuevaPartidaDoc = await PartidaModel.create(partidaData);
        const nuevaPartida = this.toDomainPartida(nuevaPartidaDoc);
        
        // Guardar para rollback
        partidasCreadasIds.push(nuevaPartida.id_partida);
        operacionesRollback.push(async () => {
          await PartidaModel.deleteOne({ id_partida: nuevaPartida.id_partida });
        });
        
        if (partidaInput.temp_id) {
          mapeoIdsPartidas.set(partidaInput.temp_id, nuevaPartida.id_partida);
        }
        
        resultado.partidasCreadas.push(nuevaPartida);
      }

      // 3. Actualizar títulos (guardar estado original para rollback)
      const titulosOriginales: Array<{ id_titulo: string; data: Partial<Titulo> }> = [];
      for (const tituloInput of input.titulosActualizar) {
        const tituloOriginal = await TituloModel.findOne({ id_titulo: tituloInput.id_titulo });
        if (tituloOriginal) {
          titulosOriginales.push({
            id_titulo: tituloInput.id_titulo,
            data: tituloOriginal.toObject(),
          });
        }

        const cambios: Partial<Titulo> = {};
        if (tituloInput.descripcion !== undefined) cambios.descripcion = tituloInput.descripcion;
        if (tituloInput.id_titulo_padre !== undefined) {
          const idPadreReal = tituloInput.id_titulo_padre && mapeoIdsTitulos.has(tituloInput.id_titulo_padre)
            ? mapeoIdsTitulos.get(tituloInput.id_titulo_padre)!
            : tituloInput.id_titulo_padre;
          cambios.id_titulo_padre = idPadreReal;
        }
        if (tituloInput.orden !== undefined) cambios.orden = tituloInput.orden;
        if (tituloInput.nivel !== undefined) cambios.nivel = tituloInput.nivel;
        if (tituloInput.numero_item !== undefined) cambios.numero_item = tituloInput.numero_item;
        if (tituloInput.tipo !== undefined) cambios.tipo = tituloInput.tipo;
        if (tituloInput.total_parcial !== undefined) cambios.total_parcial = tituloInput.total_parcial;

        if (Object.keys(cambios).length > 0) {
          const tituloDoc = await TituloModel.findOneAndUpdate(
            { id_titulo: tituloInput.id_titulo },
            { $set: cambios },
            { new: true }
          );
          if (tituloDoc) {
            const tituloActualizado = this.toDomainTitulo(tituloDoc);
            resultado.titulosActualizados.push(tituloActualizado);
            
            // Guardar para rollback
            const original = titulosOriginales.find(t => t.id_titulo === tituloInput.id_titulo);
            if (original) {
              operacionesRollback.push(async () => {
                await TituloModel.findOneAndUpdate(
                  { id_titulo: tituloInput.id_titulo },
                  { $set: original.data }
                );
              });
            }
          }
        }
      }

      // 4. Actualizar partidas (guardar estado original para rollback)
      const partidasOriginales: Array<{ id_partida: string; data: Partial<Partida> }> = [];
      for (const partidaInput of input.partidasActualizar) {
        const partidaOriginal = await PartidaModel.findOne({ id_partida: partidaInput.id_partida });
        if (partidaOriginal) {
          partidasOriginales.push({
            id_partida: partidaInput.id_partida,
            data: partidaOriginal.toObject(),
          });
        }

        const cambios: Partial<Partida> = {};
        if (partidaInput.descripcion !== undefined) cambios.descripcion = partidaInput.descripcion;
        if (partidaInput.id_titulo !== undefined) {
          const idTituloReal = mapeoIdsTitulos.has(partidaInput.id_titulo)
            ? mapeoIdsTitulos.get(partidaInput.id_titulo)!
            : partidaInput.id_titulo;
          cambios.id_titulo = idTituloReal;
        }
        if (partidaInput.id_partida_padre !== undefined) cambios.id_partida_padre = partidaInput.id_partida_padre;
        if (partidaInput.orden !== undefined) cambios.orden = partidaInput.orden;
        if (partidaInput.metrado !== undefined) cambios.metrado = partidaInput.metrado;
        if (partidaInput.precio_unitario !== undefined) cambios.precio_unitario = partidaInput.precio_unitario;
        if (partidaInput.unidad_medida !== undefined) cambios.unidad_medida = partidaInput.unidad_medida;
        if (partidaInput.nivel_partida !== undefined) cambios.nivel_partida = partidaInput.nivel_partida;
        if (partidaInput.numero_item !== undefined) cambios.numero_item = partidaInput.numero_item;
        if (partidaInput.codigo_partida !== undefined) cambios.codigo_partida = partidaInput.codigo_partida;
        if (partidaInput.estado !== undefined) cambios.estado = partidaInput.estado;
        if (partidaInput.parcial_partida !== undefined) cambios.parcial_partida = partidaInput.parcial_partida;

        if (Object.keys(cambios).length > 0) {
          const partidaDoc = await PartidaModel.findOneAndUpdate(
            { id_partida: partidaInput.id_partida },
            { $set: cambios },
            { new: true }
          );
          if (partidaDoc) {
            const partidaActualizada = this.toDomainPartida(partidaDoc);
            resultado.partidasActualizadas.push(partidaActualizada);
            
            // Guardar para rollback
            const original = partidasOriginales.find(p => p.id_partida === partidaInput.id_partida);
            if (original) {
              operacionesRollback.push(async () => {
                await PartidaModel.findOneAndUpdate(
                  { id_partida: partidaInput.id_partida },
                  { $set: original.data }
                );
              });
            }
          }
        }
      }

      // 5. Eliminar títulos (guardar para rollback - recrear)
      const titulosEliminadosData: Array<{ data: any; hijos: any[]; partidas: any[] }> = [];
      const partidasEliminadasData: Array<{ data: any; subpartidas: any[] }> = [];
      
      const eliminarTituloRecursivo = async (id_titulo: string): Promise<{ titulo: any; hijos: any[]; partidas: any[] }> => {
        const titulo = await TituloModel.findOne({ id_titulo });
        if (!titulo) {
          return { titulo: null, hijos: [], partidas: [] };
        }
        
        const tituloData = titulo.toObject();
        const hijos: any[] = [];
        const partidas: any[] = [];
        
        // Eliminar hijos recursivamente
        const hijosDocs = await TituloModel.find({ id_titulo_padre: id_titulo });
        for (const hijo of hijosDocs) {
          const resultadoHijo = await eliminarTituloRecursivo(hijo.id_titulo);
          hijos.push(resultadoHijo);
        }
        
        // Eliminar partidas asociadas
        const partidasDocs = await PartidaModel.find({ id_titulo });
        for (const partida of partidasDocs) {
          const resultadoPartida = await eliminarPartidaRecursiva(partida.id_partida);
          partidas.push(resultadoPartida);
        }
        
        // Eliminar el título
        await TituloModel.deleteOne({ id_titulo });
        
        return { titulo: tituloData, hijos, partidas };
      };

      const eliminarPartidaRecursiva = async (id_partida: string): Promise<{ partida: any; subpartidas: any[] }> => {
        const partida = await PartidaModel.findOne({ id_partida });
        if (!partida) {
          return { partida: null, subpartidas: [] };
        }

        const partidaData = partida.toObject();
        const subpartidas: any[] = [];

        // Eliminar subpartidas recursivamente
        const subpartidasDocs = await PartidaModel.find({ id_partida_padre: id_partida });
        for (const subpartida of subpartidasDocs) {
          const resultadoSubpartida = await eliminarPartidaRecursiva(subpartida.id_partida);
          subpartidas.push(resultadoSubpartida);
        }

        // Eliminar APUs asociados antes de eliminar la partida
        await ApuModel.deleteMany({ id_partida });

        // Eliminar la partida
        await PartidaModel.deleteOne({ id_partida });

        return { partida: partidaData, subpartidas };
      };

      // Función para restaurar partidas recursivamente
      const restaurarPartidaRecursiva = async (partidaData: { partida: any; subpartidas: any[] }): Promise<void> => {
        if (!partidaData.partida) return;
        
        // Restaurar subpartidas primero
        for (const subpartida of partidaData.subpartidas) {
          await restaurarPartidaRecursiva(subpartida);
        }
        
        // Restaurar la partida
        await PartidaModel.create(partidaData.partida);
      };

      // Función para restaurar títulos recursivamente
      const restaurarTituloRecursivo = async (tituloData: { titulo: any; hijos: any[]; partidas: any[] }): Promise<void> => {
        if (!tituloData.titulo) return;
        
        // Restaurar hijos primero
        for (const hijo of tituloData.hijos) {
          await restaurarTituloRecursivo(hijo);
        }
        
        // Restaurar partidas asociadas
        for (const partida of tituloData.partidas) {
          await restaurarPartidaRecursiva(partida);
        }
        
        // Restaurar el título
        await TituloModel.create(tituloData.titulo);
      };

      // Eliminar títulos
      for (const id_titulo of input.titulosEliminar) {
        const resultadoEliminacion = await eliminarTituloRecursivo(id_titulo);
        titulosEliminadosData.push(resultadoEliminacion);
        resultado.titulosEliminados.push(id_titulo);
        
        // Guardar para rollback (en orden inverso)
        operacionesRollback.unshift(async () => {
          await restaurarTituloRecursivo(resultadoEliminacion);
        });
      }

      // 6. Eliminar partidas
      for (const id_partida of input.partidasEliminar) {
        const resultadoEliminacion = await eliminarPartidaRecursiva(id_partida);
        partidasEliminadasData.push(resultadoEliminacion);
        resultado.partidasEliminadas.push(id_partida);
        
        // Guardar para rollback (en orden inverso)
        operacionesRollback.unshift(async () => {
          await restaurarPartidaRecursiva(resultadoEliminacion);
        });
      }

      // Recalcular totales de todos los títulos afectados después de todas las operaciones
      // Recopilar títulos únicos afectados
      const titulosAfectados = new Set<string>();
      
      // Títulos creados/actualizados
      for (const titulo of [...resultado.titulosCreados, ...resultado.titulosActualizados]) {
        if (titulo.id_titulo && titulo.id_presupuesto) {
          titulosAfectados.add(titulo.id_titulo);
          // Si tiene padre, también recalcular el padre
          if (titulo.id_titulo_padre) {
            titulosAfectados.add(titulo.id_titulo_padre);
          }
        }
      }
      
      // Partidas creadas/actualizadas
      for (const partida of [...resultado.partidasCreadas, ...resultado.partidasActualizadas]) {
        if (partida.id_titulo && partida.id_presupuesto) {
          titulosAfectados.add(partida.id_titulo);
        }
      }
      
      // Títulos eliminados (agregar el padre)
      for (const eliminado of titulosEliminadosData) {
        if (eliminado.titulo) {
          if (eliminado.titulo.id_titulo_padre) {
            titulosAfectados.add(eliminado.titulo.id_titulo_padre);
          }
        }
      }
      
      // Partidas eliminadas (agregar el título)
      for (const eliminada of partidasEliminadasData) {
        if (eliminada.partida && eliminada.partida.id_titulo) {
          titulosAfectados.add(eliminada.partida.id_titulo);
        }
      }
      
      // Recalcular totales de títulos únicos afectados
      if (this.recalculoTotalesService && titulosAfectados.size > 0) {
        for (const id_titulo of titulosAfectados) {
          try {
            const titulo = await this.tituloService.obtenerPorId(id_titulo);
            if (titulo && titulo.id_presupuesto) {
              await this.recalculoTotalesService.recalcularTotalesAscendentes(
                id_titulo,
                titulo.id_presupuesto
              );
            }
          } catch (error) {
            console.error('[EstructuraBatchService] Error al recalcular totales:', error);
            // Continuar con otros títulos
          }
        }
      }

      resultado.success = true;
      resultado.message = 'Cambios guardados exitosamente';
      
      return resultado;
    } catch (error: any) {
      // Rollback manual: revertir todas las operaciones en orden inverso
      try {
        for (let i = operacionesRollback.length - 1; i >= 0; i--) {
          await operacionesRollback[i]();
        }
      } catch (rollbackError) {
        console.error('Error durante rollback:', rollbackError);
      }
      
      resultado.success = false;
      resultado.message = error.message || 'Error al guardar los cambios. Se revirtieron todas las operaciones.';
      throw error;
    }
  }
}

