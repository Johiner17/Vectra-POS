/**
 * Script para verificar y corregir el hash del admin si es necesario.
 * Ejecutar: node src/database/fix_admin.js
 */
const dbManager = require('./database');
const bcrypt = require('bcrypt');

async function fixAdmin() {
    try {
        const db = await dbManager.getDb();

        const admin = await db.get('SELECT id, username, password_hash FROM usuarios WHERE username = ?', ['admin']);

        if (!admin) {
            console.log('⚠️  No existe usuario admin. Creando...');
            const hash = await bcrypt.hash('admin123', 10);
            await db.run(
                'INSERT INTO usuarios (username, password_hash, nombre_completo, rol) VALUES (?, ?, ?, ?)',
                ['admin', hash, 'Administrador', 'admin']
            );
            console.log('✅ Usuario admin creado con contraseña: admin123');
        } else {
            // Verificar si el hash actual es válido
            const isValid = await bcrypt.compare('admin123', admin.password_hash);
            if (isValid) {
                console.log('✅ El hash del admin es correcto. No se necesitan cambios.');
            } else {
                console.log('⚠️  El hash del admin no es válido. Regenerando...');
                const newHash = await bcrypt.hash('admin123', 10);
                await db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [newHash, admin.id]);
                console.log('✅ Hash del admin regenerado. Contraseña: admin123');
            }
        }

        await dbManager.close();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fixAdmin();
