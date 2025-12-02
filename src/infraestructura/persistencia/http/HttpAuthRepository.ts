import { IAuthRepository } from '../../../dominio/repositorios/IAuthRepository';
import { IUsuarioRepository } from '../../../dominio/repositorios/IUsuarioRepository';
import { LoginRequest, LoginResponse } from '../../../dominio/entidades/Auth';
import { UsuarioInput, UsuarioResponse } from '../../../dominio/entidades/Usuario';
import { GraphQLClient } from '../../http/GraphQLClient';
import { BaseHttpRepository } from './BaseHttpRepository';

export class HttpAuthRepository extends BaseHttpRepository<any> implements IAuthRepository, IUsuarioRepository {
  constructor(baseUrl?: string) {
    super(baseUrl);
  }

  /**
   * Obtener o inicializar el cliente GraphQL
   */
  protected override async getClient(): Promise<GraphQLClient> {
    return super.getClient('inacons-backend');
  }

  /**
   * Implementación requerida por BaseHttpRepository
   * HttpAuthRepository no usa list() para paginación, solo para compatibilidad
   */
  async list(): Promise<any[]> {
    throw new Error('list() not supported for HttpAuthRepository. Use getAllUsuarios() instead.');
  }

  /**
   * Campos por defecto para búsqueda (no usado en HttpAuthRepository)
   */
  protected getDefaultSearchFields(): string[] {
    return [];
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const mutation = `
      mutation Login($usuario: String!, $contrasenna: String!) {
        login(usuario: $usuario, contrasenna: $contrasenna) {
          id
          token
          usuario
          nombresA
          role {
            id
            nombre
          }
        }
      }
    `;

    const client = await this.getClient();
    const result = await client.request<{ login: LoginResponse }>({
      mutation,
      variables: {
        usuario: credentials.usuario,
        contrasenna: credentials.contrasenna,
      },
    });

    return result.login;
  }

  // Método auxiliar para hacer peticiones GraphQL
  // Usa el método protegido de BaseHttpRepository
  public override async graphqlRequest(query: string, variables: any = {}): Promise<any> {
    return super.graphqlRequest(query, variables, 'auth-service', 'inacons-backend');
  }

  // Funciones de Usuario
  async getAllUsuarios(): Promise<UsuarioResponse[]> {
    const query = `
      query {
        getAllUsuarios {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.getAllUsuarios;
  }

  async getUsuario(id: string): Promise<UsuarioResponse | null> {
    const query = `
      query GetUsuario($id: ID!) {
        getUsuario(id: $id) {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id });
    return result.getUsuario;
  }

  async usuariosCargo(): Promise<UsuarioResponse[]> {
    const query = `
      query {
        usuariosCargo {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.usuariosCargo;
  }

  async getUsuariosByRegistrosGeneralesContables(): Promise<UsuarioResponse[]> {
    const query = `
      query {
        getUsuariosByRegistrosGeneralesContables {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.getUsuariosByRegistrosGeneralesContables;
  }

  async createUsuario(data: UsuarioInput): Promise<UsuarioResponse> {
    const mutation = `
      mutation CreateUsuario($data: UsuarioInput!) {
        createUsuario(data: $data) {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(mutation, { data });
    return result.createUsuario;
  }

  async updateUsuario(id: string, data: UsuarioInput): Promise<UsuarioResponse> {
    const mutation = `
      mutation UpdateUsuario($id: ID!, $data: UsuarioInput!) {
        updateUsuario(id: $id, data: $data) {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(mutation, { id, data });
    return result.updateUsuario;
  }

  async deleteUsuario(id: string): Promise<UsuarioResponse> {
    const mutation = `
      mutation DeleteUsuario($id: ID!) {
        deleteUsuario(id: $id) {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(mutation, { id });
    return result.deleteUsuario;
  }
}

