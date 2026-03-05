/**
 * Middleware de autorización por rol
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Debe usarse DESPUÉS del authMiddleware.
 * 
 * @param {...string} allowedRoles - Roles permitidos ('admin', 'cajero', 'supervisor')
 * @returns {Function} middleware de Express
 * 
 * Ejemplo de uso:
 *   router.post('/users', authMiddleware, roleMiddleware('admin'), controller.create);
 */
const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        if (!allowedRoles.includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: `Acceso denegado. Se requiere rol: ${allowedRoles.join(' o ')}`
            });
        }

        next();
    };
};

module.exports = roleMiddleware;
