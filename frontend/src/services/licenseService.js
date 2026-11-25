import db from './db';
import { settingsRepository } from './settingsRepository';

const LICENSE_STORAGE_KEY = 'app_license';
// Salt privado de firma para licencias offline de Vectra POS
const LICENSE_SECRET = 'VECTRA-POS-VE-2026-SOPA-KEY-94F2';

/**
 * Implementación pura en JS de SHA-256 para que funcione tanto en https://
 * como en http://192.168.x.x (donde crypto.subtle no está disponible).
 */
function sha256Hex(ascii) {
    const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = '';

    const words = [];
    const asciiBitLength = ascii.length * 8;

    const hash = [];
    const k = [];
    let primeCounter = 0;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    ascii += '\x80';
    while ((ascii.length % 64) - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i++) {
        const j = ascii.charCodeAt(i);
        if (j >> 8) return '';
        words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    for (let j = 0; j < words.length;) {
        const w = words.slice(j, (j += 16));
        const oldHash = hash.slice(0);

        for (let i = 0; i < 64; i++) {
            const w15 = w[i - 15];
            const w2 = w[i - 2];
            const a = hash[0];
            const e = hash[4];
            const temp1 =
                hash[7] +
                (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
                ((e & hash[5]) ^ (~e & hash[6])) +
                k[i] +
                (w[i] =
                    i < 16
                        ? w[i]
                        : (w[i - 16] +
                              (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                              w[i - 7] +
                              (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                          0);
            const temp2 =
                (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
                ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash[7] = hash[6];
            hash[6] = hash[5];
            hash[5] = hash[4];
            hash[4] = (hash[3] + temp1) | 0;
            hash[3] = hash[2];
            hash[2] = hash[1];
            hash[1] = hash[0];
            hash[0] = (temp1 + temp2) | 0;
        }

        for (let i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (let i = 0; i < 8; i++) {
        for (let j = 3; j + 1; j--) {
            const b = (hash[i] >> (j * 8)) & 255;
            result += (b < 16 ? '0' : '') + b.toString(16);
        }
    }
    return result;
}

/** Normaliza el nombre del negocio para evitar fallos por mayúsculas o espacios extras */
export function normalizeBusinessName(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

function toUtf8BytesString(str) {
    return unescape(encodeURIComponent(str));
}

function getTodayCompactDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

export function computeLicenseSignature(businessName, expPart) {
    const normalized = normalizeBusinessName(businessName);
    const payload = `${normalized}|${expPart}|${LICENSE_SECRET}`;
    return sha256Hex(toUtf8BytesString(payload)).slice(0, 8).toUpperCase();
}

export function verifyLicenseCode(businessName, rawCode) {
    const cleanName = String(businessName || '').trim();
    if (!cleanName) {
        return { valid: false, reason: 'Ingresa el nombre del negocio.' };
    }

    const code = String(rawCode || '').trim().toUpperCase();
    const parts = code.split('-');
    if (parts.length !== 3 || parts[0] !== 'VPOS') {
        return { valid: false, reason: 'Formato de código inválido. Debe ser VPOS-XXXX-XXXXXXXX.' };
    }

    const [, expPart, sigPart] = parts;
    if (expPart !== 'PERM' && !/^\d{8}$/.test(expPart)) {
        return { valid: false, reason: 'Fecha de licencia inválida en el código.' };
    }

    const expectedSig = computeLicenseSignature(cleanName, expPart);
    if (sigPart !== expectedSig) {
        return { valid: false, reason: 'El código no corresponde a este negocio o es inválido.' };
    }

    if (expPart !== 'PERM') {
        const today = getTodayCompactDate();
        if (today > expPart) {
            const formatted = `${expPart.slice(6, 8)}/${expPart.slice(4, 6)}/${expPart.slice(0, 4)}`;
            return {
                valid: false,
                expired: true,
                expiresAt: formatted,
                reason: `La licencia venció el ${formatted}. Solicita un código de renovación.`,
            };
        }
        const formatted = `${expPart.slice(6, 8)}/${expPart.slice(4, 6)}/${expPart.slice(0, 4)}`;
        return { valid: true, expired: false, expiresAt: formatted, expPart };
    }

    return { valid: true, expired: false, expiresAt: 'Permanente', expPart: 'PERM' };
}

export const licenseService = {
    async getSavedLicense() {
        const row = await db.settings.get(LICENSE_STORAGE_KEY);
        if (!row?.valor) return null;
        const { businessName, code } = row.valor;
        const check = verifyLicenseCode(businessName, code);
        return {
            businessName,
            code,
            ...check,
        };
    },

    async activateLicense(businessName, code) {
        const check = verifyLicenseCode(businessName, code);
        if (!check.valid) {
            throw new Error(check.reason);
        }

        const cleanName = String(businessName).trim();
        const cleanCode = String(code).trim().toUpperCase();

        await db.settings.put({
            clave: LICENSE_STORAGE_KEY,
            valor: {
                businessName: cleanName,
                code: cleanCode,
                activatedAt: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
        });

        // Sincronizar el nombre del negocio en la configuración de la app
        await settingsRepository.saveConfig({ empresa_nombre: cleanName });

        return {
            businessName: cleanName,
            code: cleanCode,
            ...check,
        };
    },

    async clearLicense() {
        await db.settings.delete(LICENSE_STORAGE_KEY);
    },
};
