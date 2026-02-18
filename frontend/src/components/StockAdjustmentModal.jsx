import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, ArrowRightLeft } from 'lucide-react';

const StockAdjustmentModal = ({ isOpen, onClose, product, onSave }) => {
    const [type, setType] = useState('entrada'); // entrada, salida, ajuste
    const [amount, setAmount] = useState('');
    const [cost, setCost] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const payload = {
                type,
                producto_id: product.id,
                observaciones: notes
            };

            if (type === 'ajuste') {
                payload.stock_nuevo = parseInt(amount);
                // Ajuste absoluto
            } else {
                payload.cantidad = parseInt(amount);
                if (type === 'entrada' && cost) {
                    payload.costo_unitario_usd = parseFloat(cost);
                }
            }

            await axios.post('/api/inventory/movement', payload, config);
            toast.success('Movimiento registrado');
            onSave(); // Refresh list
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Error registrando movimiento');
        }
    };

    if (!isOpen || !product) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                    <h3>Ajuste de Stock: {product.nombre}</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div>
                        <label style={{ fontSize: '0.8rem' }}>Tipo Movimiento</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                            <option value="entrada">Entrada (Compra)</option>
                            <option value="salida">Salida (Merma/Uso)</option>
                            <option value="ajuste">Ajuste (Inventario Físico)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.8rem' }}>{type === 'ajuste' ? 'Nuevo Stock Real' : 'Cantidad'}</label>
                        <input
                            required
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem' }}
                            placeholder={type === 'ajuste' ? 'Ej: 50' : 'Ej: 10'}
                        />
                        <small style={{ color: '#64748b' }}>Stock Actual: {product.stock_actual}</small>
                    </div>

                    {type === 'entrada' && (
                        <div>
                            <label style={{ fontSize: '0.8rem' }}>Costo Unitario USD (Opcional)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem' }}
                                placeholder="Si cambió el costo"
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ fontSize: '0.8rem' }}>Observaciones</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem' }}
                            rows={2}
                        ></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary">
                        <ArrowRightLeft size={16} style={{ marginRight: '0.5rem' }} /> Registrar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StockAdjustmentModal;
