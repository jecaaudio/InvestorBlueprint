import {createBillingWebhookHandler} from './handler.mjs';
Deno.serve(createBillingWebhookHandler({env:Deno.env.toObject()}));
