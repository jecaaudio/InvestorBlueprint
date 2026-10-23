import { createClient } from "npm:@supabase/supabase-js@2.117.0";
import flip from "./pages/flip.ts";
import rental from "./pages/rental.ts";
import rent from "./pages/rent.ts";
import arvEstimator from "./pages/arv-estimator.ts";
import hardMoney from "./pages/hard-money.ts";
import roiSearch from "./pages/roi-search.ts";
import automatedArv from "./pages/automated-arv.ts";
import sellerNet from "./pages/seller-net.ts";
const pages: Record<string,string> = {
 "flip":flip,"rental":rental,"rent":rent,"arv-estimator":arvEstimator,
 "hard-money":hardMoney,"roi-search":roiSearch,"automated-arv":automatedArv,"seller-net":sellerNet
};
const cors = {
 "Access-Control-Allow-Origin":"https://jecaaudio.github.io",
 "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
 "Access-Control-Allow-Methods":"GET, OPTIONS",
 "Access-Control-Max-Age":"300",
 "Vary":"Origin"
};
function reply(status:number, body:string, type="application/json; charset=utf-8"):Response{
 return new Response(body,{status,headers:{...cors,
   "Content-Type":type,
   "Cache-Control":"private, no-store, max-age=0",
   "X-Content-Type-Options":"nosniff",
   "Referrer-Policy":"no-referrer"}});
}
Deno.serve(async(req:Request):Promise<Response>=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="GET")return reply(405,JSON.stringify({error:"method_not_allowed"}));
 const tool=new URL(req.url).searchParams.get("tool")||"";
 if(!Object.hasOwn(pages,tool))return reply(404,JSON.stringify({error:"not_found"}));
 const auth=req.headers.get("Authorization")||"";
 if(!/^Bearer\s+[^\s]+$/.test(auth))return reply(401,JSON.stringify({error:"login_required"}));
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!anon)return reply(503,JSON.stringify({error:"service_unavailable"}));
 try {
  const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:auth}}});
  const token=auth.replace(/^Bearer\s+/i,"");
  const {data:{user},error:userError}=await sb.auth.getUser(token);
  if(userError||!user||!user.email_confirmed_at)return reply(401,JSON.stringify({error:"login_required"}));
  const {data:sessionActive,error:sessionError}=await sb.rpc("ib_session_active");
  if(sessionError)return reply(503,JSON.stringify({error:"verification_unavailable"}));
  if(sessionActive!==true)return reply(401,JSON.stringify({error:"login_required"}));
  const {data:profile,error:profileError}=await sb.from("member_profiles").select("access_status,role,beta_tester,terms_accepted_at,terms_version").eq("id",user.id).single();
  if(profileError)return reply(503,JSON.stringify({error:"verification_unavailable"}));
  if(profile?.access_status!=="approved")return reply(403,JSON.stringify({error:"approval_required"}));
  const termsVersion=Deno.env.get("TERMS_VERSION")||"2026-10-21";
  if(!profile.terms_accepted_at||profile.terms_version!==termsVersion)return reply(403,JSON.stringify({error:"terms_required"}));
  const betaAllowed=profile.role==="admin"||profile.beta_tester===true;
  // Enforce the same tester permissions at the server, including direct endpoint requests.
  if(["rent","roi-search","automated-arv"].includes(tool)){
    if(!betaAllowed)return reply(403,JSON.stringify({error:"beta_required"}));
  }
  // Billing is opt-in at the server. The free beta never depends on payment data.
  if(Deno.env.get("IB_BILLING_ENABLED")==="true"&&!betaAllowed){
    const {data:subscription,error:subscriptionError}=await sb.from("member_subscription_state").select("billing_status,valid_until").eq("user_id",user.id).maybeSingle();
    if(subscriptionError)return reply(503,JSON.stringify({error:"verification_unavailable"}));
    const until=Date.parse(subscription?.valid_until||"");
    if(!["active","trialing"].includes(subscription?.billing_status)||!Number.isFinite(until)||until<=Date.now())return reply(403,JSON.stringify({error:"subscription_required"}));
  }
  const backToProfile='<a href="/InvestorBlueprint/account.html" aria-label="Mi perfil / My profile" '+ 
    'style="position:fixed;right:15px;bottom:15px;z-index:9999;background:#146d82;color:#fff;'+
    'padding:12px 16px;border-radius:30px;text-decoration:none;font:600 14px system-ui">'+
    'Mi perfil / My profile</a>';
  const protectedPage=pages[tool].replace(/<\/body>/i,backToProfile+'</body>');
  return reply(200,protectedPage,"text/html; charset=utf-8");
 } catch {
  return reply(503,JSON.stringify({error:"verification_unavailable"}));
 }
});

