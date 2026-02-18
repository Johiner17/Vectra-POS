const dbManager = require('./database');

async function debugDb() {
    try {
        console.log('--- DEBUG DB ---');
        const db = await dbManager.getDb();

        const categories = await db.all('SELECT * FROM categorias');
        console.log('Categories:', categories);

        const products = await db.all('SELECT * FROM productos');
        console.log('Products count:', products.length);

        const users = await db.all('SELECT * FROM usuarios');
        console.log('Users:', users);

        await dbManager.close();
        console.log('----------------');
    } catch (error) {
        console.error('Error:', error);
    }
}

debugDb();
