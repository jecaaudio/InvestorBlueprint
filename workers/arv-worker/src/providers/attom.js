const NOT_CONFIGURED =
  "NOT_CONFIGURED: Configure ATTOM endpoint mappings in src/providers/attom.js and set ATTOM_API_KEY secret.";

export async function getSubject() {
  throw new Error(NOT_CONFIGURED);
}

export async function getSoldComps() {
  throw new Error(NOT_CONFIGURED);
}

// TODO:
// 1) Implement fetch calls to ATTOM endpoints.
//    The `address` arg is already trimmed, length-capped, and stripped of
//    control characters by index.js — still pass it through encodeURIComponent
//    (or the SDK's param builder) when building the request URL/query string,
//    never via string concatenation.
// 2) Map endpoint fields to normalized shape expected by core modules.
// 3) Add robust pagination/filtering by radius + sold date windows.
