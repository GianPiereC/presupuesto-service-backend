// ============================================================================
// VALUE OBJECT: RUC (Registro Único de Contribuyente)
// ============================================================================

/**
 * Value Object para RUC peruano
 * Valida formato de 11 dígitos
 * Implementación nativa sin dependencias externas
 */
export class RUC {
  private constructor(private readonly value: string) {
    // Validación en constructor privado
    if (!this.isValid(value)) {
      throw new Error('RUC inválido: debe tener exactamente 11 dígitos');
    }
  }

  /**
   * Crear instancia de RUC
   * @param value - String con el RUC
   * @returns Instancia de RUC
   */
  static create(value: string): RUC {
    return new RUC(value);
  }

  /**
   * Obtener el valor del RUC como string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Obtener el valor del RUC
   */
  valueOf(): string {
    return this.value;
  }

  /**
   * Comparar dos RUCs
   */
  equals(other: RUC): boolean {
    return this.value === other.value;
  }

  /**
   * Validar formato de RUC peruano (11 dígitos)
   */
  private isValid(ruc: string): boolean {
    if (!ruc || typeof ruc !== 'string') {
      return false;
    }
    
    // Debe tener exactamente 11 dígitos
    return /^\d{11}$/.test(ruc);
  }
}

