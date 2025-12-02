import { IResolvers } from '@graphql-tools/utils';
import { AprobacionPresupuestoService } from '../../../aplicacion/servicios/AprobacionPresupuestoService';
import { ErrorHandler } from './ErrorHandler';

export class AprobacionPresupuestoResolver {
  constructor(private readonly aprobacionService: AprobacionPresupuestoService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        getAprobacionesPendientes: async () => {
          return await ErrorHandler.handleError(
            async () => await this.aprobacionService.obtenerPendientes(),
            'getAprobacionesPendientes'
          );
        },
        getAprobacionesPorAprobador: async (_: any, { usuario_aprobador_id }: { usuario_aprobador_id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.aprobacionService.obtenerPendientesPorAprobador(usuario_aprobador_id),
            'getAprobacionesPorAprobador',
            { usuario_aprobador_id }
          );
        },
        getAprobacionesPorPresupuesto: async (_: any, { id_presupuesto }: { id_presupuesto: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.aprobacionService.obtenerPorPresupuesto(id_presupuesto),
            'getAprobacionesPorPresupuesto',
            { id_presupuesto }
          );
        },
        getAprobacionesPorProyecto: async (_: any, { id_proyecto }: { id_proyecto: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.aprobacionService.obtenerPorProyecto(id_proyecto),
            'getAprobacionesPorProyecto',
            { id_proyecto }
          );
        },
        getAprobacion: async (_: any, { id_aprobacion }: { id_aprobacion: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.aprobacionService.obtenerPorId(id_aprobacion),
            'getAprobacion',
            { id_aprobacion }
          );
        },
        getAprobacionesPendientesAgrupadas: async () => {
          return await ErrorHandler.handleError(
            async () => await this.aprobacionService.obtenerPendientesAgrupadas(),
            'getAprobacionesPendientesAgrupadas'
          );
        },
      },
      Mutation: {
        aprobarPresupuesto: async (_: any, args: { id_aprobacion: string; usuario_aprobador_id: string; comentario?: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const aprobacion = await this.aprobacionService.aprobar(
                args.id_aprobacion,
                args.usuario_aprobador_id,
                args.comentario
              );
              return this.mapAprobacionToGraphQL(aprobacion);
            },
            'aprobarPresupuesto',
            args
          );
        },
        rechazarPresupuesto: async (_: any, args: { id_aprobacion: string; usuario_aprobador_id: string; comentario: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const aprobacion = await this.aprobacionService.rechazar(
                args.id_aprobacion,
                args.usuario_aprobador_id,
                args.comentario
              );
              return this.mapAprobacionToGraphQL(aprobacion);
            },
            'rechazarPresupuesto',
            args
          );
        },
      },
    };
  }

  private mapAprobacionToGraphQL(aprobacion: any): any {
    return {
      id_aprobacion: aprobacion.id_aprobacion,
      id_presupuesto: aprobacion.id_presupuesto,
      id_grupo_version: aprobacion.id_grupo_version,
      id_proyecto: aprobacion.id_proyecto,
      tipo_aprobacion: aprobacion.tipo_aprobacion,
      usuario_solicitante_id: aprobacion.usuario_solicitante_id,
      usuario_aprobador_id: aprobacion.usuario_aprobador_id,
      estado: aprobacion.estado,
      fecha_solicitud: aprobacion.fecha_solicitud,
      fecha_aprobacion: aprobacion.fecha_aprobacion,
      fecha_rechazo: aprobacion.fecha_rechazo,
      fecha_vencimiento: aprobacion.fecha_vencimiento,
      comentario_solicitud: aprobacion.comentario_solicitud,
      comentario_aprobacion: aprobacion.comentario_aprobacion,
      comentario_rechazo: aprobacion.comentario_rechazo,
      nivel_jerarquia: aprobacion.nivel_jerarquia,
      requiere_multiple_aprobacion: aprobacion.requiere_multiple_aprobacion,
      orden_aprobacion: aprobacion.orden_aprobacion,
      version_presupuesto: aprobacion.version_presupuesto,
      monto_presupuesto: aprobacion.monto_presupuesto,
      es_urgente: aprobacion.es_urgente,
    };
  }
}

