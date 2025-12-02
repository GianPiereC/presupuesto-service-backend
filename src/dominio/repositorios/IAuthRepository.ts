// ============================================================================
// INTERFAZ DEL REPOSITORIO (PUERTO DE SALIDA)
// ============================================================================

import { LoginRequest, LoginResponse } from '../entidades/Auth';

export interface IAuthRepository {
  login(credentials: LoginRequest): Promise<LoginResponse>;
}

