/**
 * Utilidades para mapear tipos de costo recurso del monolito al enum de APU
 */

export type TipoRecursoApu = 'MATERIAL' | 'MANO_OBRA' | 'EQUIPO' | 'SUBCONTRATO';

/**
 * Mapea el tipo_costo_recurso del monolito al enum de APU
 * Basado en los tipos estándar de la base de datos:
 * - MATERIALES (MAT) -> MATERIAL
 * - MANO DE OBRA (MO) -> MANO_OBRA
 * - EQUIPO (EQ) -> EQUIPO
 * - SUB-CONTRATOS (SC) -> SUBCONTRATO
 * - SUB-PARTIDAS (SP) -> No válido para APU
 * - OTROS (-) -> No válido para APU
 */
export function mapearTipoCostoRecursoATipoApu(
  nombreTipoCostoRecurso: string,
  codigoTipoCostoRecurso?: string
): TipoRecursoApu {
  // Normalizar inputs
  const nombre = nombreTipoCostoRecurso?.trim().toUpperCase() || '';
  const codigo = codigoTipoCostoRecurso?.trim().toUpperCase() || '';
  
  // Mapeo por código (más confiable)
  const mapeoPorCodigo: Record<string, TipoRecursoApu> = {
    'MAT': 'MATERIAL',
    'MO': 'MANO_OBRA',
    'EQ': 'EQUIPO',
    'SC': 'SUBCONTRATO'
    // 'SP' (SUB-PARTIDAS) y '-' (OTROS) no se mapean a APU
  };
  
  // Si hay código, usarlo primero (más confiable)
  if (codigo && mapeoPorCodigo[codigo]) {
    return mapeoPorCodigo[codigo];
  }
  
  // Mapeo por nombre (fallback)
  const mapeoPorNombre: Record<string, TipoRecursoApu> = {
    'MATERIALES': 'MATERIAL',
    'MATERIAL': 'MATERIAL',
    'MANO DE OBRA': 'MANO_OBRA',
    'MANO_OBRA': 'MANO_OBRA',
    'EQUIPO': 'EQUIPO',
    'SUB-CONTRATOS': 'SUBCONTRATO',
    'SUBCONTRATO': 'SUBCONTRATO',
    'SUBCONTRATOS': 'SUBCONTRATO'
  };
  
  if (nombre && mapeoPorNombre[nombre]) {
    return mapeoPorNombre[nombre];
  }
  
  // Si no se encuentra, usar MATERIAL como default seguro
  console.warn(
    `Tipo de costo recurso no reconocido: nombre="${nombreTipoCostoRecurso}", codigo="${codigoTipoCostoRecurso}". ` +
    `Usando MATERIAL por defecto.`
  );
  return 'MATERIAL';
}

/**
 * Valida si un tipo_costo_recurso es válido para APU
 * SUB-PARTIDAS y OTROS no se usan en APU
 */
export function esTipoValidoParaApu(
  nombreTipoCostoRecurso: string,
  codigoTipoCostoRecurso?: string
): boolean {
  const nombre = nombreTipoCostoRecurso?.trim().toUpperCase() || '';
  const codigo = codigoTipoCostoRecurso?.trim().toUpperCase() || '';
  
  // Tipos inválidos para APU
  const tiposInvalidos = ['SUB-PARTIDAS', 'SP', 'OTROS', '-'];
  
  return !tiposInvalidos.includes(nombre) && !tiposInvalidos.includes(codigo);
}

