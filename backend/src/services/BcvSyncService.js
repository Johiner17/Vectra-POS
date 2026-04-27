/**
 * BcvSyncService — Sincronización automática de la tasa del BCV
 * 
 * Filosofía: OFFLINE-FIRST
 * - El sistema funciona 100% sin internet usando la última tasa guardada en SQLite
 * - Cuando hay conexión disponible, sincroniza automáticamente la tasa oficial del BCV
 * - Múltiples fuentes con fallback para máxima confiabilidad
 */

const dbManager = require('../database/database');

class BcvSyncService {
    constructor() {
        this.syncInterval = null;
        this.isSyncing = false;
        this.lastStatus = null; // 'success' | 'offline' | 'error'
        this.lastAttempt = null;
        this.lastSuccess = null;
    }

    /**
     * Fuentes de datos en orden de prioridad.
     * Si una falla, se intenta la siguiente.
     */
    get sources() {
        return [
            {
                name: 'DolarApi.com (oficial)',
                fetch: () => this._fetchDolarApi()
            },
            {
                name: 'ExchangeRate-API (VES)',
                fetch: () => this._fetchExchangeRateApi()
            },
            {
                name: 'BCV Directo (scraping)',
                fetch: () => this._fetchBcvDirect()
            }
        ];
    }

    /**
     * Fuente 1: ve.dolarapi.com — endpoint directo del dólar oficial BCV
     * Usa /dolares/oficial para obtener exactamente la tasa BCV sin filtros.
     */
    async _fetchDolarApi() {
        const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) throw new Error(`DolarApi HTTP ${res.status}`);
        const data = await res.json();

        const tasa = data?.promedio;
        if (!tasa || isNaN(parseFloat(tasa))) throw new Error('No se encontró tasa en DolarApi /oficial');

        return {
            tasa: parseFloat(tasa),
            fuente: 'DolarApi.com (BCV Oficial)'
        };
    }

    /**
     * Fuente 2: exchangerate.host — tasa USD → VES (fallback gratuito sin key)
     */
    async _fetchExchangeRateApi() {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', {
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) throw new Error(`ExchangeRate-API HTTP ${res.status}`);
        const data = await res.json();

        const tasa = data?.rates?.VES;
        if (!tasa || isNaN(parseFloat(tasa))) throw new Error('No se encontró VES en ExchangeRate-API');

        return {
            tasa: parseFloat(tasa),
            fuente: 'ExchangeRate-API (VES)'
        };
    }

    /**
     * Fuente 3: Scraping directo de la homepage del BCV
     * El BCV publica las tasas en su web principal (bcv.org.ve).
     * Busca el bloque de tipo de cambio USD con formato venezolano (ej: 91,3456 o 484,7404).
     */
    async _fetchBcvDirect() {
        const res = await fetch('https://www.bcv.org.ve', {
            signal: AbortSignal.timeout(15000),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8'
            }
        });
        if (!res.ok) throw new Error(`BCV Directo HTTP ${res.status}`);
        const html = await res.text();

        // El BCV publica el tipo de cambio en un bloque reconocible
        // Formato: número con coma decimal venezolano (ej: 484,7404) o punto
        // Buscamos en el contexto de "USD" o "dólar"
        const patterns = [
            /id=["']dolar["'][^>]*>[\s\S]*?([0-9]{2,4}[,\.][0-9]{2,6})/i,
            /USD[\s\S]{0,200}?([0-9]{2,4}[,\.][0-9]{4,6})/i,
            /([0-9]{2,4}[,\.][0-9]{4,6})[\s\S]{0,200}?USD/i
        ];

        for (const pattern of patterns) {
            const m = html.match(pattern);
            if (m) {
                const tasaStr = m[1].replace(',', '.');
                const tasa = parseFloat(tasaStr);
                if (!isNaN(tasa) && tasa > 1) {
                    return { tasa, fuente: 'BCV Directo (scraping)' };
                }
            }
        }

        throw new Error('No se pudo extraer la tasa del HTML del BCV');
    }

    /**
     * Intenta obtener la tasa de cualquier fuente disponible.
     * Si todas fallan, retorna null (modo offline).
     */
    async fetchRate() {
        for (const source of this.sources) {
            try {
                const result = await source.fetch();
                console.log(`✅ Tasa BCV obtenida de ${source.name}: ${result.tasa}`);
                return result;
            } catch (err) {
                console.warn(`⚠️  ${source.name} falló: ${err.message}`);
            }
        }
        return null; // Todas las fuentes fallaron
    }

    /**
     * Sincroniza la tasa con la base de datos.
     * Guarda el resultado y actualiza el estado interno.
     */
    async sync() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.lastAttempt = new Date();

        try {
            const result = await this.fetchRate();

            if (!result) {
                this.lastStatus = 'offline';
                console.log('📡 Sin conexión — usando última tasa guardada en DB');
                return;
            }

            // Guardar en BD
            const db = await dbManager.getDb();
            const today = new Date().toISOString().split('T')[0];

            // Upsert: actualizar si ya existe para hoy, insertar si no
            const existing = await db.get(
                'SELECT id FROM tasas_bcv WHERE fecha = ?', [today]
            );

            if (existing) {
                await db.run(
                    'UPDATE tasas_bcv SET tasa = ?, fuente = ? WHERE fecha = ?',
                    [result.tasa, result.fuente, today]
                );
            } else {
                await db.run(
                    'INSERT INTO tasas_bcv (fecha, tasa, fuente) VALUES (?, ?, ?)',
                    [today, result.tasa, result.fuente]
                );
            }

            this.lastStatus = 'success';
            this.lastSuccess = new Date();

            console.log(`💱 Tasa BCV actualizada: ${result.tasa} Bs/USD (${result.fuente})`);

        } catch (error) {
            this.lastStatus = 'error';
            console.error('❌ Error en sincronización BCV:', error.message);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Inicia la sincronización automática:
     * - Intenta sincronizar al arrancar (después de 5 segundos para no bloquear el inicio)
     * - Luego cada 6 horas (el BCV publica la tasa una vez al día hábil)
     */
    start() {
        console.log('🔄 Iniciando sincronización automática de tasa BCV...');

        // Primera sincronización: 5 segundos después de arrancar
        setTimeout(() => this.sync(), 5000);

        // Sincronización each 6 horas (en ms)
        const SIX_HOURS = 6 * 60 * 60 * 1000;
        this.syncInterval = setInterval(() => this.sync(), SIX_HOURS);
    }

    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Estado actual del servicio (para mostrar en el frontend)
     */
    getStatus() {
        return {
            lastStatus: this.lastStatus,
            lastAttempt: this.lastAttempt,
            lastSuccess: this.lastSuccess,
            isSyncing: this.isSyncing
        };
    }
}

// Singleton
const bcvSyncService = new BcvSyncService();
module.exports = bcvSyncService;
