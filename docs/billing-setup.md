# Activar el cobro con Stripe

El código del cobro ya está en el sitio, pero apagado (`enabled:false` en `assets/js/billing-config.js`). Mientras esté apagado, la página de precios explica que la beta es gratis y el botón pide acceso.

Plan configurado: **Pro**, $19 al mes o $190 al año, con 7 días de prueba. Usa primero el **modo de prueba** de Stripe (claves `sk_test_…`) y repite los pasos en modo real cuando todo funcione.

## 1. Stripe

1. Crea la cuenta en stripe.com y completa los datos del negocio.
2. **Productos** → crea "InvestorBlueprint Pro" con dos precios recurrentes: $19/mes y $190/año. Anota los dos `price_…`.
3. **Payment Links** → crea un enlace para cada precio:
   - Activa la prueba gratis de 7 días.
   - En "Después del pago", redirige a `https://jecaaudio.github.io/InvestorBlueprint/account.html`.
   - Copia cada enlace (`https://buy.stripe.com/…`).
4. **Configuración → Suscripciones y correos** → activa el correo de aviso antes de que termine la prueba. La página de precios lo promete.
5. **Configuración → Portal de clientes** → actívalo (cancelar, cambiar tarjeta, ver facturas) y copia el enlace de inicio de sesión (`https://billing.stripe.com/p/login/…`).
6. **Desarrolladores → Claves de API** → crea una clave restringida con permiso de **lectura de Suscripciones**. Es la que usa el webhook (`rk_…`). También sirve la secreta, pero la restringida expone menos.

## 2. Supabase

1. En SQL Editor aplica `supabase/migrations/20261021130000_stripe_billing.sql`. Si hace falta revertir: `supabase/rollback/stripe_billing.sql`.
2. Publica la función, **sin verificación JWT**, porque Stripe no envía token de Supabase; su firma es la autenticación:

   ```bash
   supabase functions deploy ib-billing-webhook --no-verify-jwt
   ```

3. Guarda los secretos (nunca en GitHub). `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los da Supabase a las funciones.

   ```bash
   supabase secrets set BILLING_ENABLED=true \
     STRIPE_SECRET_KEY=rk_test_... \
     STRIPE_WEBHOOK_SECRET=whsec_... \
     STRIPE_PRICE_PLANS='{"price_MENSUAL":"pro","price_ANUAL":"pro"}'
   ```

## 3. Webhook en Stripe

**Desarrolladores → Webhooks → Agregar endpoint**:

- URL: `https://ppeyoovykxomxinumibk.supabase.co/functions/v1/ib-billing-webhook`
- Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copia el secreto de firma (`whsec_…`) en `STRIPE_WEBHOOK_SECRET`.

## 4. Encender el sitio

Edita `assets/js/billing-config.js`:

```js
enabled:true,
links:{proMonthly:'https://buy.stripe.com/...',proYearly:'https://buy.stripe.com/...'},
customerPortal:'https://billing.stripe.com/p/login/...'
```

Haz commit y PR. Al publicarse, la página de precios muestra "Probar 7 días gratis" y Mi perfil muestra la suscripción.

## 5. Probar (modo de prueba)

1. Crea una cuenta nueva en el sitio, entra y ve a Precios.
2. Paga con la tarjeta de prueba `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC.
3. Comprueba en Stripe → Webhooks que el evento respondió 200 con `"result":"applied"`.
4. En el sitio, la cuenta pasa de pendiente a **aprobada** sola, y Mi perfil dice "Plan Pro · en prueba".
5. Cancela desde el portal y verifica que el estado cambia a "cancelada".

## Qué hace el código

- **Página de precios** (`assets/js/pricing.js`): solo acepta enlaces de `buy.stripe.com` o `checkout.stripe.com`. Agrega el ID del miembro (`client_reference_id`) y su correo. Si nadie ha iniciado sesión, primero pide ingresar.
- **Webhook** (`supabase/functions/ib-billing-webhook/`):
  - Verifica la firma de Stripe con una tolerancia de 5 minutos y lee el precio en la suscripción.
  - Llama a una sola función de base de datos, `ib_apply_billing_event`. Esa función ignora eventos repetidos y eventos más viejos que el último aplicado.
  - Aprueba al instante a un miembro **pendiente** que paga. Una cuenta rechazada o suspendida no cambia por pagar.
- **Mi perfil** (`assets/js/account-billing.js`): muestra el plan y el portal de Stripe.

## Pendiente antes de cobrar en serio

- **Activar la comprobación del plan en el servidor.** El endpoint ya la implementa, pero la beta sigue gratis mientras `IB_BILLING_ENABLED` no sea exactamente `true`. Tras aplicar la migración de Stripe y verificar el webhook, configura esa variable en la función y habilita también `enabled` en `assets/js/billing-config.js`. Un miembro aprobado necesita estado `active` o `trialing` y `valid_until` válido en el futuro. El administrador y los probadores autorizados conservan su excepción. Una consulta fallida no concede acceso. No basta con cambiar el indicador del navegador.
- **Mantener la versión de los Términos sincronizada.** El endpoint ya exige aceptación registrada de la versión actual, incluso en llamadas directas. La versión predeterminada es `2026-10-21`; `TERMS_VERSION`, si está configurada en la función, debe coincidir con `termsVersion` del sitio. Un miembro sin aceptación vigente vuelve a Mi perfil; nadie acepta automáticamente por él. La migración de aceptación debe estar aplicada antes del despliegue del endpoint.
- **Comprobar el cobro real en modo de prueba.** Antes de habilitar ventas, verifica con tus productos de Stripe: checkout, webhook firmado, renovación, cancelación, vencimiento y acceso del mismo miembro. Las pruebas automatizadas cubren esas reglas con datos ficticios, pero no sustituyen esa integración con tus credenciales.
- **Configurar soporte y contraseñas.** Publica un correo atendido en `assets/js/site-config.js` y activa la protección de contraseñas filtradas de Supabase. El auditor la señala desactivada: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- **Impuesto de venta.** Algunos estados lo cobran sobre software por suscripción. Consulta con tu contador; Stripe Tax lo calcula por un costo adicional.
