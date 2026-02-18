const dbManager = require('./database');

async function fixSetup() {
    try {
        console.log('Verificando configuración de base de datos...');
        const db = await dbManager.getDb();

        // Verificar categoría General
        const catCount = await db.get('SELECT COUNT(*) as count FROM categorias');
        if (catCount.count === 0) {
            await db.run("INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)", ['General', 'Categoría general']);
            console.log('✓ Categoría por defecto creada: General');
        } else {
            console.log('✓ Categorías ya existen');
        }

        await dbManager.close();
        console.log('Corrección completada.');
    } catch (error) {
        console.error('Error:', error);
    }
}

fixSetup();
