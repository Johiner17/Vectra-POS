const dbManager = require('./database');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

/**
 * Script de inicialización de la base de datos
 * Ejecutar con: node src/database/init.js
 */
async function initializeDatabase() {
    try {
        console.log('Inicializando base de datos...');

        // Leer schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Conectar y ejecutar
        const db = await dbManager.getDb();

        // Ejecutar schema (split por ';' para ejecutar statement por statement, o exec soporta script completo?)
        // sqlite.exec soporta multiples statements
        await db.exec(schema);

        console.log('✓ Tablas creadas/verificadas');

        // Verificar usuario admin
        const adminUser = await db.get('SELECT * FROM usuarios WHERE username = ?', ['admin']);

        if (!adminUser) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.run(
                `INSERT INTO usuarios (username, password_hash, nombre_completo, rol) 
         VALUES (?, ?, ?, ?)`,
                ['admin', hashedPassword, 'Administrador', 'admin']
            );
            console.log('✓ Usuario administrador creado: admin (pass: admin123)');
        }

        // Verificar categoría por defecto
        const catCount = await db.get('SELECT COUNT(*) as count FROM categorias');
        if (catCount.count === 0) {
            await db.run("INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)", ['General', 'Categoría general']);
            console.log('✓ Categoría por defecto creada: General');
        }

        // Verificar configuraciones base
        const configCount = await db.get('SELECT COUNT(*) as count FROM configuraciones');
        if (configCount.count === 0) {
            await db.exec(`
        INSERT INTO configuraciones (clave, valor) VALUES 
        ('empresa_nombre', 'Mi Comercio'),
        ('empresa_rif', 'J-000000000'),
        ('moneda_principal', 'USD'),
        ('iva_defecto', '16.00'),
        ('printer_width', '58mm');
      `);
            console.log('✓ Configuraciones iniciales creadas');
        }

        // Verificar tasa BCV inicial
        const tasa = await db.get('SELECT * FROM tasas_bcv ORDER BY fecha DESC LIMIT 1');
        if (!tasa) {
            const today = new Date().toISOString().split('T')[0];
            await db.run(
                `INSERT INTO tasas_bcv (fecha, tasa, fuente) VALUES (?, ?, ?)`,
                [today, 36.50, 'inicial']
            );
            console.log(`✓ Tasa BCV inicial creada: 36.50 (${today})`);
        }

        console.log('\n✅ Base de datos inicializada correctamente');
        await dbManager.close();

    } catch (error) {
        console.error('\n❌ Error inicializando base de datos:', error);
        process.exit(1);
    }
}

initializeDatabase();
