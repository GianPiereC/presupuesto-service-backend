// ============================================================================
// CONTENEDOR DE INYECCIÓN DE DEPENDENCIAS SIMPLE (NATIVO)
// ============================================================================

import { EntityNotFoundException, ValidationException } from '../../dominio/exceptions/DomainException';

/**
 * Contenedor simple de inyección de dependencias implementado nativamente
 * sin dependencias externas, usando solo TypeScript y Map
 * 
 * Proporciona:
 * - Registro de dependencias por token
 * - Resolución automática de dependencias
 * - Soporte para singleton y factory
 * - Inyección de dependencias anidadas
 */
export class Container {
  private static instance: Container;
  private registrations = new Map<string, Registration>();
  private instances = new Map<string, unknown>();

  private constructor() {}

  /**
   * Obtener instancia singleton del contenedor
   */
  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Registrar una clase o factory para un token
   * @param token - Identificador único para la dependencia
   * @param factory - Función que retorna la instancia o clase constructor
   * @param singleton - Si es true, mantiene una única instancia (default: true)
   */
  register<T>(
    token: string,
    factory: (() => T) | (new (...args: any[]) => T) | ((container: Container) => T),
    singleton: boolean = true
  ): void {
    this.registrations.set(token, { factory, singleton });
  }

  /**
   * Resolver una dependencia por su token
   * @param token - Identificador de la dependencia
   * @returns Instancia de la dependencia
   */
  resolve<T = unknown>(token: string): T {
    // Si ya existe una instancia singleton, retornarla
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    const registration = this.registrations.get(token);
    if (!registration) {
      throw new EntityNotFoundException(`Dependency ${token} not registered.`, 'Dependency', token);
    }

    let instance: T;

    // Si es una factory function que recibe el container
    if (typeof registration.factory === 'function' && registration.factory.length === 1) {
      instance = (registration.factory as (container: Container) => T)(this);
    }
    // Si es una clase constructor
    else if (typeof registration.factory === 'function' && registration.factory.prototype) {
      // Intentar resolver dependencias del constructor
      instance = this.instantiateClass(registration.factory as new (...args: any[]) => T);
    }
    // Si es una factory function sin parámetros
    else {
      instance = (registration.factory as () => T)();
    }

    // Si es singleton, guardar la instancia
    if (registration.singleton) {
      this.instances.set(token, instance);
    }

    return instance;
  }

  /**
   * Instanciar una clase intentando resolver sus dependencias del contenedor
   */
  private instantiateClass<T>(Constructor: new (...args: any[]) => T): T {
    // Obtener parámetros del constructor usando reflexión limitada
    // En TypeScript no hay reflexión real, así que intentamos resolver por tipo
    // Para simplificar, asumimos que las dependencias se registran con el nombre de la clase
    try {
      return new Constructor();
    } catch (error) {
      // Si falla, intentar resolver dependencias manualmente
      // Esto es una simplificación; en un sistema real usarías decoradores o metadata
      throw new ValidationException(`Failed to instantiate ${Constructor.name}. Consider using a factory function.`);
    }
  }

  /**
   * Verificar si una dependencia está registrada
   */
  isRegistered(token: string): boolean {
    return this.registrations.has(token);
  }

  /**
   * Limpiar todas las registraciones (útil para tests)
   */
  clear(): void {
    this.registrations.clear();
    this.instances.clear();
  }
}

/**
 * Información de registro de una dependencia
 */
interface Registration {
  factory: (() => unknown) | (new (...args: unknown[]) => unknown) | ((container: Container) => unknown);
  singleton: boolean;
}

