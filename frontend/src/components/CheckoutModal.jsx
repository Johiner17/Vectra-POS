import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, Banknote, Check, Printer } from 'lucide-react';

const PAYMENT_METHODS = [
    { id: 'efectivo_usd', label: 'Efectivo USD', moneda: 'USD', icon: DollarSign, color: '#16a34a' },
    { id: 'efectivo_bs', label: 'Efectivo Bs.', moneda: 'BS', icon: Banknote, color: '#ca8a04' },
    { id: 'punto_venta', label: 'Punto de Venta', moneda: 'BS', icon: CreditCard, color: '#2563eb' },
    { id: 'transferencia_usd', label: 'Transferencia USD', moneda: 'USD', icon: CreditCard, color: '#7c3aed' },
    { id: 'transferencia_bs', label: 'Transferencia Bs.', moneda: 'BS', icon: CreditCard, color: '#db2777' },
];

const CheckoutModal = ({ isOpen, onClose, cart, totalUsd, tasaBcv, onSuccess }) => {
    const [selectedMethod, setSelectedMethod] = useState('efectivo_usd');
    const [montoRecibido, setMontoRecibido] = useState('');
    const [referencia, setReferencia] = useState('');
    const [processing, setProcessing] = useState(false);
    const [vuelto, setVuelto] = useState(0);
    const [saleResult, setSaleResult] = useState(null);

    const totalBs = totalUsd * tasaBcv;

    useEffect(() => {
        if (!isOpen) {
            // Reset al cerrar
            setSelectedMethod('efectivo_usd');
            setMontoRecibido('');
            setReferencia('');
            setVuelto(0);
            setSaleResult(null);
            setProcessing(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const monto = parseFloat(montoRecibido) || 0;
        const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);
        if (!method) return;

        if (method.moneda === 'USD') {
            setVuelto(Math.max(0, monto - totalUsd));
        } else {
            setVuelto(Math.max(0, monto - totalBs));
        }
    }, [montoRecibido, selectedMethod, totalUsd, totalBs]);

    // Declaración compartida del método seleccionado
    const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);

    // Validación: si el campo está vacío se usa el monto exacto.
    // El botón solo se bloquea si se escribe un valor menor al total requerido.
    const montoIngresado = parseFloat(montoRecibido);
    const totalRequerido = method?.moneda === 'BS' ? totalBs : totalUsd;
    const campoVacio = montoRecibido === '' || montoRecibido === null;
    const tieneMonto = !campoVacio && !isNaN(montoIngresado);
    const esPagoInsuficiente = tieneMonto && montoIngresado < totalRequerido;
    const faltante = tieneMonto ? Math.max(0, totalRequerido - montoIngresado) : 0;

    const handleConfirmarPago = async () => {
        if (!method) return;

        // Si el campo está vacío se cobra el monto exacto; si tiene valor debe cubrir el total
        const totalReq = method.moneda === 'BS' ? totalBs : totalUsd;
        const montoVal = campoVacio ? totalReq : parseFloat(montoRecibido);
        if (isNaN(montoVal) || montoVal < totalReq) return;

        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const monto = montoVal;

            const payload = {
                items: cart.map(item => ({
                    producto_id: item.id,
                    cantidad: item.quantity
                })),
                moneda_venta: method.moneda,
                pagos: [{
                    tipo_pago: selectedMethod,
                    moneda: method.moneda,
                    monto_centavos: Math.round(monto * 100),
                    referencia: referencia || null
                }]
            };

            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error procesando venta');
            }

            setSaleResult(data.data);
            onSuccess(data.data);
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error al procesar el pago');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    const isBs = method?.moneda === 'BS';

    // Pantalla de confirmación post-venta
    if (saleResult) {
        return (
            <div style={overlayStyle}>
                <div style={{ ...modalStyle, maxWidth: '400px', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <Check size={32} color="#16a34a" />
                    </div>
                    <h2 style={{ color: '#16a34a', marginBottom: '0.5rem' }}>¡Venta Completada!</h2>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                        Factura #{saleResult.numero_factura}
                    </p>
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                        <div style={rowStyle}>
                            <span>Total USD:</span>
                            <strong>${(saleResult.total_usd_centavos / 100).toFixed(2)}</strong>
                        </div>
                        <div style={rowStyle}>
                            <span>Total Bs.:</span>
                            <strong>Bs. {(saleResult.total_bs_centavos / 100).toFixed(2)}</strong>
                        </div>
                        {parseFloat(montoRecibido) > 0 && vuelto > 0 && (
                            <div style={{ ...rowStyle, color: '#16a34a', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                                <span>Vuelto ({isBs ? 'Bs.' : 'USD'}):</span>
                                <strong>{isBs ? 'Bs.' : '$'} {vuelto.toFixed(2)}</strong>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                    >
                        Nueva Venta
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Cobrar</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={22} color="#64748b" />
                    </button>
                </div>

                {/* Resumen del total */}
                <div style={{ backgroundColor: '#1e293b', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total a Cobrar</p>
                    <p style={{ color: 'white', fontSize: '2rem', fontWeight: 700 }}>$ {totalUsd.toFixed(2)}</p>
                    <p style={{ color: '#94a3b8', fontSize: '1.25rem' }}>
                        Bs. {totalBs.toFixed(2)} <span style={{ opacity: 0.7 }}></span>
                    </p>
                </div>

                {/* Método de pago */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Método de Pago</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {PAYMENT_METHODS.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedMethod(m.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer',
                                    border: `2px solid ${selectedMethod === m.id ? m.color : '#e2e8f0'}`,
                                    backgroundColor: selectedMethod === m.id ? `${m.color}15` : 'white',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <m.icon size={16} color={m.color} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: selectedMethod === m.id ? m.color : '#374151' }}>
                                    {m.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Monto recibido */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                        Monto Recibido ({isBs ? 'Bs.' : 'USD'})
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={montoRecibido}
                        onChange={e => setMontoRecibido(e.target.value)}
                        placeholder={isBs ? totalBs.toFixed(2) : totalUsd.toFixed(2)}
                        style={{
                            width: '100%', padding: '0.75rem',
                            border: `2px solid ${esPagoInsuficiente ? '#ef4444' : vuelto > 0 ? '#16a34a' : '#e2e8f0'}`,
                            borderRadius: '0.5rem',
                            fontSize: '1.125rem', textAlign: 'right',
                            outline: 'none',
                            transition: 'border-color 0.15s',
                            backgroundColor: esPagoInsuficiente ? '#fff5f5' : 'white'
                        }}
                        autoFocus
                    />
                    {/* Mensaje de monto insuficiente */}
                    {esPagoInsuficiente && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            marginTop: '0.5rem', padding: '0.5rem 0.75rem',
                            backgroundColor: '#fef2f2', borderRadius: '0.5rem',
                            border: '1px solid #fecaca'
                        }}>
                            <span style={{ fontSize: '1rem' }}>⚠️</span>
                            <p style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                                Monto insuficiente — faltan{' '}
                                <strong>{isBs ? 'Bs.' : '$'} {faltante.toFixed(2)}</strong>
                            </p>
                        </div>
                    )}
                    {/* Vuelto */}
                    {vuelto > 0 && !esPagoInsuficiente && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            marginTop: '0.5rem', padding: '0.5rem 0.75rem',
                            backgroundColor: '#f0fdf4', borderRadius: '0.5rem',
                            border: '1px solid #bbf7d0'
                        }}>
                            <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '1.125rem', margin: 0 }}>
                                Vuelto: <strong>{isBs ? 'Bs.' : '$'} {vuelto.toFixed(2)}</strong>
                            </p>
                        </div>
                    )}
                </div>

                {/* Referencia (opcional para transferencias) */}
                {selectedMethod.includes('transferencia') && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                            Referencia (Opcional)
                        </label>
                        <input
                            type="text"
                            value={referencia}
                            onChange={e => setReferencia(e.target.value)}
                            placeholder="Nro. de referencia"
                            style={{ width: '100%', padding: '0.75rem', border: '2px solid #e2e8f0', borderRadius: '0.5rem' }}
                        />
                    </div>
                )}

                {/* Botón Cobrar */}
                <button
                    onClick={handleConfirmarPago}
                    disabled={processing || esPagoInsuficiente}
                    style={{
                        width: '100%', padding: '1rem',
                        backgroundColor: processing
                            ? '#94a3b8'
                            : esPagoInsuficiente
                                ? '#e2e8f0'
                                : '#16a34a',
                        color: esPagoInsuficiente && !processing ? '#94a3b8' : 'white',
                        border: 'none', borderRadius: '0.75rem',
                        fontSize: '1.1rem', fontWeight: 700,
                        cursor: (processing || esPagoInsuficiente) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        transition: 'all 0.15s'
                    }}
                >
                    <Check size={20} />
                    {processing
                        ? 'Procesando...'
                        : esPagoInsuficiente
                            ? `Faltan ${isBs ? 'Bs.' : '$'} ${faltante.toFixed(2)}`
                            : 'Confirmar Pago'
                    }
                </button>
            </div>
        </div>
    );
};

const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(2px)'
};

const modalStyle = {
    backgroundColor: 'white', borderRadius: '1rem',
    padding: '2rem', width: '100%', maxWidth: '480px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
};

const rowStyle = {
    display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem'
};

export default CheckoutModal;
