import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username.trim() || !password.trim()) {
            toast.error('Ingrese usuario y contraseña');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('/api/auth/login', {
                username: username.trim(),
                password
            });

            if (response.data.success) {
                // Guardar token y datos del usuario reales del backend
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                toast.success(`Bienvenido, ${response.data.user.nombre_completo}`);
                navigate('/dashboard');
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Error al iniciar sesión';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* Fondo animado */}
            <div style={styles.bgGradient} />

            <div style={styles.card}>
                {/* Logo / Header */}
                <div style={styles.logoSection}>
                    <div style={styles.logoIcon}>
                        <Lock size={28} color="#fff" />
                    </div>
                    <h1 style={styles.title}>Vectra POS</h1>
                    <p style={styles.subtitle}>Sistema de Punto de Venta</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* Campo Usuario */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Usuario</label>
                        <div style={styles.inputWrapper}>
                            <User size={18} style={styles.inputIcon} />
                            <input
                                id="login-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ingrese su usuario"
                                style={styles.input}
                                autoComplete="username"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    {/* Campo Contraseña */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Contraseña</label>
                        <div style={styles.inputWrapper}>
                            <Lock size={18} style={styles.inputIcon} />
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Ingrese su contraseña"
                                style={styles.input}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={styles.eyeButton}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Botón de Login */}
                    <button
                        id="login-submit"
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.submitButton,
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                                Ingresando...
                            </>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>

                <div style={styles.footer}>
                    <p style={styles.footerText}>
                        Sistema offline • v1.0.0
                    </p>
                </div>
            </div>

            {/* CSS para la animación de spin */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                input::placeholder {
                    color: #94a3b8;
                }
                input:focus {
                    outline: none;
                    border-color: #2563eb !important;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
                }
                .login-submit:hover:not(:disabled) {
                    filter: brightness(1.1);
                    transform: translateY(-1px);
                }
            `}</style>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0f172a'
    },
    bgGradient: {
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 30% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 60%)',
        zIndex: 0
    },
    card: {
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '420px',
        margin: '1rem',
        background: 'rgba(30, 41, 59, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: '1rem',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        padding: '2.5rem'
    },
    logoSection: {
        textAlign: 'center',
        marginBottom: '2rem'
    },
    logoIcon: {
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)'
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#f1f5f9',
        margin: 0,
        letterSpacing: '-0.025em'
    },
    subtitle: {
        fontSize: '0.875rem',
        color: '#94a3b8',
        marginTop: '0.25rem'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    label: {
        fontSize: '0.8125rem',
        fontWeight: '500',
        color: '#cbd5e1'
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
    },
    inputIcon: {
        position: 'absolute',
        left: '0.875rem',
        color: '#64748b',
        pointerEvents: 'none'
    },
    input: {
        width: '100%',
        padding: '0.75rem 0.875rem 0.75rem 2.75rem',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        borderRadius: '0.5rem',
        color: '#f1f5f9',
        fontSize: '0.9375rem',
        transition: 'all 0.2s'
    },
    eyeButton: {
        position: 'absolute',
        right: '0.75rem',
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        padding: '0.25rem',
        display: 'flex',
        alignItems: 'center'
    },
    submitButton: {
        width: '100%',
        padding: '0.875rem',
        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        color: '#fff',
        fontSize: '0.9375rem',
        fontWeight: '600',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        marginTop: '0.5rem',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
    },
    footer: {
        marginTop: '1.5rem',
        textAlign: 'center'
    },
    footerText: {
        fontSize: '0.75rem',
        color: '#475569'
    }
};

export default Login;
