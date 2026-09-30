const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const langs = ['es', 'en', 'fr', 'pt', 'it', 'de', 'eo'];

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );

// Interpolated vars ({{x}}) and rich-text tags (<x>), both must match es.json.
const placeholders = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => {
    const key = `${prefix}${k}`;
    if (v !== null && typeof v === 'object') return placeholders(v, `${key}.`);
    const s = String(v);
    const vars = [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]);
    const tags = [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]);
    return [[key, `{{${vars.sort().join(',')}}} <${tags.sort().join(',')}>`]];
  });

const data = {};
for (const l of langs) {
  const file = path.join(dir, `${l}.json`);
  data[l] = JSON.parse(fs.readFileSync(file, 'utf8'));
}

const keys = {};
for (const l of langs) keys[l] = flatten(data[l]);
const base = keys.es;
let problems = 0;

// i18next plural forms are sibling keys: membersCount_one / _other / _many.
// The set a language can emit follows CLDR and differs (es/it/fr/pt get _many
// from 1e6; en/de/eo never do), so parity must be judged per language.
const PLURAL = ['zero', 'one', 'two', 'few', 'many', 'other'];
const pluralBase = (key) => {
  const m = /^(.*)_([a-z]+)$/.exec(key);
  return m && PLURAL.includes(m[2]) ? m[1] : null;
};

const i18next = require('i18next');
i18next.init({ lng: 'en', resources: {} });
const resolver = i18next.services.pluralResolver;

const probes = [];
for (let n = 0; n <= 2000; n++) probes.push(n);
for (let e = 5; e <= 18; e++) {
  const b = 10 ** e;
  probes.push(b, b + 1, b + 2, b * 2, b * 3);
}
const emittable = {};
for (const l of langs) emittable[l] = new Set(probes.map((n) => resolver.getSuffix(l, n)));

// A plural form the language can never emit is not required.
const requiredIn = (l, k) => {
  const b = pluralBase(k);
  return b === null || emittable[l].has(k.slice(b.length));
};

for (const l of langs) {
  const s = new Set(keys[l]);
  const missing = base.filter((k) => !s.has(k) && requiredIn(l, k));
  const extra = keys[l].filter((k) => !base.includes(k));
  if (missing.length || extra.length) {
    problems++;
    console.log(`\n${l}`);
    if (missing.length) console.log(`  FALTAN: ${missing.join(', ')}`);
    if (extra.length) console.log(`  SOBRAN: ${extra.join(', ')}`);
  }
}

const ph = {};
for (const l of langs) ph[l] = Object.fromEntries(placeholders(data[l]));
for (const l of langs) {
  for (const [k, v] of Object.entries(ph[l])) {
    if (k in ph.es && ph.es[k] !== v) {
      problems++;
      console.log(`\n${l} · ${k}\n  es -> {{${ph.es[k]}}}\n  ${l} -> {{${v}}}`);
    }
  }
}

// Every key referenced from app/src must exist, and every defined key must be used.
const srcFiles = [];
for (const root of ['app', 'src']) {
  const walk = (dirPath) => {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const p = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (!/node_modules|locales/.test(entry.name)) walk(p);
      } else if (/\.tsx?$/.test(entry.name)) {
        srcFiles.push(p);
      }
    }
  };
  walk(path.join(__dirname, '..', root));
}

const source = srcFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const referenced = new Set([
  ...[...source.matchAll(/\bt\(\s*'([\w.]+)'/g)].map((m) => m[1]),
  ...[...source.matchAll(/\bi18nKey=\{?\s*['"]([\w.]+)['"]/g)].map((m) => m[1]),
]);
const dynamicPrefixes = [...source.matchAll(/\bt\(\s*`([\w.]*)\$\{/g)].map((m) => m[1]);

// i18next plural forms are sibling keys: membersCount_one / _other / _many.
const has = (k) => base.includes(k);
const variants = (k) => base.filter((d) => d.startsWith(`${k}_`) && pluralBase(d) !== null);

// A referenced key exists if it is literal, or is a plural base with at least one form.
const unknown = [...referenced].filter(
  (k) => !has(k) && variants(k).length === 0 && !dynamicPrefixes.some((p) => k.startsWith(p))
);
if (unknown.length) {
  problems++;
  console.log(`\nCLAVES INEXISTENTES (usadas en el codigo)\n  ${unknown.join('\n  ')}`);
}

// A language must define every plural form i18next can emit for it, and a
// missing form is NOT replaced by _other: i18next renders the raw key instead.
for (const l of langs) {
  const bases = new Set(keys[l].map(pluralBase).filter(Boolean));
  const missing = [];
  for (const b of bases) {
    for (const s of emittable[l]) {
      if (!keys[l].includes(`${b}${s}`)) missing.push(`${b}${s}`);
    }
  }
  if (missing.length) {
    problems++;
    console.log(
      `\nFORMAS DE PLURAL QUE FALTAN · ${l}\n  ${missing.join('\n  ')}` +
        `\n  (i18next puede emitir: ${[...emittable[l]].join(', ')})`
    );
  }
}

// A plural form counts as used when its base is referenced.
const unused = base.filter((k) => {
  const b = pluralBase(k);
  return b && referenced.has(b) ? false : !referenced.has(k);
});
if (unused.length) {
  problems++;
  console.log(`\nCLAVES SIN USAR (${unused.length})\n  ${unused.join('\n  ')}`);
}

// ---------------------------------------------------------------------------
// Hardcoded user-facing text. A regex over the source misses JSX text split
// across lines, ternaries and template literals, so walk the AST instead.
// ---------------------------------------------------------------------------
const ts = require('typescript');

const TEXT_PROPS = new Set([
  'placeholder', 'title', 'label', 'message', 'headerTitle', 'alertTitle',
  'accessibilityLabel', 'hint', 'subtitle', 'description',
]);
// Variables that end up in an Alert or on screen.
const MSG_VARS = /^(error|err|warning)?[Mm]essage$|errorText|errorMessage|reason|detail$/;

const BRANDS =
  /^(openai|anthropic|google|gemini|claude|gpt[-\w]*|o1|llm|gun|gundb|expo|react native|json|api|api key|ia|ai|ki|ak)([\s(]*[a-z0-9()-]*)?$/i;

const isUntranslatable = (raw) => {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (s.length < 2) return true;
  if (/https?:\/\//.test(s)) return true;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?\s*[→←]?$/i.test(s)) return true; // dominio (+ flecha)
  if (/^[YMDymdhs]{2,4}[-/.][YMDymdhs]{2,4}([-/.][YMDymdhs]{2,4})?$/.test(s)) return true; // YYYY-MM-DD
  if (BRANDS.test(s.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u20E3\s]+/u, ''))) return true;
  if (/^[\s\d.,:;·•#@%()[\]{}\/\\|_+*=<>?!¡¿\-–—→←&'"…]+$/.test(s)) return true;
  if (/^(EUR|USD|GBP|FRP|JPY|CNY|MXN|ARS|CLP|COP|BRL|CHF|SEK|NOK|DKK|PLN|INR|KRW)$/i.test(s)) return true;
  if (/^\+?\d[\d\s.,:]*$/.test(s)) return true;
  return !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(s);
};

// console.* y los valores de style: de un boton de Alert no son texto de UI.
const isNotUI = (n) => {
  for (let p = n.parent; p; p = p.parent) {
    if (
      ts.isPropertyAssignment(p) &&
      ts.isIdentifier(p.name) &&
      /^(style|onPress|onPressAsync|value)$/.test(p.name.text)
    ) return true;
    if (
      ts.isCallExpression(p) &&
      ts.isPropertyAccessExpression(p.expression) &&
      ts.isIdentifier(p.expression.expression) &&
      p.expression.expression.text === 'console'
    ) return true;
  }
  return false;
};

const hardcoded = [];
for (const file of srcFiles.filter((f) => f.endsWith('.tsx'))) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = path.relative(path.join(__dirname, '..'), file);
  const at = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const report = (n, kind, value) => {
    if (isNotUI(n)) return;
    if (!isUntranslatable(value)) hardcoded.push(`${rel}:${at(n)}  [${kind}] "${value.trim()}"`);
  };

  const visit = (n, inAlert = false) => {
    // Alert.alert(...) / RNAlert.alert(...): cualquier literal anidado, included ternaries
    let alertCtx = inAlert;
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const owner = n.expression.expression;
      if (
        n.expression.name.text === 'alert' &&
        ts.isIdentifier(owner) &&
        /Alert$/.test(owner.text)
      ) alertCtx = true;
    }

    if (ts.isJsxText(n)) report(n, 'texto JSX', n.text);
    if (ts.isJsxAttribute(n) && n.name && TEXT_PROPS.has(n.name.text)) {
      const v = n.initializer;
      if (v && (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v))) {
        report(n, n.name.text, v.text);
      }
    }
    if (alertCtx && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))) {
      report(n, 'Alert', n.text);
    }
    if (ts.isTemplateExpression(n) && alertCtx) {
      const lit = n.head.text + n.templateSpans.map((s) => s.literal.text).join(' ');
      if (!/^\s*$/.test(lit)) report(n, 'Alert', lit);
    }
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      MSG_VARS.test(n.name.text) &&
      n.initializer &&
      (ts.isStringLiteral(n.initializer) || ts.isNoSubstitutionTemplateLiteral(n.initializer))
    ) {
      report(n, n.name.text, n.initializer.text);
    }

    ts.forEachChild(n, (c) => visit(c, alertCtx));
  };
  visit(sf, false);
}

if (hardcoded.length) {
  problems++;
  console.log(
    `\nTEXTOS DE UI SIN TRADUCIR (${hardcoded.length})\n  ` +
      [...new Set(hardcoded)].sort().join('\n  ')
  );
}

console.log(`\n${langs.length} idiomas · ${base.length} claves · ${referenced.size} en uso`);
console.log(problems === 0 ? 'OK: identicos, sin claves huerfanas ni textos sin traducir' : `${problems} problemas`);
process.exit(problems === 0 ? 0 : 1);
