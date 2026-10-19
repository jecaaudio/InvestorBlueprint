# Auditoría visual y responsive — InvestorBlueprint
**Fecha:** 19 de octubre de 2026 · **Estado:** Diagnóstico, sin cambios de diseño en producción.

## Evidencia y alcance
- Chromium/Playwright renderizó **35 combinaciones** de 5 páginas × 7 anchos: 320, 375, 390, 430, 768, 1024 y 1440 px.
- Páginas: Inicio, Mi perfil, Administración, Login y Precios; pruebas de pantalla y medición de DOM.
- Perfil y Administración se abrieron con **una sesión de administrador SIMULADA**, sin usar contraseñas, datos privados o cuentas reales.
- Modo claro y oscuro del formulario de perfil inspeccionados en 390 px. Capturas y `layout-report.json` en el artefacto de GitHub Actions [visual-responsive-audit](https://github.com/jecaaudio/InvestorBlueprint/actions/runs/39319071569).
- Sin errores JavaScript, rutas locales 404 o scroll horizontal detectados en las 35 variantes simuladas.
- **Limitación:** Chromium móvil emulado no equivale a Safari real. Las ocho calculadoras completas se sirven tras autenticar desde Supabase, por lo que no están incluidas en estas 35 capturas. Revisadas estáticamente sus hojas de estilo y HTML protegido.

## Hallazgos confirmados
| # | Severidad | Hallazgo y evidencia | Componentes afectados |
|---|---|---|---|
| V01 | ALTA | Mi perfil: encabezado **186 px en 390 px**, **225 px en 320 px**. Admin/Login llegan a 225 px en 320 px. Inicio ocupa 125 px a 390 px. El perfil usa botones de navegación en 2 filas en 390 px y 3 en 320 px. | `account.html`, `admin.html`, `login.html`, `assets/css/member-access.css` |
| V02 | ALTA | Inconsistencia de navegación: Inicio usa hamburguesa y menú vertical, mientras que Mi perfil/Admin/Login exhiben links en fila divididos por saltos. El desplegable principal de Inicio solo muestra Herramientas, Aprender, Precios e Ingresar, **no Mi perfil**; dificulta volver al área de usuario aprobado. | `index.html`, `script.js`, `style.css`, navegación Supabase |
| V03 | ALTA | Consentimiento de cookies ocupa alrededor de **un tercio de la altura visible** del iPhone en la vista inicial y tapa los formularios o titulares. El texto y botones están fijos en inglés aunque la web esté en español. En escritorio tapa parte del contenido central inferior. | `assets/js/cookie-banner-component.js`, `assets/css/cookie-banner.css`, `assets/js/consent.js` |
| V04 | MEDIA | Tarjeta de Mi cuenta demasiado alta, con espacios verticales grandes y acciones redundantes en la versión móvil. El usuario debe desplazarse bastante para editar preferencias. En escritorio hay grandes espacios vacíos frente a los controles. | `account.html`, `assets/css/member-access.css`, estilos generales |
| V05 | MEDIA | El perfil, la portada y las herramientas tienen jerarquías y encabezados distintos: `access-hero` alineado a la izquierda frente a `hero` centrado, cabeceras de herramientas con `tool-navbar`, Seller Net con estilos propios y reglas en línea. | `style.css`, `site-theme.css`, `tool-styles.css`, `seller-net` |
| V06 | MEDIA | Precios muestra íntegramente textos en inglés, incluso cuando el sitio presenta interfaz española. **Sí tiene un botón Menú móvil**; debe unificarse su experiencia y mostrar Mi perfil/Administración según la sesión. | `pricing.html`, `assets/i18n/*.json` |
| V07 | MEDIA | Elementos interactivos en Inicio/Login son relativamente pequeños (medidos múltiples targets bajo 34 px de alto); objetivos adecuados en perfil pero inconsistentes. La fila de pestañas de Login compite con el banner de cookies. | `style.css`, `assets/css/member-access.css`, formulario/login |
| V08 | MEDIA | No hay sistema visual compartido de navegación y página para las **ocho calculadoras protegidas**, ni pruebas visuales completas tras autenticación. Se necesitan capturas de flujo autorizado y pruebas de print/exportación. | Supabase Edge Function `ib-protected-tools`, `tools/*`, `calculadora-venta/*` |
| V09 | BAJA | Tipografía de marca con tamaños y estilos distintos entre secciones; `Mi perfil` no presenta un encabezado de usuario compacto e identificable (nombre/rol/avatar iniciales). | `assets/css/brand.css`, `account.html` |

### Importante: qué *no* se detectó
Las 35 combinaciones no presentan desbordamiento horizontal del documento, y los contenedores principales usan el mismo eje izquierdo que sus tarjetas. No procede corregir un falso problema de ancho global; sí mejorar la composición, ritmo vertical, alineación de controles y jerarquía visual.

## Plan de reparación por fases con puertas de validación

### Fase 1 — Encabezado y navegación compartidos (**P0**)
- Definir **un único header** para Inicio, Login, Mi perfil, Administración y Precios, con logo, enlaces principales, estado de sesión, indicador de administrador, controles ES/EN y tema.
- Móvil: marca e iconos en primera fila; menú accesible desplegable, sin enlaces sueltos en filas adicionales. Todas las opciones de cuenta y admin aparecen dentro del mismo menú cuando correspondan.
- Escritorio: alineación izquierda del logo y derecha del menú, ancho contenido consistente.
- Mantener checks de rol en Supabase; ocultar el enlace no es autorización.

**Gate:** encabezado <= 80–96 px de alto en móvil cerrado (definir visualmente en QA), menú operable por teclado/tacto, 0 links ocultos inesperadamente, 0 scroll horizontal a 320–1440 px, sin login roto.

### Fase 2 — Mi perfil y Administración (**P1**)
- Header de perfil más profesional: icono/avatar iniciales, nombre, email y rol; estado de cuenta compacto.
- Dividir en tarjetas/secciones identificables: información, preferencias de idioma, idioma de exportación, detalle de informes, seguridad y accesos.
- Controles alineados en dos columnas desktop y una móvil, medidas coherentes; acciones importantes sin duplicación.
- Validar guardar preferencias, recarga, cerrar sesión y regreso a administración desde calculadora.

**Gate:** perfil legible sin encabezado sobredimensionado; guardado remoto confirmado, ningún miembro ve controles de administración.

### Fase 3 — Consentimiento y traducciones (**P1**)
- Traducir aviso, preferencias, privacidad y botones a ES/EN; respetar idioma elegido.
- Banner móvil compacto que no tape formularios; opción clara de Rechazar/Aceptar; panel detallado voluntario.
- Verificar persistencia y activación de etiquetas/analítica solo conforme consentimiento.

**Gate:** consentimiento correctamente traducido, no bloquea tareas primarias y cumple las necesidades de accesibilidad aplicables.

### Fase 4 — Sistema visual único y consistencia responsive (**P2**)
- Tokens compartidos para espaciados (4/8/12/16/24/32), tipografía, elevación, radios y límites de ancho.
- Unificar `hero`, `access-hero`, tarjetas, botones, labels, tablas y estados. Reducir reglas CSS globales `nav` contradictorias, overrides innecesarios y estilos en línea.
- Revisar pantalla de Precios, Login, marketing y variaciones claro/oscuro.

**Gate:** capturas de referencia comparadas en 320, 375, 390, 430, 768, 1024, 1440 px en ES/EN y tema claro/oscuro; sin regresiones visuales.

### Fase 5 — Ocho calculadoras protegidas (**P2**, independiente)
- Generar comparaciones visuales reales de las 8 herramientas tras autorización sin exponer código ni credenciales al público.
- Unificar header y navegación contextual, inputs y resultados, tablas, acciones de exportación, informes de impresión y notas.
- Validar layouts complejos: tablas de escenarios, comparables, seller net, heatmap, dropdowns y formularios.
- En paralelo, ejecutar casos matemáticos reproducibles para todos los modelos, sin cambiar fórmulas únicamente por estética.

**Gate:** 8× flujo autorizado y denegado; checks de cálculo y exportación; test real en iPhone Safari y ordenador.

### Fase 6 — Publicación controlada y cierre (**P0**)
- Rama aislada, PR revisable y sin conflictos; snapshot anterior y rollback.
- Playwright: geometría, capturas y checks de enlaces; axe, Lighthouse y GitHub Actions.
- Publicar **una fase a la vez** en `main`; verificar funcionamiento desde la URL pública real y no solo entorno de pruebas.
- Conservar Supabase **Free**, sin modificar permisos ni historial sensible.

## Recomendación de ejecución
**Empezar por Fases 1 + 2**: ellas resuelven el principal dolor actual (Mi perfil y regreso al administrador). En una publicación posterior se corrige el banner y traducciones, después se armonizan los componentes, y por último se inspeccionan las calculadoras protegidas una a una.

Los problemas de navegación y de idioma en el banner se observan en capturas de Chromium; las diferencias de Safari, el contenido dentro de la sesión real y el flujo por usuario todavía requieren validación.
