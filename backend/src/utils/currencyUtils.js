const Decimal = require('decimal.js');
const config = require('../config/config');

/**
 * Utilidades para manejo de moneda y conversiones
 * Todos los montos se almacenan como enteros en centavos para evitar errores de punto flotante
 */
class CurrencyUtils {
    /**
     * Convierte un monto decimal a centavos (entero)
     * @param {number|string|Decimal} amount - Monto en formato decimal
     * @returns {number} Monto en centavos
     */
    static toCentavos(amount) {
        if (amount === null || amount === undefined) return 0;

        const decimal = new Decimal(amount);
        const centavos = decimal.times(config.currency.storageMultiplier).toNumber();

        return Math.round(centavos);
    }

    /**
     * Convierte centavos (entero) a monto decimal
     * @param {number} centavos - Monto en centavos
     * @returns {number} Monto en formato decimal
     */
    static fromCentavos(centavos) {
        if (centavos === null || centavos === undefined) return 0;

        const decimal = new Decimal(centavos);
        return decimal.dividedBy(config.currency.storageMultiplier).toNumber();
    }

    /**
     * Convierte USD a BS usando la tasa BCV
     * @param {number} usdCentavos - Monto en centavos USD
     * @param {number} tasaBcv - Tasa de cambio BCV
     * @returns {number} Monto en centavos BS
     */
    static convertUsdToBs(usdCentavos, tasaBcv) {
        const usdDecimal = new Decimal(usdCentavos).dividedBy(config.currency.storageMultiplier);
        const bsDecimal = usdDecimal.times(tasaBcv);
        const bsCentavos = bsDecimal.times(config.currency.storageMultiplier);

        return Math.round(bsCentavos.toNumber());
    }

    /**
     * Convierte BS a USD usando la tasa BCV
     * @param {number} bsCentavos - Monto en centavos BS
     * @param {number} tasaBcv - Tasa de cambio BCV
     * @returns {number} Monto en centavos USD
     */
    static convertBsToUsd(bsCentavos, tasaBcv) {
        const bsDecimal = new Decimal(bsCentavos).dividedBy(config.currency.storageMultiplier);
        const usdDecimal = bsDecimal.dividedBy(tasaBcv);
        const usdCentavos = usdDecimal.times(config.currency.storageMultiplier);

        return Math.round(usdCentavos.toNumber());
    }

    /**
     * Calcula el IVA de un monto
     * @param {number} montoCentavos - Monto base en centavos
     * @param {number} tasaIva - Tasa de IVA (ej: 16 para 16%)
     * @returns {number} Monto de IVA en centavos
     */
    static calcularIva(montoCentavos, tasaIva) {
        const montoDecimal = new Decimal(montoCentavos);
        const ivaDecimal = montoDecimal.times(tasaIva).dividedBy(100);

        return Math.round(ivaDecimal.toNumber());
    }

    /**
     * Formatea un monto en centavos para mostrar
     * @param {number} centavos - Monto en centavos
     * @param {string} moneda - Código de moneda (USD o BS)
     * @returns {string} Monto formateado
     */
    static formatear(centavos, moneda = 'USD') {
        const monto = this.fromCentavos(centavos);
        const simbolo = moneda === 'USD' ? '$' : 'Bs.';

        return `${simbolo} ${monto.toFixed(2)}`;
    }

    /**
     * Redondea un monto según las reglas fiscales venezolanas
     * Para bolívares, se redondea a 2 decimales
     * @param {number} centavos - Monto en centavos
     * @returns {number} Monto redondeado en centavos
     */
    static redondearFiscal(centavos) {
        // Ya está en centavos, solo aseguramos que sea entero
        return Math.round(centavos);
    }
}

module.exports = CurrencyUtils;
