import {createPropertyDataHandler} from './handler.mjs';
Deno.serve(createPropertyDataHandler({env:Deno.env.toObject()}));
