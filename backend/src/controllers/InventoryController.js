const InventoryService = require('../services/InventoryService');
const inventoryService = new InventoryService();

class InventoryController {
    async getKardex(req, res, next) {
        try {
            const { id } = req.params;
            const filters = req.query; // fecha_inicio, fecha_fin

            const result = await inventoryService.getKardex(id, filters);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async registerMovement(req, res, next) {
        try {
            const { type, ...data } = req.body;
            // data debe incluir: producto_id, cantidad, usuario_id (del token), etc.

            // Asignar usuario del token si no viene
            if (req.user && !data.usuario_id) {
                data.usuario_id = req.user.id;
            }

            let result;
            switch (type) {
                case 'entrada':
                    result = await inventoryService.registerEntry(data);
                    break;
                case 'salida':
                    result = await inventoryService.registerExit(data);
                    break;
                case 'ajuste':
                    result = await inventoryService.registerAdjustment(data);
                    break;
                default:
                    return res.status(400).json({ error: 'Tipo de movimiento inválido' });
            }

            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getLowStock(req, res, next) {
        try {
            const products = await inventoryService.getLowStockProducts();
            res.json({ success: true, data: products });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new InventoryController();
