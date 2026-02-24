# ARV Tool UI

Esta herramienta permite calcular ARV automatizado desde una dirección.

## Uso rápido

1. Abre `tools/arv/index.html` (o `https://<tu-pages>/tools/arv/`).
2. Ingresa la dirección del subject.
3. Haz click en **Calcular ARV**.
4. Revisa:
   - Card **Subject**
   - Card **ARV** (estimate, low, high, confidence)
   - Tabla de **comps**
5. Usa:
   - **Copiar reporte** para copiar texto formateado
   - **Export JSON** para descargar el resultado

## Configurar URL del Worker

En `tools/arv/arv.js`, cambia:

```js
const DEFAULT_WORKER_URL = "https://YOUR-WORKER.workers.dev";
```

por la URL real de tu Worker de Cloudflare.

También puedes setear temporalmente desde consola del navegador:

```js
localStorage.setItem("arvWorkerUrl", "https://tu-worker.workers.dev");
```

## Errores amigables

La UI muestra mensajes claros cuando:
- Falta dirección
- El worker no responde
- Hay error de CORS/configuración
