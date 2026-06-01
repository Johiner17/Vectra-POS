import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, Banknote, Check, Plus, Trash2, Layers } from 'lucide-react';

const PAYMENT_METHODS = [
    { id: 'efectivo_usd', label: 'Efectivo USD', moneda: 'USD', icon: DollarSign, color: '#16a34a' },
    { id: 'efectivo_bs', label: 'Efectivo Bs.', moneda: 'BS', icon: Banknote, color: '#ca8a04' },
    { id: 'punto_venta', label: 'Punto de Venta', moneda: 'BS', icon: CreditCard, color: '#2563eb' },
    { id: 'transferencia_usd', label: 'Transferencia USD', moneda: 'USD', icon: CreditCard, color: '#7c3aed' },
    { id: 'transferencia_bs', label: 'Pago movil', moneda: 'BS', icon: CreditCard, color: '#db2777' },
];

// Methods available inside "Mixto" (same list, reused for each partial payment)
const MIXTO_AVAILABLE_METHODS = PAYMENT_METHODS;

const CheckoutModal = ({ isOpen, onClose, cart, totalUsd, tasaBcv, onSuccess }) => {
    const [selectedMethod, setSelectedMethod] = useState('efectivo_usd');
    const [montoRecibido, setMontoRecibido] = useState('');
    const [referencia, setReferencia] = useState('');
    const [processing, setProcessing] = useState(false);
    const [vuelto, setVuelto] = useState(0);
    const [saleResult, setSaleResult] = useState(null);

    // ── Mixto state ──
    const [isMixto, setIsMixto] = useState(false);
    const [mixtoPayments, setMixtoPayments] = useState([
        { methodId: 'efectivo_usd', monto: '', referencia: '' },
        { methodId: 'efectivo_bs', monto: '', referencia: '' },
    ]);

    const totalBs = totalUsd * tasaBcv;

    useEffect(() => {
        if (!isOpen) {
            setSelectedMethod('efectivo_usd');
            setMontoRecibido('');
            setReferencia('');
            setVuelto(0);
            setSaleResult(null);
            setProcessing(false);
            setIsMixto(false);
            setMixtoPayments([
                { methodId: 'efectivo_usd', monto: '', referencia: '' },
                { methodId: 'efectivo_bs', monto: '', referencia: '' },
            ]);
        }
    }, [isOpen]);

    // ── Vuelto for single method ──
    useEffect(() => {
        if (isMixto) return;
        const monto = parseFloat(montoRecibido) || 0;
        const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);
        if (!method) return;
        if (method.moneda === 'USD') {
            setVuelto(Math.max(0, monto - totalUsd));
        } else {
            setVuelto(Math.max(0, monto - totalBs));
        }
    }, [montoRecibido, selectedMethod, totalUsd, totalBs, isMixto]);

    // ── Get effective payments (filling in the first blank row with the remaining balance if needed) ──
    const getEffectiveMixtoPayments = () => {
        let explicitPaidUsd = 0;
        mixtoPayments.forEach(p => {
            const m = MIXTO_AVAILABLE_METHODS.find(x => x.id === p.methodId);
            const val = parseFloat(p.monto) || 0;
            if (m && val > 0) {
                explicitPaidUsd += (m.moneda === 'BS' ? val / tasaBcv : val);
            }
        });

        const remainingUsd = Math.max(0, totalUsd - explicitPaidUsd);
        const hasExplicit = mixtoPayments.some(p => p.monto && parseFloat(p.monto) > 0);
        const firstBlankIdx = mixtoPayments.findIndex(p => !p.monto || parseFloat(p.monto) <= 0);

        return mixtoPayments.map((p, idx) => {
            if (idx === firstBlankIdx && remainingUsd > 0 && hasExplicit) {
                const m = MIXTO_AVAILABLE_METHODS.find(x => x.id === p.methodId);
                if (m) {
                    const autoMonto = m.moneda === 'BS' ? remainingUsd * tasaBcv : remainingUsd;
                    return { ...p, monto: autoMonto.toFixed(2) };
                }
            }
            return p;
        });
    };

    // ── Mixto helpers ──
    const getMixtoTotalPaidUsd = (paymentsList = mixtoPayments) => {
        return paymentsList.reduce((acc, p) => {
            const m = MIXTO_AVAILABLE_METHODS.find(x => x.id === p.methodId);
            const val = parseFloat(p.monto) || 0;
            if (!m || val <= 0) return acc;
            return acc + (m.moneda === 'BS' ? val / tasaBcv : val);
        }, 0);
    };

    const effectivePayments = getEffectiveMixtoPayments();
    const mixtoTotalPaidUsd = getMixtoTotalPaidUsd(effectivePayments);
    const mixtoRestanteUsd = Math.max(0, totalUsd - getMixtoTotalPaidUsd(mixtoPayments));
    const mixtoCubierto = mixtoTotalPaidUsd >= totalUsd - 0.001;

    const addMixtoPayment = () => {
        // Pick first method not already used
        const used = mixtoPayments.map(p => p.methodId);
        const available = MIXTO_AVAILABLE_METHODS.find(m => !used.includes(m.id));
        setMixtoPayments(prev => [...prev, {
            methodId: available ? available.id : MIXTO_AVAILABLE_METHODS[0].id,
            monto: '',
            referencia: ''
        }]);
    };

    const removeMixtoPayment = (index) => {
        if (mixtoPayments.length <= 2) return;
        setMixtoPayments(prev => prev.filter((_, i) => i !== index));
    };

    const updateMixtoPayment = (index, field, value) => {
        setMixtoPayments(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    };

    // ── Single-method validation ──
    const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);
    const montoIngresado = parseFloat(montoRecibido);
    const totalRequerido = method?.moneda === 'BS' ? totalBs : totalUsd;
    const campoVacio = montoRecibido === '' || montoRecibido === null;
    const tieneMonto = !campoVacio && !isNaN(montoIngresado);
    const esPagoInsuficiente = tieneMonto && montoIngresado < totalRequerido;
    const faltante = tieneMonto ? Math.max(0, totalRequerido - montoIngresado) : 0;

    // ── Confirm payment ──
    const handleConfirmarPago = async () => {
        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            let pagos = [];

            if (isMixto) {
                // Build pagos array from effectivePayments (which has blank fields auto-filled)
                const effPayments = getEffectiveMixtoPayments();
                for (const p of effPayments) {
                    const val = parseFloat(p.monto) || 0;
                    if (val <= 0) continue;
                    const m = MIXTO_AVAILABLE_METHODS.find(x => x.id === p.methodId);
                    pagos.push({
                        tipo_pago: p.methodId,
                        moneda: m.moneda,
                        monto_centavos: Math.round(val * 100),
                        referencia: p.referencia || null
                    });
                }
            } else {
                if (!method) return;
                const totalReq = method.moneda === 'BS' ? totalBs : totalUsd;
                const montoVal = campoVacio ? totalReq : parseFloat(montoRecibido);
                if (isNaN(montoVal) || montoVal < totalReq) return;
                pagos = [{
                    tipo_pago: selectedMethod,
                    moneda: method.moneda,
                    monto_centavos: Math.round(montoVal * 100),
                    referencia: referencia || null
                }];
            }

            const payload = {
                items: cart.map(item => ({
                    producto_id: item.id,
                    cantidad: item.quantity
                })),
                moneda_venta: isMixto ? 'USD' : method.moneda,
                pagos
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
            if (!res.ok) throw new Error(data.error || 'Error procesando venta');

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

    // ── Post-sale confirmation screen ──
    if (saleResult) {
        return (
            <div style={overlayStyle}>
                <div style={{ ...modalWrapperStyle, maxWidth: '400px' }}>
                    <div style={{ ...modalStyle, textAlign: 'center', maxHeight: 'none', overflowY: 'visible' }}>
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
                            {!isMixto && parseFloat(montoRecibido) > 0 && vuelto > 0 && (
                                <div style={{ ...rowStyle, color: '#16a34a', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                                    <span>Monto recibido ({isBs ? 'Bs.' : 'USD'}):</span>
                                    <strong>{isBs ? 'Bs.' : '$'} {vuelto.toFixed(2)}</strong>
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
                            Nueva Venta
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Helper: get remaining in a specific currency for a mixto row ──
    const getMixtoRemainingForRow = (index) => {
        const currentMethod = MIXTO_AVAILABLE_METHODS.find(x => x.id === mixtoPayments[index].methodId);
        if (!currentMethod) return 0;
        // Calculate how much other rows have contributed (in USD)
        let otherPaidUsd = 0;
        mixtoPayments.forEach((p, i) => {
            if (i === index) return;
            const m = MIXTO_AVAILABLE_METHODS.find(x => x.id === p.methodId);
            const val = parseFloat(p.monto) || 0;
            if (!m || val <= 0) return;
            otherPaidUsd += (m.moneda === 'BS' ? val / tasaBcv : val);
        });
        const remainingUsd = Math.max(0, totalUsd - otherPaidUsd);
        return currentMethod.moneda === 'BS' ? remainingUsd * tasaBcv : remainingUsd;
    };

    // ── Determine if confirm button should be disabled ──
    const isConfirmDisabled = isMixto
        ? (processing || !mixtoCubierto)
        : (processing || esPagoInsuficiente);

    const confirmBtnBg = processing ? '#94a3b8'
        : isConfirmDisabled ? '#e2e8f0'
            : '#16a34a';

    const confirmBtnColor = isConfirmDisabled && !processing ? '#94a3b8' : 'white';

    return (
        <div style={overlayStyle}>
            <style>{scrollbarStyles}</style>
            <div style={{ ...modalWrapperStyle, maxWidth: '480px' }}>
                <div className="custom-scrollbar" style={modalStyle}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Cobrar</h3>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            <X size={22} color="#64748b" />
                        </button>
                    </div>

                    {/* Total summary */}
                    <div style={{ backgroundColor: '#1e293b', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total a Cobrar</p>
                        <p style={{ color: 'white', fontSize: '2rem', fontWeight: 700 }}>$ {totalUsd.toFixed(2)}</p>
                        <p style={{ color: '#94a3b8', fontSize: '1.25rem' }}>Bs. {totalBs.toFixed(2)}</p>
                    </div>

                    {/* Payment method selector */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Método de Pago</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {PAYMENT_METHODS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => { setSelectedMethod(m.id); setIsMixto(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer',
                                        border: `2px solid ${!isMixto && selectedMethod === m.id ? m.color : '#e2e8f0'}`,
                                        backgroundColor: !isMixto && selectedMethod === m.id ? `${m.color}15` : 'white',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <m.icon size={16} color={m.color} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: !isMixto && selectedMethod === m.id ? m.color : '#374151' }}>
                                        {m.label}
                                    </span>
                                </button>
                            ))}
                            {/* Mixto button */}
                            <button
                                onClick={() => setIsMixto(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer',
                                    border: `2px solid ${isMixto ? '#f59e0b' : '#e2e8f0'}`,
                                    backgroundColor: isMixto ? '#fffbeb' : 'white',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <Layers size={16} color="#f59e0b" />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isMixto ? '#f59e0b' : '#374151' }}>
                                    Pago Mixto
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* ════════ SINGLE METHOD UI ════════ */}
                    {!isMixto && (
                        <>
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
                                        borderRadius: '0.5rem', fontSize: '1.125rem', textAlign: 'right',
                                        outline: 'none', transition: 'border-color 0.15s',
                                        backgroundColor: esPagoInsuficiente ? '#fff5f5' : 'white'
                                    }}
                                    autoFocus
                                />
                                {esPagoInsuficiente && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                                        <span style={{ fontSize: '1rem' }}>⚠️</span>
                                        <p style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                                            Monto insuficiente — faltan <strong>{isBs ? 'Bs.' : '$'} {faltante.toFixed(2)}</strong>
                                        </p>
                                    </div>
                                )}
                                {vuelto > 0 && !esPagoInsuficiente && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                                        <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '1.125rem', margin: 0 }}>
                                            Vuelto: <strong>{isBs ? 'Bs.' : '$'} {vuelto.toFixed(2)}</strong>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Referencia (optional for transfers) */}
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
                        </>
                    )}

                    {/* ════════ MIXTO UI ════════ */}
                    {isMixto && (
                        <div style={{ marginBottom: '1rem' }}>
                            {/* Remaining balance banner */}
                            <div style={{
                                padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem',
                                backgroundColor: mixtoCubierto ? '#f0fdf4' : '#fffbeb',
                                border: `1px solid ${mixtoCubierto ? '#bbf7d0' : '#fde68a'}`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: mixtoCubierto ? '#16a34a' : '#92400e' }}>
                                    {mixtoCubierto ? '✅ Total cubierto' : 'Restante por cubrir:'}
                                </span>
                                {!mixtoCubierto && (
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#92400e' }}>
                                            $ {mixtoRestanteUsd.toFixed(2)}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#b45309', marginLeft: '0.5rem' }}>
                                            / Bs. {(mixtoRestanteUsd * tasaBcv).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Payment rows */}
                            <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                {mixtoPayments.map((payment, idx) => {
                                    const pm = MIXTO_AVAILABLE_METHODS.find(x => x.id === payment.methodId);
                                    const remaining = getMixtoRemainingForRow(idx);
                                    return (
                                        <div key={idx} style={{
                                            padding: '0.875rem', borderRadius: '0.75rem',
                                            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                                            position: 'relative'
                                        }}>
                                            {/* Remove button */}
                                            {mixtoPayments.length > 2 && (
                                                <button
                                                    onClick={() => removeMixtoPayment(idx)}
                                                    style={{
                                                        position: 'absolute', top: '0.5rem', right: '0.5rem',
                                                        background: 'none', border: 'none', cursor: 'pointer', padding: '2px'
                                                    }}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={14} color="#ef4444" />
                                                </button>
                                            )}

                                            {/* Method selector */}
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>
                                                Método {idx + 1}
                                            </label>
                                            <select
                                                value={payment.methodId}
                                                onChange={e => updateMixtoPayment(idx, 'methodId', e.target.value)}
                                                style={{
                                                    width: '100%', padding: '0.5rem', borderRadius: '0.375rem',
                                                    border: '1px solid #d1d5db', fontSize: '0.85rem',
                                                    marginBottom: '0.5rem', backgroundColor: 'white', outline: 'none'
                                                }}
                                            >
                                                {MIXTO_AVAILABLE_METHODS.map(m => (
                                                    <option key={m.id} value={m.id}>{m.label} ({m.moneda})</option>
                                                ))}
                                            </select>

                                            {/* Amount input */}
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={payment.monto}
                                                    onChange={e => updateMixtoPayment(idx, 'monto', e.target.value)}
                                                    placeholder={remaining > 0 ? remaining.toFixed(2) : '0.00'}
                                                    style={{
                                                        flex: 1, padding: '0.5rem', borderRadius: '0.375rem',
                                                        border: '1px solid #d1d5db', fontSize: '0.95rem',
                                                        textAlign: 'right', outline: 'none', backgroundColor: 'white'
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', minWidth: '32px' }}>
                                                    {pm?.moneda === 'BS' ? 'Bs.' : 'USD'}
                                                </span>
                                            </div>

                                            {/* Remaining hint */}
                                            {remaining > 0 && !payment.monto && (
                                                <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem', textAlign: 'right' }}>
                                                    Sugerido: {pm?.moneda === 'BS' ? 'Bs.' : '$'} {remaining.toFixed(2)}
                                                </p>
                                            )}

                                            {/* Reference for transfers */}
                                            {payment.methodId.includes('transferencia') && (
                                                <input
                                                    type="text"
                                                    value={payment.referencia}
                                                    onChange={e => updateMixtoPayment(idx, 'referencia', e.target.value)}
                                                    placeholder="Referencia (opcional)"
                                                    style={{
                                                        width: '100%', padding: '0.4rem', borderRadius: '0.375rem',
                                                        border: '1px solid #d1d5db', fontSize: '0.8rem',
                                                        marginTop: '0.5rem', outline: 'none'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add payment button */}
                            {mixtoPayments.length < 5 && (
                                <button
                                    onClick={addMixtoPayment}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                                        width: '100%', padding: '0.6rem', marginTop: '0.75rem',
                                        border: '2px dashed #d1d5db', borderRadius: '0.5rem',
                                        backgroundColor: 'transparent', cursor: 'pointer',
                                        fontSize: '0.82rem', fontWeight: 500, color: '#64748b',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.color = '#f59e0b'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#64748b'; }}
                                >
                                    <Plus size={14} /> Agregar otro método
                                </button>
                            )}
                        </div>
                    )}

                    {/* Confirm button */}
                    <button
                        onClick={handleConfirmarPago}
                        disabled={isConfirmDisabled}
                        style={{
                            width: '100%', padding: '1rem',
                            backgroundColor: confirmBtnBg,
                            color: confirmBtnColor,
                            border: 'none', borderRadius: '0.75rem',
                            fontSize: '1.1rem', fontWeight: 700,
                            cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'all 0.15s'
                        }}
                    >
                        <Check size={20} />
                        {processing
                            ? 'Procesando...'
                            : isMixto
                                ? (mixtoCubierto ? 'Confirmar Pago Mixto' : `Faltan $ ${mixtoRestanteUsd.toFixed(2)}`)
                                : esPagoInsuficiente
                                    ? `Faltan ${isBs ? 'Bs.' : '$'} ${faltante.toFixed(2)}`
                                    : 'Confirmar Pago'
                        }
                    </button>
                </div>
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

const modalWrapperStyle = {
    backgroundColor: 'white',
    borderRadius: '1rem',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    width: '100%'
};

const modalStyle = {
    padding: '2rem',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
};

const rowStyle = {
    display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem'
};

const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }
`;

export default CheckoutModal;
