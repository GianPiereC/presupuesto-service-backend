import mongoose from 'mongoose';
import { TituloService } from './TituloService';

import { RecalculoTotalesService } from './RecalculoTotalesService';
import { Titulo } from '../../dominio/entidades/Titulo';
import { Partida } from '../../dominio/entidades/Partida';
import { TituloModel } from '../../infraestructura/persistencia/mongo/schemas/TituloSchema';
import { PartidaModel } from '../../infraestructura/persistencia/mongo/schemas/PartidaSchema';
import { ApuModel } from '../../infraestructura/persistencia/mongo/schemas/ApuSchema';

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
  id_especialidad?: string | null;
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
  id_especialidad?: string | null;
}

export interface PartidaCreateInput {
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo: string;
  id_partida_padre?: string | null;
  nivel_partida: number;
  numero_item: string;
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
      docPlain.total_parcial || 0,
      docPlain.id_especialidad
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
    const tiempoInicio = Date.now();
    console.log('[BACKEND] 🚀 Iniciando batch con transacción...');
    console.log(`[BACKEND] 📊 Input: ${input.titulosCrear.length} títulos crear, ${input.partidasCrear.length} partidas crear, ${input.titulosActualizar.length} títulos actualizar, ${input.partidasActualizar.length} partidas actualizar, ${input.titulosEliminar.length} títulos eliminar, ${input.partidasEliminar.length} partidas eliminar`);
    
    const session = await mongoose.startSession();
    const tiempoSesion = Date.now() - tiempoInicio;
    console.log(`[BACKEND] ⏱️ Creación de sesión: ${tiempoSesion}ms`);
    
    const resultado: BatchEstructuraResponse = {
      success: false,
      titulosCreados: [],
      partidasCreadas: [],
      titulosActualizados: [],
      partidasActualizadas: [],
      titulosEliminados: [],
      partidasEliminadas: [],
    };

    const titulosAEliminarInfo: Array<{ id_titulo: string; id_titulo_padre: string | null; id_presupuesto: string }> = [];
    const partidasAEliminarInfo: Array<{ id_partida: string; id_titulo: string; id_presupuesto: string }> = [];

    try {
      const tiempoTransaccionInicio = Date.now();
      await session.withTransaction(async () => {
      // Mapeo de IDs temporales a IDs reales
      const mapeoIdsTitulos: Map<string, string> = new Map();
      const mapeoIdsPartidas: Map<string, string> = new Map();

      // 1. Crear títulos (en orden: primero padres, luego hijos)
      const tiempoCrearTitulosInicio = Date.now();
      // Obtener el último ID una vez para generar IDs secuenciales sin condición de carrera
      let ultimoIdTituloNumero = 0;
      if (input.titulosCrear.length > 0) {
        const tiempoUltimoIdInicio = Date.now();
        const ultimoTitulo = await TituloModel.findOne({}, { id_titulo: 1 })
          .sort({ id_titulo: -1 })
          .lean()
          .session(session);
        const tiempoUltimoId = Date.now() - tiempoUltimoIdInicio;
        console.log(`[BACKEND] ⏱️ Obtener último ID título: ${tiempoUltimoId}ms`);
        
        if (ultimoTitulo) {
          ultimoIdTituloNumero = parseInt(ultimoTitulo.id_titulo.replace('TIT', '')) || 0;
        }
      }

      const titulosParaCrear = [...input.titulosCrear];
      const titulosCreados = new Set<string>();

      while (titulosParaCrear.length > 0) {
        let progreso = false;
        for (let i = titulosParaCrear.length - 1; i >= 0; i--) {
          const tituloInput = titulosParaCrear[i];
          if (!tituloInput) continue;
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

            // Generar ID secuencial localmente para evitar condición de carrera
            ultimoIdTituloNumero++;
            const idTitulo = `TIT${ultimoIdTituloNumero.toString().padStart(10, '0')}`;
            
            const tituloData: Partial<Titulo> & { id_titulo: string } = {
              id_titulo: idTitulo,
              id_presupuesto: tituloInput.id_presupuesto,
              id_proyecto: tituloInput.id_proyecto,
              id_titulo_padre: idPadreReal || null,
              nivel: tituloInput.nivel,
              numero_item: tituloInput.numero_item || '', // Se calcula dinámicamente en frontend, pero requerido en BD
              descripcion: tituloInput.descripcion,
              tipo: tituloInput.tipo,
              orden: tituloInput.orden,
              total_parcial: tituloInput.total_parcial || 0,
              id_especialidad: tituloInput.id_especialidad ? tituloInput.id_especialidad : undefined,
            };

            // Validar unicidad de numero_item por proyecto
            if (tituloData.numero_item && tituloData.id_presupuesto) {
              const existente = await TituloModel.findOne({
                numero_item: tituloData.numero_item,
                id_presupuesto: tituloData.id_presupuesto
              }).session(session);
              if (existente) {
                throw new ValidationException(
                  `Ya existe un título con el número de item "${tituloData.numero_item}" en este presupuesto`,
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
      const tiempoCrearTitulosTotal = Date.now() - tiempoCrearTitulosInicio;
      console.log(`[BACKEND] ⏱️ Crear ${resultado.titulosCreados.length} títulos: ${tiempoCrearTitulosTotal}ms`);

      // 2. Crear partidas (actualizar referencias a títulos nuevos)
      const tiempoCrearPartidasInicio = Date.now();
      // Obtener el último ID una vez para generar IDs secuenciales sin condición de carrera
      let ultimoIdPartidaNumero = 0;
      if (input.partidasCrear.length > 0) {
        const ultimaPartida = await PartidaModel.findOne({}, { id_partida: 1 })
          .sort({ id_partida: -1 })
          .lean()
          .session(session);
        
        if (ultimaPartida) {
          ultimoIdPartidaNumero = parseInt(ultimaPartida.id_partida.replace('PAR', '')) || 0;
        }
      }

      for (const partidaInput of input.partidasCrear) {
        let idTituloReal = partidaInput.id_titulo;
        if (mapeoIdsTitulos.has(partidaInput.id_titulo)) {
          idTituloReal = mapeoIdsTitulos.get(partidaInput.id_titulo)!;
        }

        // Generar ID secuencial localmente para evitar condición de carrera
        ultimoIdPartidaNumero++;
        const idPartida = `PAR${ultimoIdPartidaNumero.toString().padStart(10, '0')}`;
        
        const partidaData: Partial<Partida> & { id_partida: string } = {
          id_partida: idPartida,
          id_presupuesto: partidaInput.id_presupuesto,
          id_proyecto: partidaInput.id_proyecto,
          id_titulo: idTituloReal,
          id_partida_padre: partidaInput.id_partida_padre || null,
          nivel_partida: partidaInput.nivel_partida,
          numero_item: partidaInput.numero_item,
          descripcion: partidaInput.descripcion,
          unidad_medida: partidaInput.unidad_medida,
          metrado: partidaInput.metrado,
          precio_unitario: partidaInput.precio_unitario,
          parcial_partida: partidaInput.parcial_partida || (partidaInput.metrado * partidaInput.precio_unitario),
          orden: partidaInput.orden,
          estado: partidaInput.estado || 'Activa',
        };

        // Crear usando el modelo directamente con la sesión
        const nuevaPartidaDoc = await PartidaModel.create([partidaData], { session });
        const nuevaPartida = this.toDomainPartida(nuevaPartidaDoc[0]);
        
        if (partidaInput.temp_id) {
          mapeoIdsPartidas.set(partidaInput.temp_id, nuevaPartida.id_partida);
        }
        
        resultado.partidasCreadas.push(nuevaPartida);
      }
      const tiempoCrearPartidasTotal = Date.now() - tiempoCrearPartidasInicio;
      console.log(`[BACKEND] ⏱️ Crear ${resultado.partidasCreadas.length} partidas: ${tiempoCrearPartidasTotal}ms`);

      // 3. Actualizar títulos
      const tiempoActualizarTitulosInicio = Date.now();
      let tiempoUpdates = 0;
      for (const tituloInput of input.titulosActualizar) {
        const tiempoTituloInicio = Date.now();
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
        // numero_item NO se actualiza - se calcula dinámicamente en frontend
        if (tituloInput.tipo !== undefined) cambios.tipo = tituloInput.tipo;
        if (tituloInput.total_parcial !== undefined) cambios.total_parcial = tituloInput.total_parcial;
        if (tituloInput.id_especialidad !== undefined) {
          // Permitir null para limpiar id_especialidad, o el valor si está definido
          cambios.id_especialidad = tituloInput.id_especialidad || undefined;
        }

        // ⚠️ Validación de numero_item ELIMINADA - se calcula dinámicamente en frontend
        // Ya no validamos ni actualizamos numero_item porque se calcula basado en orden/nivel/padre

        if (Object.keys(cambios).length > 0) {
          // Actualizar usando el modelo directamente con la sesión
          const tiempoUpdateInicio = Date.now();
          const tituloDoc = await TituloModel.findOneAndUpdate(
            { id_titulo: tituloInput.id_titulo },
            { $set: cambios },
            { new: true, session }
          );
          tiempoUpdates += Date.now() - tiempoUpdateInicio;
          if (tituloDoc) {
            const tituloActualizado = this.toDomainTitulo(tituloDoc);
            resultado.titulosActualizados.push(tituloActualizado);
          }
        }
        const tiempoTitulo = Date.now() - tiempoTituloInicio;
        if (tiempoTitulo > 200) {
          console.log(`[BACKEND] ⚠️ Actualizar título ${tituloInput.id_titulo} tomó ${tiempoTitulo}ms`);
        }
      }
      const tiempoActualizarTitulosTotal = Date.now() - tiempoActualizarTitulosInicio;
      console.log(`[BACKEND] ⏱️ Actualizar ${resultado.titulosActualizados.length} títulos: ${tiempoActualizarTitulosTotal}ms (updates: ${tiempoUpdates}ms)`);

      // 4. Actualizar partidas
      const tiempoActualizarPartidasInicio = Date.now();
      let tiempoUpdatesPartidas = 0;
      for (const partidaInput of input.partidasActualizar) {
        const tiempoPartidaInicio = Date.now();
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
        // numero_item NO se actualiza - se calcula dinámicamente en frontend
        if (partidaInput.estado !== undefined) cambios.estado = partidaInput.estado;
        if (partidaInput.parcial_partida !== undefined) cambios.parcial_partida = partidaInput.parcial_partida;

        if (Object.keys(cambios).length > 0) {
          // Actualizar usando el modelo directamente con la sesión
          const tiempoUpdateInicio = Date.now();
          const partidaDoc = await PartidaModel.findOneAndUpdate(
            { id_partida: partidaInput.id_partida },
            { $set: cambios },
            { new: true, session }
          );
          tiempoUpdatesPartidas += Date.now() - tiempoUpdateInicio;
          if (partidaDoc) {
            const partidaActualizada = this.toDomainPartida(partidaDoc);
            resultado.partidasActualizadas.push(partidaActualizada);
          }
        }
        const tiempoPartida = Date.now() - tiempoPartidaInicio;
        if (tiempoPartida > 200) {
          console.log(`[BACKEND] ⚠️ Actualizar partida ${partidaInput.id_partida} tomó ${tiempoPartida}ms`);
        }
      }
      const tiempoActualizarPartidasTotal = Date.now() - tiempoActualizarPartidasInicio;
      console.log(`[BACKEND] ⏱️ Actualizar ${resultado.partidasActualizadas.length} partidas: ${tiempoActualizarPartidasTotal}ms (updates: ${tiempoUpdatesPartidas}ms)`);

      // 5. Obtener información de títulos antes de eliminar (para recalcular después)
      const tiempoEliminarInicio = Date.now();
      titulosAEliminarInfo.length = 0;
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
      partidasAEliminarInfo.length = 0;
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
      const tiempoEliminarTotal = Date.now() - tiempoEliminarInicio;
      console.log(`[BACKEND] ⏱️ Eliminar ${resultado.titulosEliminados.length} títulos y ${resultado.partidasEliminadas.length} partidas: ${tiempoEliminarTotal}ms`);

      // Si todo fue exitoso, la transacción se confirma automáticamente
      resultado.success = true;
      resultado.message = 'Cambios guardados exitosamente';
      });
      
      const tiempoTransaccionTotal = Date.now() - tiempoTransaccionInicio;
      console.log(`[BACKEND] ⏱️ Transacción completada: ${tiempoTransaccionTotal}ms`);
      
      // ⚠️ RECÁLCULO ELIMINADO: Los totales ahora se calculan en el frontend
      // El frontend recalcula total_parcial, parcial_partida y parcial_presupuesto instantáneamente
      // después de guardar usando el hook useEstructuraPresupuesto
      console.log('[BACKEND] ℹ️ Recálculo de totales deshabilitado - se calcula en frontend');
      
      const tiempoTotal = Date.now() - tiempoInicio;
      console.log(`[BACKEND] ✅ Batch completado: ${tiempoTotal}ms`);
      
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
      // Obtener el último ID una vez para generar IDs secuenciales sin condición de carrera
      let ultimoIdTituloNumeroSinTrans = 0;
      if (input.titulosCrear.length > 0) {
        const ultimoTitulo = await TituloModel.findOne({}, { id_titulo: 1 })
          .sort({ id_titulo: -1 })
          .lean();
        
        if (ultimoTitulo) {
          ultimoIdTituloNumeroSinTrans = parseInt(ultimoTitulo.id_titulo.replace('TIT', '')) || 0;
        }
      }

      const titulosParaCrear = [...input.titulosCrear];
      const titulosCreados = new Set<string>();

      while (titulosParaCrear.length > 0) {
        let progreso = false;
        for (let i = titulosParaCrear.length - 1; i >= 0; i--) {
          const tituloInput = titulosParaCrear[i];
          if (!tituloInput) continue;
          const idPadre = tituloInput.id_titulo_padre;

          const puedeCrear = !idPadre ||
            !idPadre.startsWith('temp_') ||
            titulosCreados.has(idPadre) ||
            mapeoIdsTitulos.has(idPadre);

          if (puedeCrear) {
            const idPadreReal = idPadre && mapeoIdsTitulos.has(idPadre)
              ? mapeoIdsTitulos.get(idPadre)!
              : idPadre;

            // Generar ID secuencial localmente para evitar condición de carrera
            ultimoIdTituloNumeroSinTrans++;
            const idTitulo = `TIT${ultimoIdTituloNumeroSinTrans.toString().padStart(10, '0')}`;
            
            const tituloData: Partial<Titulo> & { id_titulo: string } = {
              id_titulo: idTitulo,
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
      // Obtener el último ID una vez para generar IDs secuenciales sin condición de carrera
      let ultimoIdPartidaNumeroSinTrans = 0;
      if (input.partidasCrear.length > 0) {
        const ultimaPartida = await PartidaModel.findOne({}, { id_partida: 1 })
          .sort({ id_partida: -1 })
          .lean();
        
        if (ultimaPartida) {
          ultimoIdPartidaNumeroSinTrans = parseInt(ultimaPartida.id_partida.replace('PAR', '')) || 0;
        }
      }

      for (const partidaInput of input.partidasCrear) {
        let idTituloReal = partidaInput.id_titulo;
        if (mapeoIdsTitulos.has(partidaInput.id_titulo)) {
          idTituloReal = mapeoIdsTitulos.get(partidaInput.id_titulo)!;
        }

        // Generar ID secuencial localmente para evitar condición de carrera
        ultimoIdPartidaNumeroSinTrans++;
        const idPartida = `PAR${ultimoIdPartidaNumeroSinTrans.toString().padStart(10, '0')}`;
        
        const partidaData: Partial<Partida> & { id_partida: string } = {
          id_partida: idPartida,
          id_presupuesto: partidaInput.id_presupuesto,
          id_proyecto: partidaInput.id_proyecto,
          id_titulo: idTituloReal,
          id_partida_padre: partidaInput.id_partida_padre || null,
          nivel_partida: partidaInput.nivel_partida,
          numero_item: partidaInput.numero_item,
          descripcion: partidaInput.descripcion,
          unidad_medida: partidaInput.unidad_medida,
          metrado: partidaInput.metrado,
          precio_unitario: partidaInput.precio_unitario,
          parcial_partida: partidaInput.parcial_partida || (partidaInput.metrado * partidaInput.precio_unitario),
          orden: partidaInput.orden,
          estado: partidaInput.estado || 'Activa',
        };

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
        // numero_item NO se actualiza - se calcula dinámicamente en frontend
        if (tituloInput.tipo !== undefined) cambios.tipo = tituloInput.tipo;
        if (tituloInput.total_parcial !== undefined) cambios.total_parcial = tituloInput.total_parcial;
        if (tituloInput.id_especialidad !== undefined) {
          // Permitir null para limpiar id_especialidad, o el valor si está definido
          cambios.id_especialidad = tituloInput.id_especialidad || undefined;
        }

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
        // numero_item NO se actualiza - se calcula dinámicamente en frontend
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
      
      const eliminarTituloRecursivo = async (id_titulo: string): Promise<{ data: any; hijos: any[]; partidas: any[] }> => {
        const titulo = await TituloModel.findOne({ id_titulo });
        if (!titulo) {
          return { data: null, hijos: [], partidas: [] };
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
        
        return { data: tituloData, hijos, partidas };
      };

      const eliminarPartidaRecursiva = async (id_partida: string): Promise<{ data: any; subpartidas: any[] }> => {
        const partida = await PartidaModel.findOne({ id_partida });
        if (!partida) {
          return { data: null, subpartidas: [] };
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

        return { data: partidaData, subpartidas };
      };

      // Función para restaurar partidas recursivamente
      const restaurarPartidaRecursiva = async (partidaData: { data: any; subpartidas: any[] }): Promise<void> => {
        if (!partidaData.data) return;
        
        // Restaurar subpartidas primero
        for (const subpartida of partidaData.subpartidas) {
          await restaurarPartidaRecursiva(subpartida);
        }
        
        // Restaurar la partida
        await PartidaModel.create(partidaData.data);
      };

      // Función para restaurar títulos recursivamente
      const restaurarTituloRecursivo = async (tituloData: { data: any; hijos: any[]; partidas: any[] }): Promise<void> => {
        if (!tituloData.data) return;
        
        // Restaurar hijos primero
        for (const hijo of tituloData.hijos) {
          await restaurarTituloRecursivo(hijo);
        }
        
        // Restaurar partidas asociadas
        for (const partida of tituloData.partidas) {
          await restaurarPartidaRecursiva(partida);
        }
        
        // Restaurar el título
        await TituloModel.create(tituloData.data);
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
        if (eliminado.data) {
          if (eliminado.data.id_titulo_padre) {
            titulosAfectados.add(eliminado.data.id_titulo_padre);
          }
        }
      }
      
      // Partidas eliminadas (agregar el título)
      for (const eliminada of partidasEliminadasData) {
        if (eliminada.data && eliminada.data.id_titulo) {
          titulosAfectados.add(eliminada.data.id_titulo);
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
          const operacion = operacionesRollback[i];
          if (operacion) {
            await operacion();
          }
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

