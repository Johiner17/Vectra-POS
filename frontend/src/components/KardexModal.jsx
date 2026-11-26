import React, { useState, useEffect } from 'react';
import { X, History } from 'lucide-react';
import { format } from 'date-fns';
import { productRepository } from '../services/productRepository';

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
            const items = await productRepository.getKardex(product.id);
            setMovements(items);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !product) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1200,
                padding: '0.75rem'
            }}
        >
            <div
                className="card"
                onClick={e => e.stopPropagation()}
                style={{
                    width: 'min(700px, calc(100vw - 1.5rem))',
                    maxHeight: '88dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '1rem',
                    padding: 'clamp(1rem, 3vw, 1.5rem)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: 'clamp(1rem, 3vw, 1.15rem)', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Kardex: {product.nombre}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: '0.25rem', flexShrink: 0 }}
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                            <tr>
                                <th style={{ padding: '0.5rem', textAlign: 'left', whiteSpace: 'nowrap' }}>Fecha</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', whiteSpace: 'nowrap' }}>Tipo</th>
                                <th style={{ padding: '0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Cant</th>
                                <th style={{ padding: '0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Stock Pre</th>
                                <th style={{ padding: '0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Stock Post</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', whiteSpace: 'nowrap' }}>Obs</th>
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
