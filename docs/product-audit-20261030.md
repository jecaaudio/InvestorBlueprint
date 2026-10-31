# Auditoría de producto — 30 de octubre de 2026

Producto: InvestorBlueprint. Base inspeccionada: `f1d5ae83ac0b696ccbc31832ca857277ffb34f8e`. Cambios y controles de publicación: PR #119. Alcance: repositorio, portada publicada, cinco calculadoras públicas, ocho plantillas entregadas por el servidor, acceso, reportes, motor ARV, dependencias y diseño adaptable.

## Dictamen

La base tiene pruebas y separación de permisos útiles, pero no corresponde certificar que todo está terminado. Esta revisión corrige fallos reproducibles del catálogo y consentimiento, mejora la presentación y comprueba mecanismos de seguridad del servidor. Quedan pruebas con cuentas/dispositivos reales y trabajo de infraestructura descritos abajo. No se activaron cobros, proveedores de pago ni suscripciones.

## Hallazgos y correcciones

| Prioridad | Hallazgo | Acción y evidencia |
|---|---|---|
| Alta | La consulta directa a localStorage podía abortar el catálogo; la descarga de configuración era imprescindible para ver herramientas. | Consulta protegida, idioma del documento, cinco tarjetas estáticas y respaldo generado desde el mismo JSON. Pruebas de lectura bloqueada, JSON inválido, conexión fallida y petición sin respuesta. La traducción sigue funcionando. |
| Alta | Escribir el consentimiento podía lanzar una excepción; aceptar, rechazar o guardar no cerraba el aviso cuando el almacenamiento estaba bloqueado o lleno. | Elección conservada en memoria de la página y escritura persistente opcional. Pruebas para los tres botones, bloqueo de lectura y bloqueo de escritura, y reapertura con la elección vigente. Al recargar sin almacenamiento se vuelve a preguntar. |
| Media | Registro como primera acción pese a disponer de herramientas públicas funcionales. | Acción principal hacia las cinco calculadoras; solicitud de acceso como segunda acción. El enlace de acceso conserva su transformación a Mi perfil cuando corresponde. |
| Media | Descripciones prometían ajustes avanzados de comparables y retorno neto que no corresponden al modelo simple. | Textos ES/EN describen promedio/rango de precios ingresados, vacancia/deuda y costo del financiamiento. No se presenta un promedio como tasación verificada. |
| Media | Portada sin demostración concreta; aviso de cookies ocupaba demasiado espacio móvil. | Ejemplo de flip en escritorio con cifras y supuestos explícitos. Portada compacta en móvil, botones de consentimiento en tres columnas y enlaces con nombre accesible por herramienta. |
| Media | Controles de notas/PDF conservaban el idioma inicial al cambiar ES/EN. | Siguen el idioma visible, incluidos mensajes de validación, sin borrar notas ni descartar un cálculo válido. Regresión y comprobación visual con la plantilla privada de renta. |
| Media | El panel de notas de Venta usaba fondo blanco en modo oscuro, con texto de muy bajo contraste. | Panel, campo y placeholder usan las variables de tema de Venta y las compartidas; entrada con tipografía legible de 16 px. Comprobación visual con el HTML privado actual. |
| Media | Dependencias de desarrollo con avisos de seguridad. | Actualizaciones compatibles del lockfile, incluido el instalador de navegadores y body-parser. Auditoría pasó de 22 a 21 avisos (13 altos, 6 moderados, 2 bajos), todos en herramientas de desarrollo. `npm audit --omit=dev` devuelve cero; esto no audita los SDK remotos ni el servidor. |
| Baja | README afirmaba que beta solo se restringía en el cliente y que existían planes de pago activos. | Documentación alineada con la función de producción v6 y el acceso aprobado gratuito. |

## Código, seguridad y datos

- Se inspeccionó la función activa `ib-protected-tools` v6, no solo la copia del repositorio. Comprueba usuario confirmado, sesión activa, aprobación, versión de términos y autorización beta; devuelve el HTML con `private, no-store`. Las solicitudes sin credenciales y con credenciales falsas recibieron 401 para Flip y Seller Net.
- Las tablas públicas observadas tienen RLS. Propiedad de perfiles, preferencias y escenarios se combina con políticas **RESTRICTIVE** de sesión/aprobación; no se confundieron reglas permisivas con una restricción global. La identidad propietaria permanece en un esquema privado.
- Se ejecutó `supabase/tests/session-security.sql` contra PostgreSQL real, con usuarios/sesiones sintéticos y `ROLLBACK`: sesión válida, aislamiento de perfil, revocación, límite de ocho horas, sesión de otro usuario, falta de session_id y RPC anónimo. Resultado PASS. Sin correos ni cambios persistentes a usuarios reales.
- El asesor de seguridad reportó dos advertencias: protección nativa de contraseñas filtradas desactivada y RPC SECURITY DEFINER de aceptación de términos. El RPC inspeccionado limita la escritura a `auth.uid()`, exige sesión activa y fija search_path. No se revocó una operación necesaria sin estudiar sus controles. La tabla privada de propietario sin políticas es un bloqueo intencional de acceso directo.
- La expiración por inactividad de 15 minutos se aplica en el navegador; el servidor verifica vigencia/revocación y ocho horas de duración. No se confunden ambas garantías.
- ARV automático y búsqueda por ROI siguen siendo funciones beta con datos de demostración/proveedor no habilitado. No son inventario verificado ni valoración de mercado en vivo.

## Cálculos y reportes

| Módulo | Verificación actual | Límite del alcance |
|---|---|---|
| Flip | Pruebas de compra/cierre, depósito, financiación, pérdidas, equilibrio, ROI y ejemplo de portada. HTML privado real con motor actual y reporte. | No valida términos concretos de un prestamista ni garantiza precio de salida. |
| Flujo de renta | Vacancia, gastos, deuda, NOI y flujo anual; HTML privado y resultado con ejemplo. | Reservas y supuestos deben reflejar cada operación; no es una renta de mercado verificada. |
| Renta sugerida beta | Ocupación cero, rendimiento bruto, validación y HTML privado. | Meta de rendimiento no equivale a estudio de rentas comparables. |
| ARV por comparables | Promedio/rango, valores inválidos y oferta negativa; HTML privado y reporte. | Sin ajustes automáticos por condición, fecha o tamaño; el 70% es una heurística. |
| Hard Money | Interés simple, puntos, duración, entradas inválidas y desembolsos; HTML privado y reporte. | Contrato, cargos y calendario reales requieren datos del prestamista. |
| ROI beta | Métricas diferenciadas, validación, etiqueta de simulación y HTML privado. | No contiene oportunidades verificadas disponibles para comprar. |
| ARV automático beta | 18 pruebas de procedencia, tipos, antigüedad, duplicados, extremos, filtros y proveedor desconocido. | Sin proveedor licenciado y calibración no hay precisión de mercado certificable. |
| Venta | Pruebas de parser, base de Illinois, hipotecas, negativos, impuestos pendientes, exportaciones inválidas y reporte bilingüe contra HTML actual. | No certifica todas las normas fiscales, cargos locales o exenciones; deben confirmarse para la transacción. |

El ejemplo de portada reutiliza el caso de la calculadora pública: compra $200,000 + reparación $50,000 + cierre de compra $4,000 + mantenimiento $6,000 + venta $22,400; venta $320,000; ganancia $37,600; ROI sobre $260,000 = 14.46% (se muestra 14.5%). No incluye préstamo ni impuesto sobre ganancia.

Evidencia local: **202 pruebas del sitio**, **18 del worker ARV**, **7 de HTML privado real**, cuatro negativas del endpoint en vivo y SQL de sesión con rollback. Las siete comprobaciones privadas son DOM/modelo, no inicios de sesión reales. Chromium/WebKit, axe, Lighthouse y PDFs se ejecutan en los controles de CI de #119; sus resultados finales deben leerse allí antes de publicar.

## Diseño y experiencia

Revisión visual en navegador de la portada actual y candidata. Comprobación de la candidata en marcos de 320, 393 y 430 px, además de escritorio: cinco tarjetas visibles, menú compacto, sin desbordamiento horizontal medido y controles utilizables. Son vistas adaptables del navegador, no un iPhone físico. Un control de CI detectó exceso de altura en el teléfono menor; se compactó la composición conservando el límite de descubrimiento de herramientas. La suite móvil recorre 320/360/393/430/768/1280/1440 px, ES/EN y temas claro/oscuro en Chromium y WebKit.

El catálogo estático mejora el primer render y sigue disponible sin JavaScript. El HTML público no incluye las calculadoras privadas. Las tarjetas estáticas, el respaldo y los textos proceden de `assets/config/tools.json`; las pruebas exigen regenerar con `node scripts/build-home-catalog.mjs` cuando cambia esa fuente.

## Trabajo pendiente para escalar

1. **Acceso real:** probar con dos cuentas controladas, administrador/miembro, confirmación y recuperación de correo, preferencias tras volver a iniciar sesión y cierre en iPhone físico. La evidencia sintética no sustituye ese recorrido. Revisar configuración de redirecciones y SMTP antes de ampliar usuarios.
2. **Cadena de desarrollo:** sustituir o actualizar de forma compatible las dependencias antiguas de Lighthouse CI. No usar `npm audit fix --force` ni rebajar herramientas para ocultar avisos. Mantener permisos de CI de solo lectura y la publicación ligada al SHA verificado.
3. **Fuentes y modelos:** conectar únicamente datos con procedencia y licencia comprobables. Conservar simulaciones identificadas. Reforzar comparables y reglas locales con fixtures de operaciones verificadas.
4. **Código privado reproducible:** el repositorio contiene el punto de entrada del servidor, pero las ocho plantillas viven en el despliegue remoto. Versionarlas en un repositorio privado autorizado y probar artefactos idénticos evitaría depender de exportaciones manuales y divergencias entre servidor y sitio. No se creó otra cuenta/repositorio ni se cambió visibilidad en esta revisión.
5. **Mantenimiento:** separar gradualmente módulos de finanzas, presentación y exportación del motor compartido; consolidar tokens CSS y generación de las cabeceras. Hacerlo por comportamiento con regresiones, conservando el sitio estático económico.
6. **Operación y producto:** instrumentar errores de carga y abandono sin datos financieros ni personales, usando consentimiento. Medir uso de calculadoras y conversión a solicitud antes de decidir cambios de marketing. Definir soporte, versión y responsabilidad de mantenimiento.

## Publicación y reversión

**Hallazgo de prioridad alta durante la verificación de publicación:** además del flujo seleccionado por `deploy-pages.yml`, GitHub ejecutó `pages build and deployment` (run `41162555366`) con Jekyll desde la raíz del repositorio. El log del job `124423078652` muestra que generó páginas de `docs/` y `workers/`. Esa vía puede publicar antes de Quality y no usa el paquete `public-site/`; por tanto, la existencia del workflow no basta para garantizar el control de publicación.

Se añadió `_config.yml` para excluir código de servidor, herramientas internas, documentación y archivos de desarrollo de ese publicador heredado. Es una mitigación de exposición accidental, no sustituye el control de Quality. **Falta cambiar en GitHub: Settings → Pages → Build and deployment → Source → GitHub Actions**, y verificar que solo se despliega el artefacto seleccionado. El conector disponible no permite editar esa configuración; la vista de Settings del navegador requiere iniciar sesión. No se considerará cerrado este hallazgo hasta comprobar ese cambio. El repositorio continúa público: esta exclusión no hace confidencial su código.

No publicar un SHA con controles fallidos. #119 contiene la revisión y las comprobaciones; Pages exige Quality exitoso en el commit exacto de main. Conservar la base indicada y revertir los commits de esta entrega para restaurar catálogo/portada anteriores si hay una regresión. Esta entrega no migra esquemas ni modifica datos de negocio. Las verificaciones externas pendientes permanecen abiertas aunque el despliegue y sus pruebas automatizadas pasen.
