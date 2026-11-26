import React from 'react';

const GRADIENTS = {
    '#2563eb': { bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', shadow: 'rgba(37, 99, 235, 0.28)' },
    '#16a34a': { bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)', shadow: 'rgba(5, 150, 105, 0.28)' },
    '#7c3aed': { bg: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', shadow: 'rgba(124, 58, 237, 0.28)' },
    '#dc2626': { bg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', shadow: 'rgba(225, 29, 72, 0.28)' },
    '#f59e0b': { bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', shadow: 'rgba(217, 119, 6, 0.28)' },
};

/**
 * Tarjeta KPI estilo Full-Bleed Moderno con fondo semántico degradado y tipografía blanca.
 */
const StatCard = ({ title, value, subtitle, icon: Icon, color = '#2563eb', loading = false }) => {
    const theme = GRADIENTS[color] || {
        bg: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        shadow: 'rgba(15, 23, 42, 0.18)',
    };

    return (
        <div
            style={{
                background: theme.bg,
                borderRadius: '1.125rem',
                padding: '1.25rem 1.35rem',
                boxShadow: `0 10px 24px -6px ${theme.shadow}`,
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.875rem',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 14px 28px -6px ${theme.shadow}`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 10px 24px -6px ${theme.shadow}`;
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'rgba(255, 255, 255, 0.85)',
                }}>
                    {title}
                </span>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Icon size={19} color="#ffffff" />
                </div>
            </div>

            <div>
                {loading ? (
                    <div style={{
                        height: '30px',
                        backgroundColor: 'rgba(255, 255, 255, 0.22)',
                        borderRadius: '0.375rem',
                        width: '68%',
                    }} />
                ) : (
                    <h3 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        lineHeight: 1.1,
                        margin: 0,
                    }}>
                        {value}
                    </h3>
                )}
                {subtitle && (
                    <p style={{
                        fontSize: '0.78rem',
                        color: 'rgba(255, 255, 255, 0.82)',
                        marginTop: '0.35rem',
                        marginBottom: 0,
                    }}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
};

export default StatCard;
