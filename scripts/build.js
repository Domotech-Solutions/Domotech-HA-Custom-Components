#!/usr/bin/env node
/*
 * Concatena todos los componentes de src/*.js en un único fichero para HACS.
 *
 * HACS (tipo "Dashboard") solo carga UN fichero JS por repositorio, por eso
 * cada componente nuevo se añade como src/<nombre>.js y este script los une en
 * dist/domotech-ha-custom-components.js.
 *
 * Uso: node scripts/build.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');
const outFile = path.join(distDir, 'domotech-ha-custom-components.js');

const files = fs
  .readdirSync(srcDir)
  .filter((f) => f.endsWith('.js'))
  .sort();

if (files.length === 0) {
  console.error('No hay componentes en src/');
  process.exit(1);
}

// Cada componente va envuelto en su propio ámbito para que sus constantes no choquen entre sí.
const bundle = files
  .map((f) => {
    const code = fs.readFileSync(path.join(srcDir, f), 'utf8').trimEnd();
    return `/* ===== ${f} ===== */\n(() => {\n${code}\n})();\n`;
  })
  .join('\n');

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(outFile, bundle);
console.log(`dist/${path.basename(outFile)} generado con ${files.length} componente(s): ${files.join(', ')}`);
