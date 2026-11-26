import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, Store, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { licenseService } from '../services/licenseService';

/**
 * Bloquea el acceso a la aplicación hasta que el dispositivo tenga una licencia válida.
 * Los datos existentes en IndexedDB nunca se borran si la licencia vence.
 */
const LicenseGate = ({ children }) => {
    const [checking, setChecking] = useState(true);
    const [license, setLicense] = useState(null);
    const [businessName, setBusinessName] = useState('');
    const [code, setCode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                const saved = await licenseService.getSavedLicense();
                if (saved?.valid) {
                    setLicense(saved);
                } else if (saved) {
                    // Licencia guardada pero vencida o inválida
                    setBusinessName(saved.businessName || '');
                    setErrorMsg(saved.reason || 'Licencia vencida o inválida.');
                }
            } catch (err) {
                console.error('Error verificando licencia:', err);
            } finally {
                setChecking(false);
            }
        };
        check();
    }, []);

    const handleActivate = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSubmitting(true);
        try {
            const activated = await licenseService.activateLicense(businessName, code);
            setLicense(activated);
            toast.success(`¡Bienvenido a Vectra POS, ${activated.businessName}!`);
        } catch (err) {
            setErrorMsg(err.message || 'No se pudo activar la licencia.');
        } finally {
            setSubmitting(false);
        }
    };

    if (checking) {
        return (
            <div style={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                gap: '0.75rem',
            }}>
                <Loader2 size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Verificando licencia...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (license?.valid) {
        return children;
    }

    return (
        <div style={{
            minHeight: '100dvh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: 'white',
                borderRadius: '1.25rem',
                padding: 'clamp(1.5rem, 4vw, 2.25rem)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
            }}>
                {/* Logo / Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '1rem',
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                        boxShadow: '0 10px 25px rgba(37, 99, 235, 0.3)',
                    }}>
                        <Lock size={28} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Vectra POS
                    </h1>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem' }}>
                        Ingresa tus credenciales de acceso para activar este dispositivo
                    </p>
                </div>

                {/* Error */}
                {errorMsg && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.625rem',
                        padding: '0.75rem 0.875rem',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '0.75rem',
                        marginBottom: '1.25rem',
                        color: '#b91c1c',
                        fontSize: '0.8125rem',
                        lineHeight: 1.4,
                    }}>
                        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: '#334155',
                            marginBottom: '0.375rem',
                        }}>
                            Nombre del Negocio
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Store size={18} color="#94a3b8" style={{
                                position: 'absolute',
                                left: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                            }} />
                            <input
                                type="text"
                                required
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Ej: Restaurante + nombre"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: '0.625rem',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: '#334155',
                            marginBottom: '0.375rem',
                        }}>
                            Código de Activación
                        </label>
                        <div style={{ position: 'relative' }}>
                            <KeyRound size={18} color="#94a3b8" style={{
                                position: 'absolute',
                                left: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                            }} />
                            <input
                                type="text"
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="VPOS-PERM-XXXXXXXX"
                                autoCapitalize="characters"
                                spellCheck={false}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: '0.625rem',
                                    fontSize: '0.95rem',
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.04em',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            marginTop: '0.5rem',
                            width: '100%',
                            padding: '0.875rem',
                            borderRadius: '0.75rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                        }}
                    >
                        <ShieldCheck size={18} />
                        {submitting ? 'Activando...' : 'Activar Vectra POS'}
                    </button>
                </form>

                <p style={{
                    marginTop: '1.25rem',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    lineHeight: 1.4,
                }}>
                    Una vez activado, tus datos e inventario quedan guardados de forma segura en este dispositivo.
                </p>
            </div>
        </div>
    );
};

export default LicenseGate;
