const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
    // Para facilitar pruebas iniciales sin frontend, permitimos bypass con header
    // OJO: Eliminar esto en producción
    if (process.env.NODE_ENV === 'development' && req.headers['x-bypass-auth']) {
        req.user = { id: 1, username: 'admin', rol: 'admin' };
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    try {
        // Usar el mismo secret que config.js para consistencia
        const decoded = jwt.verify(token, config.security.jwtSecret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

module.exports = authMiddleware;
