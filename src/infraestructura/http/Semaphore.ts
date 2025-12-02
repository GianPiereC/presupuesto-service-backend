// ============================================================================
// SEMAPHORE - Implementación simple nativa para límite de concurrencia
// ============================================================================

/**
 * Implementación simple de Semaphore usando Promise y contador
 * Sin dependencias externas, solo TypeScript nativo
 */
export class Semaphore {
  private current: number = 0;
  private waitQueue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {
    if (maxConcurrent <= 0) {
      throw new Error('maxConcurrent debe ser mayor que 0');
    }
  }

  /**
   * Adquirir permiso (bloquea si no hay disponibles)
   */
  async acquire(): Promise<void> {
    if (this.current < this.maxConcurrent) {
      // Hay espacio disponible, adquirir inmediatamente
      this.current++;
      return;
    }

    // No hay espacio, esperar en cola
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  /**
   * Liberar permiso
   */
  release(): void {
    if (this.current === 0) {
      throw new Error('Semaphore: intentando liberar sin haber adquirido');
    }

    this.current--;

    // Si hay alguien esperando, darle el permiso
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        this.current++;
        next();
      }
    }
  }

  /**
   * Ejecutar función con control de concurrencia
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Obtener número de permisos disponibles
   */
  available(): number {
    return this.maxConcurrent - this.current;
  }

  /**
   * Obtener número de permisos en uso
   */
  inUse(): number {
    return this.current;
  }

  /**
   * Obtener número de esperas en cola
   */
  waiting(): number {
    return this.waitQueue.length;
  }
}

