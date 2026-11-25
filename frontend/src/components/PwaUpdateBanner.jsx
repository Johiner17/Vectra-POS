import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Banner que aparece en la parte inferior cuando hay una actualización disponible del Service Worker.
 * El usuario puede actualizar con un clic o cerrar el banner.
 */
export default function PwaUpdateBanner() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('[PWA] Service Worker registrado:', r)
        },
        onRegisterError(error) {
            console.error('[PWA] Error al registrar Service Worker:', error)
        },
    })

    if (!needRefresh) return null

    return (
        <div style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            fontSize: '0.875rem',
            maxWidth: 'calc(100vw - 2rem)',
            whiteSpace: 'nowrap',
        }}>
            <span>🔄 Nueva versión disponible</span>
            <button
                onClick={() => updateServiceWorker(true)}
                style={{
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.375rem 0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                }}
            >
                Actualizar
            </button>
            <button
                onClick={() => setNeedRefresh(false)}
                style={{
                    background: 'transparent',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                    padding: '0 0.25rem',
                }}
                aria-label="Cerrar"
            >
                ✕
            </button>
        </div>
    )
}

