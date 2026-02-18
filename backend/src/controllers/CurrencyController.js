const CurrencyService = require('../services/CurrencyService');
const currencyService = new CurrencyService();

class CurrencyController {
    async getLatestRate(req, res, next) {
        try {
            const rate = await currencyService.getLatestRate();
            res.json({ success: true, data: { tasa: rate } });
        } catch (error) {
            next(error);
        }
    }

    async registerRate(req, res, next) {
        try {
            const result = await currencyService.registerRate(req.body);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getHistory(req, res, next) {
        try {
            const history = await currencyService.getHistory();
            res.json({ success: true, data: history });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CurrencyController();
