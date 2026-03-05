const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const dbManager = require('../database/database');

/**
 * Servicio de autenticación
 * Maneja login real contra la base de datos, validación de contraseñas con bcrypt,
 * generación de tokens JWT y gestión de usuarios.
 */
class AuthService {
    /**
     * Autenticar usuario con credenciales
     * @param {string} username 
     * @param {string} password 
     * @returns {Object} { token, user }
     */
    async login(username, password) {
        const db = await dbManager.getDb();

        // Buscar usuario activo por username
        const user = await db.get(
            'SELECT id, username, password_hash, nombre_completo, rol, activo FROM usuarios WHERE username = ?',
            [username]
        );

        if (!user) {
            throw new AuthError('Usuario o contraseña incorrectos', 401);
        }

        if (!user.activo) {
            throw new AuthError('Usuario desactivado. Contacte al administrador.', 403);
        }

        // Verificar contraseña con bcrypt
        const passwordValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            // Registrar intento fallido en auditoría
            await this._logAudit(null, 'LOGIN_FALLIDO', 'usuarios', user.id, null, { username });
            throw new AuthError('Usuario o contraseña incorrectos', 401);
        }

        // Generar token JWT
        const tokenPayload = {
            id: user.id,
            username: user.username,
            nombre_completo: user.nombre_completo,
            rol: user.rol
        };

        const token = jwt.sign(tokenPayload, config.security.jwtSecret, {
            expiresIn: config.security.jwtExpiresIn
        });

        // Registrar login exitoso en auditoría
        await this._logAudit(user.id, 'LOGIN_EXITOSO', 'usuarios', user.id, null, { username });

        // Retornar sin el hash de la contraseña
        const { password_hash, ...userData } = user;
        return { token, user: userData };
    }

    /**
     * Obtener perfil del usuario autenticado
     * @param {number} userId 
     * @returns {Object} datos del usuario
     */
    async getProfile(userId) {
        const db = await dbManager.getDb();
        const user = await db.get(
            'SELECT id, username, nombre_completo, rol, activo, created_at FROM usuarios WHERE id = ?',
            [userId]
        );

        if (!user) {
            throw new AuthError('Usuario no encontrado', 404);
        }

        return user;
    }

    /**
     * Cambiar contraseña del usuario
     * @param {number} userId 
     * @param {string} currentPassword 
     * @param {string} newPassword 
     */
    async changePassword(userId, currentPassword, newPassword) {
        const db = await dbManager.getDb();

        const user = await db.get(
            'SELECT id, password_hash FROM usuarios WHERE id = ?',
            [userId]
        );

        if (!user) {
            throw new AuthError('Usuario no encontrado', 404);
        }

        // Verificar contraseña actual
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            throw new AuthError('Contraseña actual incorrecta', 400);
        }

        // Validar nueva contraseña
        if (!newPassword || newPassword.length < 4) {
            throw new AuthError('La nueva contraseña debe tener al menos 4 caracteres', 400);
        }

        // Hash nueva contraseña
        const newHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

        await db.run(
            'UPDATE usuarios SET password_hash = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?',
            [newHash, userId]
        );

        await this._logAudit(userId, 'CAMBIO_PASSWORD', 'usuarios', userId, null, null);
    }

    /**
     * Crear nuevo usuario (solo admin)
     * @param {Object} userData 
     * @param {number} creatorId - ID del admin que crea el usuario
     * @returns {Object} usuario creado
     */
    async createUser(userData, creatorId) {
        const db = await dbManager.getDb();
        const { username, password, nombre_completo, rol } = userData;

        // Validaciones
        if (!username || !password || !nombre_completo || !rol) {
            throw new AuthError('Todos los campos son obligatorios', 400);
        }

        if (!['admin', 'cajero', 'supervisor'].includes(rol)) {
            throw new AuthError('Rol inválido. Debe ser: admin, cajero o supervisor', 400);
        }

        if (password.length < 4) {
            throw new AuthError('La contraseña debe tener al menos 4 caracteres', 400);
        }

        // Verificar que no exista el username
        const existing = await db.get('SELECT id FROM usuarios WHERE username = ?', [username]);
        if (existing) {
            throw new AuthError('El nombre de usuario ya existe', 409);
        }

        // Hash de contraseña
        const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

        const result = await db.run(
            `INSERT INTO usuarios (username, password_hash, nombre_completo, rol) 
             VALUES (?, ?, ?, ?)`,
            [username, passwordHash, nombre_completo, rol]
        );

        await this._logAudit(creatorId, 'CREAR_USUARIO', 'usuarios', result.lastID, null, {
            username, nombre_completo, rol
        });

        return {
            id: result.lastID,
            username,
            nombre_completo,
            rol,
            activo: 1
        };
    }

    /**
     * Listar todos los usuarios
     * @returns {Array} lista de usuarios
     */
    async listUsers() {
        const db = await dbManager.getDb();
        return db.all(
            'SELECT id, username, nombre_completo, rol, activo, created_at, updated_at FROM usuarios ORDER BY id'
        );
    }

    /**
     * Activar/Desactivar usuario
     * @param {number} userId 
     * @param {boolean} active 
     * @param {number} adminId 
     */
    async toggleUser(userId, active, adminId) {
        const db = await dbManager.getDb();

        // No permitir desactivarse a sí mismo
        if (userId === adminId && !active) {
            throw new AuthError('No puede desactivar su propia cuenta', 400);
        }

        const user = await db.get('SELECT id, username FROM usuarios WHERE id = ?', [userId]);
        if (!user) {
            throw new AuthError('Usuario no encontrado', 404);
        }

        await db.run(
            'UPDATE usuarios SET activo = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?',
            [active ? 1 : 0, userId]
        );

        await this._logAudit(adminId, active ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO', 'usuarios', userId, null, {
            username: user.username
        });
    }

    /**
     * Resetear contraseña de un usuario (solo admin)
     * @param {number} targetUserId 
     * @param {string} newPassword 
     * @param {number} adminId 
     */
    async resetPassword(targetUserId, newPassword, adminId) {
        const db = await dbManager.getDb();

        const user = await db.get('SELECT id FROM usuarios WHERE id = ?', [targetUserId]);
        if (!user) {
            throw new AuthError('Usuario no encontrado', 404);
        }

        if (!newPassword || newPassword.length < 4) {
            throw new AuthError('La nueva contraseña debe tener al menos 4 caracteres', 400);
        }

        const newHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);
        await db.run(
            'UPDATE usuarios SET password_hash = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?',
            [newHash, targetUserId]
        );

        await this._logAudit(adminId, 'RESET_PASSWORD', 'usuarios', targetUserId, null, null);
    }

    /**
     * Registrar evento en la tabla de auditoría
     */
    async _logAudit(userId, accion, tabla, registroId, datosAnteriores, datosNuevos) {
        try {
            const db = await dbManager.getDb();
            await db.run(
                `INSERT INTO auditoria (usuario_id, accion, tabla, registro_id, datos_anteriores, datos_nuevos)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    accion,
                    tabla,
                    registroId,
                    datosAnteriores ? JSON.stringify(datosAnteriores) : null,
                    datosNuevos ? JSON.stringify(datosNuevos) : null
                ]
            );
        } catch (err) {
            // No fallar si la auditoría falla
            console.error('Error al registrar auditoría:', err.message);
        }
    }
}

/**
 * Error personalizado para autenticación
 */
class AuthError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'AuthError';
        this.statusCode = statusCode;
    }
}

module.exports = new AuthService();
