#!/usr/bin/env node
/**
 * Generador CLI de licencias para Vectra POS.
 * Uso:
 *   node scripts/generar-licencia.mjs "Puesto de Sopas El Sabor" PERM
 *   node scripts/generar-licencia.mjs "Bodega La Esquina" 2026-12-31
 */
import crypto from 'node:crypto';

const LICENSE_SECRET = 'VECTRA-POS-VE-2026-SOPA-KEY-94F2';

function normalizeBusinessName(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

const [, , businessName, expArg = 'PERM'] = process.argv;

if (!businessName) {
    console.error('Uso: node scripts/generar-licencia.mjs "<Nombre del Negocio>" [PERM | YYYY-MM-DD]');
    process.exit(1);
}

const expPart = expArg.toUpperCase() === 'PERM'
    ? 'PERM'
    : expArg.replace(/-/g, '');

if (expPart !== 'PERM' && !/^\d{8}$/.test(expPart)) {
    console.error('Fecha inválida. Usa PERM o formato YYYY-MM-DD (ej. 2026-12-31).');
    process.exit(1);
}

const normalized = normalizeBusinessName(businessName);
const payload = `${normalized}|${expPart}|${LICENSE_SECRET}`;
const sig = crypto.createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 8).toUpperCase();
const code = `VPOS-${expPart}-${sig}`;

console.log('\n=== Licencia Vectra POS Generada ===');
console.log(`Negocio : ${businessName.trim()}`);
console.log(`Vigencia: ${expPart === 'PERM' ? 'Permanente' : `${expPart.slice(6, 8)}/${expPart.slice(4, 6)}/${expPart.slice(0, 4)}`}`);
console.log(`Código  : ${code}\n`);
