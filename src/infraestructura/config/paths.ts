// ============================================================================
// CONFIGURACIÓN DE PATH ALIASES PARA RUNTIME
// ============================================================================
// 
// NOTA: TypeScript resuelve los path aliases solo para type checking,
// pero NO los transforma en el código compilado. Para que funcionen en runtime:
//
// Opción 1: Usar Bun (recomendado) - Bun soporta path aliases directamente
// Opción 2: Usar tsconfig-paths/register antes de cualquier import
// Opción 3: Usar un bundler (esbuild, rollup) que transforme los paths
//
// Este archivo se puede usar para registrar tsconfig-paths si es necesario

/**
 * Registrar path aliases para runtime usando tsconfig-paths
 * Solo es necesario si se ejecuta con Node.js en lugar de Bun
 */
export function registerPathAliases(): void {
  try {
    // Intentar registrar tsconfig-paths si está disponible
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('tsconfig-paths/register');
  } catch (error) {
    // Si tsconfig-paths no está instalado, continuar sin él
    // Bun maneja los paths automáticamente, así que esto es opcional
    // tsconfig-paths no está disponible - esto es normal en desarrollo con bun
    // No requiere logging ya que es solo una advertencia de desarrollo
  }
}

