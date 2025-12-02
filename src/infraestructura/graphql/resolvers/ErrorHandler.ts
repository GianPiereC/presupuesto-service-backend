import { logger } from '../../logging';
import { DomainException } from '../../../dominio/exceptions/DomainException';

/**
 * Utilidad compartida para manejo de errores en resolvers
 * Evita duplicación de código en resolvers que no extienden BaseResolver
 */
export class ErrorHandler {
  /**
   * Manejo centralizado de errores para todos los resolvers
   * @param fn - Función asíncrona a ejecutar
   * @param operationName - Nombre de la operación para logging
   * @param context - Contexto adicional para logging
   * @returns Resultado de la función
   * @throws DomainException si la función falla
   */
  static async handleError<TResult>(
    fn: () => Promise<TResult>,
    operationName: string,
    context?: Record<string, unknown>
  ): Promise<TResult> {
    try {
      return await fn();
    } catch (error) {
      // Si ya es una DomainException, relanzarla
      if (error instanceof DomainException) {
        logger.error(`Error en ${operationName} resolver`, {
          error: error.message,
          code: error.code,
          statusCode: error.statusCode,
          ...context
        });
        throw error;
      }

      // Si es un Error genérico, convertirlo a DomainException
      logger.error(`Error en ${operationName} resolver`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...context
      });

      throw new DomainException(
        `No se pudo ejecutar ${operationName}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'OPERATION_ERROR',
        500
      );
    }
  }
}

