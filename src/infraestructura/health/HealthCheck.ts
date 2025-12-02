// ============================================================================
// HEALTH CHECK - Interfaz base para health checks
// ============================================================================

/**
 * Estado de salud de un componente
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  details?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Interfaz para health checks
 */
export interface HealthCheck {
  /**
   * Verificar el estado de salud
   */
  check(): Promise<HealthStatus>;
}

