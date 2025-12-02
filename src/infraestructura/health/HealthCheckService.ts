// ============================================================================
// HEALTH CHECK SERVICE - Servicio para gestionar múltiples health checks
// ============================================================================

import { HealthCheck, HealthStatus } from './HealthCheck';

/**
 * Resultado de todos los health checks
 */
export interface HealthCheckResult {
  overall: 'healthy' | 'unhealthy';
  checks: Record<string, HealthStatus>;
  timestamp: Date;
}

/**
 * Servicio para gestionar y ejecutar múltiples health checks
 */
export class HealthCheckService {
  private checks: Map<string, HealthCheck> = new Map();

  /**
   * Registrar un health check
   */
  register(name: string, check: HealthCheck): void {
    this.checks.set(name, check);
  }

  /**
   * Remover un health check
   */
  unregister(name: string): void {
    this.checks.delete(name);
  }

  /**
   * Ejecutar todos los health checks
   */
  async checkAll(): Promise<HealthCheckResult> {
    const results: Record<string, HealthStatus> = {};

    // Ejecutar todos los checks en paralelo
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      try {
        const status = await check.check();
        return { name, status };
      } catch (error) {
        return {
          name,
          status: {
            status: 'unhealthy',
            details: {
              error: error instanceof Error ? error.message : String(error)
            },
            timestamp: new Date()
          } as HealthStatus
        };
      }
    });

    const checkResults = await Promise.all(checkPromises);

    // Construir objeto de resultados
    checkResults.forEach(({ name, status }) => {
      results[name] = status;
    });

    // Determinar estado general
    const overall = Object.values(results).every(result => result.status === 'healthy')
      ? 'healthy'
      : 'unhealthy';

    return {
      overall,
      checks: results,
      timestamp: new Date()
    };
  }

  /**
   * Ejecutar un health check específico
   */
  async check(name: string): Promise<HealthStatus | null> {
    const check = this.checks.get(name);
    if (!check) {
      return null;
    }

    return check.check();
  }
}

