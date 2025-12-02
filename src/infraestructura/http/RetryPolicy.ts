// ============================================================================
// RETRY POLICY - Implementación simple nativa con backoff exponencial
// ============================================================================

/**
 * Configuración de la política de reintentos
 */
export interface RetryPolicyConfig {
  maxRetries: number;      // Número máximo de reintentos
  baseDelay: number;       // Delay base en ms
  maxDelay: number;        // Delay máximo en ms
  exponentialBase: number; // Base exponencial (default: 2)
}

/**
 * Política de reintentos simple con backoff exponencial
 * Implementación nativa sin dependencias externas
 */
export class RetryPolicy {
  constructor(
    private readonly config: RetryPolicyConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 segundo
      maxDelay: 10000, // 10 segundos
      exponentialBase: 2
    }
  ) {}

  /**
   * Ejecutar función con política de reintentos
   * @param fn - Función a ejecutar
   * @param isRetryable - Función opcional para determinar si un error es recuperable
   */
  async execute<T>(
    fn: () => Promise<T>,
    isRetryable?: (error: Error) => boolean
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Verificar si el error es recuperable
        if (isRetryable && !isRetryable(lastError)) {
          throw lastError;
        }

        // Si no es el último intento, esperar antes de reintentar
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          await this.delay(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Calcular delay usando backoff exponencial
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * 
      Math.pow(this.config.exponentialBase, attempt);
    
    // Limitar al delay máximo
    return Math.min(exponentialDelay, this.config.maxDelay);
  }

  /**
   * Delay simple usando Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verificar si un error es recuperable por defecto
   * (errores de red, timeouts, errores 5xx)
   */
  static isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Errores de red
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('etimedout')) {
      return true;
    }

    // Errores HTTP 5xx
    if (message.includes('500') || 
        message.includes('502') || 
        message.includes('503') || 
        message.includes('504')) {
      return true;
    }

    return false;
  }
}

