// ============================================================================
// DOMAIN EXCEPTION - Jerarquía de excepciones de dominio
// ============================================================================

/**
 * Excepción base del dominio
 * Todas las excepciones de dominio deben extender esta clase
 */
export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'DomainException';
    Object.setPrototypeOf(this, DomainException.prototype);
  }
}

/**
 * Excepción de validación del dominio
 * Se lanza cuando una entidad no cumple con las reglas de negocio
 */
export class ValidationException extends DomainException {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationException';
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}

/**
 * Excepción de entidad no encontrada
 * Se lanza cuando se intenta acceder a una entidad que no existe
 */
export class EntityNotFoundException extends DomainException {
  constructor(
    message: string,
    public readonly entityType?: string,
    public readonly entityId?: string
  ) {
    super(message, 'ENTITY_NOT_FOUND', 404);
    this.name = 'EntityNotFoundException';
    Object.setPrototypeOf(this, EntityNotFoundException.prototype);
  }
}

/**
 * Excepción de conflicto
 * Se lanza cuando hay un conflicto con el estado actual de la entidad
 */
export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictException';
    Object.setPrototypeOf(this, ConflictException.prototype);
  }
}

/**
 * Excepción de acceso no autorizado
 * Se lanza cuando el usuario no tiene permisos para realizar una operación
 */
export class UnauthorizedException extends DomainException {
  constructor(message: string = 'Acceso no autorizado') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedException';
    Object.setPrototypeOf(this, UnauthorizedException.prototype);
  }
}

/**
 * Excepción de acceso prohibido
 * Se lanza cuando el usuario no tiene permisos suficientes
 */
export class ForbiddenException extends DomainException {
  constructor(message: string = 'Acceso prohibido') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenException';
    Object.setPrototypeOf(this, ForbiddenException.prototype);
  }
}

