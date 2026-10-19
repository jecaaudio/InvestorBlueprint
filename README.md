# InvestorBlueprint

Sitio estatico bilingue (EN/ES) para una plataforma de herramientas de inversion inmobiliaria.

## Publicar la pagina en la web (GitHub Pages)

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

## Quality gates (CI)

El workflow `.github/workflows/quality-gates.yml` ejecuta:

- Pruebas de accesibilidad con `axe` en paginas clave.
- Auditoria de Lighthouse con minimos de performance, accesibilidad, best-practices y SEO.

Para ejecutarlos localmente:

```bash
npm install
npx playwright install chromium
python -m http.server 4173
npm run qa:axe
npm run qa:lighthouse
```

Si estas sirviendo desde la carpeta del proyecto y no desde la carpeta padre, ejecuta axe con:

```bash
AXE_SITE_BASE_PATH= npm run qa:axe
```

## Acceso y seguridad (octubre de 2026)

- InvestorBlueprint usa Supabase Auth (correo y contraseña), perfiles de usuarios con aprobación administrativa y políticas RLS.
- El administrador principal registrado está aprobado en Supabase. **Nunca** se guardan contraseñas ni claves secretas en GitHub.
- `login.html` permite solicitar acceso, iniciar sesión y recuperar la contraseña; `admin.html` solo consulta datos con RLS para administradores aprobados.
- Las ocho direcciones de herramientas son *loaders*: el HTML de la calculadora llega desde la Edge Function `ib-protected-tools` únicamente tras validar una sesión y el permiso actualizado en Supabase.
- El workflow publica un sitio seleccionado (`public-site/`) y no la raíz completa del repositorio; archivos internos, demos y scripts antiguos quedan excluidos de GitHub Pages.
- **Limitación importante:** este repositorio continúa siendo público y su historial contiene versiones antiguas del código de las calculadoras. Las librerías JavaScript que ejecuta el navegador tampoco son secretas. Para proteger propiedad intelectual, migrar a un repositorio privado y mover la lógica confidencial al servidor.
- La organización Supabase `JECA` continúa en el plan **Free**. La protección de contraseñas filtradas solo está disponible en Supabase Pro.
- Pendiente en el panel de Supabase: **Authentication → URL Configuration**. Configurar **Site URL** como `https://jecaaudio.github.io/InvestorBlueprint/` y añadir `https://jecaaudio.github.io/InvestorBlueprint/login.html` en **Redirect URLs**. Esta configuración no se puede gestionar con las acciones del conector Supabase disponibles actualmente.
- El flujo de recuperación por correo y el login desde iPhone requieren pruebas reales. El envío de correos a clientes externos exige configurar SMTP apropiado.
- Una implementación solo con GitHub Pages **no** proporciona confidencialidad del código que se ejecute en el navegador.

