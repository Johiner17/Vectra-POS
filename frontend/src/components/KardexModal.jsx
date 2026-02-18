import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, History } from 'lucide-react';
import { format } from 'date-fns';

const KardexModal = ({ isOpen, onClose, product }) => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && product) {
            fetchKardex();
        }
    }, [isOpen, product]);

    const fetchKardex = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/inventory/kardex/${product.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMovements(res.data.data.movimientos || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !product) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                    <h3>Kardex: {product.nombre}</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                            <tr>
                                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fecha</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Tipo</th>
                                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cant</th>
                                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Stock Pre</th>
                                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Stock Post</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Obs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1rem' }}>Cargando...</td></tr>
                            ) : movements.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1rem' }}>Sin movimientos</td></tr>
                            ) : (
                                movements.map(mov => (
                                    <tr key={mov.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '0.5rem' }}>{format(new Date(mov.fecha_movimiento), 'dd/MM/yyyy HH:mm')}</td>
                                        <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>
                                            <span style={{
                                                padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                                                backgroundColor: mov.tipo_movimiento === 'entrada' ? '#dcfce7' : mov.tipo_movimiento === 'salida' ? '#fee2e2' : '#f1f5f9',
                                                color: mov.tipo_movimiento === 'entrada' ? '#166534' : mov.tipo_movimiento === 'salida' ? '#991b1b' : '#475569'
                                            }}>
                                                {mov.tipo_movimiento}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{mov.stock_anterior}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{mov.stock_nuevo}</td>
                                        <td style={{ padding: '0.5rem', color: '#64748b' }}>{mov.observaciones}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default KardexModal;
