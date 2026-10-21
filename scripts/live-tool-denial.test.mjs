// Live production authorization-denial probe. No credentials, user accounts or writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const configWindow={};
vm.runInNewContext(readFileSync('assets/js/member-auth-config.js','utf8'),{window:configWindow});
const {supabaseUrl,supabaseAnonKey}=configWindow.IB_AUTH_CONFIG||{};
assert.match(supabaseUrl||'',/^https:\/\//);
assert.match(supabaseAnonKey||'',/^sb_publishable_/);

for(const tool of ['flip','seller-net']){
  const uri=supabaseUrl+'/functions/v1/ib-protected-tools?tool='+tool;
  for(const variant of ['missing','invalid']){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    let response;
    try {
      response=await fetch(uri,{
        method:'GET',cache:'no-store',signal:controller.signal,
        headers:{
          apikey:supabaseAnonKey,
          Accept:'text/html',
          ...(variant==='invalid'?{Authorization:'Bearer intentionally-not-a-valid-jwt'}:{})
        }
      });
    }finally{clearTimeout(timeout)}
    assert.equal(response.status,401,
      'SECURITY: '+tool+' '+variant+' token received '+response.status+' (expected 401)');
    console.log('[live-denial] '+tool+' '+variant+' -> 401');
  }
}
