import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('assets/js/auth-nav.js','utf8');
const key='sb-ppeyoovykxomxinumibk-auth-token';

function open(page,{saved=null,lang='es'}={}){
  const html=fs.readFileSync(page,'utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'').replace('<html lang="es">',`<html lang="${lang}">`);
  const dom=new JSDOM(html,{url:'https://jecaaudio.github.io/InvestorBlueprint/'+page,runScripts:'outside-only'});
  if(saved!==null)dom.window.localStorage.setItem(key,typeof saved==='string'?saved:JSON.stringify(saved));
  dom.window.eval(source);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  const links=[...dom.window.document.querySelectorAll('.navbar #primary-nav a')].filter(a=>/login\.html|account\.html/.test(a.getAttribute('href')));
  return {dom,links};
}
const session={access_token:'x',refresh_token:'r',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'member-id'}};

test('without a saved session the header keeps "Ingresar"',()=>{
  for(const page of ['index.html','pricing.html','terms.html','calculadoras/flip.html']){
    const {dom,links}=open(page);
    assert.ok(links.length>=1,page);
    for(const link of links){assert.match(link.getAttribute('href'),/login\.html$/);assert.equal(link.textContent.trim(),'Ingresar')}
    dom.window.close();
  }
});

test('with a saved session the header shows "Mi perfil", so a signed-in person can tell',()=>{
  for(const page of ['index.html','pricing.html','privacy.html','calculadoras/venta.html']){
    const {dom,links}=open(page,{saved:session});
    for(const link of links){
      assert.match(link.getAttribute('href'),/account\.html$/,page);
      assert.equal(link.textContent,'Mi perfil');
      assert.equal(link.dataset.i18n,'navAccount','language switches keep the new label');
    }
    dom.window.close();
  }
  const {dom,links}=open('index.html',{saved:session,lang:'en'});
  assert.equal(links[0].textContent,'My profile');
  dom.window.close();
});

test('an expired or unreadable saved session does not count as signed in',()=>{
  for(const saved of ['not json',{...session,refresh_token:'',expires_at:1},{access_token:'x'}]){
    const {dom,links}=open('index.html',{saved});
    assert.match(links[0].getAttribute('href'),/login\.html$/);
    dom.window.close();
  }
});

test('every public page with "Ingresar" in the header loads the session check',()=>{
  const pages=['index.html','pricing.html','privacy.html','terms.html','404.html',
    ...fs.readdirSync('calculadoras').filter(f=>f.endsWith('.html')).map(f=>'calculadoras/'+f)];
  for(const page of pages)assert.match(fs.readFileSync(page,'utf8'),/auth-nav\.js/,page);
});
