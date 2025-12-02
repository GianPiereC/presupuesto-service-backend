// ============================================================================
// DOMAIN EVENT - Interfaz base para eventos de dominio
// ============================================================================

/**
 * Interfaz base para eventos de dominio
 * Implementación nativa sin dependencias externas
 */
export interface DomainEvent {
  /**
   * Fecha y hora en que ocurrió el evento
   */
  occurredOn: Date;

  /**
   * Nombre del evento (para identificación y logging)
   */
  eventName: string;
}

