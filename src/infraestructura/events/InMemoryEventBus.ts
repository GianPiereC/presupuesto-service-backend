// ============================================================================
// IN MEMORY EVENT BUS - Implementación simple del bus de eventos
// ============================================================================

import { EventBus } from '../../dominio/events/EventBus';
import { DomainEvent } from '../../dominio/events/DomainEvent';
import { logger } from '../logging';

/**
 * Implementación simple del bus de eventos en memoria
 * Usa Map y arrays para gestionar suscriptores
 * Implementación nativa sin dependencias externas
 */
export class InMemoryEventBus implements EventBus {
  private subscribers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  /**
   * Publicar un evento de dominio
   */
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.subscribers.get(event.eventName);
    
    if (!handlers || handlers.length === 0) {
      // No hay suscriptores, simplemente retornar
      return;
    }

    // Ejecutar todos los handlers de forma secuencial
    // Si quisieras ejecutarlos en paralelo, usar Promise.all
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        // Log error pero no fallar la publicación
        logger.error(`Error ejecutando handler para evento ${event.eventName}`, { 
          eventName: event.eventName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Suscribirse a un tipo de evento
   */
  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    
    const handlers = this.subscribers.get(eventName)!;
    handlers.push(handler);
  }

  /**
   * Desuscribirse de un evento
   */
  unsubscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void {
    const handlers = this.subscribers.get(eventName);
    
    if (!handlers) {
      return;
    }

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }

    // Si no quedan handlers, eliminar la entrada del Map
    if (handlers.length === 0) {
      this.subscribers.delete(eventName);
    }
  }

  /**
   * Obtener número de suscriptores para un evento
   */
  getSubscriberCount(eventName: string): number {
    return this.subscribers.get(eventName)?.length || 0;
  }

  /**
   * Limpiar todos los suscriptores (útil para testing)
   */
  clear(): void {
    this.subscribers.clear();
  }
}

