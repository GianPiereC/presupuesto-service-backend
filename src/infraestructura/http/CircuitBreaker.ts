// ============================================================================
// CIRCUIT BREAKER - Implementación simple nativa
// ============================================================================

import { ConflictException } from '../../dominio/exceptions/DomainException';

/**
 * Estados del Circuit Breaker
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',    // Funcionando normalmente
  OPEN = 'OPEN',        // Circuito abierto, rechazando requests
  HALF_OPEN = 'HALF_OPEN' // Intentando recuperarse
}

/**
 * Configuración del Circuit Breaker
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;  // Número de fallos antes de abrir
  timeout: number;            // Tiempo en ms antes de intentar recuperarse
  resetTimeout: number;       // Tiempo en ms antes de resetear a CLOSED desde HALF_OPEN
}

/**
 * Implementación simple de Circuit Breaker
 * Sin dependencias externas, solo TypeScript nativo
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;

  constructor(
    private readonly config: CircuitBreakerConfig = {
      failureThreshold: 5,
      timeout: 10000, // 10 segundos
      resetTimeout: 5000 // 5 segundos
    }
  ) {}

  /**
   * Ejecutar una función con protección del Circuit Breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Verificar estado del circuito
    if (this.state === CircuitBreakerState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceLastFailure >= this.config.timeout) {
        // Cambiar a HALF_OPEN para intentar recuperarse
        this.state = CircuitBreakerState.HALF_OPEN;
      } else {
        // Circuito todavía abierto, rechazar request
        throw new ConflictException(`Circuit Breaker está ${CircuitBreakerState.OPEN}. Intentar nuevamente en ${Math.ceil((this.config.timeout - timeSinceLastFailure) / 1000)} segundos`);
      }
    }

    try {
      // Ejecutar la función
      const result = await fn();
      
      // Éxito: resetear contador y estado
      this.onSuccess();
      return result;
    } catch (error) {
      // Fallo: registrar y actualizar estado
      this.onFailure();
      throw error;
    }
  }

  /**
   * Manejar éxito
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Si estaba en HALF_OPEN y ahora hay éxito, esperar resetTimeout antes de cerrar
      setTimeout(() => {
        if (this.state === CircuitBreakerState.HALF_OPEN && 
            Date.now() - this.lastSuccessTime >= this.config.resetTimeout) {
          this.state = CircuitBreakerState.CLOSED;
        }
      }, this.config.resetTimeout);
    }
  }

  /**
   * Manejar fallo
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    } else if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Si estaba en HALF_OPEN y falla, volver a abrir
      this.state = CircuitBreakerState.OPEN;
    }
  }

  /**
   * Obtener estado actual
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Obtener contador de fallos
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Resetear manualmente el Circuit Breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = 0;
  }
}

