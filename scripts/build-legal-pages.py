"""Generate privacy.html, terms.html and 404.html (bilingual, shared header). Run from repo root."""
import html

def t(es, en, tag='p', attrs=''):
    return f'<{tag}{attrs} data-es="{html.escape(es, True)}" data-en="{html.escape(en, True)}">{html.escape(es)}</{tag}>'

def page(slug, title_es, title_en, desc, body, robots='', base=''):
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title data-es="{html.escape(title_es)} | InvestorBlueprint" data-en="{html.escape(title_en)} | InvestorBlueprint">{html.escape(title_es)} | InvestorBlueprint</title>
<meta name="description" content="{html.escape(desc, True)}">
{robots}<link rel="canonical" href="https://jecaaudio.github.io/InvestorBlueprint/{slug}">
{base}<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="assets/css/cookie-banner.css">
<link rel="stylesheet" href="assets/css/site-theme.css?v=20261018">
<link rel="stylesheet" href="assets/css/brand.css?v=20261019">
<link rel="stylesheet" href="assets/css/landing.css?v=20261021">
<link rel="icon" type="image/svg+xml" href="assets/brand/favicon.svg?v=1">
<link rel="apple-touch-icon" sizes="180x180" href="assets/brand/apple-touch-icon.png?v=1">
<link rel="manifest" href="manifest.webmanifest?v=1">
<meta name="theme-color" content="#0f172a">
</head>
<body>
<header class="navbar">
  <div class="brand-menu has-primary-nav">
    <a class="logo home-link brand-lockup" href="index.html" aria-label="InvestorBlueprint"><img class="brand-icon" src="assets/brand/favicon.svg" width="45" height="45" alt="" aria-hidden="true"><span class="brand-name" aria-hidden="true"><span class="brand-name-investor">Investor</span><span class="brand-name-blueprint">Blueprint</span></span></a>
  </div>
  <button id="menu-toggle" class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" data-i18n="menuToggle">☰ Menú</button>
  <nav id="primary-nav">
    <a href="index.html#tools" data-i18n="navTools">Herramientas</a>
    <a href="index.html#learn" data-i18n="navLearn">Aprender</a>
    <a href="pricing.html" data-i18n="navPricing">Precios</a>
    <a href="login.html" data-i18n="navLogin">Ingresar</a>
  </nav>
  <div class="lang-switcher" role="group" aria-label="Language selector">
    <button type="button" class="lang-option" data-lang="en" aria-label="Switch to English"><img class="flag-emoji" src="assets/flags/us.svg" alt="" aria-hidden="true"> EN</button>
    <button type="button" class="lang-option" data-lang="es" aria-label="Cambiar a Español"><img class="flag-emoji" src="assets/flags/es.svg" alt="" aria-hidden="true"> ES</button>
  </div>
</header>
<main class="lp-main legal">
{body}
</main>
<script src="assets/js/config.js"></script>
<script src="assets/js/cookie-banner-component.js"></script>
<script src="assets/js/consent.js"></script>
<script src="assets/js/analytics-ga4.js"></script>
<script src="assets/js/meta-pixel.js"></script>
<script src="lang.js"></script>
<script src="assets/js/member-i18n.js"></script>
<script src="script.js"></script>
<script src="assets/js/site-config.js?v=20261021"></script>
<script src="assets/js/site-footer.js?v=20261021"></script>
<script src="assets/js/site-theme.js?v=20261018"></script>
</body>
</html>
'''

UPDATED = t('Última actualización: 21 de octubre de 2026', 'Last updated: October 21, 2026', attrs=' class="legal-date"')

def section(h_es, h_en, *paras):
    out = [t(h_es, h_en, 'h2')]
    for p in paras:
        if isinstance(p, list):
            out.append('<ul>' + ''.join(t(a, b, 'li') for a, b in p) + '</ul>')
        else:
            out.append(t(*p))
    return '<section class="legal-section">' + ''.join(out) + '</section>'

contact_es = 'Para ejercer estos derechos o hacer preguntas, escríbenos mediante '
contact_en = 'To exercise these rights or ask questions, contact us through '
CONTACT = f'<p><span data-es="{contact_es}" data-en="{contact_en}">{contact_es}</span><span data-contact></span>.</p>'

privacy = '\n'.join([
 t('Privacidad y cookies', 'Privacy and cookies', 'h1'), UPDATED,
 t('Explicamos qué datos usa InvestorBlueprint, para qué y con quién se comparten. No vendemos tus datos.',
   'This explains which data InvestorBlueprint uses, why, and who it is shared with. We do not sell your data.', attrs=' class="lp-lead"'),
 section('Datos que usamos', 'Data we use', [
   ('Cuenta: nombre, correo y estado de tu solicitud. La contraseña se guarda cifrada y nadie de InvestorBlueprint puede verla.',
    'Account: name, email and request status. Your password is stored encrypted and nobody at InvestorBlueprint can see it.'),
   ('Preferencias: nombre y empresa para los documentos, idiomas y nivel de detalle de los informes.',
    'Preferences: name and company for documents, languages and report detail.'),
   ('Cálculos: los números que escribes se procesan en tu navegador. La calculadora de venta guarda tu último escenario en tu navegador, separado por cuenta. Los PDF se generan en tu dispositivo.',
    'Calculations: the numbers you type are processed in your browser. The seller net calculator keeps your last scenario in your browser, separated by account. PDFs are created on your device.'),
   ('Suscripción: si pagas un plan, Stripe procesa el pago. Recibimos el identificador de cliente, el plan y su estado; nunca los datos de tu tarjeta.',
    'Subscription: if you pay for a plan, Stripe processes the payment. We receive the customer id, plan and status; never your card details.'),
   ('Comentarios: lo que envías con «Enviar comentarios», junto con tu cuenta y la herramienta.',
    'Feedback: what you send with “Send feedback”, together with your account and the tool.')]),
 section('Cookies y medición', 'Cookies and measurement',
   ('Usamos almacenamiento técnico para mantener tu sesión, idioma y tema. Las cookies de analítica (Google Analytics) y de marketing (Meta) solo se activan si las aceptas en el aviso de cookies, y puedes cambiar tu decisión cuando quieras con «Preferencias de cookies» al pie de cada página.',
    'We use technical storage to keep your session, language and theme. Analytics (Google Analytics) and marketing (Meta) cookies only run if you accept them in the cookie notice, and you can change your choice anytime with “Cookie preferences” at the foot of every page.')),
 section('Proveedores', 'Service providers', [
   ('Supabase: cuentas, preferencias y comentarios.', 'Supabase: accounts, preferences and feedback.'),
   ('GitHub Pages: alojamiento del sitio.', 'GitHub Pages: website hosting.'),
   ('Stripe: pagos de suscripción, cuando estén activos.', 'Stripe: subscription payments, when enabled.'),
   ('Google y Meta: medición, solo con tu consentimiento.', 'Google and Meta: measurement, only with your consent.')]),
 section('Cuánto tiempo y tus derechos', 'Retention and your rights',
   ('Conservamos los datos de tu cuenta mientras esté activa. Puedes pedir una copia, corregirlos o eliminar tu cuenta y sus datos.',
    'We keep your account data while it is active. You can request a copy, correct it, or delete your account and its data.')),
 '<section class="legal-section">' + t('Contacto', 'Contact', 'h2') + CONTACT + '</section>',
])

terms = '\n'.join([
 t('Términos de uso', 'Terms of use', 'h1'), UPDATED,
 t('Al usar InvestorBlueprint aceptas estos términos.', 'By using InvestorBlueprint you agree to these terms.', attrs=' class="lp-lead"'),
 section('El servicio', 'The service',
   ('InvestorBlueprint ofrece calculadoras para analizar operaciones inmobiliarias en Estados Unidos: venta, flip, rentas, ARV y préstamos.',
    'InvestorBlueprint provides calculators to analyze real estate deals in the United States: sales, flips, rentals, ARV and loans.')),
 section('No es asesoría profesional', 'Not professional advice',
   ('Los resultados son estimaciones informativas basadas en los datos que introduces. No son asesoría financiera, legal, fiscal ni un avalúo. Confirma impuestos, cierres, préstamos y valores con tu agente, prestamista, compañía de título, contador o abogado antes de decidir.',
    'Results are informational estimates based on the data you enter. They are not financial, legal or tax advice, nor an appraisal. Confirm taxes, closings, loans and values with your agent, lender, title company, accountant or attorney before deciding.')),
 section('Tu cuenta', 'Your account', [
   ('Usa datos verdaderos y una cuenta por persona.', 'Use accurate details and one account per person.'),
   ('Cuida tu contraseña; eres responsable de lo que se haga con tu cuenta.', 'Keep your password safe; you are responsible for activity on your account.'),
   ('Podemos rechazar o suspender cuentas que incumplan estos términos.', 'We may decline or suspend accounts that break these terms.')]),
 section('Planes, pagos y cancelación', 'Plans, payments and cancellation', [
   ('El plan Gratis no requiere pago. El plan Pro se cobra por mes o por año mediante Stripe y se renueva automáticamente.',
    'The Free plan requires no payment. The Pro plan is billed monthly or yearly through Stripe and renews automatically.'),
   ('Si el plan incluye prueba gratis, no se cobra si cancelas antes de que termine.',
    'If the plan includes a free trial, you are not charged if you cancel before it ends.'),
   ('Puedes cancelar cuando quieras desde Mi perfil; conservas el acceso hasta el final del periodo pagado. No hacemos reembolsos de periodos parciales, salvo que la ley lo exija.',
    'You can cancel anytime from My profile; you keep access until the end of the paid period. Partial periods are not refunded unless required by law.'),
   ('Si cambiamos los precios, te avisaremos antes de que el cambio afecte tu próxima renovación.',
    'If prices change, we will tell you before the change affects your next renewal.')]),
 section('Uso permitido', 'Acceptable use', [
   ('No copies, revendas ni automatices el acceso a las calculadoras.', 'Do not copy, resell or automate access to the calculators.'),
   ('No intentes acceder a cuentas o datos de otras personas.', 'Do not try to access other people’s accounts or data.')]),
 section('Responsabilidad', 'Liability',
   ('El servicio se ofrece tal cual. En la medida que permita la ley, InvestorBlueprint no responde por decisiones tomadas con base en los cálculos, y nuestra responsabilidad total se limita a lo que pagaste en los últimos 12 meses.',
    'The service is provided as is. To the extent permitted by law, InvestorBlueprint is not liable for decisions made from the calculations, and our total liability is limited to what you paid in the last 12 months.')),
 section('Cambios', 'Changes',
   ('Podemos actualizar estos términos. Publicaremos la fecha de la última versión en esta página.',
    'We may update these terms. The date of the latest version is shown on this page.')),
 '<section class="legal-section">' + t('Contacto', 'Contact', 'h2') +
   '<p><span data-es="Escríbenos mediante " data-en="Contact us through ">Escríbenos mediante </span><span data-contact></span>.</p></section>',
])

notfound = '\n'.join([
 '<section class="lp-section">',
 t('Error 404', 'Error 404', attrs=' class="lp-eyebrow"'),
 t('No encontramos esta página', 'We could not find this page', 'h1'),
 t('Puede que el enlace esté mal escrito o que la página ya no exista. Prueba con una de estas calculadoras:',
   'The link may be mistyped or the page may no longer exist. Try one of these calculators:', attrs=' class="lp-lead"'),
 '<div class="lp-related">' + ''.join(t(a, b, 'a', f' href="{h}"') for h, a, b in [
   ('calculadoras/venta.html', 'Calculadora de venta', 'Seller net calculator'), ('calculadoras/flip.html', 'Calculadora de flip', 'Flip calculator'),
   ('calculadoras/rentas.html', 'Calculadora de rentas', 'Rental calculator'), ('calculadoras/arv.html', 'Calculadora de ARV', 'ARV calculator'),
   ('calculadoras/hard-money.html', 'Préstamo hard money', 'Hard money loan')]) + '</div>',
 '<p>' + t('Volver al inicio', 'Back to home', 'a', ' class="btn btn-primary" href="index.html"') + '</p>',
 '</section>'])

open('privacy.html', 'w').write(page('privacy.html', 'Privacidad y cookies', 'Privacy and cookies',
  'Qué datos usa InvestorBlueprint, para qué, con quién se comparten y cómo cambiar tus preferencias de cookies.', privacy))
open('terms.html', 'w').write(page('terms.html', 'Términos de uso', 'Terms of use',
  'Términos de uso de InvestorBlueprint: el servicio, cuentas, planes, pagos, cancelación y responsabilidad.', terms))
open('404.html', 'w').write(page('404.html', 'Página no encontrada', 'Page not found',
  'La página que buscas no existe.', notfound, robots='<meta name="robots" content="noindex">\n',
  base='<base href="/InvestorBlueprint/">\n'))
print('generated privacy.html terms.html 404.html')
