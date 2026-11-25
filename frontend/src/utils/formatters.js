/**
 * Formatea un monto numérico en bolívares al estilo venezolano:
 * separador de miles con punto (.) y decimales con coma (,).
 * Ejemplo: 1250.5 -> "1.250,50"
 */
export const formatBs = (amount) =>
    Number(amount || 0).toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
