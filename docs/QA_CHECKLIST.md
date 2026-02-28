# QA Checklist — InvestorBlueprint Demo

## Objetivo
Asegurar que la demo estática de InvestorBlueprint sea consistente, usable y verificable antes de publicar en GitHub Pages.

## Criterios de aceptación por PR

### 1) Seguridad y alcance del demo estático
- [ ] No se solicitan contraseñas en formularios públicos.
- [ ] No se solicitan métodos de pago ni tarjetas en GitHub Pages.
- [ ] No existe dependencia de backend para funcionalidades clave del demo.

### 2) UX de calculadoras
- [ ] Cada calculadora muestra labels claros, placeholders y/o valores por defecto razonables.
- [ ] Validaciones evitan valores fuera de rango (ej. porcentaje > 100 o negativos inválidos).
- [ ] Los errores se muestran de forma visible y accesible (`role="alert"`).
- [ ] El resultado se actualiza en un contenedor con `aria-live` para lectores de pantalla.

### 3) Consistencia visual y accesibilidad
- [ ] Botones, inputs y tarjetas mantienen el estilo general existente.
- [ ] Estados de foco son visibles para navegación por teclado.
- [ ] Contrastes y semántica básica pasan controles automáticos (axe).

### 4) SEO mínimo
- [ ] Páginas principales de tools incluyen `title`, `meta description` y `canonical`.
- [ ] Las páginas tienen estructura semántica base (`header`, `main`, headings).

### 5) Analítica y consentimiento
- [ ] Eventos clave (por ejemplo envío de calculadoras) están instrumentados.
- [ ] Analytics/marketing solo se disparan con consentimiento de cookies.

### 6) Quality gates (CI)
- [ ] CI ejecuta auditoría Lighthouse en la home y al menos una calculadora.
- [ ] CI ejecuta pruebas de accesibilidad con axe.
- [ ] El workflow falla cuando no se alcanzan mínimos definidos.

## Verificación manual rápida
1. Abrir `index.html` y navegar a herramientas.
2. Probar `tools/rental-cash-flow.html` con datos inválidos y válidos.
3. Probar `tools/rent-calculator.html` con ocupación > 100 y luego con valores correctos.
4. Confirmar que se muestran mensajes de validación y resultados esperados.
5. Verificar que login/registro solo piden email.
