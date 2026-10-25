"""Generate the public calculator landing pages in calculadoras/. Run from the repo root: python3 scripts/build-landing-pages.py"""
import html, json, os

SITE = 'https://jecaaudio.github.io/InvestorBlueprint/'

# The result notice comes from assets/js/disclaimers.js so the site, PDFs and these pages agree.
import re
_DISCLAIMER_JS = open(os.path.join(os.path.dirname(__file__), '..', 'assets', 'js', 'disclaimers.js'), encoding='utf-8').read()
def _pair(block):
    return (re.search(r"es:\s*'([^']*)'", block).group(1), re.search(r"en:\s*'([^']*)'", block).group(1))
GENERAL = _pair(re.search(r"const GENERAL = \{(.*?)\};", _DISCLAIMER_JS, re.S).group(1))
DISCLAIMERS = {m.group(1): _pair(m.group(2)) for m in re.finditer(r"'?([a-z-]+)'?: \{(\s*es:.*?en:\s*'[^']*')\s*\}", _DISCLAIMER_JS, re.S)}
NOTICE_KEY = {'venta': 'seller-net', 'flip': 'flip', 'rentas': 'rental', 'arv': 'arv', 'hard-money': 'hard-money'}

def t(es, en, tag='span', cls='', attrs=''):
    c = f' class="{cls}"' if cls else ''
    return f'<{tag}{c}{attrs} data-es="{html.escape(es, True)}" data-en="{html.escape(en, True)}">{html.escape(es)}</{tag}>'

PAGES = [
 dict(slug='venta', tool='../calculadora-venta/', title='Calculadora de venta: cuánto te queda al vender una casa', title_en='Seller net calculator: what you take home from a home sale',
  desc='Calcula gratis cuánto dinero te queda al vender una propiedad en EE. UU.: comisiones, hipoteca, gastos de cierre e impuesto de transferencia por estado. En español.',
  eyebrow=('Calculadora de venta · neto del vendedor','Seller net calculator'),
  h1=('¿Cuánto te queda en el bolsillo al vender la propiedad?','How much will you actually take home from the sale?'),
  lead=('Calcula el neto del vendedor con comisiones, hipotecas, concesiones e impuesto de transferencia de tu estado. En español, en minutos y con un PDF listo para tu cliente.',
        'Work out the seller net with commissions, mortgages, concessions and your state transfer tax. In Spanish or English, in minutes, with a PDF ready for your client.'),
  calc='venta', fields=[('price','Precio de venta','Sale price','385000'),('mortgage','Saldo de hipoteca','Mortgage balance','150000'),
   ('commissionPct','Comisiones (%)','Commissions (%)','6'),('closingPct','Otros gastos de cierre (%)','Other closing costs (%)','2')],
  note=('Versión rápida con porcentajes generales. La calculadora completa suma el impuesto de transferencia de tu estado y condado, prorrateos, concesiones y segundas hipotecas.',
        'Quick version with general percentages. The full calculator adds your state and county transfer tax, prorations, concessions and second mortgages.'),
  benefits=[('Sin sorpresas en el cierre','No surprises at closing','Ve cada costo antes de firmar el listado o aceptar una oferta.','See every cost before signing the listing or accepting an offer.'),
   ('Impuestos por estado','Taxes by state','Fórmula automática con su ley citada en Kentucky, Illinois, Florida (incluido Miami-Dade) y Texas.','Automatic formula with its statute cited for Kentucky, Illinois, Florida (including Miami-Dade) and Texas.'),
   ('PDF para tu cliente','PDF for your client','Con tu nombre y empresa arriba, en español o inglés, detallado o resumido.','With your name and company on top, in Spanish or English, detailed or summary.')],
  steps=[('Elige estado y condado.','Choose the state and county.'),('Escribe precio, hipotecas y comisiones.','Enter price, mortgages and commissions.'),('Descarga el PDF o compara precios de venta.','Download the PDF or compare sale prices.')],
  includes=[('Los 50 estados y D.C., con impuesto automático donde la fórmula está verificada','All 50 states and D.C., with automatic tax where the formula is verified'),
   ('Segunda hipoteca, deudas asumidas, concesiones y prorrateos','Second mortgage, assumed debt, concessions and prorations'),
   ('Comparación de escenarios de precio','Sale price scenario comparison'),('PDF detallado o resumido y exportación CSV','Detailed or summary PDF and CSV export')],
  faq=[('¿Reemplaza el Closing Disclosure?','Does it replace the Closing Disclosure?','No. Es una estimación para planificar; los montos finales los confirma la compañía de título.','No. It is a planning estimate; the title company confirms final amounts.'),
   ('¿Qué estados calcula solos?','Which states are calculated automatically?','Kentucky, Illinois, Florida y Texas. En los demás escribes el impuesto confirmado y el resto se calcula igual.','Kentucky, Illinois, Florida and Texas. Elsewhere you enter the confirmed tax and everything else is calculated the same way.'),
   ('¿Puedo escribir 385.000 con punto?','Can I type 385.000 with a dot?','Sí. La calculadora entiende 385.000 y 385,000 y te muestra cómo leyó el número.','Yes. It understands 385.000 and 385,000 and shows you how it read the number.')]),
 dict(slug='flip', tool='../tools/flip-calculator.html', title='Calculadora de flip: ganancia, ROI y oferta máxima', title_en='Flip calculator: profit, ROI and maximum offer',
  desc='Calcula gratis la ganancia de un flip de casas: compra, reparación, meses de espera y venta. ROI sobre tu dinero, precio mínimo de venta y regla del 70%. En español.',
  eyebrow=('Calculadora de flip','Flip calculator'),
  h1=('¿Este flip deja ganancia? Sábelo antes de hacer la oferta.','Will this flip make money? Know before you make the offer.'),
  lead=('Compra, reparación, meses de espera, préstamo hard money y venta. Obtén la ganancia, el ROI sobre tu dinero, el precio mínimo de venta y la oferta máxima.',
        'Purchase, rehab, holding months, hard money loan and sale. Get the profit, ROI on your cash, break-even sale price and maximum offer.'),
  calc='flip', fields=[('purchase','Precio de compra','Purchase price','200000'),('rehab','Reparación','Rehab','50000'),
   ('sale','Precio de venta (ARV)','Sale price (ARV)','320000'),('holdingMonths','Meses hasta vender','Months to sell','6'),('monthly','Gastos por mes','Monthly costs','1000')],
  note=('Supuestos de la versión rápida: compra en efectivo, 2% de cierre al comprar, 6% de comisión y 1% de cierre al vender. La completa agrega préstamo, puntos, desembolsos, contingencia y escenarios.',
        'Quick version assumptions: cash purchase, 2% buyer closing, 6% commission and 1% seller closing. The full version adds the loan, points, draws, contingency and scenarios.'),
  benefits=[('Números antes de ofertar','Numbers before you offer','Sabes cuánto puedes pagar antes de comprometerte.','Know what you can pay before you commit.'),
   ('ROI sobre tu dinero','ROI on your cash','La versión completa resta lo que pone el prestamista y mide el retorno sobre tu capital.','The full version subtracts the lender\'s money and measures return on your own capital.'),
   ('Escenarios de riesgo','Risk scenarios','Ve qué pasa si vendes 5% más barato o más caro.','See what happens if you sell 5% lower or higher.')],
  steps=[('Escribe compra, reparación y venta.','Enter purchase, rehab and sale.'),('Agrega meses, gastos y préstamo.','Add months, costs and the loan.'),('Revisa ganancia, ROI y oferta máxima.','Review profit, ROI and maximum offer.')],
  includes=[('Préstamo hard money con puntos, intereses y desembolsos por mes','Hard money loan with points, interest and monthly draws'),
   ('Costos de cierre, prorrateos, inspección y contingencia','Closing costs, prorations, inspection and contingency'),
   ('Precio de equilibrio, oferta máxima y escenarios ±5%','Break-even, maximum offer and ±5% scenarios'),('PDF con tus datos y supuestos','PDF with your inputs and assumptions')],
  faq=[('¿Qué es el ARV?','What is ARV?','El valor estimado de la propiedad después de repararla, según ventas comparables recientes.','The estimated value after repairs, based on recent comparable sales.'),
   ('¿Qué es la regla del 70%?','What is the 70% rule?','Una guía rápida: ofrecer como máximo el 70% del ARV menos la reparación. Sirve para filtrar, no para decidir sola.','A quick guide: offer at most 70% of ARV minus repairs. It filters deals; it should not decide alone.'),
   ('¿Por qué el ROI cambia con préstamo?','Why does ROI change with a loan?','Porque pones menos dinero propio. La versión completa calcula el ROI sobre tu capital, no sobre el costo total.','Because you put in less of your own money. The full version measures ROI on your capital, not on total cost.')]),
 dict(slug='rentas', tool='../tools/rental-cash-flow.html', title='Calculadora de rentas: flujo de caja, NOI y cap rate', title_en='Rental calculator: cash flow, NOI and cap rate',
  desc='Calcula gratis si una propiedad de renta paga su hipoteca: flujo de caja mensual, NOI, cap rate y cash-on-cash. En español.',
  eyebrow=('Calculadora de propiedades de renta','Rental property calculator'),
  h1=('¿Esta propiedad paga sola su hipoteca?','Does this rental pay for itself?'),
  lead=('Flujo de caja mensual después de la hipoteca, ingreso operativo neto (NOI), cap rate y retorno sobre tu dinero.',
        'Monthly cash flow after the mortgage, net operating income (NOI), cap rate and cash-on-cash return.'),
  calc='rentas', fields=[('rent','Renta mensual','Monthly rent','2400'),('vacancyRate','Vacancia (%)','Vacancy (%)','5'),
   ('expenses','Gastos mensuales','Monthly expenses','710'),('mortgage','Pago de hipoteca mensual','Monthly mortgage payment','1200')],
  note=('Gastos mensuales = impuestos, seguro, mantenimiento y administración. La versión completa los separa y agrega HOA, servicios, reserva de capital, cap rate y cash-on-cash.',
        'Monthly expenses = taxes, insurance, maintenance and management. The full version itemizes them and adds HOA, utilities, capital reserve, cap rate and cash-on-cash.'),
  benefits=[('Flujo real, después de la hipoteca','Real cash flow, after the mortgage','No te quedas con la renta bruta: ves lo que de verdad entra cada mes.','Not the gross rent: what actually comes in each month.'),
   ('Métricas que usan los bancos','Metrics lenders use','NOI y cap rate para comparar propiedades entre sí.','NOI and cap rate to compare properties.'),
   ('Retorno sobre tu dinero','Return on your cash','Cash-on-cash según lo que realmente invertiste.','Cash-on-cash based on what you actually invested.')],
  steps=[('Escribe la renta y la vacancia.','Enter rent and vacancy.'),('Agrega gastos e hipoteca.','Add expenses and the mortgage.'),('Compara flujo, NOI y cap rate.','Compare cash flow, NOI and cap rate.')],
  includes=[('Gastos separados: impuestos, seguro, mantenimiento, administración, HOA y servicios','Itemized costs: taxes, insurance, maintenance, management, HOA and utilities'),
   ('Reserva para reemplazos de capital','Capital replacement reserve'),('Cap rate y cash-on-cash','Cap rate and cash-on-cash'),('PDF con tus datos','PDF with your inputs')],
  faq=[('¿Qué es el NOI?','What is NOI?','Ingresos menos gastos operativos, antes de la hipoteca. Es la base del cap rate.','Income minus operating expenses, before the mortgage. It drives the cap rate.'),
   ('¿Qué es cash-on-cash?','What is cash-on-cash?','El flujo anual dividido entre el dinero que pusiste tú.','Annual cash flow divided by the cash you put in.'),
   ('¿Por qué una reserva de capital?','Why a capital reserve?','Techos, calentadores y aires se reemplazan. Apartar cada mes evita sorpresas.','Roofs, heaters and AC units get replaced. Setting money aside each month avoids surprises.')]),
 dict(slug='arv', tool='../tools/arv-estimator.html', title='Calculadora de ARV con ventas comparables', title_en='ARV calculator with comparable sales',
  desc='Calcula gratis el ARV (valor después de reparar) con ventas comparables, y la oferta máxima con la regla del 70%. En español.',
  eyebrow=('Calculadora de ARV','ARV calculator'),
  h1=('Calcula el valor después de reparar con tus comparables.','Estimate after-repair value from your comparables.'),
  lead=('Promedia ventas comparables, agrega ajustes documentados y obtén el rango de valor y la oferta máxima.',
        'Average comparable sales, add documented adjustments and get the value range and maximum offer.'),
  calc='arv', fields=[('comp1','Venta comparable 1','Comparable sale 1','305000'),('comp2','Venta comparable 2','Comparable sale 2','315000'),
   ('comp3','Venta comparable 3','Comparable sale 3','322000'),('repairs','Reparación estimada','Estimated repairs','38000')],
  note=('Promedio simple de tres ventas. La versión completa permite ajustes en dólares por tamaño, estado o fecha, con la evidencia de cada comparable.',
        'Simple average of three sales. The full version allows dollar adjustments for size, condition or date, with evidence for each comparable.'),
  benefits=[('Valor con respaldo','Value you can back up','Cada comparable con su fuente y su ajuste.','Each comparable with its source and adjustment.'),
   ('Rango, no un número mágico','A range, not a magic number','Ves el mínimo y el máximo observados.','See the lowest and highest observed values.'),
   ('Conecta con el flip','Connects to the flip','Usa el ARV en la calculadora de flip.','Use the ARV in the flip calculator.')],
  steps=[('Escribe tres ventas comparables.','Enter three comparable sales.'),('Ajusta por diferencias documentadas.','Adjust for documented differences.'),('Obtén ARV, rango y oferta máxima.','Get ARV, range and maximum offer.')],
  includes=[('Ajustes positivos o negativos por comparable','Positive or negative adjustments per comparable'),('Notas de fecha, fuente y evidencia','Date, source and evidence notes'),('Rango observado y oferta máxima','Observed range and maximum offer'),('PDF con fuentes','PDF with sources')],
  faq=[('¿Qué es un comparable?','What is a comparable?','Una venta cerrada reciente de una propiedad parecida y cercana.','A recent closed sale of a similar, nearby property.'),
   ('¿Es un avalúo?','Is it an appraisal?','No. Es una estimación para analizar ofertas; no reemplaza un avalúo ni un CMA certificado.','No. It is an estimate for analyzing offers; it does not replace an appraisal or a certified CMA.')]),
 dict(slug='hard-money', tool='../tools/hard-money-analyzer.html', title='Calculadora de préstamo hard money: intereses y puntos', title_en='Hard money loan calculator: interest and points',
  desc='Calcula gratis el costo real de un préstamo hard money: intereses, puntos y cargos según los desembolsos. En español.',
  eyebrow=('Calculadora de préstamo hard money','Hard money loan calculator'),
  h1=('¿Cuánto te cuesta de verdad el préstamo hard money?','What does the hard money loan really cost?'),
  lead=('Intereses, puntos y cargos según cómo se desembolsa el dinero. Ve el costo total antes de firmar.',
        'Interest, points and fees based on how the money is drawn. See the total cost before you sign.'),
  calc='hard-money', fields=[('loan','Monto del préstamo','Loan amount','210000'),('interestRate','Tasa anual (%)','Annual rate (%)','11.5'),
   ('points','Puntos','Points','2'),('months','Meses','Months','9')],
  note=('Versión rápida: todo el préstamo desde el mes cero, interés simple. La completa acepta desembolsos por mes, interés capitalizado y cargos del prestamista.',
        'Quick version: full loan from month zero, simple interest. The full version takes monthly draws, capitalized interest and lender fees.'),
  benefits=[('Costo total, no solo la tasa','Total cost, not just the rate','Intereses más puntos más cargos, en un solo número.','Interest plus points plus fees, in one number.'),
   ('Desembolsos reales','Real draws','Pagas interés solo sobre lo que ya recibiste.','You pay interest only on what has been drawn.'),
   ('Compara antes de firmar','Compare before signing','Prueba varias tasas y puntos en segundos.','Try different rates and points in seconds.')],
  steps=[('Escribe monto, tasa y puntos.','Enter amount, rate and points.'),('Agrega meses y desembolsos.','Add months and draws.'),('Revisa el costo total.','Review the total cost.')],
  includes=[('Desembolsos por mes','Draws by month'),('Interés simple o capitalizado','Simple or capitalized interest'),('Cargos del prestamista y penalidades','Lender fees and penalties'),('PDF con tus datos','PDF with your inputs')],
  faq=[('¿Qué son los puntos?','What are points?','Un cargo inicial: 1 punto es el 1% del monto del préstamo.','An upfront fee: 1 point is 1% of the loan amount.'),
   ('¿Por qué importan los desembolsos?','Why do draws matter?','Si el dinero de la reparación llega por partes, pagas menos interés que si te lo dan todo el primer día.','If rehab money arrives in parts, you pay less interest than if it all arrives on day one.')]),
]

HEAD = '''<!DOCTYPE html>
<html lang="es">
<head>
<script src="../assets/js/session-security.js?v=20261023session"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title data-es="{title} | InvestorBlueprint" data-en="{title_en} | InvestorBlueprint">{title} | InvestorBlueprint</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{site}calculadoras/{slug}.html">
<meta property="og:site_name" content="InvestorBlueprint">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="{site}calculadoras/{slug}.html">
<meta property="og:image" content="{site}assets/brand/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="es_US">
<meta property="og:locale:alternate" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{jsonld}</script>
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="../assets/css/cookie-banner.css">
<link rel="stylesheet" href="../assets/css/site-theme.css?v=20261023compact">
<link rel="stylesheet" href="../assets/css/brand.css?v=20261019">
<link rel="stylesheet" href="../assets/css/landing.css?v=20261023">
<link rel="stylesheet" href="../assets/css/finance-visuals.css?v=20261023">
<link rel="icon" type="image/svg+xml" href="../assets/brand/favicon.svg?v=1">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/brand/favicon-32.png?v=1">
<link rel="apple-touch-icon" sizes="180x180" href="../assets/brand/apple-touch-icon.png?v=1">
<link rel="manifest" href="../manifest.webmanifest?v=1">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-title" content="InvestorBlueprint">
</head>
<body data-landing="{slug}">
<header class="navbar">
  <div class="brand-menu has-primary-nav">
    <a class="logo home-link brand-lockup" href="../index.html" aria-label="InvestorBlueprint"><img class="brand-icon" src="../assets/brand/favicon.svg" width="45" height="45" alt="" aria-hidden="true"><span class="brand-name" aria-hidden="true"><span class="brand-name-investor">Investor</span><span class="brand-name-blueprint">Blueprint</span></span></a>
  </div>
  <button id="menu-toggle" class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" data-i18n="menuToggle">☰ Menú</button>
  <nav id="primary-nav">
    <a href="../index.html#tools" data-i18n="navTools">Herramientas</a>
    <a href="../index.html#learn" data-i18n="navLearn">Aprender</a>
    <a href="../pricing.html" data-i18n="navPricing">Acceso gratis</a>
    <a href="../login.html" data-i18n="navLogin">Ingresar</a>
  </nav>
  <div class="lang-switcher" role="group" aria-label="Language selector">
    <button type="button" class="lang-option" data-lang="en" aria-label="EN, English"><img class="flag-emoji" src="../assets/flags/us.svg" alt="" aria-hidden="true"> EN</button>
    <button type="button" class="lang-option" data-lang="es" aria-label="ES, Español"><img class="flag-emoji" src="../assets/flags/es.svg" alt="" aria-hidden="true"> ES</button>
  </div>
</header>
'''

FOOT_SCRIPTS = '''<script src="../assets/js/config.js"></script>
<script src="../assets/js/cookie-banner-component.js"></script>
<script src="../assets/js/consent.js"></script>
<script src="../assets/js/analytics-ga4.js"></script>
<script src="../assets/js/meta-pixel.js"></script>
<script src="../assets/js/analytics.js"></script>
<script src="../assets/js/track-events.js"></script>
<script src="../lang.js"></script>
<script src="../assets/js/member-i18n.js"></script>
<script src="../script.js?v=20261023compact"></script>
<script src="../assets/js/finance-visuals.js?v=20261023"></script>
<script src="../tools/tool-script.js?v=20261023"></script>
<script src="../assets/js/landing.js?v=20261023"></script>
<script src="../assets/js/site-config.js?v=20261021b"></script>
<script src="../assets/js/site-footer.js?v=20261025free"></script>
<script src="../assets/js/auth-nav.js?v=20261023session"></script>
<script src="../assets/js/site-theme.js?v=20261023compact"></script>
</body>
</html>
'''

def page(p):
    jsonld = json.dumps({
        '@context': 'https://schema.org', '@type': 'WebApplication', 'name': p['title'],
        'url': f"{SITE}calculadoras/{p['slug']}.html", 'description': p['desc'],
        'applicationCategory': 'FinanceApplication', 'operatingSystem': 'Web', 'inLanguage': ['es', 'en'],
        'isAccessibleForFree': True, 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'},
        'publisher': {'@type': 'Organization', 'name': 'InvestorBlueprint', 'logo': SITE + 'assets/brand/icon-512.png'}
    }, ensure_ascii=False).replace('</', '<\\/')
    out = [HEAD.format(title=html.escape(p['title'], True), title_en=html.escape(p['title_en'], True),
                       desc=html.escape(p['desc'], True), site=SITE, slug=p['slug'], jsonld=jsonld)]
    fields = ''.join(
        f'<label for="q-{n}">{t(es, en)}<input id="q-{n}" name="{n}" type="text" inputmode="decimal" autocomplete="off" value="{v}"><small aria-live="polite"></small></label>'
        for n, es, en, v in p['fields'])
    out.append('<main class="lp-main">\n<section class="lp-hero">\n<div>')
    out.append(t(*p['eyebrow'], tag='p', cls='lp-eyebrow'))
    out.append(t(*p['h1'], tag='h1'))
    out.append(t(*p['lead'], tag='p', cls='lp-lead'))
    out.append('<div class="lp-actions">' + t('Solicitar acceso gratis', 'Request free access', tag='a', cls='btn btn-primary', attrs=' href="../login.html" data-cta-click="Landing request access"') +
               t('Abrir la calculadora completa', 'Open the full calculator', tag='a', cls='btn', attrs=f' href="{p["tool"]}"') + '</div>')
    out.append(t('Cálculos verificados con casos resueltos a mano · En español e inglés · Sin tarjeta', 'Math checked against hand-worked cases · Spanish and English · No card required', tag='p', cls='lp-trust'))
    out.append('</div>')
    out.append(f'<form class="lp-quick" data-quick-calc="{p["calc"]}" novalidate aria-labelledby="quick-title">')
    out.append(t('Pruébala ahora, sin cuenta · USD', 'Try it now, no account needed · USD', tag='h2', attrs=' id="quick-title"'))
    out.append(f'<div class="lp-fields">{fields}</div>')
    out.append('<div id="quick-result" class="lp-result" aria-live="polite"></div>')
    out.append(t(*p['note'], tag='p', cls='lp-quick-note'))
    es, en = DISCLAIMERS[NOTICE_KEY[p['slug']]]
    out.append('<aside class="ib-disclaimer" role="note">' + t('Importante', 'Important', tag='strong') +
               t(es + ' ' + GENERAL[0], en + ' ' + GENERAL[1]) + '</aside>')
    out.append('</form>\n</section>')
    out.append('<section class="lp-section">' + t('Lo que resuelve', 'What it solves', tag='h2') + '<div class="lp-grid">' +
               ''.join('<article class="lp-card">' + t(a, b, tag='h3') + t(c, d, tag='p') + '</article>' for a, b, c, d in p['benefits']) + '</div></section>')
    out.append('<section class="lp-section">' + t('Cómo funciona', 'How it works', tag='h2') + '<div class="lp-grid">' +
               ''.join(f'<article class="lp-card"><span class="lp-step">{i}</span>' + t(a, b, tag='p') + '</article>' for i, (a, b) in enumerate(p['steps'], 1)) + '</div></section>')
    out.append('<section class="lp-section">' + t('La versión completa incluye', 'The full version includes', tag='h2') + '<ul class="lp-includes">' +
               ''.join(t(a, b, tag='li') for a, b in p['includes']) + '</ul></section>')
    out.append('<section class="lp-section">' + t('Preguntas frecuentes', 'Frequently asked questions', tag='h2') + '<div class="lp-faq">' +
               ''.join('<details>' + t(q, qe, tag='summary') + t(a, ae, tag='p') + '</details>' for q, qe, a, ae in p['faq']) + '</div></section>')
    others = [o for o in PAGES if o['slug'] != p['slug']]
    out.append('<section class="lp-cta"><div>' + t('Analiza tu próxima propiedad con números claros', 'Analyze your next property with clear numbers', tag='h2') +
               t('Solicita acceso y usa todas las calculadoras, con PDF para tus clientes.', 'Request access and use every calculator, with PDFs for your clients.', tag='p') + '</div>' +
               t('Solicitar acceso gratis', 'Request free access', tag='a', cls='btn btn-primary', attrs=' href="../login.html"') + '</section>')
    out.append('<nav class="lp-related" aria-label="Otras calculadoras">' + ''.join(t(o['eyebrow'][0], o['eyebrow'][1], tag='a', attrs=f' href="{o["slug"]}.html"') for o in others) + '</nav>')
    out.append('</main>')
    out.append(FOOT_SCRIPTS)
    return '\n'.join(out)

os.makedirs('calculadoras', exist_ok=True)
for p in PAGES:
    with open(f'calculadoras/{p["slug"]}.html', 'w') as f:
        f.write(page(p))
print('generated', [p['slug'] for p in PAGES])
