/* Free Pwned Passwords form screening. This is not Supabase's paid server policy.
 * SHA-1 is used only for its range lookup, never to store passwords. */
(function(){
 'use strict';
 const english=()=>document.documentElement.lang==='en';
 const failure=()=>new Error(english()?'We could not check password safety. Please try again.':'No pudimos comprobar la seguridad de la contraseña. Inténtalo de nuevo.');
 async function assertSafe(password){
   if(typeof password!=='string'||password.length<12)throw new Error(english()?'Use at least 12 characters.':'Usa al menos 12 caracteres.');
   if(!window.crypto?.subtle)throw failure();
   let hash;
   try{hash=Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-1',new TextEncoder().encode(password))),n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();}
   catch{throw failure();}
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
   try{
     const response=await fetch('https://api.pwnedpasswords.com/range/'+hash.slice(0,5),{
       headers:{'Add-Padding':'true'},signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error'
     });
     if(!response.ok)throw failure();
     const body=await response.text();
     if(body.length>2000000)throw failure();
     const rows=body.trim().split(/\r?\n/);
     if(!rows.length||rows.some(row=>!/^([A-F0-9]{35}):\d+$/i.test(row)))throw failure();
     if(rows.some(row=>{const [suffix,count]=row.split(':');return suffix.toUpperCase()===hash.slice(5)&&Number(count)>0})){
       const error=new Error(english()?'This password appears in known leaks. Choose a different, unique password.':'Esta contraseña aparece en filtraciones conocidas. Elige otra contraseña única.');
       error.code='compromised_password';throw error;
     }
   }catch(error){if(error?.code==='compromised_password')throw error;throw failure();}
   finally{clearTimeout(timeout);}
 }
 window.IBPasswordSafety=Object.freeze({assertSafe});
})();
