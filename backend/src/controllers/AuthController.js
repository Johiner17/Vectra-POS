const authService = require('../services/AuthService');

/**
 * Controlador de autenticación
 * Maneja las rutas de login, perfil, gestión de usuarios y contraseñas
 */
class AuthController {
    /**
     * POST /api/auth/login
     * Autenticar usuario con username y password
     */
    async login(req, res, next) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuario y contraseña son obligatorios'
                });
            }

            const result = await authService.login(username, password);

            res.json({
                success: true,
                token: result.token,
                user: result.user
            });
        } catch (error) {
            if (error.name === 'AuthError') {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * GET /api/auth/profile
     * Obtener perfil del usuario autenticado
     */
    async getProfile(req, res, next) {
        try {
            const user = await authService.getProfile(req.user.id);
            res.json({ success: true, data: user });
        } catch (error) {
            if (error.name === 'AuthError') {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * PUT /api/auth/password
     * Cambiar contraseña del usuario autenticado
     */
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Contraseña actual y nueva son obligatorias'
                });
            }

            await authService.changePassword(req.user.id, currentPassword, newPassword);

            res.json({
                success: true,
                message: 'Contraseña actualizada correctamente'
            });
        } catch (error) {
            if (error.name === 'AuthError') {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * POST /api/users
     * Crear nuevo usuario (solo admin)
     */
    async createUser(req, res, next) {
        try {
            const user = await authService.createUser(req.body, req.user.id);
            res.status(201).json({ success: true, data: user });
        } catch (error) {
            if (error.name === 'AuthError') {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * GET /api/users
     * Listar todos los usuarios (solo admin)
     */
    async listUsers(req, res, next) {
        try {
            const users = await authService.listUsers();
            res.json({ success: true, data: users });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/users/:id/toggle
     * Activar/Desactivar usuario (solo admin)
     */
    async toggleUser(req, res, next) {
        try {
            const { active } = req.body;
            await authService.toggleUser(parseInt(req.params.id), active, req.user.id);
            res.json({
                success: true,
                message: active ? 'Usuario activado' : 'Usuario desactivado'
            });
        } catch (error) {
            if (error.name === 'AuthError') {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * PUT /api/users/:id/reset-password
     * Resetear contraseña de un usuario (solo admin)
     */
    async resetPassword(req, res, next) {
        try {
            const { newPassword } = req.body;
            if (!newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'La nueva contraseña es obligatoria'
                });
            }
            await authService.resetPassword(parseInt(req.params.id), newPassword, req.user.id);
            res.json({
                success: true,
                message: 'Contraseña reseteada correctamente'
            });
        } catch (error) {
            if (error.name === 'AuthError') {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }
}

module.exports = new AuthController();
