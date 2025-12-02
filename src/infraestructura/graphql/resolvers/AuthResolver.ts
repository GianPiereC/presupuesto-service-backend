import { IResolvers } from '@graphql-tools/utils';
import { AuthService } from '../../../aplicacion/servicios/AuthService';
import { LoginRequest, LoginResponse } from '../../../dominio/entidades/Auth';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de autenticación que extiende BaseResolver para mantener consistencia
 * Sobrescribe getResolvers() para implementar métodos específicos de autenticación
 */
export class AuthResolver extends BaseResolver<LoginResponse> {
  constructor(private readonly authService: AuthService) {
    super(authService);
  }

  /**
   * Sobrescribe getResolvers() para implementar métodos específicos de autenticación
   */
  override getResolvers(): IResolvers {
    return {
      Mutation: {
        login: async (_: any, { usuario, contrasenna }: { usuario: string; contrasenna: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const credentials: LoginRequest = { usuario, contrasenna };
              return await this.authService.login(credentials);
            },
            'login',
            { usuario }
          );
        },
      },
    };
  }

  /**
   * Método abstracto requerido por BaseResolver
   */
  protected getEntityName(): string {
    return 'Auth';
  }
}

