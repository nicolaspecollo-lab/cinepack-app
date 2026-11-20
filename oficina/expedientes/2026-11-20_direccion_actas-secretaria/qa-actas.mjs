// QA real de dir-actas — login real, navegación real, interacción de
// escritura real, capturas en 390/820/1440px. Correr con el dev server ya
// levantado (NODE_USE_ENV_PROXY=1 npm run dev) en localhost:3000.
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/tmp/claude-0/cinepack-dev-dir-actas/oficina/expedientes/2026-11-20_direccion_actas-secretaria/capturas';
fs.mkdirSync(OUT, { recursive: true });

const EMAIL = 'qa.dir-secretaria2@mailinator.com';
const PASS = 'CinepackQA-2026!tester';

const log = [];
function L(s) { console.log(s); log.push(s); }

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => L('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') L('CONSOLE ERROR: ' + m.text()); });

  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    L('login page loaded: ' + page.url());

    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    L('after submit url: ' + page.url());
    await page.waitForTimeout(1500);
    L('after submit url (settled): ' + page.url());

    // La cuenta de QA es compartida con otras sesiones de la oficina
    // trabajando en paralelo hoy (una sola cuenta por cargo, ver
    // oficina-qa/CLAUDE.md) — a veces aparece crear-perfil, a veces la
    // selección de proyecto directamente. Se resuelve cualquiera de los dos
    // hasta llegar a /hoy, con reintentos (contención real, no bug).
    for (let ronda = 0; ronda < 6; ronda++) {
      await page.waitForTimeout(1500);
      if (page.url().includes('/hoy')) break;
      if (page.url().includes('/crear-perfil')) {
        L('WARN: la cuenta de QA pidio crear-perfil (posible contencion con otra sesion de la oficina usando la misma cuenta en paralelo)');
        const nombreInput = page.locator('input[name="nombre"], input[placeholder*="nombre" i]').first();
        if (await nombreInput.count() > 0) await nombreInput.fill('QA Secretaría de rodaje').catch(() => {});
        // crear-perfil usa <select> nativos (distinto del CpSelect del resto de la app)
        const cargoSelect = page.locator('select.afield-select').first();
        if (await cargoSelect.count() > 0) {
          const opciones = await cargoSelect.locator('option').allInnerTexts();
          const match = opciones.find((o) => o.toLowerCase().includes('secretaría de rodaje'));
          if (match) {
            await cargoSelect.selectOption({ label: match });
            L('seleccionado cargo: ' + match);
          } else {
            L('WARN: no aparecio "Secretaría de rodaje" entre las opciones de cargo: ' + JSON.stringify(opciones));
          }
        }
        await page.waitForTimeout(300);
        const paisSelects = page.locator('select').filter({ has: page.locator('option', { hasText: 'España' }) });
        const nPais = await paisSelects.count();
        for (let i = 0; i < nPais; i++) {
          await paisSelects.nth(i).selectOption({ label: 'España' }).catch((e) => L('WARN pais ' + i + ': ' + e.message));
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(300);
        await page.getByText('CONTINUAR A CINE PACK', { exact: false }).first().click().catch(() => {});
        await page.waitForTimeout(3000);
        L('tras completar crear-perfil, url: ' + page.url());
        continue;
      }

      if (page.url().includes('/proyectos')) {
        const proyectoTest = page.getByText('PROYECTO TEST', { exact: false }).first();
        for (let i = 0; i < 15; i++) {
          const modoOscuro = page.locator('text=MODO OSCURO').first();
          if (await modoOscuro.count() > 0) {
            await modoOscuro.click().catch(() => {});
            L('cerrado selector de tema (MODO OSCURO)');
          }
          if (await proyectoTest.count() > 0) break;
          if (page.url().includes('/crear-perfil')) break;
          await page.waitForTimeout(2000);
        }
        if (await proyectoTest.count() > 0) {
          const entrarBtn = page.getByText('Entrar a tu espacio de trabajo', { exact: false }).first();
          if (await entrarBtn.count() > 0) {
            await entrarBtn.click({ force: true });
          } else {
            await proyectoTest.click({ force: true });
          }
          await page.waitForURL((u) => !u.pathname.includes('/proyectos'), { timeout: 20000 }).catch(() => {});
          await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
          L('entered proyecto test, url: ' + page.url());
        } else if (!page.url().includes('/crear-perfil')) {
          L('WARN: no se encontro [PROYECTO TEST] en /proyectos, listado de texto: ' + (await page.locator('body').innerText()).slice(0, 500));
        }
      }
    }

    await page.waitForTimeout(3000);
    L('url en /hoy: ' + page.url());
    await page.screenshot({ path: `${OUT}/debug-hoy.png`, fullPage: true }).catch(() => {});
    L('body snippet en /hoy: ' + (await page.locator('body').innerText()).slice(0, 2000));

    // Buscar en el menu de herramientas la de Actas (puede requerir abrir el
    // menu de herramientas del cargo / seleccionar cargo si la cuenta es multi-cargo)
    const candidatos = [
      'text=Actas de reuniones',
      'text=Actas',
    ];
    let found = false;
    for (const sel of candidatos) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0) {
        await loc.click();
        found = true;
        L('click en herramienta via selector: ' + sel);
        break;
      }
    }
    if (!found) {
      L('WARN: no se encontro el link directo a la herramienta de actas en pantalla, body snippet:');
      L((await page.locator('body').innerText()).slice(0, 1500));
    }
    await page.waitForTimeout(1500);

    // Capturas en los 3 anchos pedidos
    const anchos = [390, 820, 1440];
    for (const w of anchos) {
      await page.setViewportSize({ width: w, height: 1000 });
      await page.waitForTimeout(400);
      const scrollInfo = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      L(`ancho ${w}px -> scrollWidth=${scrollInfo.sw} clientWidth=${scrollInfo.cw} scrollHorizontal=${scrollInfo.sw > scrollInfo.cw}`);
      await page.screenshot({ path: `${OUT}/${w}px.png`, fullPage: true, timeout: 15000 }).catch((e) => L('screenshot error ' + w + ': ' + e.message));
    }

    // Volver a 1440 e intentar una interaccion real: usar el buscador
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(300);
    const buscador = page.locator('.hp-actas-buscador input').first();
    if (await buscador.count() > 0) {
      await buscador.fill('seguridad');
      await page.waitForTimeout(400);
      const resultTxt = await page.locator('.hp-actas-resultados').first().innerText().catch(() => '(sin contador)');
      L('buscador real: tras escribir "seguridad" -> ' + resultTxt);
      await page.screenshot({ path: `${OUT}/busqueda-real.png`, fullPage: true });
      await buscador.fill('');
    } else {
      L('WARN: no se encontro el input de busqueda .hp-actas-buscador input en el DOM');
    }

    // Intentar crear un acta real (escritura real, no solo lectura)
    const crearBtn = page.locator('button:has-text("Registrar acta")').first();
    if (await crearBtn.count() > 0) {
      await crearBtn.click();
      await page.waitForTimeout(1200);
      L('click en "Registrar acta" ejecutado');
      await page.screenshot({ path: `${OUT}/tras-crear-acta.png`, fullPage: true });
    } else {
      L('WARN: no se encontro el boton "Registrar acta"');
    }

  } catch (e) {
    L('ERROR FATAL: ' + e.message);
  } finally {
    fs.writeFileSync('/tmp/claude-0/cinepack-dev-dir-actas/qa-log.txt', log.join('\n'));
    await browser.close();
  }
})();
