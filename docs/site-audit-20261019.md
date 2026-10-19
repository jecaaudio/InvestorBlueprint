# Auditoría de InvestorBlueprint — 19 octubre 2026

## Estado e inventario
- Página pública de marketing, precios y política de privacidad.
- Formulario bilingüe de registro, sesión y recuperación; panel de administración.
- Ocho rutas de calculadoras, con HTML entregado desde Supabase tras comprobar la cuenta.
- Base de datos Supabase con perfiles, estados y auditoría. Organización JECA en Free.
- Sitio público en GitHub Pages, proyecto de GitHub con historial público.

## Hallazgos prioritarios

| Riesgo | Hallazgo | Acción |
|---|---|---|
| Crítico | Login y recuperación de contraseña sin prueba final en Safari móvil | Confirmar URL de redirección y realizar prueba real |
| Alto | Calculadoras sin batería completa de pruebas funcionales autenticadas | Probar las ocho con diferentes estados de usuario |
| Alto | Código antiguo accesible en historial público del repositorio | Estudiar migración a repositorio privado |
| Alto | CI bloqueado por dependencias npm desincronizadas | Lockfile regenerado en rama de auditoría |
| Medio | Arranque tardío del servidor de CI | Agregada comprobación de servidor listo |
| Medio | Manifiesto del móvil omitido por despliegue | Incluir manifest e iconos |
| Medio | Login con ARIA inválido | Corregir semántica y estados |
| Medio | Banner de cookies sin traducción y contraste insuficiente | Ajustes bilingües y visuales |
| Medio | Política de privacidad obsoleta para sistema de miembros | Actualizar tras validar contacto público |
| Bajo | Índices recomendados por Supabase en dos claves foráneas | Evaluar pequeña migración de rendimiento |

## Verificación

- Revisión estática: 13 páginas HTML sin rutas internas inexistentes en el árbol fuente.
- Tests deterministas: estructura del portal, ocho rutas, manifiesto y referencias.
- Supabase Security Advisor: advertencia de protección de contraseñas filtradas (Pro).
- No existe evidencia suficiente para afirmar que el login, la recuperación ni todos los cálculos pasen en un dispositivo real.

## Condiciones para publicar cambios
1. CI de pruebas estáticas, accesibilidad y rendimiento satisfactorio.
2. Login y restablecimiento probados por el propietario desde Safari.
3. Prueba de autorización real con URL directa y usuarios de diferentes estados.
4. Verificar cálculos y reportes en todas las herramientas.
5. Revisar política de privacidad y correo de soporte público.
6. Plan de reversión reproducible.

Los cambios permanecen en la rama auditada hasta completar las comprobaciones.
