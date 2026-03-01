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

## TEAM_ACCESS en beta (sin backend)

Durante la beta free, **las tools no requieren `TEAM_ACCESS`** para usarse.
El flujo de `login.html` sigue siendo un request de acceso y registro de email, sin contraseñas ni pagos.

Cuando alguien envía el formulario en `login.html`, siempre se guarda su email en `localStorage` con la clave `ib_waitlist_email`.
Además, el rol interno `TEAM_ACCESS` se activa si se cumple **cualquiera** de estas condiciones en `assets/js/login.js`:

1. **Dominio interno** (`TEAM_DOMAIN`): el email termina en ese dominio.
2. **Allowlist explícita** (`TEAM_ALLOWLIST`): el email está en la lista exacta.
3. **Team code opcional** (`TEAM_ACCESS_CODE`): el campo "Team access code" coincide con `INVESTOR_TEAM_2026`.

El rol se guarda así:

- Clave en `localStorage`: `ib_role`
- Valor: `TEAM_ACCESS`

### Cómo cambiar la configuración de acceso interno

Abre `assets/js/login.js` y ajusta estas constantes:

- `TEAM_DOMAIN`: dominio que habilita acceso interno por sufijo de email.
- `TEAM_ALLOWLIST`: lista de correos exactos con acceso interno.
- `TEAM_ACCESS_CODE`: código opcional para marcar `TEAM_ACCESS` desde el formulario.

> Nota: esto es un control de conveniencia en frontend, no un sistema de seguridad robusto.
