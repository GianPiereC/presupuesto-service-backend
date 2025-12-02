import { IResolvers } from '@graphql-tools/utils';
import { UsuarioService } from '../../../aplicacion/servicios/UsuarioService';
import { UsuarioInput, UsuarioResponse } from '../../../dominio/entidades/Usuario';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de usuarios que extiende BaseResolver para mantener consistencia
 * Sobrescribe getResolvers() para implementar métodos específicos de usuarios
 */
export class UsuarioResolver extends BaseResolver<UsuarioResponse> {
  constructor(private readonly usuarioService: UsuarioService) {
    super(usuarioService);
  }

  /**
   * Sobrescribe getResolvers() para implementar métodos específicos de usuarios
   */
  override getResolvers(): IResolvers {
    return {
      Query: {
        getUsuario: async (_: unknown, args: { id: string }) => {
          const { id } = args;
          return await ErrorHandler.handleError(
            async () => await this.usuarioService.getUsuario(id),
            'getUsuario',
            { id }
          );
        },
        getAllUsuarios: async () => {
          return await ErrorHandler.handleError(
            async () => await this.usuarioService.getAllUsuarios(),
            'getAllUsuarios'
          );
        },
        usuariosCargo: async () => {
          return await ErrorHandler.handleError(
            async () => await this.usuarioService.usuariosCargo(),
            'usuariosCargo'
          );
        },
        getUsuariosByRegistrosGeneralesContables: async () => {
          return await ErrorHandler.handleError(
            async () => await this.usuarioService.getUsuariosByRegistrosGeneralesContables(),
            'getUsuariosByRegistrosGeneralesContables'
          );
        }
      },
      Mutation: {
        createUsuario: async (_: unknown, args: { data: UsuarioInput }) => {
          const { data } = args;
          return await ErrorHandler.handleError(
            async () => await this.usuarioService.createUsuario(data),
            'createUsuario'
          );
        },
        updateUsuario: async (_: unknown, args: { id: string; data: UsuarioInput }) => {
          const { id, data } = args;
          return await ErrorHandler.handleError(
            async () => await this.usuarioService.updateUsuario(id, data),
            'updateUsuario',
            { id }
          );
        },
        deleteUsuario: async (_: unknown, args: { id: string }) => {
          const { id } = args;
          return await ErrorHandler.handleError(
            async () => await this.usuarioService.deleteUsuario(id),
            'deleteUsuario',
            { id }
          );
        }
      }
    };
  }

  /**
   * Método abstracto requerido por BaseResolver
   */
  protected getEntityName(): string {
    return 'Usuario';
  }
}

