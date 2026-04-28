import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, Save } from 'lucide-react';

const ProductModal = ({ isOpen, onClose, product, onSave }) => {
    const [formData, setFormData] = useState({
        codigo_barras: '',
        nombre: '',
        categoria_id: 1, // Default por ahora
        precio_venta_usd: '',
        precio_costo_usd: '',
        stock_actual: 0,
        stock_minimo: 5,
        unidad_medida: 'UNIDAD',
        aplica_iva: 1, // 1 = Sí, 0 = No
        tasa_iva: 16.00
    });

    useEffect(() => {
        if (product) {
            // Al editar, usar datos del producto
            setFormData({
                ...product,
                // Precios vienen en centavos si es edición directa del objeto de DB, 
                // pero si viene de la tabla Inventory puede que ya lo hayamos formateado?
                // El backend ProductController devuelve centavos en update/create no, pero getById si.
                // Asumamos que product viene con precios en centavos desde la DB.
                precio_venta_usd: product.precio_venta_usd_centavos ? product.precio_venta_usd_centavos / 100 : '',
                precio_costo_usd: product.precio_costo_usd_centavos ? product.precio_costo_usd_centavos / 100 : '',
            });
        } else {
            // Reset para nuevo
            setFormData({
                codigo_barras: '',
                nombre: '',
                categoria_id: 1,
                precio_venta_usd: '',
                precio_costo_usd: '',
                stock_actual: 0,
                stock_minimo: 5,
                unidad_medida: 'UNIDAD',
                aplica_iva: 1,
                tasa_iva: 16.00
            });
        }
    }, [product, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // El token se agrega automáticamente por el interceptor de axiosConfig
            const payload = {
                ...formData,
                stock_actual: parseInt(formData.stock_actual),
                stock_minimo: parseInt(formData.stock_minimo),
                precio_venta_usd: parseFloat(formData.precio_venta_usd),
                precio_costo_usd: parseFloat(formData.precio_costo_usd),
            };

            if (product) {
                await axios.put(`/api/products/${product.id}`, payload);
                toast.success('Producto actualizado');
            } else {
                await axios.post('/api/products', payload);
                toast.success('Producto creado');
            }
            onSave();
            onClose();
        } catch (error) {
            console.error(error);
            const rawMsg = error.response?.data?.error || '';
            let msg = 'Error guardando producto';

            if (rawMsg.includes('UNIQUE constraint failed: productos.codigo_barras')) {
                msg = `El código de barras "${formData.codigo_barras}" ya está registrado. Por favor, verifica el código o busca el producto existente.`;
            } else if (rawMsg) {
                msg = rawMsg;
            }

            toast.error(msg, { duration: 5000 });
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                    <h3>{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem' }}>Código Barras</label>
                            <input required name="codigo_barras" value={formData.codigo_barras} onChange={handleChange} style={{ width: '100%', padding: '0.5rem' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem' }}>Nombre</label>
                            <input required name="nombre" value={formData.nombre} onChange={handleChange} style={{ width: '100%', padding: '0.5rem' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem' }}>Precio Venta (USD)</label>
                            <input required type="number" step="0.01" name="precio_venta_usd" value={formData.precio_venta_usd} onChange={handleChange} style={{ width: '100%', padding: '0.5rem' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem' }}>Costo (USD)</label>
                            <input required type="number" step="0.01" name="precio_costo_usd" value={formData.precio_costo_usd} onChange={handleChange} style={{ width: '100%', padding: '0.5rem' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem' }}>Stock Actual</label>
                            <input required type="number" name="stock_actual" value={formData.stock_actual} onChange={handleChange} style={{ width: '100%', padding: '0.5rem' }} disabled={!!product} title={product ? "Use Ajuste de Stock" : ""} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem' }}>Stock Mínimo</label>
                            <input required type="number" name="stock_minimo" value={formData.stock_minimo} onChange={handleChange} style={{ width: '100%', padding: '0.5rem' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem' }}>Aplica IVA</label>
                            <select name="aplica_iva" value={formData.aplica_iva} onChange={handleChange} style={{ width: '100%', padding: '0.5rem' }}>
                                <option value={1}>Sí</option>
                                <option value={0}>No</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem' }}>Tasa IVA %</label>
                            <input required type="number" step="0.01" name="tasa_iva" value={formData.tasa_iva} onChange={handleChange} style={{ width: '100%', padding: '0.5rem' }} disabled={formData.aplica_iva == 0} />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        <Save size={16} style={{ marginRight: '0.5rem' }} /> Guardar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
