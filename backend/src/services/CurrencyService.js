const ExchangeRateRepository = require('../repositories/ExchangeRateRepository');
const CurrencyUtils = require('../utils/currencyUtils');
const dbManager = require('../database/database');

class CurrencyService {
    constructor() {
        // Repo instantiated per method/call for async DB
    }

    async getLatestRate() {
        const db = await dbManager.getDb();
        const repo = new ExchangeRateRepository(db);
        return await repo.getLatestRate();
    }

    async registerRate(data) {
        const db = await dbManager.getDb();
        const repo = new ExchangeRateRepository(db);

        // Validar datos
        if (!data.tasa || data.tasa <= 0) {
            throw new Error('La tasa debe ser mayor a 0');
        }

        return await repo.create({
            fecha: data.fecha || new Date().toISOString().split('T')[0],
            tasa: parseFloat(data.tasa),
            fuente: data.fuente || 'manual'
        });
    }

    async getHistory() {
        const db = await dbManager.getDb();
        const repo = new ExchangeRateRepository(db);
        return await repo.getHistory();
    }

    async convertUsdToBs(amountUsd, rate = null) {
        let currentRate = rate;
        if (!currentRate) {
            currentRate = await this.getLatestRate();
            if (!currentRate) throw new Error('No hay tasa registrada');
        }

        return CurrencyUtils.convertUsdToBs(
            CurrencyUtils.toCentavos(amountUsd),
            currentRate
        );
    }
}

module.exports = CurrencyService;
