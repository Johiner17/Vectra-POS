const ProductRepository = require('../repositories/ProductRepository');
const dbManager = require('../database/database');

class ProductController {
    async search(req, res, next) {
        try {
            const db = await dbManager.getDb();
            const repo = new ProductRepository(db);

            const { q, barcode } = req.query;
            let result;

            if (barcode) {
                const product = await repo.findByBarcode(barcode);
                result = product ? [product] : [];
            } else if (q !== undefined) {
                // Si q llega vacío, repo.search('') debería traer todo si usa LIKE %%
                // Si no, forzamos un string vacío
                result = await repo.search(q);
            } else {
                return res.status(400).json({ error: 'Debe especificar q o barcode' });
            }

            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const db = await dbManager.getDb();
            const repo = new ProductRepository(db);
            const product = await repo.findById(req.params.id);

            if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

            res.json({ success: true, data: product });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            console.log('Creating product with body:', req.body);
            const db = await dbManager.getDb();

            // Validate category existence
            const category = await db.get('SELECT id FROM categorias WHERE id = ?', [req.body.categoria_id]);
            if (!category) {
                console.error(`Category ID ${req.body.categoria_id} not found`);
                return res.status(400).json({ error: 'Categoría inválida' });
            }

            const result = await db.run(
                `INSERT INTO productos (
           codigo_barras, nombre, categoria_id, 
           precio_venta_usd_centavos, precio_costo_usd_centavos,
           stock_actual, stock_minimo, unidad_medida, 
           aplica_iva, tasa_iva, imagen
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.body.codigo_barras,
                    req.body.nombre,
                    req.body.categoria_id,
                    req.body.precio_venta_usd * 100,
                    req.body.precio_costo_usd * 100,
                    req.body.stock_actual,
                    req.body.stock_minimo,
                    (req.body.unidad_medida || 'unidad').toLowerCase(), // Normalize to lowercase for CHECK constraint
                    parseInt(req.body.aplica_iva || 0),
                    parseFloat(req.body.tasa_iva || 0),
                    req.body.imagen || null
                ]
            );
            res.json({ success: true, id: result.lastID });
        } catch (error) {
            console.error('Error creating product:', error);
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const db = await dbManager.getDb();
            const repo = new ProductRepository(db);
            const id = req.params.id;

            const data = { ...req.body };

            // Convertir precios a centavos si vienen en el body
            if (data.precio_venta_usd) data.precio_venta_usd_centavos = data.precio_venta_usd * 100;
            if (data.precio_costo_usd) data.precio_costo_usd_centavos = data.precio_costo_usd * 100;

            // Eliminar campos que no son de DB o que ya transformamos
            delete data.precio_venta_usd;
            delete data.precio_costo_usd;

            await repo.update(id, data);
            res.json({ success: true, message: 'Producto actualizado' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ProductController();
