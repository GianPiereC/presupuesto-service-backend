// ============================================================================
// EVENT BUS - Interfaz para el bus de eventos
// ============================================================================

import { DomainEvent } from './DomainEvent';

/**
 * Interfaz para el bus de eventos
 * Define el contrato para publicar y suscribirse a eventos de dominio
 */
export interface EventBus {
  /**
   * Publicar un evento de dominio
   * @param event - Evento de dominio a publicar
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Suscribirse a un tipo de evento
   * @param eventName - Nombre del evento a escuchar
   * @param handler - Función que maneja el evento
   */
  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void;

  /**
   * Desuscribirse de un evento
   * @param eventName - Nombre del evento
   * @param handler - Handler a remover
   */
  unsubscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void;
}

