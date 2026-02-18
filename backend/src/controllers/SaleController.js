const SaleService = require('../services/SaleService');
const CurrencyService = require('../services/CurrencyService');

const saleService = new SaleService();
const currencyService = new CurrencyService();

class SaleController {
    async processSale(req, res, next) {
        try {
            const data = req.body;

            // Obtener tasa actual si no viene en el request
            if (!data.tasa_bcv_usada) {
                data.tasa_bcv_usada = await currencyService.getLatestRate();
            }

            // Procesar venta
            const sale = await saleService.processSale(data);

            res.json({
                success: true,
                message: 'Venta procesada correctamente',
                data: sale
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const sale = await saleService.getSale(req.params.id);
            if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });

            res.json({ success: true, data: sale });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SaleController();
