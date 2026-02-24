# ARV Worker (Cloudflare Workers)

Backend API para calcular ARV con contrato JSON consistente para la UI en GitHub Pages.

## Rutas

- `GET /health`
- `POST /api/arv`
- `OPTIONS *` (preflight CORS)

## Contrato

### Request

```json
{
  "address": "123 Main St, Miami, FL",
  "options": {
    "radiusMiles": 1.5,
    "soldWithinMonths": 12,
    "maxComps": 8,
    "sqftTolerance": 0.25,
    "bedsTolerance": 1,
    "bathsTolerance": 1
  }
}
```

### Response éxito

```json
{
  "subject": {},
  "comps": [],
  "arv": {
    "estimate": 0,
    "low": 0,
    "high": 0,
    "method": "weighted_ppsf",
    "ppsfWeighted": 0,
    "confidence": 0
  },
  "meta": {
    "provider": "DUMMY",
    "generatedAt": "2026-01-01T00:00:00.000Z",
    "compsUsed": 8,
    "warnings": []
  }
}
```

### Response error

```json
{
  "error": {
    "code": "ADDRESS_REQUIRED",
    "message": "Field `address` is required"
  }
}
```

## Proveedor

- `PROVIDER=DUMMY` (por defecto): devuelve datos simulados realistas sin APIs externas.
- `PROVIDER=ATTOM`: scaffolding listo en `src/providers/attom.js`.

Si ATTOM no está configurado aún, retorna error `NOT_CONFIGURED` con instrucciones.

## Deploy

```bash
cd workers/arv-worker
npm install
npx wrangler login
npx wrangler deploy
```

## Secrets / env

```bash
wrangler secret put ATTOM_API_KEY
wrangler secret put PROVIDER
wrangler secret put ALLOWED_ORIGIN
```

Ejemplo recomendado:
- `PROVIDER=DUMMY`
- `ALLOWED_ORIGIN=https://<tu-usuario>.github.io`

## Conectar con la UI

1. Copia la URL del worker desplegado (`https://arv-worker.<subdominio>.workers.dev`).
2. Pégala en `tools/arv/arv.js` en `DEFAULT_WORKER_URL`.
3. Alternativa rápida en navegador:

```js
localStorage.setItem("arvWorkerUrl", "https://arv-worker.<subdominio>.workers.dev");
```
