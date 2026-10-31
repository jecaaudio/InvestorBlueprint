# InvestorBlueprint

Sitio estatico bilingue (EN/ES) para una plataforma de herramientas de inversion inmobiliaria.

## Publicar la pagina en la web (GitHub Pages)

**Configuración pendiente detectada el 30 de octubre:** además del workflow, seguía activo un publicador Jekyll de rama. En Settings → Pages → Source, seleccionar **GitHub Actions** para que la publicación dependa únicamente del control de Quality. `_config.yml` excluye archivos internos si el publicador heredado llega a ejecutarse, pero no reemplaza ese cambio de configuración.

Este repositorio incluye el workflow `.github/workflows/deploy-pages.yml` para publicar automaticamente en GitHub Pages.

### Pasos

1. Sube este codigo a tu repositorio en GitHub.
2. Asegurate de que la rama principal sea `main`.
3. En GitHub, entra a **Settings -> Pages**.
4. En **Build and deployment**, selecciona **Source: GitHub Actions**.
5. Haz push a `main` o ejecuta el workflow manualmente en **Actions**.

Cuando termine el workflow, la web quedara visible en la URL de Pages del repositorio:

- `https://<tu-usuario>.github.io/<tu-repo>/`

Para este repo:

- `https://jecaaudio.github.io/InvestorBlueprint/`

## Desarrollo local

Desde la carpeta del repo:

```bash
python -m http.server 4173
```

Luego abre:

- `http://localhost:4173/InvestorBlueprint/` si estas sirviendo desde la carpeta padre.
- `http://localhost:4173/` si estas sirviendo desde la carpeta del proyecto.

## Pruebas y quality gates (CI)

El workflow `.github/workflows/quality.yml` corre en cada push y pull request:

- **Pruebas unitarias, de estructura y de DOM** (`npm test`): rutas protegidas, recuperación de contraseña, finanzas de cada calculadora, reportes, perfiles y despliegue. Cuatro pruebas que necesitan navegador, el endpoint en vivo o archivos privados corren en pasos aparte; una prueba falla si aparece un archivo `scripts/*.test.mjs` que no esté en ninguna lista.
- **Accesibilidad** con `axe` en páginas clave.
- **Lighthouse** con mínimos de performance, accesibilidad, best-practices y SEO.

GitHub Pages solo publica un commit si este workflow pasó en ese mismo commit (ver `.github/workflows/deploy-pages.yml`).

Para ejecutarlos localmente:

```bash
npm install
npm test
npx playwright install chromium
python -m http.server 4173
npm run qa:axe
npm run qa:lighthouse
```

Si estas sirviendo desde la carpeta del proyecto y no desde la carpeta padre, ejecuta axe con:

```bash
AXE_SITE_BASE_PATH= npm run qa:axe
```

El worker ARV (`workers/arv-worker`) tiene sus propias pruebas: `cd workers/arv-worker && npm test`.

## SDK de Supabase

Todas las páginas cargan la misma versión fija del SDK (`@supabase/supabase-js@2.117.0`) con un hash de integridad (`integrity="sha384-..."`). Si el CDN entrega un archivo distinto, el navegador no lo ejecuta. Para actualizar la versión, cambia la URL y el hash juntos en todas las páginas y en `scripts/site-smoke.test.mjs`; la prueba falla si alguna página queda distinta.

## Portadas públicas y precios

- `calculadoras/` tiene una portada por herramienta pública (venta, flip, rentas, ARV, hard money), con una calculadora rápida que funciona sin cuenta. Los textos se editan en `scripts/build-landing-pages.py`; luego se ejecuta `python3 scripts/build-landing-pages.py`.
- `pricing.html` explica el acceso gratuito: calculadoras rápidas sin cuenta y versiones completas tras aprobación. El cobro está desactivado; no hace falta una suscripción para el acceso aprobado.
- La portada usa `assets/css/home.css`. Su catálogo estático y su respaldo sin conexión se generan desde `assets/config/tools.json`: ejecutar `node scripts/build-home-catalog.mjs` después de editar el catálogo. Las pruebas detectan diferencias entre las tarjetas y su fuente.
- Los PDF ponen arriba la empresa o el nombre del miembro, y al final una línea pequeña con el logo y "Preparado con InvestorBlueprint".

## Modo beta tester

Tres herramientas siguen en pruebas: **Búsqueda por ROI** (datos simulados), **ARV automático** (sin proveedor de datos real) y **Renta sugerida** (se fusionará con Flujo de renta). En `assets/config/tools.json` tienen `"access": "beta"`.

- Solo las ven y las abren el administrador y los miembros marcados como **beta tester**. Para los demás no aparecen en el catálogo, y si abren el enlace ven un aviso en lugar de la herramienta.
- El administrador marca o desmarca a cada miembro en `admin.html` con la casilla **Beta tester**.
- **Paso único en Supabase:** aplicar `supabase/migrations/20261021120000_beta_testers.sql` (SQL Editor o `supabase db push`). Agrega la columna `beta_tester`, que solo el administrador puede cambiar, y la función `private.has_beta_access()`. Hasta aplicarla, el administrador ya tiene acceso beta y la casilla aparece desactivada con un aviso. Reversión: `supabase/rollback/beta_testers.sql`. Pruebas: `supabase/tests/beta-testers.sql`.
- La Edge Function `ib-protected-tools` también exige permisos de beta en el servidor antes de entregar `roi-search`, `rent` y `automated-arv`. Comprobado en la versión 6 durante la auditoría del 30 de octubre.

## Acceso y seguridad (octubre de 2026)

- InvestorBlueprint usa Supabase Auth (correo y contraseña), perfiles de usuarios con aprobación administrativa y políticas RLS.
- El administrador principal registrado está aprobado en Supabase. **Nunca** se guardan contraseñas ni claves secretas en GitHub.
- `login.html` permite solicitar acceso, iniciar sesión y recuperar la contraseña; `admin.html` solo consulta datos con RLS para administradores aprobados.
- Las ocho direcciones de herramientas son *loaders*: el HTML de la calculadora llega desde la Edge Function `ib-protected-tools` únicamente tras validar una sesión y el permiso actualizado en Supabase.
- El workflow publica un sitio seleccionado (`public-site/`) y no la raíz completa del repositorio; archivos internos, demos y scripts antiguos quedan excluidos de GitHub Pages.
- **Limitación importante:** este repositorio continúa siendo público y su historial contiene versiones antiguas del código de las calculadoras. Las librerías JavaScript que ejecuta el navegador tampoco son secretas. Para proteger propiedad intelectual, migrar a un repositorio privado y mover la lógica confidencial al servidor.
- La organización Supabase `JECA` continúa en el plan **Free**. La comprobación nativa de contraseñas filtradas sigue desactivada; la aplicación añade una comprobación de nuevas contraseñas por rangos de hash, sin enviar la contraseña. Esa comprobación del navegador no sustituye una restricción nativa del servidor frente a clientes externos.
- Pendiente en el panel de Supabase: **Authentication → URL Configuration**. Configurar **Site URL** como `https://jecaaudio.github.io/InvestorBlueprint/` y añadir `https://jecaaudio.github.io/InvestorBlueprint/login.html` en **Redirect URLs**. Esta configuración no se puede gestionar con las acciones del conector Supabase disponibles actualmente.
- El flujo de recuperación por correo y el login desde iPhone requieren pruebas reales. El envío de correos a clientes externos exige configurar SMTP apropiado.
- Una implementación solo con GitHub Pages **no** proporciona confidencialidad del código que se ejecute en el navegador.

La [auditoría de producto del 30 de octubre](docs/product-audit-20261030.md) diferencia las correcciones, la evidencia actual y las verificaciones externas pendientes. Para reproducir las comprobaciones de las páginas privadas, exportar la función autorizada a archivos HTML temporales y ejecutar `IB_PRIVATE_PAGES=<directorio> node --test scripts/private-page-dom.test.mjs`; esos archivos no se publican.

