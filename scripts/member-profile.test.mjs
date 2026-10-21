import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(path,'utf8');

test('account route is published and connects to authenticated settings',()=>{
 const html=read('account.html'),deploy=read('.github/workflows/deploy-pages.yml');
 for(const id of ['account-content','account-login-needed','account-settings-form','account-admin-button','setting-display-name','setting-company-name','setting-interface-language','setting-document-language','setting-report-detail','setting-notes-detail','account-signout']){
   assert.ok(html.includes('id="'+id+'"'),id+' missing');
 }
 assert.ok(deploy.includes('admin.html account.html pricing.html'), 'Profile must be present in Pages artifact');
 assert.ok(deploy.includes('test -f public-site/account.html'));
});

test('all approved members including admin return to normal member profile; admin is reached from it',()=>{
 const code=read('assets/js/member-access.js');
 assert.ok(code.includes("window.location.assign('account.html')"));
 assert.ok(code.includes("raw==='/InvestorBlueprint/account.html'"));
 assert.ok(code.includes("profile.role!=='admin'||profile.access_status!=='approved'"),'the admin page itself refuses anyone but the approved owner');
 assert.ok(read('admin.html').includes('href="account.html"'));
 assert.ok(read('index.html').includes('href="account.html"'));
 assert.ok(!read('index.html').includes('admin.html'),'the home page never links to administration');
 assert.ok(!read('login.html').includes('admin.html'),'sign-in sends the owner to My profile, not to administration');
 assert.ok(read('account.html').includes('id="account-admin-button"'));
});

test('preferences migration never permits anonymous access or writes to another member',()=>{
 const sql=read('supabase/migrations/20261019_member_preferences.sql');
 assert.ok(sql.includes('enable row level security'));
 assert.ok(sql.includes('revoke all on public.member_preferences from anon'));
 for(const cmd of ['select','insert','update'])assert.match(sql,new RegExp('for '+cmd+' to authenticated'));
 assert.ok(sql.includes('user_id = (select auth.uid())'));
 assert.ok(!sql.includes('public.member_profiles set role'));
 assert.ok(!/grant all .*anon/i.test(sql));
});

test('profile options and saved document/report languages are used in exports',()=>{
 const account=read('assets/js/account-settings.js');
 assert.ok(account.includes(".upsert(next,{onConflict:'user_id'})"));
 assert.ok(account.includes("localStorage.setItem('ib_document_language'"));
 assert.ok(account.includes("localStorage.setItem('ib_report_detail'"));
 const seller=read('calculadora-venta/print-report.js');
 assert.ok(seller.includes("setting('ib_document_language'"));
 assert.ok(seller.includes("setting('ib_report_detail'"));
 assert.ok(seller.includes('ib-report-notes'));
 const arv=read('tools/arv/arv.js');
 assert.ok(arv.includes("pref('ib_document_language'"));
 assert.ok(arv.includes("pref('ib_report_detail'"));
 assert.ok(arv.includes('reportNotes()'));
});

test('ARV demo is explicit, with required sample asset published',()=>{
 const arv=read('tools/arv/arv.js'),deploy=read('.github/workflows/deploy-pages.yml');
 assert.ok(arv.includes('calculateBtn.disabled = !configured'));
 assert.ok(arv.includes('render(payload, true)'));
 assert.ok(arv.includes('render(payload, false)'));
 assert.ok(!arv.includes('runWithDemo = !isWorkerUrlConfigured'));
 assert.ok(existsSync('tools/arv/fixtures/demo-report.json'));
 assert.ok(deploy.includes('cp -R tools/arv/fixtures public-site/tools/arv/fixtures'));
 const example=JSON.parse(read('tools/arv/fixtures/demo-report.json'));
 assert.ok(example.subject?.address && example.arv?.estimate);
});

test('report and account scripts have valid JavaScript syntax',()=>{
 for(const path of ['assets/js/account-settings.js','assets/js/member-navigation.js','assets/js/member-access.js','calculadora-venta/print-report.js','tools/arv/arv.js']){
   assert.doesNotThrow(()=>new vm.Script(read(path),{filename:path}),path);
 }
});

test('eight tools remain behind protected entry wrappers',()=>{
 const tools=JSON.parse(read('assets/config/tools.json'));
 assert.equal(tools.length,8);
 for(const tool of tools){
   const path=tool.url.endsWith('/')?tool.url+'index.html':tool.url;
   assert.ok(existsSync(path),path);
   const html=read(path);
   assert.ok(html.includes('secure-tool-loader.js'),path);
   assert.ok(html.length<6000,'Calculator implementation accidentally embedded: '+path);
 }
});
