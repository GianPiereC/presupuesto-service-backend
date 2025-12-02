// Usar fetch nativo disponible en Node.js 18+

import { CircuitBreaker } from './CircuitBreaker';
import { RetryPolicy, RetryPolicyConfig } from './RetryPolicy';
import { Semaphore } from './Semaphore';

export interface GraphQLRequest {
  query?: string;
  mutation?: string;
  variables?: Record<string, any>;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface GraphQLClientConfig {
  timeout?: number;              // Timeout en ms (default: 5000)
  maxConcurrent?: number;         // Máximo de requests concurrentes (default: 10)
  circuitBreaker?: {
    failureThreshold?: number;
    timeout?: number;
    resetTimeout?: number;
  };
  retry?: RetryPolicyConfig;
}

/**
 * Cliente GraphQL con resiliencia integrada
 * Incluye Circuit Breaker, Retry Policy y Semaphore
 */
export class GraphQLClient {
  private endpoint: string;
  private circuitBreaker: CircuitBreaker;
  private retryPolicy: RetryPolicy;
  private semaphore: Semaphore;
  private timeout: number;

  constructor(
    endpoint: string,
    config: GraphQLClientConfig = {}
  ) {
    this.endpoint = endpoint;
    this.timeout = config.timeout || 5000;

    // Inicializar Circuit Breaker
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreaker?.failureThreshold || 5,
      timeout: config.circuitBreaker?.timeout || 10000,
      resetTimeout: config.circuitBreaker?.resetTimeout || 5000
    });

    // Inicializar Retry Policy
    this.retryPolicy = new RetryPolicy(
      config.retry || {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        exponentialBase: 2
      }
    );

    // Inicializar Semaphore
    this.semaphore = new Semaphore(config.maxConcurrent || 10);
  }

  async request<T = any>(request: GraphQLRequest): Promise<T> {
    // Usar Semaphore para limitar concurrencia
    return this.semaphore.execute(async () => {
      // Usar Circuit Breaker para proteger contra fallos repetidos
      return this.circuitBreaker.execute(async () => {
        // Usar Retry Policy para reintentos automáticos
        return this.retryPolicy.execute(
          async () => this.makeRequest<T>(request),
          RetryPolicy.isRetryableError
        );
      });
    });
  }

  /**
   * Realizar la petición HTTP real
   */
  private async makeRequest<T = any>(request: GraphQLRequest): Promise<T> {
    const requestBody: any = {
      query: request.query || request.mutation,
    };
    
    // Solo incluir variables si están definidas y no están vacías
    if (request.variables && Object.keys(request.variables).length > 0) {
      requestBody.variables = request.variables;
    }

    // Usar AbortController para timeout (nativo en Node.js 18+)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Intentar leer el cuerpo de la respuesta como JSON
      let result: GraphQLResponse<T>;
      try {
        result = await response.json();
      } catch (jsonError) {
        // Si no es JSON válido, lanzar error HTTP simple
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        throw new Error('Invalid JSON response from server');
      }

      // Si hay errores GraphQL, lanzarlos incluso si el status HTTP es 200
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map(e => e.message).join(', ');
        throw new Error(`GraphQL errors: ${errorMessages}`);
      }

      // Si el status HTTP no es OK, lanzar error con información adicional
      if (!response.ok) {
        const errorInfo = result.errors && result.errors.length > 0
          ? `GraphQL errors: ${result.errors.map(e => e.message).join(', ')}` 
          : `HTTP error! status: ${response.status}`;
        throw new Error(errorInfo);
      }

      if (!result.data) {
        throw new Error('No data returned from GraphQL query');
      }

      return result.data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Si es un error de aborto (timeout), lanzar error específico
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Obtener estado del Circuit Breaker
   */
  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  /**
   * Resetear Circuit Breaker manualmente
   */
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }
}

