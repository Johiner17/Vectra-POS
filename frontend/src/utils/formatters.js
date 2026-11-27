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

export const PAYMENT_LABELS = {
    punto_venta: 'Punto de Venta',
    transferencia_bs: 'Pago Móvil',
    efectivo_bs: 'Efectivo Bs.',
    efectivo_usd: 'Efectivo USD',
    transferencia_usd: 'Binance USDT',
    credito: 'Crédito',
};

/**
 * Devuelve el nombre legible y consistente de un método de pago.
 */
export const formatPaymentLabel = (tipoPago) =>
    PAYMENT_LABELS[tipoPago] || (tipoPago ? tipoPago.replace(/_/g, ' ') : '');
