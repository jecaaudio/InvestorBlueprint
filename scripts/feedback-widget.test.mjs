import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('tools/tool-access-feedback.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));

function open({lang='es',session={user:{id:'member-id'}},insertError=null,client=true,email='',tool='flip'}={}){
  const dom=new JSDOM(`<!doctype html><html lang="${lang}"><body></body></html>`,
    {url:'https://jecaaudio.github.io/InvestorBlueprint/tools/flip-calculator.html',runScripts:'outside-only'});
  const w=dom.window,inserts=[];
  w.IB_TOOL_ID=tool;
  if(email)w.IB_SITE={contactEmail:email};
  if(client)w.IB_MEMBER_CLIENT={
    auth:{getSession:async()=>({data:{session},error:null})},
    from(table){assert.equal(table,'member_feedback');return {insert:async row=>{inserts.push(row);return {error:insertError}}}}
  };
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const d=w.document;
  const send=async text=>{
    d.getElementById('feedbackOpen').click();
    d.getElementById('feedback-message').value=text;
    d.getElementById('feedback-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
    await tick();
  };
  return {dom,d,inserts,send,status:()=>d.getElementById('feedback-status').textContent};
}

test('a signed-in member saves feedback for the current tool',async()=>{
  const {dom,d,inserts,send,status}=open();
  assert.equal(d.getElementById('feedbackOpen').textContent,'Enviar comentarios');
  assert.equal(d.getElementById('feedback-tool').value,'flip');
  await send('  El ROI no se entiende  ');
  assert.equal(JSON.stringify(inserts),JSON.stringify([{tool:'flip',page:'/InvestorBlueprint/tools/flip-calculator.html',message:'El ROI no se entiende',language:'es'}]));
  assert.match(status(),/Gracias/);
  assert.equal(d.getElementById('feedback-message').value,'');
  assert.ok(!dom.serialize().includes('investorblueprint.local'),'no fake inbox');
  dom.window.close();
});

test('the form follows the page language',async()=>{
  const {dom,d,inserts,send,status}=open({lang:'en',tool:'hard-money-analyzer'});
  assert.equal(d.getElementById('feedbackOpen').textContent,'Send feedback');
  assert.equal(d.getElementById('feedback-tool').value,'hard-money');
  await send('Great');
  assert.equal(inserts[0].language,'en');
  assert.match(status(),/Thank you/);
  d.documentElement.lang='es';await tick();
  assert.equal(d.getElementById('feedbackOpen').textContent,'Enviar comentarios');
  assert.match(status(),/Gracias/);
  dom.window.close();
});

test('empty, oversized and rate-limited feedback is explained and kept',async()=>{
  const {dom,d,inserts,send,status}=open({insertError:{code:'54000',message:'Too many comments'}});
  await send('   ');
  assert.match(status(),/Escribe tu comentario/);
  await send('a'.repeat(2001));
  assert.match(status(),/demasiado largo/);
  assert.equal(inserts.length,0);
  await send('otra idea');
  assert.match(status(),/en una hora/);
  assert.equal(d.getElementById('feedback-message').value,'otra idea','text is kept for a retry');
  dom.window.close();
});

test('without a session the comment is kept and the configured inbox is offered',async()=>{
  const {dom,d,inserts,send,status}=open({session:null,email:'hola@example.com'});
  await send('Me gustaría exportar a Excel');
  assert.equal(inserts.length,0);
  assert.match(status(),/Inicia sesión/);
  const link=d.getElementById('feedback-email');
  assert.equal(link.hidden,false);
  assert.match(link.href,/^mailto:hola@example\.com\?subject=/);
  assert.match(decodeURIComponent(link.href),/Me gustaría exportar a Excel/);
  dom.window.close();
});

test('a failed save without a contact inbox never shows an email link',async()=>{
  const {dom,d,send,status}=open({insertError:{code:'08006',message:'network'}});
  await send('hola');
  assert.match(status(),/No pudimos enviar/);
  assert.equal(d.getElementById('feedback-email').hidden,true);
  dom.window.close();
});
