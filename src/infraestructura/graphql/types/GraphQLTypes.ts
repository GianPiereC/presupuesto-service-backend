// ============================================================================
// GRAPHQL TYPES - Tipos TypeScript para inputs/outputs de GraphQL
// ============================================================================

/**
 * Contexto de GraphQL con información de la petición
 */
export interface GraphQLContext {
  req: Request;
  token?: string;
}

/**
 * Argumentos base para queries con ID
 */
export interface GraphQLIdArgs {
  id: string;
}

/**
 * Argumentos para queries con paginación
 */
export interface GraphQLPaginationArgs {
  page?: number;
  limit?: number;
}

/**
 * Argumentos para queries con filtros
 */
export interface GraphQLFilterArgs<T = Record<string, unknown>> {
  filter?: T;
}

/**
 * Argumentos para queries con paginación y filtros
 */
export interface GraphQLPaginationFilterArgs<T = Record<string, unknown>> extends GraphQLPaginationArgs {
  filter?: T;
}

/**
 * Argumentos para mutations con input
 */
export interface GraphQLInputArgs<T> {
  input: T;
}

/**
 * Argumentos para mutations con múltiples inputs
 */
export interface GraphQLMultipleInputArgs<T> {
  inputs: T[];
}

/**
 * Argumentos para mutations con ID e input
 */
export interface GraphQLUpdateArgs<T> {
  id: string;
  input: T;
}

/**
 * Argumentos para mutations con data (usado en esquemas que usan 'data' en lugar de 'input')
 */
export interface GraphQLDataArgs<T> {
  data: T;
}

/**
 * Argumentos para mutations con ID y data (usado en esquemas que usan 'data' en lugar de 'input')
 */
export interface GraphQLUpdateDataArgs<T> {
  id: string;
  data: T;
}

