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

## Acceso beta

Durante la beta, las herramientas no requieren contrasena, pago ni `TEAM_ACCESS` para usarse.

El formulario de `login.html` funciona como solicitud de acceso/lista de contacto:

- Valida que el email tenga formato correcto.
- Guarda el email en `localStorage` con la clave `ib_waitlist_email`.
- Redirige al usuario de vuelta al sitio.

Esto es un flujo de demo/frontend. Para capturar emails de verdad, conecta el formulario a un backend, Formspree, Supabase, Firebase, Airtable o Google Sheets.
