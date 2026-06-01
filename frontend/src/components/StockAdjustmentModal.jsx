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

    const inputStyle = {
        width: '100%', padding: '0.55rem 0.75rem',
        border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
        fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'block', fontSize: '0.85rem', fontWeight: 700,
        color: '#475569', marginBottom: '0.25rem'
    };

    const handleFocus = (e) => { e.currentTarget.style.borderColor = '#2563eb'; };
    const handleBlur = (e) => { e.currentTarget.style.borderColor = '#e2e8f0'; };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeInModal 0.2s ease-out'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '1.25rem',
                width: '460px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            Ajuste de Stock
                        </h3>
                        <span style={{ fontSize: '1.2rem', color: '#64748b', marginTop: '0.15rem', display: 'block' }}>
                            {product.nombre}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0.25rem', borderRadius: '50%', transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    <div>
                        <label style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                            Tipo Movimiento</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            style={{ ...inputStyle, backgroundColor: 'white' }}
                        >
                            <option value="entrada">Entrada (Compra)</option>
                            <option value="salida">Salida (Merma/Uso)</option>
                            <option value="ajuste">Ajuste (Inventario Físico)</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: type === 'entrada' ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                        <div>
                            <label style={{...labelStyle, fontSize: '1rem'}}>{type === 'ajuste' ? 'Nuevo Stock Real' : 'Cantidad'}</label>
                            <input
                                required
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={inputStyle}
                                placeholder={type === 'ajuste' ? 'Ej: 50' : 'Ej: 10'}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                            />
                            <small style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '0.25rem', display: 'block' }}>
                                Stock Actual: <strong style={{ color: '#0f172a' }}>{product.stock_actual}</strong>
                            </small>
                        </div>

                        {type === 'entrada' && (
                            <div>
                                <label style={{...labelStyle, fontSize: '1rem'}}>Costo Unit. USD</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={cost}
                                    onChange={(e) => setCost(e.target.value)}
                                    style={inputStyle}
                                    placeholder="Opcional"
                                    onFocus={handleFocus}
                                    onBlur={handleBlur}
                                />
                                <small style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '0.25rem', display: 'block' }}>
                                    Si cambió el costo
                                </small>
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={{...labelStyle, fontSize: '1rem'}}>Observaciones</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={{ ...inputStyle, resize: 'vertical' }}
                            rows={2}
                            placeholder="Motivo del ajuste..."
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        ></textarea>
                    </div>

                    {/* Botones de Acción */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '0.75rem',
                                backgroundColor: '#f1f5f9', color: '#475569',
                                border: 'none', borderRadius: '0.75rem',
                                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                                transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            style={{
                                flex: 1, padding: '0.75rem',
                                backgroundColor: '#2563eb', color: 'white',
                                border: 'none', borderRadius: '0.75rem',
                                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                        >
                            <ArrowRightLeft size={18} />
                            Registrar
                        </button>
                    </div>
                </form>
            </div>

            {/* Animaciones CSS inline */}
            <style>{`
                @keyframes fadeInModal {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUpModal {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default StockAdjustmentModal;
