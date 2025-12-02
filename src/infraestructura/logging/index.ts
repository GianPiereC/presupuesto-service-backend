// ============================================================================
// EXPORTAR LOGGER - Facilita imports
// ============================================================================

import { Logger, LogLevel } from './Logger';
import type { LoggerConfig } from './Logger';

export { Logger, LogLevel };
export type { LoggerConfig };

// Exportar instancia singleton por defecto
export const logger = Logger.getInstance();

