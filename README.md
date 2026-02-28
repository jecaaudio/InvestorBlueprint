# InvestorBlueprint

Sitio estático bilingüe (EN/ES) para una plataforma de herramientas de inversión inmobiliaria.

## Publicar la página en la web (GitHub Pages)

Este repositorio ya incluye el workflow `.github/workflows/deploy-pages.yml` para publicar automáticamente en GitHub Pages.

### Pasos

1. Sube este código a tu repositorio en GitHub.
2. Asegúrate de que la rama principal sea `main`.
3. En GitHub, entra a **Settings → Pages**.
4. En **Build and deployment**, selecciona **Source: GitHub Actions**.
5. Haz push a `main` (o ejecuta el workflow manualmente en **Actions**).

Cuando termine el workflow, tu web quedará visible en la URL de Pages del repositorio:

- `https://<tu-usuario>.github.io/<tu-repo>/`

## Desarrollo local

```bash
python3 -m http.server 4173
```

Luego abre:

- `http://localhost:4173`

## Quality gates (CI)

El workflow `.github/workflows/quality-gates.yml` ejecuta:

- Pruebas de accesibilidad con `axe` en páginas clave.
- Auditoría de Lighthouse con mínimos de performance, accesibilidad, best-practices y SEO.

Para ejecutarlos localmente:

```bash
npm install
npx playwright install --with-deps chromium
python3 -m http.server 4173 &
npm run qa:axe
npm run qa:lighthouse
```
