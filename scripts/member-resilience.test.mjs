import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = file => readFileSync(file, 'utf8');

test('language controls still work when browser storage and translations are unavailable', async () => {
  let ready;
  const document = {
    documentElement: {lang:'es'},
    querySelectorAll(){ return []; },
    dispatchEvent(){},
    addEventListener(type,callback){ if(type==='DOMContentLoaded') ready=callback; }
  };
  const window = {translations:{}};
  const localStorage = {getItem(){throw Error('Storage blocked')},setItem(){throw Error('Storage blocked')}};
  const fetch = async () => {throw Error('Offline')};
  class CustomEvent {constructor(type, init){this.type=type;this.detail=init?.detail}}
  vm.runInNewContext(read('lang.js'), {window,document,localStorage,fetch,CustomEvent,console});
  assert.equal(typeof ready,'function');
  await ready();
  assert.equal(document.documentElement.lang,'es');
  await window.IBI18n.applyLanguage('en');
  assert.equal(document.documentElement.lang,'en');
});

test('approved member can view and save account preferences when localStorage is blocked', async () => {
  const elements = new Map();
  function el(id){
    if (!elements.has(id)) {
      const handlers={};
      elements.set(id,{
        id,hidden:true,value:'',textContent:'',dataset:{},disabled:false,handlers,
        setAttribute(){},addEventListener(type,fn){handlers[type]=fn}
      });
    }
    return elements.get(id);
  }
  const document = {readyState:'complete',documentElement:{lang:'es'},getElementById:el};
  const user={id:'member-one',email:'member@example.com'};
  const saved=[];
  const settings={
    display_name:'',company_name:'',interface_language:'es',document_language:'es',
    report_detail:'detailed',notes_detail:'detailed'
  };
  const client={
    auth:{
      async getUser(){return {data:{user},error:null}},
      async signOut(){return {error:null}}
    },
    from(table){
      if (table==='member_profiles') {
        const builder={select(){return builder},eq(){return builder},
          async single(){return {data:{id:user.id,email:user.email,role:'admin',access_status:'approved'},error:null}}};
        return builder;
      }
      assert.equal(table,'member_preferences');
      const builder={select(){return builder},eq(){return builder},
        async maybeSingle(){return {data:null,error:null}},
        upsert(data){saved.push(data);return builder},
        async single(){return {data:saved.at(-1),error:null}}};
      return builder;
    }
  };
  const window={IB_AUTH_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_example'},
    supabase:{createClient:()=>client},IBI18n:{async applyLanguage(lang){document.documentElement.lang=lang}},
    location:{assign(){}}};
  const localStorage={getItem(){throw Error('Storage blocked')},setItem(){throw Error('Storage blocked')},removeItem(){throw Error('Storage blocked')}};
  vm.runInNewContext(read('assets/js/account-settings.js'),{window,document,localStorage,Date,console});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(el('account-content').hidden,false);
  assert.equal(el('account-admin-button').hidden,false);
  assert.equal(typeof el('account-settings-form').handlers.submit,'function');
  el('setting-interface-language').value='en';
  el('setting-document-language').value='en';
  el('setting-report-detail').value='summary';
  await el('account-settings-form').handlers.submit({preventDefault(){}});
  assert.equal(saved.length,1);
  assert.equal(saved[0].user_id,user.id);
  assert.equal(saved[0].document_language,'en');
  assert.equal(saved[0].report_detail,'summary');
  assert.equal(el('account-settings-message').dataset.state,'success');
});
