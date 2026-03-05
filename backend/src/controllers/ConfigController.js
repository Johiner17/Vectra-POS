const configService = require('../services/ConfigService');

/**
 * Controlador de configuración del sistema
 * Expone endpoints para leer y actualizar todas las configuraciones
 */
class ConfigController {
    /**
     * GET /api/config
     * Obtener todas las configuraciones del negocio
     */
    async getConfig(req, res, next) {
        try {
            const config = await configService.getBusinessConfig();
            res.json({ success: true, data: config });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/config/all
     * Obtener todas las configuraciones en formato lista
     */
    async getAllConfig(req, res, next) {
        try {
            const configs = await configService.getAllFlat();
            res.json({ success: true, data: configs });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/config/:key
     * Obtener una configuración específica por clave
     */
    async getByKey(req, res, next) {
        try {
            const value = await configService.get(req.params.key);
            if (value === null) {
                return res.status(404).json({
                    success: false,
                    message: `Configuración '${req.params.key}' no encontrada`
                });
            }
            res.json({ success: true, data: { clave: req.params.key, valor: value } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/config
     * Actualizar múltiples configuraciones
     * Body: { configs: { clave1: valor1, clave2: valor2, ... } }
     */
    async updateConfig(req, res, next) {
        try {
            const { configs } = req.body;

            if (!configs || typeof configs !== 'object' || Object.keys(configs).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe enviar un objeto "configs" con al menos una configuración'
                });
            }

            // Solo admin puede modificar configuraciones
            if (req.user.rol !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Solo los administradores pueden modificar la configuración'
                });
            }

            await configService.updateBulk(configs, req.user.id);

            // Retornar la configuración actualizada
            const updatedConfig = await configService.getBusinessConfig();

            res.json({
                success: true,
                message: 'Configuración actualizada correctamente',
                data: updatedConfig
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/config/:key
     * Actualizar una configuración individual
     * Body: { valor: "...", descripcion: "..." }
     */
    async updateByKey(req, res, next) {
        try {
            const { valor, descripcion } = req.body;
            const { key } = req.params;

            if (valor === undefined || valor === null) {
                return res.status(400).json({
                    success: false,
                    message: 'El campo "valor" es obligatorio'
                });
            }

            if (req.user.rol !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Solo los administradores pueden modificar la configuración'
                });
            }

            await configService.set(key, String(valor), descripcion);

            res.json({
                success: true,
                message: `Configuración '${key}' actualizada correctamente`,
                data: { clave: key, valor: String(valor) }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ConfigController();
