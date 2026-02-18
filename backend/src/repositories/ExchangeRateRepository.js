const CurrencyUtils = require('../utils/currencyUtils');

/**
 * Repositorio para gestión de tasas de cambio BCV (Async)
 */
class ExchangeRateRepository {
  constructor(db) {
    this.db = db;
  }

  async getLatestRate() {
    const rate = await this.db.get(
      'SELECT * FROM tasas_bcv ORDER BY fecha DESC, created_at DESC LIMIT 1'
    );
    return rate ? rate.tasa : null;
  }

  async getRateByDate(date) {
    const rate = await this.db.get(
      'SELECT * FROM tasas_bcv WHERE fecha = ? ORDER BY created_at DESC LIMIT 1',
      [date]
    );
    return rate ? rate.tasa : null;
  }

  async create(data) {
    const result = await this.db.run(
      'INSERT INTO tasas_bcv (fecha, tasa, fuente) VALUES (?, ?, ?)',
      [data.fecha, data.tasa, data.fuente]
    );
    return { id: result.lastID, ...data };
  }

  async getHistory(limit = 10) {
    return await this.db.all(
      'SELECT * FROM tasas_bcv ORDER BY fecha DESC LIMIT ?',
      [limit]
    );
  }
}

module.exports = ExchangeRateRepository;
