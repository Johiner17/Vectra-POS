/**
 * Repositorio de Productos (Async - sqlite3)
 */
class ProductRepository {
    constructor(db) {
        this.db = db;
    }

    async findById(id) {
        return await this.db.get('SELECT * FROM productos WHERE id = ?', [id]);
    }

    async findByBarcode(barcode) {
        return await this.db.get('SELECT * FROM productos WHERE codigo_barras = ?', [barcode]);
    }

    async search(query) {
        return await this.db.all(
            'SELECT * FROM productos WHERE nombre LIKE ? OR codigo_barras LIKE ? LIMIT 20',
            [`%${query}%`, `%${query}%`]
        );
    }

    async updateStock(id, newStock) {
        return await this.db.run(
            'UPDATE productos SET stock_actual = ? WHERE id = ?',
            [newStock, id]
        );
    }

    async update(id, data) {
        const sets = [];
        const values = [];

        Object.keys(data).forEach(key => {
            sets.push(`${key} = ?`);
            values.push(data[key]);
        });

        values.push(id);

        return await this.db.run(
            `UPDATE productos SET ${sets.join(', ')} WHERE id = ?`,
            values
        );
    }

    async getLowStockProducts() {
        return await this.db.all(
            'SELECT * FROM productos WHERE stock_actual <= stock_minimo'
        );
    }
}

module.exports = ProductRepository;
