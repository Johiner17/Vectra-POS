const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

/**
 * Clase singleton para gestión de la base de datos SQLite (Async)
 */
class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.resolve(config.database.path || './data/vectra_pos.db');
        this.ensureDirectory();
    }

    ensureDirectory() {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    async connect() {
        if (this.db) return this.db;

        try {
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            // Habilitar WAL mode para mejor concurrencia
            await this.db.exec('PRAGMA journal_mode = WAL;');
            // Habilitar claves foráneas
            await this.db.exec('PRAGMA foreign_keys = ON;');

            // Migración automática para agregar columna imagen si no existe
            try {
                await this.db.exec('ALTER TABLE productos ADD COLUMN imagen TEXT;');
                console.log('⚡ Columna "imagen" agregada a la tabla "productos"');
            } catch (e) {
                // La columna ya existe o error no crítico
            }

            console.log(`✅ Base de datos conectada: ${this.dbPath}`);
            return this.db;
        } catch (error) {
            console.error('❌ Error al conectar base de datos:', error);
            throw error;
        }
    }

    async getDb() {
        if (!this.db) {
            await this.connect();
        }
        return this.db;
    }

    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
            console.log('Base de datos cerrada');
        }
    }

    /**
     * Ejecuta una transacción
     * Nota: sqlite wrapper no tiene soporte nativo simple para transacciones anidadas o automáticas
     * como better-sqlite3. Se debe manejar manualmente.
     */
    async transaction(callback) {
        const db = await this.getDb();
        try {
            await db.exec('BEGIN TRANSACTION');
            const result = await callback(db);
            await db.exec('COMMIT');
            return result;
        } catch (error) {
            await db.exec('ROLLBACK');
            throw error;
        }
    }
}

module.exports = new DatabaseManager();
