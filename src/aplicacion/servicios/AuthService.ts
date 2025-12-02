import { IAuthRepository } from '../../dominio/repositorios/IAuthRepository';
import { LoginRequest, LoginResponse } from '../../dominio/entidades/Auth';
import { BaseService } from './BaseService';
import { IBaseRepository } from '../../dominio/repositorios/IBaseRepository';
import { ValidationException } from '../../dominio/exceptions/DomainException';

/**
 * Servicio de autenticación que extiende BaseService para mantener consistencia
 * Aunque solo implementa login, sigue el patrón estándar del proyecto
 */
export class AuthService extends BaseService<LoginResponse> {
  constructor(private readonly authRepository: IAuthRepository) {
    // BaseService requiere IBaseRepository, creamos un adaptador mínimo
    super({} as IBaseRepository<LoginResponse>);
  }

  /**
   * Realiza el login de un usuario
   * @param credentials - Credenciales de login (usuario y contraseña)
   * @returns Respuesta de login con token y datos del usuario
   * @throws ValidationException si las credenciales están vacías
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (!credentials.usuario || !credentials.contrasenna) {
      throw new ValidationException('Usuario y contraseña son requeridos');
    }

    return await this.authRepository.login(credentials);
  }
}

