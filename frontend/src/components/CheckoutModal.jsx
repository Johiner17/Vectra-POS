import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, Banknote, Check, Plus, Trash2, Layers, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { saleRepository } from '../services/saleRepository';
import { formatBs } from '../utils/formatters';

const PAYMENT_METHODS = [
    { id: 'punto_venta', label: 'Punto de Venta', moneda: 'BS', icon: CreditCard, color: '#2563eb' },
    { id: 'transferencia_bs', label: 'Pago Móvil', moneda: 'BS', icon: CreditCard, color: '#db2777' },
    { id: 'efectivo_bs', label: 'Efectivo Bs.', moneda: 'BS', icon: Banknote, color: '#ca8a04' },
    { id: 'efectivo_usd', label: 'Efectivo USD', moneda: 'USD', icon: DollarSign, color: '#16a34a' },
    { id: 'transferencia_usd', label: 'Binance USDT', moneda: 'USD', icon: CreditCard, color: '#7c3aed' },
];

// Methods available inside "Mixto" (same list, reused for each partial payment)
const MIXTO_AVAILABLE_METHODS = PAYMENT_METHODS;

const CheckoutModal = ({ isOpen, onClose, cart, totalUsd, tasaBcv, onSuccess }) => {
    const [selectedMethod, setSelectedMethod] = useState('punto_venta');
    const [montoRecibido, setMontoRecibido] = useState('');
    const [referencia, setReferencia] = useState('');
    const [processing, setProcessing] = useState(false);
    const [vuelto, setVuelto] = useState(0);
    const [saleResult, setSaleResult] = useState(null);

    // ── Mixto state ──
    const [isMixto, setIsMixto] = useState(false);
    const [mixtoPayments, setMixtoPayments] = useState([
        { methodId: 'punto_venta', monto: '', referencia: '' },
        { methodId: 'transferencia_bs', monto: '', referencia: '' },
    ]);

    const totalBs = totalUsd * tasaBcv;

    useEffect(() => {
        if (!isOpen) {
            setSelectedMethod('punto_venta');
            setMontoRecibido('');
            setReferencia('');
            setVuelto(0);
            setSaleResult(null);
            setProcessing(false);
            setIsMixto(false);
            setMixtoPayments([
                { methodId: 'punto_venta', monto: '', referencia: '' },
                { methodId: 'transferencia_bs', monto: '', referencia: '' },
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

            const saleData = await saleRepository.processSale({
                items: cart.map(item => ({
                    producto_id: item.id,
                    cantidad: item.quantity
                })),
                moneda_venta: isMixto ? 'USD' : method.moneda,
                pagos,
                tasa_bcv_usada: tasaBcv
            });

            setSaleResult(saleData);
            onSuccess(saleData);
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Error al procesar el pago');
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
                <div style={{ ...modalWrapperStyle, maxWidth: 'min(420px, calc(100vw - 1.5rem))', borderRadius: '1.25rem' }}>
                    <div style={{ ...modalStyle, textAlign: 'center', maxHeight: 'none', overflowY: 'visible', padding: 'clamp(1.5rem, 4vw, 2.25rem)' }}>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.125rem',
                            boxShadow: '0 8px 20px rgba(22, 163, 74, 0.2)'
                        }}>
                            <Check size={36} color="#16a34a" strokeWidth={2.75} />
                        </div>
                        <h2 style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                            ¡Venta Completada!
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 500 }}>
                            Factura #{saleResult.numero_factura}
                        </p>

                        <div style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.875rem',
                            padding: '1.125rem 1.25rem',
                            marginBottom: '1.5rem',
                            textAlign: 'left'
                        }}>
                            <div style={{ ...rowStyle, fontSize: '1rem', color: '#334155' }}>
                                <span>Total USD:</span>
                                <strong style={{ color: '#2563eb', fontSize: '1.125rem' }}>
                                    ${(saleResult.total_usd_centavos / 100).toFixed(2)}
                                </strong>
                            </div>
                            <div style={{ ...rowStyle, fontSize: '1rem', color: '#334155', marginBottom: (!isMixto && parseFloat(montoRecibido) > 0 && vuelto > 0) ? '0.5rem' : 0 }}>
                                <span>Total Bs.:</span>
                                <strong style={{ color: '#16a34a', fontSize: '1.125rem' }}>
                                    Bs. {formatBs(saleResult.total_bs_centavos / 100)}
                                </strong>
                            </div>
                            {!isMixto && parseFloat(montoRecibido) > 0 && vuelto > 0 && (
                                <div style={{ ...rowStyle, color: '#16a34a', marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid #e2e8f0', marginBottom: 0 }}>
                                    <span>Vuelto ({isBs ? 'Bs.' : 'USD'}):</span>
                                    <strong>{isBs ? `Bs. ${formatBs(vuelto)}` : `$ ${vuelto.toFixed(2)}`}</strong>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            style={{
                                width: '100%',
                                padding: '1.125rem 1.5rem',
                                borderRadius: '0.875rem',
                                border: 'none',
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                color: 'white',
                                fontSize: '1.05rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.3)',
                                transition: 'transform 0.1s'
                            }}
                        >
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
            <div style={{ ...modalWrapperStyle, maxWidth: 'min(480px, calc(100vw - 1.5rem))' }}>
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
                        <p style={{ color: '#94a3b8', fontSize: '1.25rem' }}>Bs. {formatBs(totalBs)}</p>
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
                                />
                                {esPagoInsuficiente && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                                        <span style={{ fontSize: '1rem' }}>⚠️</span>
                                        <p style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                                            Monto insuficiente — faltan <strong>{isBs ? `Bs. ${formatBs(faltante)}` : `$ ${faltante.toFixed(2)}`}</strong>
                                        </p>
                                    </div>
                                )}
                                {vuelto > 0 && !esPagoInsuficiente && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                                        <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '1.125rem', margin: 0 }}>
                                            Vuelto: <strong>{isBs ? `Bs. ${formatBs(vuelto)}` : `$ ${vuelto.toFixed(2)}`}</strong>
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
                    {isMixto && (() => {
                        const explicitPaidUsd = getMixtoTotalPaidUsd(mixtoPayments);
                        const firstBlankIdx = mixtoPayments.findIndex(p => !p.monto || parseFloat(p.monto) <= 0);
                        const hasExplicit = mixtoPayments.some(p => p.monto && parseFloat(p.monto) > 0);
                        const coveragePct = totalUsd > 0 ? Math.min(100, Math.round((mixtoTotalPaidUsd / totalUsd) * 100)) : 0;
                        const excedenteUsd = Math.max(0, mixtoTotalPaidUsd - totalUsd);
                        const segColors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

                        return (
                            <div style={{ marginBottom: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {/* Tarjeta de Cobertura de la Cuenta */}
                                <div style={{
                                    padding: '0.85rem 1rem',
                                    borderRadius: '0.85rem',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: mixtoCubierto ? '#10b981' : '#f59e0b' }} />
                                            Cobertura de la cuenta
                                        </span>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: mixtoCubierto ? '#059669' : '#d97706' }}>
                                            {coveragePct}% Cubierto
                                        </span>
                                    </div>

                                    {/* Barra segmentada */}
                                    <div style={{
                                        height: '10px',
                                        borderRadius: '999px',
                                        backgroundColor: '#e2e8f0',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        marginBottom: '0.55rem'
                                    }}>
                                        {effectivePayments.map((ep, idx) => {
                                            const m = MIXTO_AVAILABLE_METHODS.find(x => x.id === ep.methodId);
                                            const val = parseFloat(ep.monto) || 0;
                                            const usdVal = m && val > 0 ? (m.moneda === 'BS' ? val / tasaBcv : val) : 0;
                                            const pct = totalUsd > 0 ? Math.min(100, (usdVal / totalUsd) * 100) : 0;
                                            if (pct <= 0) return null;
                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        width: `${pct}%`,
                                                        backgroundColor: segColors[idx % segColors.length],
                                                        transition: 'width 0.2s ease'
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Leyenda de métodos */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                                        {effectivePayments.map((ep, idx) => {
                                            const m = MIXTO_AVAILABLE_METHODS.find(x => x.id === ep.methodId);
                                            const val = parseFloat(ep.monto) || 0;
                                            const formatted = m?.moneda === 'BS' ? `Bs. ${formatBs(val)}` : `$ ${val.toFixed(2)}`;
                                            return (
                                                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: segColors[idx % segColors.length] }} />
                                                    Método {idx + 1}: <strong style={{ color: '#0f172a' }}>{formatted}</strong>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Tarjetas de Pago */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {mixtoPayments.map((payment, idx) => {
                                        const pm = MIXTO_AVAILABLE_METHODS.find(x => x.id === payment.methodId);
                                        const isBsMethod = pm?.moneda === 'BS';
                                        const explicitVal = parseFloat(payment.monto) || 0;
                                        const isAutoFilled = idx === firstBlankIdx && mixtoRestanteUsd > 0 && hasExplicit;
                                        const effectiveVal = parseFloat(effectivePayments[idx]?.monto) || 0;
                                        const remaining = getMixtoRemainingForRow(idx);
                                        const eqOtherCurrency = isBsMethod
                                            ? `$ ${(effectiveVal / tasaBcv).toFixed(2)} USD`
                                            : `Bs. ${formatBs(effectiveVal * tasaBcv)}`;

                                        const badgeColor = isAutoFilled ? '#10b981' : segColors[idx % segColors.length];
                                        const cardTitle = idx === 0
                                            ? 'Primer Pago'
                                            : idx === 1
                                                ? (isAutoFilled ? 'Segundo Pago (Saldo Restante)' : 'Segundo Pago')
                                                : `Pago ${idx + 1}`;

                                        const applyQuickPct = (pct) => {
                                            const targetUsd = totalUsd * pct;
                                            const val = isBsMethod ? targetUsd * tasaBcv : targetUsd;
                                            updateMixtoPayment(idx, 'monto', val.toFixed(2));
                                        };

                                        return (
                                            <React.Fragment key={idx}>
                                                <div style={{
                                                    padding: '0.95rem',
                                                    borderRadius: '0.9rem',
                                                    backgroundColor: 'white',
                                                    border: isAutoFilled ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
                                                    boxShadow: isAutoFilled ? '0 4px 14px rgba(16, 185, 129, 0.08)' : '0 1px 3px rgba(15, 23, 42, 0.03)',
                                                    position: 'relative'
                                                }}>
                                                    {/* Encabezado de tarjeta */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                                            <span style={{
                                                                width: '22px', height: '22px', borderRadius: '50%',
                                                                backgroundColor: isAutoFilled ? '#10b981' : `${badgeColor}18`,
                                                                color: isAutoFilled ? 'white' : badgeColor,
                                                                fontSize: '0.75rem', fontWeight: 800,
                                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}>
                                                                {idx + 1}
                                                            </span>
                                                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                                                                {cardTitle}
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                                            {isAutoFilled ? (
                                                                <span style={{
                                                                    fontSize: '0.68rem', fontWeight: 700,
                                                                    backgroundColor: '#dcfce7', color: '#15803d',
                                                                    padding: '0.2rem 0.55rem', borderRadius: '999px',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    ✓ Auto-completado
                                                                </span>
                                                            ) : effectiveVal > 0 ? (
                                                                <span style={{
                                                                    fontSize: '0.7rem', fontWeight: 700,
                                                                    backgroundColor: '#eff6ff', color: '#2563eb',
                                                                    padding: '0.2rem 0.55rem', borderRadius: '999px',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    ≈ {eqOtherCurrency}
                                                                </span>
                                                            ) : null}

                                                            {mixtoPayments.length > 2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeMixtoPayment(idx)}
                                                                    style={{
                                                                        background: '#fef2f2', border: 'none', borderRadius: '0.4rem',
                                                                        cursor: 'pointer', padding: '0.28rem', display: 'flex', alignItems: 'center'
                                                                    }}
                                                                    title="Eliminar método"
                                                                >
                                                                    <Trash2 size={14} color="#ef4444" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Selector de método */}
                                                    <select
                                                        value={payment.methodId}
                                                        onChange={e => updateMixtoPayment(idx, 'methodId', e.target.value)}
                                                        style={{
                                                            width: '100%', padding: '0.58rem 0.75rem', borderRadius: '0.6rem',
                                                            border: '1.5px solid #e2e8f0', fontSize: '0.86rem', fontWeight: 600,
                                                            color: '#1e293b', marginBottom: '0.6rem', backgroundColor: '#f8fafc', outline: 'none'
                                                        }}
                                                    >
                                                        {MIXTO_AVAILABLE_METHODS.map(m => (
                                                            <option key={m.id} value={m.id}>{m.label} ({m.moneda})</option>
                                                        ))}
                                                    </select>

                                                    {/* Campo de Monto */}
                                                    <div style={{
                                                        position: 'relative',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        border: isAutoFilled ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
                                                        borderRadius: '0.65rem',
                                                        backgroundColor: 'white',
                                                        padding: '0.45rem 0.75rem'
                                                    }}>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isAutoFilled ? '#059669' : '#64748b', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                                                            {isAutoFilled ? 'Monto restante' : 'Monto'}
                                                        </span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className={isAutoFilled ? 'mixto-auto-input' : undefined}
                                                            value={payment.monto}
                                                            onChange={e => updateMixtoPayment(idx, 'monto', e.target.value)}
                                                            placeholder={isAutoFilled ? effectiveVal.toFixed(2) : (remaining > 0 ? remaining.toFixed(2) : '0.00')}
                                                            style={{
                                                                flex: 1,
                                                                minWidth: 0,
                                                                border: 'none',
                                                                outline: 'none',
                                                                textAlign: 'right',
                                                                fontSize: '1.1rem',
                                                                fontWeight: 800,
                                                                color: '#0f172a',
                                                                backgroundColor: 'transparent',
                                                                fontVariantNumeric: 'tabular-nums'
                                                            }}
                                                        />
                                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginLeft: '0.4rem', flexShrink: 0 }}>
                                                            {isBsMethod ? 'Bs.' : 'USD'}
                                                        </span>
                                                    </div>

                                                    {/* Chips de ajuste rápido para Primer Pago */}
                                                    {idx === 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.55rem', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Ajuste rápido:</span>
                                                            {[
                                                                { label: '25%', pct: 0.25 },
                                                                { label: '50%', pct: 0.5 },
                                                                { label: '75%', pct: 0.75 },
                                                            ].map(chip => (
                                                                <button
                                                                    key={chip.label}
                                                                    type="button"
                                                                    onClick={() => applyQuickPct(chip.pct)}
                                                                    style={{
                                                                        padding: '0.2rem 0.55rem',
                                                                        borderRadius: '0.4rem',
                                                                        border: '1px solid #e2e8f0',
                                                                        backgroundColor: '#f8fafc',
                                                                        color: '#334155',
                                                                        fontSize: '0.72rem',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {chip.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Nota informativa debajo del Segundo Pago auto-completado */}
                                                    {isAutoFilled && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.74rem' }}>
                                                            <span style={{ color: '#059669', fontWeight: 600 }}>
                                                                ● Calculado para cubrir el 100%
                                                            </span>
                                                            <span style={{ color: '#64748b', fontWeight: 600 }}>
                                                                ≈ {eqOtherCurrency}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Referencia para transferencias */}
                                                    {payment.methodId.includes('transferencia') && (
                                                        <input
                                                            type="text"
                                                            value={payment.referencia}
                                                            onChange={e => updateMixtoPayment(idx, 'referencia', e.target.value)}
                                                            placeholder="Referencia (opcional)"
                                                            style={{
                                                                width: '100%', padding: '0.45rem 0.65rem', borderRadius: '0.5rem',
                                                                border: '1px solid #e2e8f0', fontSize: '0.8rem',
                                                                marginTop: '0.55rem', outline: 'none', backgroundColor: '#f8fafc'
                                                            }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Banner "Resta por cubrir" justo después del Primer Pago */}
                                                {idx === 0 && explicitPaidUsd > 0 && mixtoRestanteUsd > 0.009 && (() => {
                                                    const nextMethod = MIXTO_AVAILABLE_METHODS.find(x => x.id === mixtoPayments[1]?.methodId);
                                                    const nextIsBs = nextMethod?.moneda === 'BS';
                                                    const restMain = nextIsBs
                                                        ? `Bs. ${formatBs(mixtoRestanteUsd * tasaBcv)}`
                                                        : `$ ${mixtoRestanteUsd.toFixed(2)}`;
                                                    const restEq = nextIsBs
                                                        ? `$ ${mixtoRestanteUsd.toFixed(2)} USD`
                                                        : `Bs. ${formatBs(mixtoRestanteUsd * tasaBcv)}`;
                                                    const nextHasExplicit = Boolean(mixtoPayments[1]?.monto && parseFloat(mixtoPayments[1].monto) > 0);

                                                    return (
                                                        <div style={{
                                                            padding: '0.65rem 0.85rem',
                                                            borderRadius: '0.8rem',
                                                            backgroundColor: '#fffbeb',
                                                            border: '1px solid #fde68a',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: '0.6rem'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                                                                <span style={{
                                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                                    backgroundColor: '#f59e0b', color: 'white',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    flexShrink: 0
                                                                }}>
                                                                    <ArrowDown size={14} strokeWidth={2.5} />
                                                                </span>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#92400e' }}>
                                                                        Resta por cubrir: {restMain}
                                                                    </p>
                                                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#b45309', fontWeight: 500 }}>
                                                                        Equivalente a {restEq}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {!nextHasExplicit ? (
                                                                <span style={{
                                                                    padding: '0.28rem 0.6rem',
                                                                    borderRadius: '999px',
                                                                    backgroundColor: '#f59e0b',
                                                                    color: 'white',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    whiteSpace: 'nowrap',
                                                                    flexShrink: 0
                                                                }}>
                                                                    Auto-asignado ✓
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const val = nextIsBs ? mixtoRestanteUsd * tasaBcv : mixtoRestanteUsd;
                                                                        updateMixtoPayment(1, 'monto', val.toFixed(2));
                                                                    }}
                                                                    style={{
                                                                        padding: '0.28rem 0.6rem',
                                                                        borderRadius: '999px',
                                                                        border: 'none',
                                                                        backgroundColor: '#f59e0b',
                                                                        color: 'white',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        whiteSpace: 'nowrap',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    Completar
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>

                                {/* Agregar otro método */}
                                {mixtoPayments.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={addMixtoPayment}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                            width: '100%', padding: '0.68rem',
                                            border: '1.5px dashed #cbd5e1', borderRadius: '0.75rem',
                                            backgroundColor: '#f8fafc', cursor: 'pointer',
                                            fontSize: '0.82rem', fontWeight: 700, color: '#475569',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
                                    >
                                        <Plus size={15} /> Agregar otro método ({mixtoPayments.length + 1}er pago)
                                    </button>
                                )}

                                {/* Resumen de cobertura total */}
                                <div style={{
                                    padding: '0.75rem 0.95rem',
                                    borderRadius: '0.8rem',
                                    backgroundColor: mixtoCubierto ? '#ecfdf5' : '#fef2f2',
                                    border: `1px solid ${mixtoCubierto ? '#bbf7d0' : '#fecaca'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.6rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                        <span style={{
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            backgroundColor: mixtoCubierto ? '#10b981' : '#ef4444',
                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            {mixtoCubierto ? <Check size={14} strokeWidth={3} /> : '!'}
                                        </span>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: mixtoCubierto ? '#065f46' : '#991b1b' }}>
                                                {mixtoCubierto
                                                    ? (excedenteUsd > 0.01 ? 'Total cubierto (con vuelto)' : 'Total cubierto con exactitud')
                                                    : 'Falta cubrir el total de la venta'}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.72rem', color: mixtoCubierto ? '#047857' : '#b91c1c' }}>
                                                ${mixtoTotalPaidUsd.toFixed(2)} de ${totalUsd.toFixed(2)} (Bs. {formatBs(totalBs)})
                                            </p>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: mixtoCubierto ? '#059669' : '#dc2626', whiteSpace: 'nowrap' }}>
                                        {mixtoCubierto
                                            ? (excedenteUsd > 0.01 ? `+$${excedenteUsd.toFixed(2)}` : 'Diferencia: 0,00')
                                            : `Falta $${mixtoRestanteUsd.toFixed(2)}`}
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

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
                                    ? `Faltan ${isBs ? `Bs. ${formatBs(faltante)}` : `$ ${faltante.toFixed(2)}`}`
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
    zIndex: 1200, backdropFilter: 'blur(2px)'
};

const modalWrapperStyle = {
    backgroundColor: 'white',
    borderRadius: '1rem',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    width: 'calc(100vw - 1.5rem)'
};

const modalStyle = {
    padding: 'clamp(1.25rem, 4vw, 2rem)',
    width: '100%',
    maxHeight: '90dvh',
    overflowY: 'auto'
};

const rowStyle = {
    display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem'
};

const scrollbarStyles = `
    .mixto-auto-input::placeholder {
        color: #0f172a;
        opacity: 1;
    }
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
