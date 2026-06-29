# Auth Worker (Cloudflare Workers + D1)

Backend de autenticación real (registro, login, sesión, cálculos guardados) para InvestorBlueprint, usando Cloudflare D1 como base de datos.

## Rutas

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/saved-calculations`
- `POST /api/saved-calculations`
- `DELETE /api/saved-calculations/:id`
- `OPTIONS *` (preflight CORS)

Las sesiones se manejan con una cookie `ib_session` (`HttpOnly`, `Secure`, `SameSite=Lax`, 30 días), no con JWT. El frontend debe llamar a la API con `fetch(..., { credentials: 'include' })` (ya implementado en `auth.js`).

## Tests

```bash
cd workers/auth-worker
npm install
npm test
```

Los tests corren contra un D1 simulado en memoria (`test/fakeD1.js`), no requieren credenciales de Cloudflare ni `wrangler`.

## Deploy (pasos manuales, requieren tu cuenta de Cloudflare)

Estos pasos no se pueden automatizar desde aquí porque requieren tus credenciales de Cloudflare. Tómalos como una checklist de ~5 minutos.

### 1. Instalar dependencias y autenticarte

```bash
cd workers/auth-worker
npm install
npx wrangler login
```

### 2. Crear la base de datos D1

```bash
npx wrangler d1 create investorblueprint-auth
```

Este comando imprime un bloque como:

```toml
[[d1_databases]]
binding = "DB"
database_name = "investorblueprint-auth"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copia el `database_id` real y reemplázalo en `wrangler.toml` (actualmente tiene el placeholder `REPLACE_WITH_YOUR_D1_DATABASE_ID`).

### 3. Aplicar el esquema

```bash
npx wrangler d1 execute investorblueprint-auth --remote --file=./schema.sql
```

(Usa `--local` en vez de `--remote` si quieres probar primero con `wrangler dev` localmente.)

### 4. Configurar el origen permitido (CORS)

Edita `wrangler.toml` y cambia:

```toml
[vars]
ALLOWED_ORIGIN = "https://your-site.example.com"
```

por el dominio real donde está publicado el sitio (por ejemplo `https://jecaaudio.github.io`).

### 5. Desplegar el worker

```bash
npx wrangler deploy
```

Wrangler imprime la URL del worker desplegado, algo como:

```
https://auth-worker.<tu-subdominio>.workers.dev
```

### 6. Conectar el frontend

Edita `assets/js/config.js` y pon esa URL en `API_BASE`:

```js
window.AUTH_CONFIG = {
  API_BASE: 'https://auth-worker.<tu-subdominio>.workers.dev'
};
```

Mientras `API_BASE` esté vacío (como está ahora por defecto), el sitio sigue funcionando pero muestra el mensaje "El backend de autenticación aún no está configurado en este sitio." al intentar registrarse o iniciar sesión — no se rompe nada en producción hasta que completes este paso.

## Por qué no se desplegó automáticamente

Crear la base de datos D1 y ejecutar `wrangler deploy` requieren autenticación contra tu cuenta personal de Cloudflare, a la que no tengo acceso desde este entorno. El código (worker, esquema SQL, tests) está completo y probado; solo falta este paso manual de aprovisionamiento.

## Proveedor ATTOM (pendiente, fuera de alcance de este worker)

La integración real con la API de ATTOM (`workers/arv-worker/src/providers/attom.js`) sigue bloqueada: para implementarla sin arriesgar inventar el contrato de la API, se necesita la documentación oficial de ATTOM (endpoints, parámetros, formato de respuesta) o credenciales de sandbox. Compártelas cuando las tengas y se completa esa pieza.
