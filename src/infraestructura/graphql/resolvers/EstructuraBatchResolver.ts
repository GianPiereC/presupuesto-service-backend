import { IResolvers } from '@graphql-tools/utils';
import { EstructuraBatchService, BatchEstructuraInput } from '../../../aplicacion/servicios/EstructuraBatchService';
import { ErrorHandler } from './ErrorHandler';
import { TituloModel } from '../../persistencia/mongo/schemas/TituloSchema';
import { PartidaModel } from '../../persistencia/mongo/schemas/PartidaSchema';
import { Titulo } from '../../../dominio/entidades/Titulo';
import { Partida } from '../../../dominio/entidades/Partida';

export class EstructuraBatchResolver {
  constructor(
    private readonly estructuraBatchService: EstructuraBatchService
  ) {}

  getResolvers(): IResolvers {
    return {
      Mutation: {
        batchEstructuraPresupuesto: async (_: any, args: { input: BatchEstructuraInput }) => {
          return await ErrorHandler.handleError(
            async () => {
              const resultado = await this.estructuraBatchService.ejecutarBatch(args.input);
              
              // Mapear _id de MongoDB para títulos y partidas
              const titulosIds = [
                ...resultado.titulosCreados.map(t => t.id_titulo),
                ...resultado.titulosActualizados.map(t => t.id_titulo)
              ];
              const partidasIds = [
                ...resultado.partidasCreadas.map(p => p.id_partida),
                ...resultado.partidasActualizadas.map(p => p.id_partida)
              ];
              
              const titulosIdsMap = await this.getMongoIdsTitulosBatch(titulosIds);
              const partidasIdsMap = await this.getMongoIdsPartidasBatch(partidasIds);
              
              return {
                ...resultado,
                titulosCreados: resultado.titulosCreados.map(titulo => {
                  const tituloObj = titulo instanceof Titulo
                    ? Object.assign({}, titulo)
                    : titulo;
                  return {
                    ...tituloObj,
                    _id: titulosIdsMap.get(titulo.id_titulo) || null
                  };
                }),
                partidasCreadas: resultado.partidasCreadas.map(partida => {
                  const partidaObj = partida instanceof Partida
                    ? Object.assign({}, partida)
                    : partida;
                  return {
                    ...partidaObj,
                    _id: partidasIdsMap.get(partida.id_partida) || null
                  };
                }),
                titulosActualizados: resultado.titulosActualizados.map(titulo => {
                  const tituloObj = titulo instanceof Titulo
                    ? Object.assign({}, titulo)
                    : titulo;
                  return {
                    ...tituloObj,
                    _id: titulosIdsMap.get(titulo.id_titulo) || null
                  };
                }),
                partidasActualizadas: resultado.partidasActualizadas.map(partida => {
                  const partidaObj = partida instanceof Partida
                    ? Object.assign({}, partida)
                    : partida;
                  return {
                    ...partidaObj,
                    _id: partidasIdsMap.get(partida.id_partida) || null
                  };
                })
              };
            },
            'batchEstructuraPresupuesto',
            args
          );
        }
      }
    };
  }

  private async getMongoIdsTitulosBatch(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    try {
      const docs = await TituloModel.find({ id_titulo: { $in: ids } }).lean();
      const map = new Map<string, string>();
      docs.forEach((doc: any) => {
        if (doc.id_titulo && doc._id) {
          map.set(doc.id_titulo, doc._id.toString());
        }
      });
      return map;
    } catch (error) {
      console.error('Error obteniendo _ids de títulos de MongoDB en batch:', error);
      return new Map();
    }
  }

  private async getMongoIdsPartidasBatch(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    try {
      const docs = await PartidaModel.find({ id_partida: { $in: ids } }).lean();
      const map = new Map<string, string>();
      docs.forEach((doc: any) => {
        if (doc.id_partida && doc._id) {
          map.set(doc.id_partida, doc._id.toString());
        }
      });
      return map;
    } catch (error) {
      console.error('Error obteniendo _ids de partidas de MongoDB en batch:', error);
      return new Map();
    }
  }
}

