const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [,, mdPath, outPdf, metaPath] = process.argv;
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const tplDir = __dirname;

const bodyHtml = execSync(`pandoc "${mdPath}" -t html5`, { maxBuffer: 1024 * 1024 * 20 }).toString();
const css = fs.readFileSync(path.join(tplDir, 'style.css'), 'utf8');
const logoDataUri = 'data:image/png;base64,' + fs.readFileSync(meta.logoPath).toString('base64');

const metaItems = meta.metaItems.map(([k, v]) => `<div class="meta-item"><b>${v}</b>${k}</div>`).join('');

const accentOverride = meta.accent ? `:root{--accent-2:${meta.accent};}` : '';
const html = `<!doctype html><html><head><meta charset="utf8">
<style>${css}\n${accentOverride}</style>
</head><body>
<div class="cover">
  <div class="cover-top"><img src="${logoDataUri}"><div class="word">CINE<b>PACK</b></div></div>
  <div class="cover-mid">
    <div class="kicker">${meta.kicker}</div>
    <h1>${meta.title}</h1>
    <p class="sub">${meta.subtitle}</p>
    <div style="margin-top:22px">${meta.badge}</div>
  </div>
  <div class="cover-bottom">${metaItems}</div>
</div>
<div class="page">
${bodyHtml}
<div class="footer-note">Documento interno de la Oficina de Agentes CINEPACK &mdash; ${meta.footerNote || 'no es parte del producto publicado'}.</div>
</div>
</body></html>`;

const htmlPath = outPdf.replace(/\.pdf$/, '.tmp.html');
fs.writeFileSync(htmlPath, html);

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.pdf({
    path: outPdf, format: 'A4', printBackground: true,
    margin: { top: '0mm', bottom: '14mm', left: '0mm', right: '0mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="font-size:8px; width:100%; text-align:center; color:#8a8a92; font-family:Poppins,sans-serif;"><span class="pageNumber"></span> / <span class="totalPages"></span> &middot; CINEPACK</div>`,
  });
  await browser.close();
  fs.unlinkSync(htmlPath);
  console.log('done', outPdf);
})();
