import { UsuarioInput, UsuarioResponse } from '../entidades/Usuario';

export interface IUsuarioRepository {
  getAllUsuarios(): Promise<UsuarioResponse[]>;
  getUsuario(id: string): Promise<UsuarioResponse | null>;
  usuariosCargo(): Promise<UsuarioResponse[]>;
  getUsuariosByRegistrosGeneralesContables(): Promise<UsuarioResponse[]>;
  createUsuario(data: UsuarioInput): Promise<UsuarioResponse>;
  updateUsuario(id: string, data: UsuarioInput): Promise<UsuarioResponse>;
  deleteUsuario(id: string): Promise<UsuarioResponse>;
}

