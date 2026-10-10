'use strict';
/* =========================================================
   Sổ Tài Chính Gia Đình — app
   Every number on every screen is derived from the same store (tx, fund, deposits, vcbf, months, config),
   so sub-pages and the overview always agree and update live together.
   ========================================================= */

/* ---------- language ----------
   Texts are written in Vietnamese and translated by L() (public/js/i18n.js + i18n-dict.js).
   Label tables below keep the Vietnamese text and translate on every read, so a language switch only needs a re-render. */
const I = window.STCI18n;
const L = (s, vars) => I.t(s, vars);
function i18nize(o, fields=Object.keys(o)){ for(const f of fields){ const raw=o[f]; Object.defineProperty(o, f, {get:()=>L(raw), enumerable:true, configurable:true}); } return o; }

/* ---------- constants ---------- */
const CATS = [
  {id:'mgmt',      name:'Phí quản lý',           abs:['QL','MG','管']},
  {id:'util',      name:'Điện, nước, wifi',      abs:['ĐN','UT','光']},
  {id:'helper',    name:'Giúp việc, dọn dẹp',    abs:['GV','HS','家']},
  {id:'transport', name:'Đi lại',                abs:['ĐL','TR','交']},
  {id:'food',      name:'Ăn uống & sinh hoạt',   abs:['ĂU','FD','食']},
  {id:'other',     name:'Mua sắm, sửa chữa',     abs:['MS','SH','買']},
  {id:'kids',      name:'Bỉm sữa, khám cho con', abs:['BS','KD','子']},
].map(c=>i18nize(c,['name']));
const CAT = Object.fromEntries(CATS.map(c=>[c.id,c]));
const catAb = c => c.abs[{vi:0,en:1,ja:2}[I.get()]||0];
const INCOME_CATS = [
  {id:'income', name:'Thu nhập tháng'},
  {id:'salary', name:'Lương'},
  {id:'bonus',  name:'Thưởng'},
  {id:'side',   name:'Thu nhập phụ'},
].map(c=>i18nize(c,['name']));
const INC = Object.fromEntries(INCOME_CATS.map(c=>[c.id,c]));
const FUNDS = {
  savings:   i18nize({name:'Sổ tiết kiệm',          short:'Tiết kiệm'}),
  kids:      i18nize({name:'Quỹ cho con',           short:'Cho con'}),
  risk:      i18nize({name:'Đầu tư rủi ro cao',     short:'Đầu tư'}),
  emergency: i18nize({name:'Quỹ khẩn cấp',          short:'Khẩn cấp'}),
};
const FUND_TYPES = {
  savings:   i18nize({in:'Nạp vào', out:'Rút ra', interest:'Nhận lãi'}),
  emergency: i18nize({in:'Thu vào', out:'Chi ra'}),
};
const fundTypeLabel = (f,t) => FUND_TYPES[f]?.[t] || L(({in:'Thu vào',out:'Chi ra',interest:'Nhận lãi'})[t] || t);
const EMERGENCY_MIN = 3;
/* Banks operating in Vietnam. `ab` is the 3-letter mark shown on badges: the stock ticker for listed banks,
   otherwise the bank's common short code. Colours approximate each brand; an official logo file in
   /banks/<key>.svg replaces the badge. */
const BANK_GROUPS = i18nize({state:'Ngân hàng thương mại có vốn Nhà nước', jsc:'Ngân hàng TMCP', foreign:'Ngân hàng 100% vốn nước ngoài & liên doanh', policy:'Ngân hàng chính sách & hợp tác'});
const BANKS = {
  vcb:   {g:'state',   ab:'VCB', name:'Vietcombank',     full:'Ngân hàng TMCP Ngoại thương Việt Nam',          c1:'#00703C', c2:'#8DC63F', al:['vietcombank','ngoai thuong']},
  bidv:  {g:'state',   ab:'BID', name:'BIDV',            full:'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',  c1:'#006B68', c2:'#FDB913', al:['bidv']},
  ctg:   {g:'state',   ab:'CTG', name:'VietinBank',      full:'Ngân hàng TMCP Công Thương Việt Nam',           c1:'#004A9C', c2:'#ED1C24', al:['vietinbank','vtb','vietin']},
  agri:  {g:'state',   ab:'AGR', name:'Agribank',        full:'Ngân hàng Nông nghiệp và Phát triển Nông thôn',  c1:'#AD1E3C', c2:'#F2C200', al:['agribank','agri']},
  acb:   {g:'jsc',     ab:'ACB', name:'ACB',             full:'Ngân hàng TMCP Á Châu',                         c1:'#1A4C9B', c2:'#5BC2E7', al:[]},
  abb:   {g:'jsc',     ab:'ABB', name:'ABBank',          full:'Ngân hàng TMCP An Bình',                        c1:'#00843D', c2:'#F7A600', al:['abbank','an binh']},
  bab:   {g:'jsc',     ab:'BAB', name:'Bac A Bank',      full:'Ngân hàng TMCP Bắc Á',                          c1:'#0B7A3E', c2:'#E2B33C', al:['bac a bank','bacabank','bac a']},
  bvb:   {g:'jsc',     ab:'BVB', name:'BVBank',          full:'Ngân hàng TMCP Bản Việt',                       c1:'#F37021', c2:'#1B3F8B', al:['bvbank','ban viet','viet capital']},
  bvl:   {g:'jsc',     ab:'BVL', name:'BAOVIET Bank',    full:'Ngân hàng TMCP Bảo Việt',                       c1:'#0067B3', c2:'#F7941D', al:['baoviet bank','baovietbank','bao viet']},
  eib:   {g:'jsc',     ab:'EIB', name:'Eximbank',        full:'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam',        c1:'#0066B3', c2:'#F7A600', al:['eximbank']},
  hdb:   {g:'jsc',     ab:'HDB', name:'HDBank',          full:'Ngân hàng TMCP Phát triển TP.HCM',              c1:'#E20613', c2:'#FFCB05', al:['hdbank']},
  klb:   {g:'jsc',     ab:'KLB', name:'KienlongBank',    full:'Ngân hàng TMCP Kiên Long',                      c1:'#0067B1', c2:'#F58220', al:['kienlongbank','kien long']},
  lpb:   {g:'jsc',     ab:'LPB', name:'LPBank',          full:'Ngân hàng TMCP Lộc Phát Việt Nam',              c1:'#F37021', c2:'#004B8D', al:['lpbank','lienvietpostbank','lien viet']},
  mb:    {g:'jsc',     ab:'MBB', name:'MB',              full:'Ngân hàng TMCP Quân đội',                       c1:'#1E3B8C', c2:'#E4202A', al:['mb','mbbank','mb bank','quan doi']},
  msb:   {g:'jsc',     ab:'MSB', name:'MSB',             full:'Ngân hàng TMCP Hàng Hải Việt Nam',              c1:'#E5202E', c2:'#2B2B2B', al:['maritime','hang hai']},
  nab:   {g:'jsc',     ab:'NAB', name:'Nam A Bank',      full:'Ngân hàng TMCP Nam Á',                          c1:'#00955A', c2:'#F58220', al:['nam a bank','namabank','nam a']},
  ncb:   {g:'jsc',     ab:'NVB', name:'NCB',             full:'Ngân hàng TMCP Quốc Dân',                       c1:'#003C82', c2:'#00A0E1', al:['ncb','quoc dan']},
  ocb:   {g:'jsc',     ab:'OCB', name:'OCB',             full:'Ngân hàng TMCP Phương Đông',                    c1:'#00843D', c2:'#F7941D', al:['phuong dong']},
  pgb:   {g:'jsc',     ab:'PGB', name:'PGBank',          full:'Ngân hàng TMCP Thịnh vượng và Phát triển',      c1:'#0067B1', c2:'#ED1C24', al:['pgbank']},
  pvb:   {g:'jsc',     ab:'PVB', name:'PVcomBank',       full:'Ngân hàng TMCP Đại Chúng Việt Nam',             c1:'#0E59A6', c2:'#F6A200', al:['pvcombank','dai chung']},
  scb:   {g:'jsc',     ab:'SCB', name:'SCB',             full:'Ngân hàng TMCP Sài Gòn',                        c1:'#005BAA', c2:'#F7941D', al:['sai gon']},
  sgb:   {g:'jsc',     ab:'SGB', name:'Saigonbank',      full:'Ngân hàng TMCP Sài Gòn Công Thương',            c1:'#1B4D9B', c2:'#E31B23', al:['saigonbank','sai gon cong thuong']},
  shb:   {g:'jsc',     ab:'SHB', name:'SHB',             full:'Ngân hàng TMCP Sài Gòn – Hà Nội',               c1:'#F26F21', c2:'#004A8F', al:[]},
  seab:  {g:'jsc',     ab:'SSB', name:'SeABank',         full:'Ngân hàng TMCP Đông Nam Á',                     c1:'#E30613', c2:'#9D9D9C', al:['seabank','seab','dong nam a']},
  stb:   {g:'jsc',     ab:'STB', name:'Sacombank',       full:'Ngân hàng TMCP Sài Gòn Thương Tín',             c1:'#0066B3', c2:'#F58220', al:['sacombank']},
  tcb:   {g:'jsc',     ab:'TCB', name:'Techcombank',     full:'Ngân hàng TMCP Kỹ Thương Việt Nam',             c1:'#E3242B', c2:'#231F20', al:['techcombank','techcom','tech','ky thuong']},
  tpb:   {g:'jsc',     ab:'TPB', name:'TPBank',          full:'Ngân hàng TMCP Tiên Phong',                     c1:'#5C2D91', c2:'#F7941D', al:['tpbank','tien phong']},
  vab:   {g:'jsc',     ab:'VAB', name:'VietABank',       full:'Ngân hàng TMCP Việt Á',                         c1:'#1C3F95', c2:'#ED1C24', al:['vietabank','viet a']},
  vbb:   {g:'jsc',     ab:'VBB', name:'Vietbank',        full:'Ngân hàng TMCP Việt Nam Thương Tín',            c1:'#1F4E9A', c2:'#E31E24', al:['vietbank','viet nam thuong tin']},
  vib:   {g:'jsc',     ab:'VIB', name:'VIB',             full:'Ngân hàng TMCP Quốc tế Việt Nam',               c1:'#00419A', c2:'#F7A600', al:['quoc te']},
  vpb:   {g:'jsc',     ab:'VPB', name:'VPBank',          full:'Ngân hàng TMCP Việt Nam Thịnh Vượng',           c1:'#00A859', c2:'#E1251B', al:['vpbank']},
  gpb:   {g:'jsc',     ab:'GPB', name:'GPBank',          full:'Ngân hàng Dầu khí Toàn cầu',                    c1:'#0D7C3A', c2:'#F2B705', al:['gpbank','dau khi toan cau']},
  mbv:   {g:'jsc',     ab:'MBV', name:'MBV',             full:'Ngân hàng Việt Nam Hiện Đại (trước là OceanBank)', c1:'#1E3B8C', c2:'#00A3E0', al:['oceanbank','ocean bank']},
  vcn:   {g:'jsc',     ab:'VCN', name:'VCBNeo',          full:'Ngân hàng Thương mại TNHH MTV Ngoại thương Công nghệ số (trước là CBBank)', c1:'#00703C', c2:'#00B3E3', al:['vcbneo','cbbank','xay dung']},
  vkb:   {g:'jsc',     ab:'VKB', name:'Vikki Bank',      full:'Ngân hàng Số Vikki (trước là DongA Bank)',       c1:'#F05A28', c2:'#1A1A1A', al:['vikki','vikki bank','donga bank','dong a']},
  hsbc:  {g:'foreign', ab:'HSB', name:'HSBC',            full:'Ngân hàng TNHH MTV HSBC (Việt Nam)',             c1:'#DB0011', c2:'#FFFFFF', al:['hsbc']},
  scv:   {g:'foreign', ab:'SCV', name:'Standard Chartered', full:'Ngân hàng TNHH MTV Standard Chartered (Việt Nam)', c1:'#0473EA', c2:'#38D200', al:['standard chartered','scb vn']},
  shv:   {g:'foreign', ab:'SHV', name:'Shinhan Bank',    full:'Ngân hàng TNHH MTV Shinhan Việt Nam',            c1:'#0046FF', c2:'#B0B7C3', al:['shinhan','shinhan bank']},
  wvn:   {g:'foreign', ab:'WVN', name:'Woori Bank',      full:'Ngân hàng TNHH MTV Woori Việt Nam',              c1:'#0067AC', c2:'#00B1EB', al:['woori','woori bank']},
  uob:   {g:'foreign', ab:'UOB', name:'UOB',             full:'Ngân hàng TNHH MTV United Overseas Bank (Việt Nam)', c1:'#005EB8', c2:'#E2231A', al:[]},
  cimb:  {g:'foreign', ab:'CIM', name:'CIMB',            full:'Ngân hàng TNHH MTV CIMB Việt Nam',               c1:'#7F0019', c2:'#EC1C24', al:['cimb']},
  hlb:   {g:'foreign', ab:'HLB', name:'Hong Leong',      full:'Ngân hàng TNHH MTV Hong Leong Việt Nam',         c1:'#0055A5', c2:'#7AB800', al:['hong leong']},
  pbv:   {g:'foreign', ab:'PBV', name:'Public Bank',     full:'Ngân hàng TNHH MTV Public Việt Nam',             c1:'#E31B23', c2:'#8C8C8C', al:['public bank','public']},
  ivb:   {g:'foreign', ab:'IVB', name:'Indovina Bank',   full:'Ngân hàng TNHH Indovina (liên doanh)',           c1:'#003D7C', c2:'#E30613', al:['indovina','indovina bank']},
  vrb:   {g:'foreign', ab:'VRB', name:'VRB',             full:'Ngân hàng Liên doanh Việt – Nga',                c1:'#C8102E', c2:'#003DA5', al:['viet nga']},
  vbsp:  {g:'policy',  ab:'VBS', name:'VBSP',            full:'Ngân hàng Chính sách Xã hội Việt Nam',           c1:'#00539F', c2:'#ED1C24', al:['vbsp','chinh sach xa hoi','nhcsxh']},
  coop:  {g:'policy',  ab:'COB', name:'Co-opBank',       full:'Ngân hàng Hợp tác xã Việt Nam',                  c1:'#0068B3', c2:'#F5A623', al:['co-opbank','coopbank','hop tac xa']},
};
const noAccent = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
function bankKey(name){ const n = noAccent(name); if(!n) return null; if(BANKS[n]) return n;
  for(const [k,b] of Object.entries(BANKS)) if(b.al.includes(n) || noAccent(b.name)===n || b.ab.toLowerCase()===n) return k; return null; }
let BANK_LOGOS = {};
function bankBadge(name, size=''){
  const k = bankKey(name); const b = k && BANKS[k];
  if(k && BANK_LOGOS[k]) return `<span class="bk logo ${size}" title="${esc(b.name)}"><img src="${esc(BANK_LOGOS[k])}" alt="${esc(b.name)}"></span>`;
  if(b) return `<span class="bk ${size}" style="--b1:${b.c1};--b2:${b.c2}" title="${esc(b.name)} – ${esc(b.full)}" aria-label="${esc(b.name)}">${b.ab}</span>`;
  return `<span class="bk ${size}" style="--b1:var(--ink-2);--b2:var(--muted)" title="${esc(name||L('Khác'))}">${esc(noAccent(name||'khac').replace(/[^a-z0-9]/gi,'').slice(0,3).toUpperCase()||'—')}</span>`;
}
const bankName = name => { const k=bankKey(name); return k? BANKS[k].name : (String(name||'').trim()||L('Khác')); };
const ICONS = {
  overview:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  spending:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  invest:'<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  settings:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', close:'<path d="M6 6l12 12M18 6L6 18"/>', arrow:'<path d="M9 6l6 6-6 6"/>',
  down:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', check:'<path d="M20 6L9 17l-5-5"/>', alert:'<path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/>',
  trendUp:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', trendDown:'<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  warn:'<path d="M10.3 3.9L2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17.2v.3"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};
const GROUPS = [
  {id:'overview', label:'Tổng quan',          tab:'Tổng quan'},
  {id:'spending', label:'Chi tiêu',           tab:'Chi tiêu'},
  {id:'invest',   label:'Tiết kiệm & đầu tư', tab:'Tiết kiệm'},
  {id:'settings', label:'Thiết lập',          tab:'Thiết lập'},
].map(g=>i18nize(g,['label','tab']));
const VIEWS = {
  overview:  {group:'overview', title:'Tài sản gia đình'},
  spending:  {group:'spending', title:'Chi tiêu sinh hoạt'},
  invest:    {group:'invest',   title:'Tiết kiệm & đầu tư'},
  deposits:  {group:'invest',   title:'Sổ tiết kiệm'},
  emergency: {group:'invest',   title:'Quỹ khẩn cấp'},
  kids:      {group:'invest',   title:'Quỹ cho con'},
  settings:  {group:'settings', title:'Thiết lập & dữ liệu'},
};
for(const v of Object.values(VIEWS)) i18nize(v,['title']);
const INVEST_TABS = [['invest','Tổng hợp thông tin'],['deposits','Sổ tiết kiệm'],['emergency','Quỹ khẩn cấp'],['kids','Quỹ cho con']].map(x=>i18nize(x,[1]));
const DEFAULT_CFG = {
  openings:{savings:0, emergency:0, asOf:''},
  budgets:{}, navHistory:{}, history:{}, emergencyHistory:{},
  highRisk:0, highRiskNote:'', vcbfPrice:0, vcbfPriceDate:'', vcbfCode:'VCBF-MGF',
  emergencyTarget:6,
};

/* ---------- state ---------- */
const now = new Date();
const S = {
  view:'overview', year:now.getFullYear(), month:now.getMonth()+1,
  donutPeriod:'year', lineHidden:new Set(['_total']),
  tx:[], fund:[], deposits:[], vcbf:[], products:[], months:{}, members:[], product:null,
  cfg:null, cfgExists:false,
  loaded:{tx:false,fund:false,deposits:false,vcbf:false,products:false,months:false,cfg:false},
  conn:'pending', canWrite:true, isOwner:false, meId:null,
  drafts:{}, openInsights:new Set(),
};
let db=null, user=null;

/* ---------- helpers ---------- */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vnd = n => I.int(n);
const compact = n => I.compact(n);
const pct = (x,d=1) => (!isFinite(x)? '—' : (x>=0?'+':'−')+I.num(Math.abs(x*100),d,d)+'%');
const pctPlain = (x,d=1) => (!isFinite(x)? '—' : I.num(x*100,d,d)+'%');
const signed = n => (n>0?'+':n<0?'−':'')+vnd(Math.abs(n));
const signedC = n => (n>0?'+':n<0?'−':'')+compact(Math.abs(n));
const fmt1 = n => I.num(n,1);
const pad = n => String(n).padStart(2,'0');
const toISO = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const todayISO = () => toISO(new Date());
const fmtDate = iso => iso ? iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4) : '—';
const fmtDateTime = d => pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
function parseDMY(str){ const m=String(str||'').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/); if(!m) return null;
  const dt=new Date(+m[3],+m[2]-1,+m[1]); return (dt.getFullYear()===+m[3] && dt.getMonth()===+m[2]-1 && dt.getDate()===+m[1]) ? toISO(dt) : null; }
/** Date input that always reads/writes DD/MM/YYYY; the calendar button opens the browser picker. */
function dateInput(id, val, attrs=''){ const shown = /^\d{4}-\d{2}-\d{2}$/.test(val||'')? fmtDate(val) : (val||'');
  return `<div class="date-box"><input class="input num" id="${id}" data-date inputmode="numeric" autocomplete="off" placeholder="DD/MM/YYYY" maxlength="10" value="${esc(shown)}" ${attrs}><button type="button" class="date-btn" data-pick="${id}" aria-label="${L('Chọn ngày trên lịch')}">${ico(ICONS.cal)}</button><input type="date" class="date-native" tabindex="-1" aria-hidden="true" data-native-for="${id}"></div>`; }
function readDate(id){ const el=document.getElementById(id); const v=parseDMY(el?.value); if(!v && el){ el.setAttribute('aria-invalid','true'); el.focus(); toast(L('Ngày chưa đúng định dạng DD/MM/YYYY')); } return v; }
function parseISO(s){ const [y,m,d]=String(s).split('-').map(Number); return new Date(y,(m||1)-1,d||1); }
function addMonths(iso,n){ const d=parseISO(iso); const day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n); const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(day,last)); return toISO(d); }
const daysBetween = (a,b) => Math.round((parseISO(b)-parseISO(a))/86400000);
const ymKey = (y,m) => y+'-'+pad(m);
const lastDayISO = (y,m) => toISO(new Date(y,m,0));
const monthLabel = (y,m) => I.monthLabel(y,m);
const monthIn = (y,m) => I.monthIn(y,m);
const mShort = m => I.mShort(m);
const mYShort = (m,y) => I.mYShort(m,y);
const sum = (arr,f=x=>x) => arr.reduce((s,x)=>s+(+f(x)||0),0);
function niceMax(v){ if(v<=0) return 1; const p=10**Math.floor(Math.log10(v)); const n=v/p; return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p; }
const ico = (paths,cls='ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const normCat = c => CAT[c]? c : 'other';
const isClosed = d => d.status==='closed';

/* Shorthand in every language: 250k, 1tr2, 2.5tr, 1ty5, 2.5m, 1.2b/bn, 25万, 1億2000万, 150k+80k+1tr */
function parseAmount(str){
  let s = String(str??'').toLowerCase().replace(/\s+/g,'').replace(/₫|vnđ|vnd|đ|ドン/g,'');
  if(!s) return NaN;
  const units = {'tỷ':1e9,ty:1e9,bn:1e9,b:1e9,'triệu':1e6,trieu:1e6,tr:1e6,m:1e6,'nghìn':1e3,nghin:1e3,k:1e3,n:1e3,'億':1e8,'万':1e4,'千':1e3};
  const tok = /(\d+(?:[.,]\d+)?)(tỷ|ty|bn|b|triệu|trieu|tr|m|nghìn|nghin|k|n|億|万|千)/y;
  let total = 0;
  for(const p of s.split('+')){
    if(!p) return NaN;
    if(/^\d{1,3}([.,]\d{3})+$/.test(p) || /^\d+$/.test(p)){ total += parseInt(p.replace(/[.,]/g,''),10); continue; }
    tok.lastIndex = 0; let m, n = 0, last = 0, v = 0, lastUnit = 0;
    while((m = tok.exec(p))){ lastUnit = units[m[2]]; v += parseFloat(m[1].replace(',','.'))*lastUnit; last = tok.lastIndex; n++; }
    if(!n) return NaN;
    const rest = p.slice(last);
    if(rest){ if(!/^\d+$/.test(rest)) return NaN;
      if(n===1 && !/[億万千]/.test(p)) v += parseFloat('0.'+rest)*lastUnit;   // 1tr2 = 1.2 triệu
      else v += +rest; }                                                     // 1億2000万500 → +500
    total += v;
  }
  return Math.round(total);
}
const parseDecimal = s => I.parseDecimal(s);
const cfg = () => ({...DEFAULT_CFG, ...(S.cfg||{}), openings:{...DEFAULT_CFG.openings, ...((S.cfg||{}).openings||{})}, budgets:{...((S.cfg||{}).budgets||{})}, emergencyHistory:{...((S.cfg||{}).emergencyHistory||{})}});

let toastT;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2800); }
function errMsg(e){
  const c = e && e.code;
  if(e && e.message && /[À-ỹ]/.test(e.message) && c!=='unavailable') return I.tMsg(e.message);
  if(c==='permission_denied') return L('Tài khoản của bạn không có quyền thực hiện thao tác này.');
  if(c==='invalid_argument') return L('Không lưu được: dữ liệu chưa hợp lệ.');
  if(c==='resource_exhausted') return L('Thao tác quá nhanh. Đợi vài giây rồi thử lại.');
  if(c==='revoked') return L('Phiên đăng nhập đã thay đổi. Tải lại trang.');
  return L('Không lưu được. Kiểm tra kết nối rồi thử lại.');
}
async function write(fn){
  if(!db){ toast(L('Chưa kết nối được máy chủ. Kiểm tra mạng rồi tải lại trang.')); return false; }
  try{ await fn(); return true; }
  catch(e){
    if(e && e.code==='unavailable'){ await new Promise(r=>setTimeout(r,600+Math.random()*600)); try{ await fn(); return true; }catch(e2){ toast(errMsg(e2)); return false; } }
    toast(errMsg(e)); return false;
  }
}
const draft = (k, dflt) => (k in S.drafts ? S.drafts[k] : dflt);

/* =========================================================
   Derivations (single source of truth)
   ========================================================= */
const aggCache = new Map();
function monthAgg(year){
  if(aggCache.has(year)) return aggCache.get(year);
  const arr = Array.from({length:12},()=>({income:0,exp:0,n:0,cats:Object.fromEntries(CATS.map(c=>[c.id,0]))}));
  for(const t of S.tx){
    if(!t.date || +t.date.slice(0,4)!==year) continue;
    const m = +t.date.slice(5,7)-1; if(m<0||m>11) continue;
    const a = +t.amount||0; const r = arr[m]; r.n++;
    if(t.kind==='income') r.income += a; else { r.exp += a; r.cats[normCat(t.cat)] += a; }
  }
  aggCache.set(year, arr);
  return arr;
}
function yearTotals(year){ const a=monthAgg(year); const out={income:sum(a,m=>m.income), exp:sum(a,m=>m.exp), months:a.filter(m=>m.n).length, cats:{}}; for(const c of CATS) out.cats[c.id]=sum(a,m=>m.cats[c.id]); return out; }
/* ---------- years: data for each calendar year, balances carried forward ---------- */
const YEARS_AHEAD = 40;
const curYear = () => new Date().getFullYear();
const curMonth = () => new Date().getMonth()+1;
function firstYear(){
  const c = cfg(); let y = curYear();
  for(const t of S.tx) if(t.date) y = Math.min(y, +t.date.slice(0,4));
  for(const e of S.fund) if(e.date) y = Math.min(y, +e.date.slice(0,4));
  for(const src of [c.history, c.navHistory, c.emergencyHistory]) for(const k of Object.keys(src||{})) if(+k) y = Math.min(y, +k);
  return y;
}
const lastYear = () => curYear() + YEARS_AHEAD;
/** Month shown for a year: the current month this year, December for past years, January for future years. */
const refMonth = y => y===curYear()? curMonth() : y<curYear()? 12 : 1;
const monthsElapsed = y => y<curYear()? 12 : y===curYear()? curMonth() : 0;
function defaultDateISO(){ const y=S.year, cy=curYear(); return y===cy? todayISO() : y<cy? y+'-12-31' : y+'-01-01'; }
/** Income/expense of a year: from records when the year has them, else from the yearly summary imported from Excel. */
function yearSummary(y){
  const t = yearTotals(y); if(t.months) return {...t, source:'data'};
  const h = cfg().history[y]; if(!h) return null;
  const cats = {}; for(const c of CATS) cats[c.id] = +h[c.id]||0;
  return {income:+h.income||0, exp:sum(CATS,c=>cats[c.id]), months:12, cats, source:'history'};
}
function setYear(y){
  S.year = Math.min(lastYear(), Math.max(firstYear(), +y)); S.month = refMonth(S.year);
  try{ sessionStorage.setItem('stc.year', String(S.year)); }catch(e){}
  render(); window.scrollTo(0,0);
}
/** Rolling average of the last 12 months that have expenses (crosses year boundaries). */
function avgMonthlyExpense(){
  const rows=[]; let y=curYear(), m=curMonth()+1;
  for(let k=0;k<12;k++){ m--; if(m<1){m=12;y--;} const a=monthAgg(y)[m-1]; if(a.exp>0) rows.push({y,m,exp:a.exp}); }
  if(rows.length){ const o=rows[rows.length-1], l=rows[0]; return {avg: sum(rows,r=>r.exp)/rows.length, n:rows.length, basis:L('{n} tháng gần nhất có số liệu ({from} – {to})', {n:rows.length, from:pad(o.m)+'/'+o.y, to:pad(l.m)+'/'+l.y})}; }
  const p = yearSummary(curYear()-1); if(p) return {avg:p.exp/p.months, n:p.months, basis:L('năm {y}', {y:curYear()-1})};
  return {avg:0,n:0,basis:''};
}
/** Average of up to 12 earlier months (crossing years) that have records. */
function prevAverage(y,m){
  const rows=[]; let yy=y, mm=m;
  for(let k=0;k<12;k++){ mm--; if(mm<1){mm=12;yy--;} const a=monthAgg(yy)[mm-1]; if(a.n) rows.push(a); }
  const n=rows.length; const out={n, income: n? sum(rows,r=>r.income)/n : 0, exp: n? sum(rows,r=>r.exp)/n : 0, cats:{}};
  for(const c of CATS) out.cats[c.id] = n? sum(rows,r=>r.cats[c.id])/n : 0;
  return out;
}
function fundBalance(f, upTo){
  let b = +cfg().openings[f]||0;
  for(const e of S.fund){ if(e.fund!==f || (upTo && e.date>upTo)) continue; b += e.type==='out' ? -(+e.amount||0) : (+e.amount||0); }
  return b;
}
/** Per-year in/out of a fund. Years before the ledger starts come from the summary history in config. */
function fundYearFlows(f){
  const hist = f==='emergency'? cfg().emergencyHistory : {};
  const out = {};
  for(const [y,v] of Object.entries(hist)) out[y] = {in:+v.in||0, out:+v.out||0};
  for(const e of S.fund){
    if(e.fund!==f || !e.date) continue;
    const y = e.date.slice(0,4); if(hist[y]) continue;
    out[y] = out[y] || {in:0, out:0};
    if(e.type==='out') out[y].out += +e.amount||0; else out[y].in += +e.amount||0;
  }
  return out;
}
/* ---------- investment portfolio (Quỹ cho con) ----------
   products: one document per fund / instrument, each with its own current price.
   lots (collection "vcbf"): every buy/sell, tagged with its product id. Totals = sum over products. */
const LEGACY_PRODUCT = 'vcbf-mgf';
const PRODUCT_TYPES = i18nize({equity:'Quỹ cổ phiếu', bond:'Quỹ trái phiếu', balanced:'Quỹ cân bằng', stock:'Cổ phiếu', gold:'Vàng', other:'Khác'});
const PRODUCT_MODES = i18nize({sip:'Định kỳ (SIP)', lump:'Mua một lần'});
const MANAGERS = ['VCBF','Dragon Capital (DCVFM)','SSIAM','VinaCapital','Techcom Capital (TCAM)','MB Capital','Mirae Asset','Manulife IM','VinaWealth','Bảo Việt Fund','Công ty chứng khoán','Khác'];
const PRODUCT_COLORS = ['var(--c-kids)','var(--c-mgmt)','var(--c-util)','var(--c-transport)','var(--c-helper)','var(--c-other)','var(--c-food)'];
function products(){
  const list = S.products.map(p=>({...p}));
  if(S.vcbf.some(l=>!list.some(p=>p.id===(l.product||LEGACY_PRODUCT)))) list.push({id:LEGACY_PRODUCT, code:cfg().vcbfCode||'VCBF-MGF', name:'', manager:'VCBF', type:'equity', mode:'sip', unit:'CCQ', price:+cfg().vcbfPrice||0, priceDate:cfg().vcbfPriceDate||'', _virtual:true});
  return list.sort((a,b)=>(a.at||0)-(b.at||0)).map((p,i)=>({...p, color:PRODUCT_COLORS[i%PRODUCT_COLORS.length]}));
}
/** Average-cost accounting: a sell reduces units and cost at the running average; the difference is realised P/L. */
function productStats(p){
  const lots = S.vcbf.filter(l=>(l.product||LEGACY_PRODUCT)===p.id).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.at||0)-(b.at||0));
  let units=0, cost=0, realized=0, invested=0, proceeds=0;
  for(const l of lots){
    const u=+l.units||0, pr=+l.price||0, fee=+l.fee||0;
    if(l.side==='sell'){ const avg = units? cost/units : 0; const q = Math.min(u, units); cost -= avg*q; units -= q; realized += q*pr - fee - avg*q; proceeds += q*pr - fee; }
    else { units += u; cost += u*pr + fee; invested += u*pr + fee; }
  }
  const price = +p.price||0, value = units*price, unreal = value-cost;
  return {p, lots, units, cost, value, price, avg: units? cost/units : 0, unreal, realized, pl: unreal+realized, plPct: cost? unreal/cost : NaN, invested, proceeds};
}
function portfolio(){
  const items = products().map(productStats);
  const t = {items, value:sum(items,i=>i.value), cost:sum(items,i=>i.cost), unreal:sum(items,i=>i.unreal), realized:sum(items,i=>i.realized), invested:sum(items,i=>i.invested), tx:S.vcbf.length};
  t.pl = t.unreal + t.realized; t.plPct = t.cost? t.unreal/t.cost : NaN;
  return t;
}
function vcbfStats(){ const t = portfolio(); return {value:t.value, cost:t.cost, pl:t.pl, plPct:t.plPct, n:t.items.length, tx:t.tx}; }
const productLabel = p => p.code || p.name || L('Sản phẩm');
/** Units are stored as typed (CCQ, cổ phiếu…); the common ones are shown in the reader's language. */
const unitLabel = u => u? L(u) : '';
const fmtUnits = u => I.num(u,2);
const fmtPrice = p => I.num(p,2);
function depCalc(d){
  const mat = depMaturity(d); const today = todayISO();
  const totalDays = Math.max(1, daysBetween(d.start, mat));
  const end = isClosed(d) && d.closedAt && d.closedAt<mat ? d.closedAt : mat;
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(d.start, today<end? today : end)));
  const amt = +d.amount||0, r = (+d.rate||0)/100;
  const accrued = amt*r*elapsed/365, atMat = amt*r*totalDays/365;
  const left = daysBetween(today, mat);
  const status = isClosed(d) ? 'closed' : left<=0 ? 'matured' : left<=30 ? 'soon' : 'active';
  return {mat,totalDays,elapsed,accrued,atMat,left,status,progress:elapsed/totalDays};
}
const activeDeposits = () => S.deposits.filter(d=>!isClosed(d));
function nav(){
  const v = vcbfStats();
  const parts = { savings: fundBalance('savings'), kids: v.value, risk: +cfg().highRisk||0, emergency: fundBalance('emergency') };
  return {parts, total: sum(Object.values(parts))};
}
function portfolioValueAt(end){
  return sum(products(), p=>{ let u=0; for(const l of S.vcbf){ if((l.product||LEGACY_PRODUCT)!==p.id || (l.date||'')>end) continue; u += l.side==='sell'? -(+l.units||0) : (+l.units||0); } return Math.max(0,u)*(+p.price||0); });
}
function navEstimate(y){ const end=y+'-12-31'; const parts={savings:fundBalance('savings',end), kids:portfolioValueAt(end), risk:+cfg().highRisk||0, emergency:fundBalance('emergency',end)}; return {parts, total:sum(Object.values(parts))}; }
const ledgerStartYear = () => +(cfg().openings.asOf||'').slice(0,4) || 0;
function navAt(y){
  if(y>=curYear()) return {...nav(), kind:'live'};
  const c = cfg(); const snap = +c.navHistory[y]||0;
  if(snap) return {total:snap, parts:(c.navParts||{})[y]||null, kind:'snapshot'};
  if(y>ledgerStartYear()) return {...navEstimate(y), kind:'estimate'};
  return {total:0, parts:null, kind:'none'};
}
/** At the first visit of a new year, record last year's closing net worth so it becomes next year's baseline. */
async function maybeCloseYear(){
  const py = curYear()-1; const c = cfg();
  if(!S.canWrite || c.navHistory[py] || py<=ledgerStartYear()) return;
  const est = navEstimate(py);
  if(await saveCfg({navHistory:{...c.navHistory,[py]:Math.round(est.total)}, navParts:{...(c.navParts||{}),[py]:est.parts}})) toast(L('Đã chốt tài sản ròng cuối năm {y}: {v} ₫', {y:py, v:vnd(est.total)}));
}
function emergencyStats(){
  const c = cfg(); const bal = fundBalance('emergency'); const {avg, basis} = avgMonthlyExpense();
  const target = +c.emergencyTarget||6; const months = avg? bal/avg : 0;
  const y = String(S.year); const fl = fundYearFlows('emergency')[y] || {in:0,out:0};
  return {bal, avg, basis, target, months, days: Math.round(months*30), targetAmt: avg*target, minAmt: avg*EMERGENCY_MIN,
    gap: bal-avg*target, minProgress: avg? bal/(avg*EMERGENCY_MIN) : 0, yearIn: fl.in, yearOut: fl.out, yearNet: fl.in-fl.out};
}
function txLabel(t){ return t.kind==='income' ? (INC[t.cat]?.name||L('Thu nhập')) : (CAT[t.cat]?.name||L('Khác')); }

function alerts(){
  const out = []; const c = cfg();
  for(const d of activeDeposits()){
    const k = depCalc(d);
    if(k.status==='matured') out.push({lv:'neg', t:L('Sổ {bank} {amt} đã đến hạn {date}', {bank:d.bank||'', amt:compact(d.amount), date:fmtDate(k.mat)}), d:L('Cập nhật: tái tục (sửa ngày gửi) hoặc đánh dấu Đã tất toán.'), go:'deposits'});
    else if(k.status==='soon') out.push({lv:'warn', t:L('Sổ {bank} {amt} đáo hạn sau {n} ngày', {bank:d.bank||'', amt:compact(d.amount), n:k.left}), d:L('Ngày {date} · lãi dự kiến {v}.', {date:fmtDate(k.mat), v:compact(k.atMat)}), go:'deposits'});
  }
  const y=curYear(), m=curMonth(); const a = monthAgg(y)[m-1];
  for(const cat of CATS){ const b=+c.budgets[cat.id]||0; if(b && a.cats[cat.id]>b) out.push({lv:'warn', t:L('{cat} vượt ngân sách {month}', {cat:cat.name, month:monthIn(y,m)}), d:L('Đã chi {spent} / {budget} (+{over}).', {spent:compact(a.cats[cat.id]), budget:compact(b), over:compact(a.cats[cat.id]-b)}), go:'spending'}); }
  const pm = m===1? {y:y-1,m:12} : {y, m:m-1};
  const pa = monthAgg(pm.y)[pm.m-1]; const sur = pa.income - pa.exp;
  const pw = +((S.months[ymKey(pm.y,pm.m)]||{}).withdrawn?.amount)||0;
  if(pa.n && sur-pw>0 && !S.fund.some(e=>e.ref==='surplus-'+ymKey(pm.y,pm.m))) out.push({lv:'info', t:L('Thặng dư {month}: {v} chưa chuyển quỹ', {month:mYShort(pm.m,pm.y), v:compact(sur-pw)}), d:L('Chuyển vào Quỹ khẩn cấp để chốt sổ tháng.'), go:'spending', month:pm});
  const act = activeDeposits();
  if(act.length){ const diff = fundBalance('savings') - sum(act,d=>d.amount);
    if(Math.abs(diff) >= 100000) out.push({lv:'info', t:L('Sổ tiết kiệm lệch số dư quỹ {v}', {v:compact(Math.abs(diff))}), d:L('Tổng gốc đang gửi {p} so với số dư quỹ {f}.', {p:compact(sum(act,d=>d.amount)), f:compact(fundBalance('savings'))}), go:'deposits'}); }
  return out;
}

/** Automatic, descriptive assessment. Items that need attention (tone low/mid) carry a numeric
    improvement plan; when the numbers recover the same item turns back to a normal tone by itself. */
const SAVE_TARGET = .2;
function insights(){
  const y = S.year; const yt = yearTotals(y); const N = navAt(y); const em = emergencyStats(); const v = vcbfStats();
  const items = []; let score = 0;
  const months = monthAgg(y).map((m,i)=>({...m,i})).filter(m=>m.n);
  const n = months.length || 1, left = Math.max(0, 12 - monthsElapsed(y));
  const avgInc = yt.income/n, avgExp = yt.exp/n, avgSur = avgInc-avgExp;
  const b = s => `<b>${s}</b>`;
  const topCats = CATS.map(c=>({c, v:yt.cats[c.id]})).sort((p,q)=>q.v-p.v);

  // 1. Savings rate
  const rate = yt.income? (yt.income-yt.exp)/yt.income : NaN;
  if(isFinite(rate)){
    const tone = rate>=SAVE_TARGET?'good':rate>=.1?'mid':'low'; score += rate>=SAVE_TARGET?2:rate>=.1?1:0;
    let plan = null;
    if(tone!=='good'){
      const capExp = avgInc*(1-SAVE_TARGET), cut = avgExp-capExp;
      const top3 = topCats.slice(0,3), top3Sum = sum(top3,x=>x.v)||1;
      const needAnnual = SAVE_TARGET*avgInc*12 - (yt.income-yt.exp);
      const tg = pctPlain(SAVE_TARGET,0);
      plan = [
        L('Mục tiêu: giữ lại {tg} thu nhập. Với thu nhập bình quân {inc}/tháng, chi tiêu cần ở mức tối đa {cap}/tháng (hiện {exp} ₫ → giảm {cut}/tháng, tức {cutPct}).', {tg, inc:b(vnd(avgInc)+' ₫'), cap:b(vnd(capExp)+' ₫'), exp:vnd(avgExp), cut:b(vnd(cut)+' ₫'), cutPct:pctPlain(cut/avgExp,0)}),
        L('Chia mức giảm cho 3 khoản lớn nhất: {list}.', {list: top3.map(x=>{ const m=x.v/n, c=cut*x.v/top3Sum; return L('{cat} {cut} (từ {from} xuống {to}/tháng)', {cat:x.c.name, cut:b('−'+vnd(c)), from:compact(m), to:compact(m-c)}); }).join(L('; '))}),
        left? (needAnnual/left < avgInc ? L('Để cả năm {y} đạt {tg}: {left} tháng còn lại mỗi tháng cần thặng dư {need}, tức chi tối đa {cap}/tháng nếu thu nhập giữ mức hiện tại.', {y, tg, left, need:b(vnd(needAnnual/left)+' ₫'), cap:b(vnd(avgInc-needAnnual/left)+' ₫')})
            : L('Khó đạt {tg} cho riêng năm {y} (cần thặng dư {need} ₫/tháng, vượt thu nhập bình quân). Hãy áp dụng mức chi {cap} ₫/tháng ngay từ tháng tới để đạt mục tiêu cho năm {y1}.', {tg, y, need:vnd(needAnnual/left), cap:vnd(capExp), y1:y+1}))
          : L('Áp dụng mức chi tối đa {cap} ₫/tháng cho năm {y1}.', {cap:vnd(capExp), y1:y+1}),
        L('Hoặc tăng thu nhập thêm {add}/tháng (lên {to} ₫) nếu giữ nguyên mức chi.', {add:b(vnd(avgExp/(1-SAVE_TARGET)-avgInc)+' ₫'), to:vnd(avgExp/(1-SAVE_TARGET))}),
        L('Cuối mỗi tháng, bấm “Chuyển vào Quỹ khẩn cấp” ở mục Chi tiêu để chốt phần thặng dư, tránh tiêu lẫn sang tháng sau.'),
      ];
    }
    items.push({key:'rate', tone, ic: tone==='good'?ICONS.trendUp:ICONS.trendDown, t:L('Tỷ lệ tiết kiệm năm {y}: {rate}', {y, rate:pctPlain(rate)}),
      d:L('Giữ lại {kept} trên {inc} thu nhập sau {n} tháng.', {kept:compact(yt.income-yt.exp), inc:compact(yt.income), n:yt.months})+' '+(tone==='good'? L('Đạt mức tốt (từ {tg} trở lên).', {tg:pctPlain(SAVE_TARGET,0)}) : L('Mục tiêu thường dùng là {tg}.', {tg:pctPlain(SAVE_TARGET,0)})), plan});
  }

  // 2. Spending trend: last 3 months vs the months before
  const exp = months.filter(m=>m.exp>0);
  if(exp.length>=4){
    const last3 = exp.slice(-3), before = exp.slice(0,-3);
    const l = sum(last3,m=>m.exp)/3, bAvg = sum(before,m=>m.exp)/before.length, ch = (l-bAvg)/bAvg;
    const tone = ch>.1?'low':ch>.05?'mid':'good'; score += ch<=.05?1:0;
    let plan = null;
    if(tone!=='good'){
      const rises = CATS.map(c=>{ const a=sum(last3,m=>m.cats[c.id])/3, p=sum(before,m=>m.cats[c.id])/before.length; return {c,a,p,d:a-p}; }).filter(x=>x.d>0).sort((p,q)=>q.d-p.d);
      plan = [
        L('Mục tiêu: đưa chi tiêu về mức trung bình trước đó {avg}/tháng, tức giảm {cut}/tháng so với 3 tháng gần nhất ({last} ₫).', {avg:b(vnd(bAvg)+' ₫'), cut:b(vnd(l-bAvg)+' ₫'), last:vnd(l)}),
        rises.length? L('Các khoản tăng nhiều nhất: {list}.', {list: rises.slice(0,3).map(x=>L('{cat} {d}/tháng ({from} → {to})', {cat:x.c.name, d:b('+'+vnd(x.d)), from:compact(x.p), to:compact(x.a)})).join(L('; '))}) : L('Mức tăng đến từ nhiều khoản nhỏ; kiểm tra lại mục Mua sắm và Ăn uống.'),
        rises.length? L('Đặt ngân sách tháng cho {list} trong mục Thiết lập để nhận cảnh báo khi vượt.', {list: rises.slice(0,2).map(x=>L('{cat} ở mức {v} ₫', {cat:x.c.name, v:b(vnd(x.p))})).join(L(' và '))}) : L('Đặt ngân sách tháng trong mục Thiết lập để nhận cảnh báo khi vượt.'),
        L('Nếu khoản tăng là chi phí một lần (đám cưới, khám bệnh, sửa nhà…), ghi rõ trong “Mô tả tháng” để tách khỏi chi tiêu thường xuyên.'),
      ];
    }
    items.push({key:'trend', tone, ic: ch>0?ICONS.trendUp:ICONS.trendDown, t: ch>=0? L('Chi tiêu 3 tháng gần nhất tăng {p}', {p:pctPlain(Math.abs(ch))}) : L('Chi tiêu 3 tháng gần nhất giảm {p}', {p:pctPlain(Math.abs(ch))}),
      d:L('Trung bình {avg}/tháng ({from}–{to}) so với {before}/tháng các tháng trước đó.', {avg:compact(l), from:mShort(last3[0].i+1), to:mShort(last3[2].i+1), before:compact(bAvg)}), plan});
  }

  // 3. Expense structure
  if(yt.exp){
    const share = topCats[0].v/yt.exp;
    const tone = share>.35? 'mid' : 'info';
    const plan = tone==='mid'? [
      L('Mục tiêu: không khoản nào vượt 30% tổng chi. {cat} cần giảm {cut}/tháng (từ {from} xuống {to}/tháng).', {cat:topCats[0].c.name, cut:b(vnd((topCats[0].v-.3*yt.exp)/n)+' ₫'), from:compact(topCats[0].v/n), to:compact(.3*yt.exp/n)}),
      L('Theo dõi khoản này hằng tuần bằng nút “Ghi chép” để thấy sớm khi vượt mức.'),
    ] : null;
    items.push({key:'struct', tone, ic:ICONS.info, t:L('Khoản chi lớn nhất: {cat} ({p})', {cat:topCats[0].c.name, p:pctPlain(share)}),
      d:L('Tiếp theo là {c2} ({p2}) và {c3} ({p3}). Ba nhóm này chiếm {p} tổng chi.', {c2:topCats[1].c.name, p2:pctPlain(topCats[1].v/yt.exp), c3:topCats[2].c.name, p3:pctPlain(topCats[2].v/yt.exp), p:pctPlain((topCats[0].v+topCats[1].v+topCats[2].v)/yt.exp,0)}), plan});
  }

  // 4. Emergency fund
  if(em.avg){
    const tone = em.months>=em.target?'good':em.months>=EMERGENCY_MIN?'mid':'low'; score += em.months>=em.target?2:em.months>=EMERGENCY_MIN?1:0;
    let plan = null;
    if(tone!=='good'){
      const toMin = Math.max(0, em.minAmt-em.bal), toTarget = Math.max(0, em.targetAmt-em.bal);
      const monthsSoFar = Math.max(1, monthsElapsed(y)), inflow = em.yearNet/monthsSoFar;
      plan = [
        toMin>0? L('Mốc an toàn {min} tháng là {amt}: còn thiếu {gap}. Nạp thêm {m3} ₫/tháng để đạt trong 3 tháng, hoặc {m6} ₫/tháng trong 6 tháng.', {min:EMERGENCY_MIN, amt:b(vnd(em.minAmt)+' ₫'), gap:b(vnd(toMin)+' ₫'), m3:b(vnd(toMin/3)), m6:b(vnd(toMin/6))}) : L('Đã qua mốc an toàn {min} tháng ({amt} ₫).', {min:EMERGENCY_MIN, amt:vnd(em.minAmt)}),
        L('Mục tiêu {target} tháng là {amt}: còn thiếu {gap}, tương đương nạp {m12} ₫/tháng trong 12 tháng.', {target:em.target, amt:b(vnd(em.targetAmt)+' ₫'), gap:b(vnd(toTarget)+' ₫'), m12:b(vnd(toTarget/12))}),
        inflow>0? L('Năm {y}, quỹ đang tăng ròng bình quân {v}/tháng → với tốc độ này cần khoảng {n} tháng để đạt mục tiêu.', {y, v:b(signed(inflow)+' ₫'), n:b(Math.ceil(toTarget/inflow))})
          : L('Năm {y}, quỹ đang tăng ròng bình quân {v}/tháng. Các khoản chi từ quỹ đang lớn hơn khoản nạp vào.', {y, v:b(signed(inflow)+' ₫')}),
        L('Nguồn nạp gợi ý: thặng dư sinh hoạt hằng tháng (bình quân {v} ₫) và các khoản thưởng, thu nhập phụ. Hạn chế dùng quỹ cho chi tiêu không khẩn cấp.', {v:vnd(avgSur)}),
      ];
    }
    items.push({key:'emergency', tone, ic: tone==='good'?ICONS.check:ICONS.alert, t:L('Quỹ khẩn cấp đủ {n} tháng chi tiêu', {n:fmt1(em.months)}),
      d: tone==='good' ? L('Đạt mục tiêu {target} tháng ({amt}).', {target:em.target, amt:compact(em.targetAmt)}) : tone==='mid' ? L('Đã qua mốc an toàn {min} tháng; còn thiếu {gap} để đạt {target} tháng.', {min:EMERGENCY_MIN, gap:compact(-em.gap), target:em.target}) : L('Chưa tới mốc an toàn tối thiểu {min} tháng ({amt}); còn thiếu {gap}.', {min:EMERGENCY_MIN, amt:compact(em.minAmt), gap:compact(em.minAmt-em.bal)}), plan});
  }

  // 5. Net worth vs last year
  const prev = navAt(y-1).total||0;
  if(prev && N.total && y<=curYear()){
    const g=(N.total-prev)/prev; score += g>0?1:0;
    const plan = g<0? [
      L('Tài sản ròng giảm {v} so với cuối {py}.', {v:b(vnd(prev-N.total)+' ₫'), py:y-1})+(N.parts? ' '+L('Thành phần: sổ tiết kiệm {s}, quỹ cho con {k}, quỹ khẩn cấp {e}, đầu tư {r}.', {s:compact(N.parts.savings), k:compact(N.parts.kids), e:compact(N.parts.emergency), r:compact(N.parts.risk)}) : ''),
      L('Để lấy lại mức cuối {py} trước hết năm, cần tăng {v}/tháng trong {n} tháng còn lại.', {py:y-1, v:b(vnd((prev-N.total)/Math.max(1,left))+' ₫'), n:Math.max(1,left)}),
      L('Kiểm tra các khoản rút lớn trong nhật ký Quỹ tiết kiệm và Quỹ khẩn cấp để xác định nguyên nhân.'),
    ] : null;
    items.push({key:'nav', tone: g>=0?'good':'low', ic: g>=0?ICONS.trendUp:ICONS.trendDown, t: g>=0? L('Tài sản ròng tăng {p} so với cuối {py}', {p:pctPlain(Math.abs(g)), py:y-1}) : L('Tài sản ròng giảm {p} so với cuối {py}', {p:pctPlain(Math.abs(g)), py:y-1}), d:L('Từ {from} lên {to} ({d}).', {from:compact(prev), to:compact(N.total), d:signedC(N.total-prev)}), plan});
  }

  // 6. Allocation (descriptive only)
  if(N.total && N.parts){
    items.push({key:'alloc', tone:'info', ic:ICONS.info, t:L('Phân bổ: {p} tài sản nằm ở sổ tiết kiệm', {p:pctPlain(N.parts.savings/N.total)}), d:L('Quỹ cho con {k}, quỹ khẩn cấp {e}, đầu tư rủi ro cao {r}. Sổ tiết kiệm an toàn về vốn nhưng chỉ rút linh hoạt khi đến hạn.', {k:pctPlain(N.parts.kids/N.total), e:pctPlain(N.parts.emergency/N.total), r:pctPlain(N.parts.risk/N.total)})});
  }

  // 7. Children's portfolio
  if(v.cost){
    const P = portfolio(); const losers = P.items.filter(i=>i.unreal<0 && i.cost>0);
    const plan = v.pl<0? [
      ...losers.map(i=>L('{prod}: giá vốn bình quân {avg}, giá hiện tại {price} → cần tăng {up} để hòa vốn (lỗ tạm tính {loss} ₫).', {prod:productLabel(i.p), avg:b(fmtPrice(i.avg)), price:fmtPrice(i.price), up:b(pctPlain((i.avg-i.price)/i.price)), loss:vnd(-i.unreal)})),
      L('Đây là lỗ tạm tính, chưa phát sinh khi chưa bán. Cập nhật giá hằng tháng trong mục Quỹ cho con để theo dõi sát.'),
    ] : null;
    items.push({key:'kids', tone: v.pl>=0?'good':'mid', ic: v.pl>=0?ICONS.trendUp:ICONS.trendDown, t: v.pl>=0? L('Quỹ cho con đang lãi {p}', {p:pct(v.plPct,2)}) : L('Quỹ cho con đang lỗ {p}', {p:pct(v.plPct,2)}), d:L('Giá trị {v} trên vốn góp {c} · {n} sản phẩm, {tx} giao dịch.', {v:compact(v.value), c:compact(v.cost), n:v.n, tx:v.tx}), plan});
  }

  const order = {low:0, mid:1, info:2, good:3};
  items.sort((p,q)=>order[p.tone]-order[q.tone]);
  const maxScore = 6;
  const verdict = score>=5 ? {tone:'good', t:L('Vững vàng')} : score>=3 ? {tone:'mid', t:L('Ổn định')} : {tone:'low', t:L('Cần cải thiện')};
  return {score, maxScore, verdict, items, flagged: items.filter(i=>i.tone==='low'||i.tone==='mid').length};
}
function insightRow(it){
  const flag = it.tone==='low' || it.tone==='mid';
  const open = S.openInsights.has(it.key);
  const title = flag && it.plan
    ? `<button type="button" class="ins-t" data-insight="${it.key}" aria-expanded="${open}"><span>${esc(it.t)}</span><span class="chip neg">${it.tone==='low'?L('Cần cải thiện'):L('Cần lưu ý')}</span>${ico('<path d="M6 9l6 6 6-6"/>','ico chev')}</button>`
    : `<div class="t">${esc(it.t)}</div>`;
  return `<div class="insight ${it.tone} ${flag?'flag':''}"><span class="ic">${ico(flag? ICONS.warn : it.ic)}</span><div style="min-width:0">${title}<div class="d">${esc(it.d)}</div>
    ${flag && it.plan && open? `<div class="plan"><b>${L('Cách cải thiện')}</b><ol>${it.plan.map(p=>`<li>${p}</li>`).join('')}</ol></div>` : ''}</div></div>`;
}

/* =========================================================
   Charts (SVG, theme tokens) + hover/touch tooltips
   ========================================================= */
const CH = {};
function axis(max, W, pl, pt, ih, ticks=4){
  let g=''; for(let i=0;i<=ticks;i++){ const v=max*i/ticks, y=pt+ih-ih*i/ticks;
    g += `<line x1="${pl}" x2="${W-8}" y1="${y}" y2="${y}" stroke="${i===0?'var(--line)':'var(--line-2)'}"/>`;
    g += `<text x="${pl-8}" y="${y+3.5}" text-anchor="end">${i===0?'0':compact(v)}</text>`; }
  return g;
}
const tipRows = rows => rows.map(r=>`<div class="r"><span>${r.c?`<i class="swatch" style="background:${r.c}"></i>`:''}${esc(r.n)}</span><em>${r.v}</em></div>`).join('');
function chartCashflow(agg, year){
  const W=720,H=230,pl=52,pt=12,pb=26,ih=H-pt-pb,iw=W-pl-8,bw=iw/12;
  const max = niceMax(Math.max(1,...agg.map(m=>Math.max(m.income,m.exp))));
  const curM = year===curYear()? curMonth()-1 : -1;
  let g = axis(max,W,pl,pt,ih);
  g += `<line class="guide" x1="0" x2="0" y1="${pt}" y2="${pt+ih}" stroke="var(--muted)" stroke-dasharray="3 3" style="opacity:0"/>`;
  agg.forEach((m,i)=>{
    const x0 = pl+i*bw, w=Math.max(4,bw*.3), hI = ih*m.income/max, hE = ih*m.exp/max;
    if(m.income) g += `<rect x="${x0+bw*.17}" y="${pt+ih-hI}" width="${w}" height="${hI}" rx="3" fill="var(--accent)"/>`;
    if(m.exp) g += `<rect x="${x0+bw*.17+w+2}" y="${pt+ih-hE}" width="${w}" height="${hE}" rx="3" fill="var(--exp)"/>`;
    g += `<text x="${x0+bw/2}" y="${H-8}" text-anchor="middle" ${i===curM?'style="fill:var(--ink);font-weight:700"':''}>${mShort(i+1)}</text>`;
  });
  CH.cash = {W, x0:pl+bw/2, step:bw, n:12, tip:i=>{ const m=agg[i]; if(!m.n) return ''; const s=m.income-m.exp;
    return `<b>${monthLabel(year,i+1)}</b>`+tipRows([{n:L('Thu nhập'),c:'var(--accent)',v:vnd(m.income)},{n:L('Chi tiêu'),c:'var(--exp)',v:vnd(m.exp)},{n:L('Thặng dư'),v:`<span class="${s<0?'neg':''}">${signed(s)}</span>`},{n:L('Tỷ lệ tiết kiệm'),v:m.income?pctPlain(s/m.income):'—'}]); }};
  return `<div class="chart" data-chart="cash"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Thu nhập và chi tiêu theo tháng năm {y}', {y:year})}">${g}</svg></div>
  <div class="legend"><span><i class="swatch" style="background:var(--accent)"></i>${L('Thu nhập')}</span><span><i class="swatch" style="background:var(--exp)"></i>${L('Chi tiêu')}</span><span class="muted">${L('Chạm vào biểu đồ để xem số liệu')}</span></div>`;
}
function chartLines(agg, year, selM){
  const W=1040,H=320,pl=58,pr=18,pt=14,pb=28,ih=H-pt-pb,iw=W-pl-pr,step=iw/11;
  const series = [...CATS.map(c=>({id:c.id, name:c.name, color:`var(--c-${c.id})`, val:i=>agg[i].cats[c.id]})), {id:'_total', name:L('Tổng chi'), color:'var(--ink)', val:i=>agg[i].exp, dash:true}];
  const vis = series.filter(s=>!S.lineHidden.has(s.id));
  const max = niceMax(Math.max(1,...vis.flatMap(s=>agg.map((m,i)=>m.n? s.val(i):0))));
  const X = i=>pl+i*step, Y = v=>pt+ih-ih*v/max;
  let g = axis(max,W,pl,pt,ih);
  if(selM) g += `<rect x="${X(selM-1)-step/2}" y="${pt}" width="${step}" height="${ih}" fill="var(--accent-soft)" opacity=".55" rx="6"/>`;
  g += `<line class="guide" x1="0" x2="0" y1="${pt}" y2="${pt+ih}" stroke="var(--muted)" stroke-dasharray="3 3" style="opacity:0"/>`;
  for(const s of vis){
    let d='', open=false;
    agg.forEach((m,i)=>{ if(!m.n){ open=false; return; } d += (open?'L':'M')+X(i).toFixed(1)+','+Y(s.val(i)).toFixed(1); open=true; });
    g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.dash?2.4:2}" ${s.dash?'stroke-dasharray="6 4"':''} stroke-linejoin="round" stroke-linecap="round"/>`;
    agg.forEach((m,i)=>{ if(m.n) g += `<circle cx="${X(i)}" cy="${Y(s.val(i))}" r="${i===selM-1?4:2.6}" fill="${s.color}" stroke="var(--surface)" stroke-width="1.5"/>`; });
  }
  agg.forEach((m,i)=>{ g += `<text x="${X(i)}" y="${H-8}" text-anchor="middle" ${i===selM-1?'style="fill:var(--ink);font-weight:700"':''}>${mShort(i+1)}</text>`; });
  CH.lines = {W, x0:pl, step, n:12, tip:i=>{ const m=agg[i]; if(!m.n) return '';
    const rows = vis.filter(s=>s.id!=='_total').map(s=>({n:s.name,c:s.color,v:vnd(s.val(i)),raw:s.val(i)})).sort((a,b)=>b.raw-a.raw);
    return `<b>${monthLabel(year,i+1)}</b>`+tipRows(rows)+`<div class="r" style="border-top:1px solid rgba(255,255,255,.2);margin-top:4px;padding-top:4px"><span>${L('Tổng chi')}</span><em>${vnd(m.exp)}</em></div>`; }};
  return `<div class="chart" data-chart="lines"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Chi tiêu theo danh mục từng tháng năm {y}', {y:year})}">${g}</svg></div>
  <div class="legend" role="group" aria-label="${L('Ẩn hoặc hiện danh mục')}">${series.map(s=>`<button type="button" data-line="${s.id}" aria-pressed="${!S.lineHidden.has(s.id)}"><i class="swatch" style="background:${s.color}"></i>${s.name}</button>`).join('')}</div>`;
}
function chartArea(points, color, label, id){
  const W=600,H=220,pl=56,pt=12,pb=26,ih=H-pt-pb,iw=W-pl-14;
  if(!points.length) return '';
  const mx = niceMax(Math.max(1,...points.map(p=>p.v)));
  const step = points.length>1? iw/(points.length-1) : 0;
  const X = i => pl + i*step, Y = v => pt+ih-ih*Math.max(0,v)/mx;
  let g=''; for(let i=0;i<=2;i++){ const v=mx*i/2, y=pt+ih-ih*i/2; g+=`<line x1="${pl}" x2="${W-8}" y1="${y}" y2="${y}" stroke="var(--line-2)"/><text x="${pl-8}" y="${y+3.5}" text-anchor="end">${i===0?'0':compact(v)}</text>`; }
  const line = points.map((p,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  g += `<path d="${line} L${X(points.length-1)},${pt+ih} L${pl},${pt+ih}Z" fill="${color}" opacity=".12"/>`;
  g += `<path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>`;
  g += `<line class="guide" x1="0" x2="0" y1="${pt}" y2="${pt+ih}" stroke="var(--muted)" stroke-dasharray="3 3" style="opacity:0"/>`;
  points.forEach((p,i)=>{ g+=`<text x="${X(i)}" y="${H-7}" text-anchor="middle">${esc(p.label)}</text>`; });
  const li=points.length-1; g += `<circle cx="${X(li)}" cy="${Y(points[li].v)}" r="4" fill="${color}" stroke="var(--surface)" stroke-width="2"/>`;
  CH[id] = {W, x0:pl, step, n:points.length, tip:i=>`<b>${esc(points[i].full||points[i].label)}</b>`+tipRows([{n:L('Số dư'),c:color,v:vnd(points[i].v)}])};
  return `<div class="chart" data-chart="${id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}</svg></div>`;
}
function chartLotPL(lots, price){
  const W=1040,H=260,pl=56,pt=14,pb=34,ih=H-pt-pb,iw=W-pl-10;
  const n = lots.length; if(!n) return '';
  const rs = lots.map(l=> (+l.price? (price-(+l.price))/(+l.price) : 0));
  const mx = Math.max(.05, ...rs.map(Math.abs)); const lim = Math.ceil(mx*20)/20;
  const bw = iw/n, Y = r => pt + ih/2 - (ih/2)*(r/lim);
  let g='';
  for(const t of [lim, lim/2, 0, -lim/2, -lim]){ const y=Y(t); g += `<line x1="${pl}" x2="${W-8}" y1="${y}" y2="${y}" stroke="${t===0?'var(--line)':'var(--line-2)'}"/><text x="${pl-8}" y="${y+3.5}" text-anchor="end">${I.num(t*100,1)}%</text>`; }
  g += `<line class="guide" x1="0" x2="0" y1="${pt}" y2="${pt+ih}" stroke="var(--muted)" stroke-dasharray="3 3" style="opacity:0"/>`;
  lots.forEach((l,i)=>{ const r=rs[i], x=pl+i*bw+bw*.2, w=Math.max(3,bw*.6), y0=Y(0), y1=Y(r);
    g += `<rect x="${x}" y="${Math.min(y0,y1)}" width="${w}" height="${Math.max(1,Math.abs(y1-y0))}" rx="2.5" fill="${r>=0?'var(--pos)':'var(--neg)'}"/>`;
    if(n<=24 && (i%Math.ceil(n/12)===0 || i===n-1)) g += `<text x="${pl+i*bw+bw/2}" y="${H-16}" text-anchor="middle">${l.date.slice(5,7)}/${l.date.slice(0,4)}</text>`; });
  CH.lots = {W, x0:pl+bw/2, step:bw, n, tip:i=>{ const l=lots[i], u=+l.units||0, p=+l.price||0, r=rs[i];
    return `<b>${L('Mua ngày {date}', {date:fmtDate(l.date)})}</b>`+tipRows([{n:L('Giá mua'),v:fmtPrice(p)},{n:L('Vốn'),v:vnd(u*p)},{n:L('Giá trị hiện tại'),v:vnd(u*price)},{n:L('Lãi/lỗ'),v:`<span style="color:${r>=0?'var(--pos)':'var(--neg)'}">${pct(r,2)}</span>`}]); }};
  return `<div class="chart" data-chart="lots"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Lãi lỗ phần trăm từng lần mua chứng chỉ quỹ')}">${g}</svg></div>
  <div class="legend"><span><i class="swatch" style="background:var(--pos)"></i>${L('Đang lãi')}</span><span><i class="swatch" style="background:var(--neg)"></i>${L('Đang lỗ')}</span><span class="muted">${L('Theo giá hiện tại · chạm để xem chi tiết')}</span></div>`;
}
function donut(items, total, periodLabel){
  const cx=100, cy=100, R=92, r=60; let a0=-Math.PI/2; let paths='';
  const P = (rad,a)=>[cx+rad*Math.cos(a), cy+rad*Math.sin(a)];
  for(const it of items){
    if(!it.v) continue;
    const frac = it.v/total; let a1 = a0 + frac*2*Math.PI; if(frac>=.9999) a1 = a0 + 2*Math.PI - .0001;
    const large = a1-a0 > Math.PI ? 1 : 0;
    const [x0,y0]=P(R,a0),[x1,y1]=P(R,a1),[x2,y2]=P(r,a1),[x3,y3]=P(r,a0);
    paths += `<path data-seg="${it.id}" d="M${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)} A${r},${r} 0 ${large} 0 ${x3.toFixed(2)},${y3.toFixed(2)}Z" fill="var(--c-${it.id})" stroke="var(--surface)" stroke-width="2"><title>${esc(it.name)}: ${pctPlain(frac)}</title></path>`;
    a0 = a1;
  }
  return `<div class="donut"><svg viewBox="0 0 200 200" role="img" aria-label="${L('Cơ cấu chi phí')} ${esc(periodLabel)}">${paths}
    <text class="c1" id="dn1" x="100" y="88" text-anchor="middle">${L('Cơ cấu chi phí')}</text>
    <text class="c2" id="dn2" x="100" y="110" text-anchor="middle">${esc(periodLabel)}</text>
    <text class="c3" id="dn3" x="100" y="127" text-anchor="middle">${L('Chạm để xem số tiền')}</text></svg></div>`;
}
let donutTimer=0;
function revealDonut(id){
  const st = S._donut; if(!st) return;
  const it = st.items.find(x=>x.id===id); if(!it) return;
  $('#dn1').textContent = it.name.length>18? it.name.slice(0,17)+'…' : it.name;
  $('#dn2').textContent = compact(it.v);
  $('#dn3').textContent = `${pctPlain(it.v/st.total)} · ${vnd(it.v)} ₫`;
  $$('.donut path').forEach(p=>p.classList.toggle('dim', p.dataset.seg!==id));
  $$('.dlegend button').forEach(b=>b.classList.toggle('on', b.dataset.seg===id));
  clearTimeout(donutTimer);
  donutTimer = setTimeout(()=>{ if(!$('#dn1')) return; $('#dn1').textContent=L('Cơ cấu chi phí'); $('#dn2').textContent=st.label; $('#dn3').textContent=L('Chạm để xem số tiền');
    $$('.donut path').forEach(p=>p.classList.remove('dim')); $$('.dlegend button').forEach(b=>b.classList.remove('on')); }, 4000);
}
function chartPointer(e){
  const box = e.target.closest && e.target.closest('.chart[data-chart]'); if(!box) return;
  const c = CH[box.dataset.chart]; if(!c) return;
  const svg = box.querySelector('svg'); const r = svg.getBoundingClientRect(); const sx = r.width/c.W;
  let i = Math.round(((e.clientX-r.left)/sx - c.x0)/c.step); i = Math.max(0, Math.min(c.n-1, i));
  const html = c.tip(i); const guide = svg.querySelector('.guide');
  let tip = box.querySelector('.tip'); if(!tip){ tip=document.createElement('div'); tip.className='tip'; box.append(tip); }
  if(!html){ tip.hidden=true; if(guide) guide.style.opacity=0; return; }
  tip.innerHTML = html; tip.hidden=false;
  const px = (c.x0+i*c.step)*sx; const tw = tip.offsetWidth;
  let left = px+14; if(left+tw > r.width) left = px-14-tw; tip.style.left = Math.max(0,left)+'px'; tip.style.top='6px';
  if(guide){ const gx=c.x0+i*c.step; guide.setAttribute('x1',gx); guide.setAttribute('x2',gx); guide.style.opacity=1; }
}
function chartLeave(e){ const box = e.target.closest && e.target.closest('.chart[data-chart]'); if(!box) return; const tip=box.querySelector('.tip'); if(tip) tip.hidden=true; const g=box.querySelector('.guide'); if(g) g.style.opacity=0; }

/* =========================================================
   Shared fragments
   ========================================================= */
function catIcon(id, kind){
  if(kind==='income') return `<span class="cat-ico" style="--c:var(--accent)">${ico('<path d="M12 19V5M6 11l6-6 6 6"/>')}</span>`;
  const c = CAT[normCat(id)]; return `<span class="cat-ico" style="--c:var(--c-${c.id})">${catAb(c)}</span>`;
}
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
function whoTag(t){ return t.by ? `<img class="who" data-uid="${esc(t.by)}" alt="" src="${BLANK}">` : ''; }
function txRow(t){
  const sign = t.kind==='income'? '+' : '−';
  return `<button class="row" type="button" data-edit-tx="${esc(t.id)}">${catIcon(t.cat,t.kind)}
    <div style="min-width:0"><div class="t">${esc(t.note || txLabel(t))}</div><div class="s">${whoTag(t)}${esc(txLabel(t))} · ${fmtDate(t.date)}</div></div>
    <div class="amt ${t.kind==='income'?'pos':''}">${sign}${vnd(t.amount)}</div></button>`;
}
const delBtn = (col,id) => S.canWrite? `<button class="btn xs danger" type="button" data-del="${col}/${esc(id)}">${L('Xóa')}</button>` : '';
function kpi(label, value, foot='', cls=''){ return `<div class="card kpi ${cls}"><div class="label">${label}</div><div class="value">${value}</div>${foot?`<div class="foot">${foot}</div>`:''}</div>`; }
/** Inline exact-amount field (digits only, separators added while typing; see formatExact). */
function exactField(id, draftKey, label){
  const v = draft(draftKey,''), n = +String(v).replace(/\D/g,'') || 0;
  return `<div class="field"><label for="${id}">${label}</label><div class="amt-box sm"><input id="${id}" data-draft="${draftKey}" data-exact data-exact-prev="${id}-p" inputmode="numeric" autocomplete="off" value="${esc(v)}" placeholder="${I.int(20000000)}"><span>₫</span></div><div class="amt-prev" id="${id}-p">${exactPreview(n)}</div></div>`;
}

/** Inline entry form for a fund ledger (savings / emergency). */
function fundForm(f){
  const types = FUND_TYPES[f]; const k = 'ff:'+f+':';
  const curType = draft(k+'type','in');
  return `<form class="inline-form" data-fund-form="${f}" novalidate>
    <div class="typeseg" role="radiogroup" aria-label="${L('Loại giao dịch')}">${Object.entries(types).map(([t,l])=>`<label><input type="radio" name="ff-${f}-type" value="${t}" data-draft="${k}type" ${curType===t?'checked':''}><span class="${t==='out'?'out':''}">${l}</span></label>`).join('')}</div>
    <div class="row2">
      <div class="field"><label for="ff-${f}-date">${L('Ngày')}</label>${dateInput(`ff-${f}-date`, draft(k+'date', fmtDate(defaultDateISO())), `data-draft="${k}date"`)}</div>
      ${exactField(`ff-${f}-amt`, k+'amt', L('Số tiền'))}
    </div>
    <div class="field"><label for="ff-${f}-note">${L('Nguồn / ghi chú')}</label><input class="input" id="ff-${f}-note" data-draft="${k}note" value="${esc(draft(k+'note',''))}" placeholder="${f==='savings'?L('vd: Tất toán sổ VCB 6 tháng'):L('vd: Lương tháng 10, khám bệnh cho Dâu')}" maxlength="200"></div>
    <div><button class="btn primary" type="submit">${ico(ICONS.plus)}${L('Ghi nhận')}</button></div>
  </form>`;
}
function journalSub(f){
  const y = S.year; const startY = ledgerStartYear();
  if(y<=startY) return `<span class="sub">${L('Năm {y} · số dư đầu kỳ {date}: {v} ₫', {y, date:fmtDate(cfg().openings.asOf), v:vnd(cfg().openings[f])})}</span>`;
  return `<span class="sub">${L('Năm {y} · đầu năm {start} → cuối năm {end} ₫', {y, start:`<b class="num">${vnd(fundBalance(f,(y-1)+'-12-31'))}</b>`, end:`<b class="num">${vnd(fundBalance(f,y+'-12-31'))}</b>`})}</span>`;
}
function fundJournal(f){
  const list = S.fund.filter(e=>e.fund===f && (e.date||'').startsWith(String(S.year))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.at||0)-(a.at||0));
  if(!list.length) return `<div class="empty"><b>${L('Chưa có giao dịch năm {y}', {y:S.year})}</b>${L('Dùng mục nhập liệu để ghi nhận khoản đầu tiên.')}</div>`;
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>${L('Ngày')}</th><th class="l">${L('Loại')}</th><th>${L('Số tiền (₫)')}</th><th class="l">${L('Ghi chú / nguồn')}</th>${S.canWrite?'<th></th>':''}</tr></thead>
    <tbody>${list.map(e=>{ const out=e.type==='out'; return `<tr><td class="num">${fmtDate(e.date)}</td><td class="txt"><span class="chip ${out?'neg':e.type==='interest'?'gold':'pos'}">${fundTypeLabel(f,e.type)}</span></td><td class="${out?'neg':'pos'}">${out?'−':'+'}${vnd(e.amount)}</td><td class="wrap">${whoTag(e)}${esc(e.note||'')}</td>${S.canWrite?`<td><span class="act"><button class="btn xs" type="button" data-edit-fund="${esc(e.id)}">${L('Sửa')}</button>${delBtn('fund',e.id)}</span></td>`:''}</tr>`; }).join('')}</tbody>
  </table></div>`;
}

/* =========================================================
   Views — Tổng quan
   ========================================================= */
const emptyYear = y => `<div class="empty"><b>${L('Chưa có số liệu năm {y}', {y})}</b>${y>curYear()? L('Số liệu sẽ hiện khi bắt đầu nhập cho năm {y}.', {y}) : L('Nhập số liệu tháng trong mục Chi tiêu để xem biểu đồ.')}</div>`;
function heroCard(){
  const y = S.year; const future = y>curYear(); const N = navAt(y); const P = navAt(y-1); const prevNav = future? 0 : (P.total||0);
  const growth = prevNav && N.total? (N.total-prevNav)/prevNav : NaN;
  const hv = []; const top = future? curYear() : y;
  for(let k=top-3;k<top;k++){ const t=navAt(k).total; if(t) hv.push({y:k, v:t}); } if(N.total) hv.push({y:top, v:N.total, now:true});
  const hmax = Math.max(1,...hv.map(h=>h.v)); const yt = yearTotals(y);
  const keys = ['savings','kids','risk','emergency'];
  const label = N.kind==='live' ? `${future? L('Tổng tài sản ròng (NAV) hiện tại') : L('Tổng tài sản ròng (NAV)')} · <span class="num" data-clock>${fmtDateTime(new Date())}</span>`
    : N.kind==='snapshot' ? L('Tài sản ròng chốt cuối năm {y} · 31/12/{y}', {y})
    : N.kind==='estimate' ? L('Tài sản ròng cuối năm {y} · ước tính từ sổ quỹ', {y}) : L('Chưa có số liệu tài sản ròng năm {y}', {y});
  return `<section class="hero" aria-label="${L('Tổng tài sản ròng')}">
    <div class="hero-row">
      <div style="min-width:0">
        <div class="eyebrow hero-label">${label}<button type="button" class="eye-btn" data-privacy aria-pressed="${isPrivate()}" aria-label="${isPrivate()? L('Hiện số tiền') : L('Ẩn số tiền')}" title="${isPrivate()? L('Hiện số tiền') : L('Ẩn số tiền')}">${privacyBtnInner()}</button></div>
        <div class="hero-nav">${N.total? vnd(N.total) : '—'}<small>₫</small></div>
        <div class="hero-meta">${prevNav && N.total? `<span>${L('So với cuối {py}:', {py:y-1})} <b class="up">${pct(growth)}</b> <span class="m">(${signedC(N.total-prevNav)})</span></span>`:''}<span>${L('Thu {y}:', {y})} <b>${compact(yt.income)}</b></span><span>${L('Chi {y}:', {y})} <b>${compact(yt.exp)}</b></span></div>
      </div>
      <div class="hero-years" aria-hidden="true">${hv.map(h=>`<div class="hy ${h.now?'now':''}"><span class="v">${compact(h.v)}</span><span class="bar" style="height:${Math.max(4,60*h.v/hmax)}px"></span><span>${h.y}</span></div>`).join('')}</div>
    </div>
    ${N.parts? `<div class="alloc">${keys.map(k=>N.parts[k]>0?`<span style="width:${N.parts[k]/N.total*100}%;background:var(--f-${k})" title="${FUNDS[k].name}"></span>`:'').join('')}</div>
    <div class="alloc-legend">${keys.map(k=>`<div><div class="t"><i class="swatch" style="background:var(--f-${k})"></i>${FUNDS[k].short}</div><div class="a">${compact(N.parts[k])}</div><div class="p">${N.total?pctPlain(N.parts[k]/N.total):'—'}</div></div>`).join('')}</div>`
    : `<p class="hero-meta" style="margin-top:16px">${L('Năm này chỉ có số tổng tài sản ròng, chưa có chi tiết từng quỹ.')}</p>`}
  </section>`;
}
function viewOverview(){
  const y = S.year, m = refMonth(y);
  const agg = monthAgg(y), cur = agg[m-1], yt = yearTotals(y); const py = yearSummary(y-1);
  const sur = cur.income-cur.exp, rate = cur.income? sur/cur.income : NaN;
  const ysur = yt.income-yt.exp, yrate = yt.income? ysur/yt.income : NaN;
  const em = emergencyStats();
  const emTone = em.months>=em.target?'pos':em.months>=EMERGENCY_MIN?'gold':'warn';
  // expense structure
  const per = S.donutPeriod;
  const base = per==='month'? cur.cats : yt.cats; const total = per==='month'? cur.exp : yt.exp;
  const items = CATS.map(c=>({id:c.id, name:c.name, v:base[c.id]})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
  const plabel = per==='month'? mYShort(m,y) : L('Năm {y}', {y});
  S._donut = {items, total, label:plabel};
  const ins = insights(); const al = alerts();
  const recent = [...S.tx].sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.at||0)-(a.at||0)).slice(0,5);
  return `${heroCard()}
  <div class="grid g-4 section-gap">
    ${kpi(`<i class="swatch" style="background:var(--accent)"></i>${L('Thu nhập {m}', {m:mShort(m)})}`, `${compact(cur.income)}`, cur.n? `<b>${vnd(cur.income)}</b> ₫` : L('Chưa ghi tháng này'))}
    ${kpi(`<i class="swatch" style="background:var(--exp)"></i>${L('Chi tiêu {m}', {m:mShort(m)})}`, `${compact(cur.exp)}`, cur.income? L('{p} thu nhập · {v} ₫', {p:pctPlain(cur.exp/cur.income,0), v:`<b>${vnd(cur.exp)}</b>`}) : '—')}
    <div class="card kpi accent"><div class="label">${L('Tỷ lệ tiết kiệm {m}', {m:mShort(m)})}</div><div class="value ${rate<0?'neg':rate>=.2?'pos':''}">${pctPlain(rate)}</div>
      <div class="foot">${L('Thặng dư')} <b class="${sur<0?'neg':'pos'}">${signed(sur)}</b> ₫</div>
      <div class="foot">${L('Cả năm {y}:', {y})} <b>${pctPlain(yrate)}</b> · ${L('thặng dư')} <b class="${ysur<0?'neg':'pos'}">${signedC(ysur)}</b></div>${py? `<div class="foot">${L('Năm {y}:', {y:y-1})} <b>${pctPlain(py.income?(py.income-py.exp)/py.income:NaN)}</b> · ${L('thặng dư')} ${signedC(py.income-py.exp)}</div>`:''}</div>
    <div class="card kpi"><div class="label">${L('Quỹ khẩn cấp đủ dùng')}</div><div class="value">${fmt1(em.months)}<small>${L('tháng')}</small></div>
      <div class="meter ${emTone==='pos'?'pos':emTone==='gold'?'gold':'warn'}" style="margin-top:9px"><i style="width:${Math.min(100,em.months/em.target*100)}%"></i></div>
      <div class="foot"><span class="chip ${emTone}">${em.months>=em.target?L('Đạt mục tiêu'):em.months>=EMERGENCY_MIN?L('Đạt mức tối thiểu'):L('Dưới mức an toàn')}</span> ${L('mục tiêu {n} tháng', {n:em.target})}</div></div>
  </div>
  <div class="grid g-main section-gap">
    <div class="card"><div class="card-h"><h2>${L('Dòng tiền {y}', {y})}</h2><span class="sub">${L('Thặng dư lũy kế')} <b class="num ${ysur<0?'neg':'pos'}">${signed(ysur)} ₫</b></span></div>${yt.months? chartCashflow(agg,y) : emptyYear(y)}</div>
    <div class="card"><div class="card-h"><h2>${L('Cơ cấu chi phí')}</h2>
        <div class="seg" role="group" aria-label="${L('Kỳ')}"><button type="button" data-donut="month" aria-pressed="${per==='month'}">${mShort(m)}</button><button type="button" data-donut="year" aria-pressed="${per==='year'}">${L('Năm {y}', {y})}</button></div></div>
      ${total? `<div class="donut-wrap">${donut(items,total,plabel)}
        <div class="dlegend">${items.map(it=>`<button type="button" data-seg="${it.id}"><i class="swatch" style="background:var(--c-${it.id})"></i><span class="n">${it.name}</span><b>${pctPlain(it.v/total)}</b></button>`).join('')}</div></div>`
      : `<div class="empty"><b>${L('Chưa có chi phí')}</b>${L('Nhập số liệu trong mục Chi tiêu.')}</div>`}
    </div>
  </div>
  <div class="grid g-main section-gap">
    <div class="card"><div class="card-h"><h2>${L('Nhận định tài chính gia đình')}</h2><span class="sub">${L('Tự động · cập nhật theo số liệu')}</span></div>
      ${yt.months? '' : `<div class="verdict"><div class="badge" style="background:var(--muted)">—</div><div><b>${L('Chưa có thu chi năm {y}', {y})}</b><span>${L('Nhận định về tỷ lệ tiết kiệm và xu hướng chi tiêu sẽ có khi nhập số liệu tháng đầu tiên. Các mục dưới đây là tình hình hiện tại.')}</span></div></div>`}
      <div class="verdict ${ins.verdict.tone}" ${yt.months?'':'hidden'}><div class="badge">${ins.score}/${ins.maxScore}</div><div><b>${ins.verdict.t}</b><span>${ins.flagged? L('{n} mục cần lưu ý · bấm vào tiêu đề màu đỏ để xem cách cải thiện.', {n:ins.flagged}) : L('Không có mục cần cải thiện.')} ${L('Chấm theo tỷ lệ tiết kiệm, quỹ khẩn cấp, xu hướng chi tiêu và tài sản ròng.')}</span></div></div>
      <div>${ins.items.map(insightRow).join('')}</div>
      <p class="disclaimer">${L('Nhận định được tính tự động từ số liệu đã ghi, chỉ để tham khảo, không phải tư vấn đầu tư.')}</p>
    </div>
    <div class="stack">
      <div class="card"><div class="card-h"><h2>${L('Cần chú ý')}</h2><span class="sub">${L('{n} mục', {n:al.length})}</span></div>
        <div class="list">${al.length? al.map(a=>`<div class="alert ${a.lv}"><span class="bar"></span><div style="min-width:0"><div class="t">${esc(a.t)}</div><div class="d">${esc(a.d)}</div></div><a class="btn sm ghost" href="#${a.go}" ${a.month?`data-goto-month="${a.month.y}-${a.month.m}"`:''}>${L('Xem')}</a></div>`).join('') : `<div class="empty"><b>${L('Mọi thứ ổn')}</b>${L('Không có việc cần xử lý.')}</div>`}</div></div>
      <div class="card"><div class="card-h"><h2>${L('Ghi chép gần đây')}</h2><a class="btn sm ghost" href="#spending">${L('Tất cả')}</a></div>
        <div class="list">${recent.length? recent.map(txRow).join('') : `<div class="empty"><b>${L('Chưa có ghi chép')}</b></div>`}</div></div>
    </div>
  </div>`;
}

/* =========================================================
   Views — Chi tiêu
   ========================================================= */
function monthField(y,m,cat){
  const key = ymKey(y,m);
  const items = S.tx.filter(t=>t.date && t.date.startsWith(key) && (cat==='income'? t.kind==='income' : t.kind!=='income' && normCat(t.cat)===cat));
  const baseId = 'x'+key+'-'+cat; const base = items.find(t=>t.id===baseId); const others = items.filter(t=>t.id!==baseId);
  const othersSum = sum(others,t=>t.amount); const total = (base? +base.amount||0 : 0) + othersSum;
  const display = (!others.length && base?.expr) ? base.expr : (total? vnd(total) : '');
  return {key, baseId, base, others, othersSum, total, display};
}
const MONTH_FIELDS = ['income', ...CATS.map(c=>c.id)];
function monthDraftValues(y,m){
  const out = {}; let dirty=false;
  for(const f of MONTH_FIELDS){ const mf = monthField(y,m,f); const k=`m:${mf.key}:${f}`; const raw = draft(k, mf.display);
    const v = String(raw).trim()==='' ? 0 : parseAmount(raw); out[f]={mf, raw, v, dirty: k in S.drafts && raw!==mf.display}; if(out[f].dirty) dirty=true; }
  const noteKey = `m:${ymKey(y,m)}:note`; const savedNote = (S.months[ymKey(y,m)]||{}).note||'';
  out._note = {raw: draft(noteKey, savedNote), dirty: noteKey in S.drafts && S.drafts[noteKey]!==savedNote}; if(out._note.dirty) dirty=true;
  out._dirty = dirty; return out;
}
function viewSpending(){
  const y=S.year, m=S.month, agg = monthAgg(y), cur = agg[m-1];
  const dv = monthDraftValues(y,m);
  const liveInc = isNaN(dv.income.v)?0:dv.income.v, liveExp = sum(CATS,c=>isNaN(dv[c.id].v)?0:dv[c.id].v), liveSur = liveInc-liveExp;
  const yt = yearTotals(y);
  const moved = S.fund.find(e=>e.ref==='surplus-'+ymKey(y,m));
  const withdrawn = (S.months[ymKey(y,m)]||{}).withdrawn;
  const ro = S.canWrite? '' : 'readonly';
  const noteMonths = agg.map((a,i)=>({a,i,note:(S.months[ymKey(y,i+1)]||{}).note||''})).filter(x=>x.a.n||x.note);
  const surSaved = cur.income-cur.exp;
  return `
  <div class="top-actions" style="margin-bottom:16px;justify-content:space-between">
    <div class="month-nav"><button type="button" data-mstep="-1" aria-label="${L('Tháng trước')}">${ico('<path d="M15 6l-6 6 6 6"/>')}</button><b>${monthLabel(y,m)}</b><button type="button" data-mstep="1" aria-label="${L('Tháng sau')}">${ico(ICONS.arrow)}</button></div>
    <span class="hint">${L('Năm đang xem: {y} · đổi năm ở góc trên bên phải', {y:`<b>${y}</b>`})}</span>
  </div>
  <div class="grid g-4">
    ${kpi(`<i class="swatch" style="background:var(--accent)"></i>${L('Thu nhập')}`, `${vnd(cur.income)}<small>₫</small>`, yoyFoot(y,m,'income'))}
    ${kpi(`<i class="swatch" style="background:var(--exp)"></i>${L('Tổng chi')}`, `${vnd(cur.exp)}<small>₫</small>`, yoyFoot(y,m,'exp'))}
    ${kpi(L('Thặng dư / lỗ'), `<span class="${surSaved<0?'neg':surSaved>0?'pos':''}">${signed(surSaved)}</span><small>₫</small>`, surplusFoot(surSaved, moved, withdrawn))}
    ${kpi(L('Tỷ lệ tiết kiệm'), `<span class="${surSaved<0?'neg':''}">${pctPlain(cur.income? surSaved/cur.income : NaN)}</span>`, `${L('Năm {y}:', {y})} <b>${pctPlain(yt.income?(yt.income-yt.exp)/yt.income:NaN)}</b>`, 'accent')}
  </div>

  <div class="grid g-split section-gap">
    <div class="card"><div class="card-h"><h2>${L('Số liệu {month}', {month:monthIn(y,m)})}</h2></div>
      <form class="mform" id="monthForm" novalidate>
        <div class="mrow income ${dv.income.dirty?'dirty':''}" data-mrow="income"><label class="n" for="mf-income"><i class="swatch" style="background:var(--accent)"></i><span>${L('Thu nhập tháng')}</span></label>
          <input class="input" id="mf-income" data-draft="m:${ymKey(y,m)}:income" data-mfield="income" inputmode="text" autocomplete="off" value="${esc(dv.income.raw)}" placeholder="0" ${ro}>
          ${dv.income.mf.others.length? `<span class="hint">${L('Gồm {n} khoản ghi lẻ: {v} ₫', {n:dv.income.mf.others.length, v:vnd(dv.income.mf.othersSum)})}</span>`:''}</div>
        <div class="mgroup">${L('Chi phí')}</div>
        ${CATS.map(c=>{ const f=dv[c.id]; return `<div class="mrow ${f.dirty?'dirty':''}" data-mrow="${c.id}"><label class="n" for="mf-${c.id}"><i class="swatch" style="background:var(--c-${c.id})"></i><span>${c.name}</span></label>
          <input class="input" id="mf-${c.id}" data-draft="m:${ymKey(y,m)}:${c.id}" data-mfield="${c.id}" inputmode="text" autocomplete="off" value="${esc(f.raw)}" placeholder="0" ${ro}>
          ${f.mf.others.length? `<span class="hint">${L('Gồm {n} khoản ghi lẻ: {v} ₫', {n:f.mf.others.length, v:vnd(f.mf.othersSum)})}</span>`:''}</div>`; }).join('')}
        <div class="field" style="margin-top:14px"><label for="mf-note">${L('Mô tả tháng')}</label>
          <textarea class="input" id="mf-note" data-draft="m:${ymKey(y,m)}:note" placeholder="${L('vd: 5tr đưa bà ngoại, 2tr đám cưới, 1tr mua quạt…')}" ${ro}>${esc(dv._note.raw)}</textarea></div>
        <div class="mtotals" aria-live="polite">
          <div><span>${L('Thu nhập')}</span><b id="mt-inc">${vnd(liveInc)}</b></div>
          <div><span>${L('Tổng chi')}</span><b id="mt-exp">${vnd(liveExp)}</b></div>
          <div><span>${L('Thặng dư')}</span><b id="mt-sur" class="${liveSur<0?'neg':'pos'}">${signed(liveSur)}</b></div>
          <div><span>${L('Tỷ lệ tiết kiệm')}</span><b id="mt-rate">${pctPlain(liveInc? liveSur/liveInc : NaN)}</b></div>
        </div>
        ${S.canWrite? `<div class="mfoot"><span class="unsaved" id="mUnsaved" ${dv._dirty?'':'hidden'}>${L('Có thay đổi chưa lưu')}</span><span></span>
          <div class="top-actions"><button class="btn" type="button" id="mReset" ${dv._dirty?'':'disabled'}>${L('Hoàn tác')}</button><button class="btn primary" type="submit" id="mSave" ${dv._dirty?'':'disabled'}>${L('Lưu số liệu tháng')}</button></div></div>
          <p class="hint" style="margin:8px 0 0">${L('Gõ tắt được: 12tr, 2tr5, 250k, hoặc cộng nhiều khoản 250k+300k+1tr.')}</p>` : ''}
      </form>
    </div>
    ${compareCard(y,m,cur)}
  </div>

  <div class="card section-gap"><div class="card-h"><h2>${L('Diễn biến chi tiêu theo danh mục · {y}', {y})}</h2><span class="sub">${L('Chạm vào biểu đồ để xem số liệu từng tháng; bấm chú thích để ẩn/hiện')}</span></div>${yt.months? chartLines(agg,y,m) : emptyYear(y)}</div>

  <div class="card section-gap"><div class="card-h"><h2>${L('Bảng tổng hợp {y}', {y})}</h2><span class="sub">${L('Đơn vị: ₫ · bấm vào tháng để mở số liệu tháng đó')}</span></div>
    <div class="tbl-wrap"><table class="sum-tbl">
      <thead><tr><th>${L('Khoản mục')}</th>${agg.map((a,i)=>`<th class="${i===m-1?'cur':''}">${mShort(i+1)}</th>`).join('')}<th>${L('Cả năm')}</th></tr></thead>
      <tbody>
        <tr class="click"><td><b>${L('Thu nhập')}</b></td>${agg.map((a,i)=>`<td class="${i===m-1?'cur':''} ${a.income?'':'zero'}" data-goto="${i+1}">${a.income?vnd(a.income):'·'}</td>`).join('')}<td><b>${vnd(yt.income)}</b></td></tr>
        ${CATS.map(cc=>`<tr><td><i class="swatch" style="background:var(--c-${cc.id});margin-right:7px"></i>${cc.name}</td>${agg.map((a,i)=>`<td class="${i===m-1?'cur':''} ${a.cats[cc.id]?'':'zero'}" data-goto="${i+1}">${a.cats[cc.id]?vnd(a.cats[cc.id]):'·'}</td>`).join('')}<td>${vnd(yt.cats[cc.id])}</td></tr>`).join('')}
        <tr class="total"><td>${L('Tổng chi')}</td>${agg.map((a,i)=>`<td class="${i===m-1?'cur':''}" data-goto="${i+1}">${a.exp?vnd(a.exp):'·'}</td>`).join('')}<td>${vnd(yt.exp)}</td></tr>
        <tr><td>${L('Thặng dư / lỗ')}</td>${agg.map((a,i)=>{const d=a.income-a.exp; return `<td class="${i===m-1?'cur':''} ${!a.n?'zero':d<0?'neg':'pos'}" data-goto="${i+1}">${a.n?vnd(d):'·'}</td>`;}).join('')}<td class="${yt.income-yt.exp<0?'neg':'pos'}">${vnd(yt.income-yt.exp)}</td></tr>
      </tbody></table></div>
  </div>

  <div class="card section-gap"><div class="card-h"><h2>${L('Ghi chú theo tháng · {y}', {y})}</h2><span class="sub">${L('Tổng hợp từ ô “Mô tả tháng”')}</span></div>
    ${noteMonths.length? `<div class="tbl-wrap"><table class="sum-tbl">
      <thead><tr><th>${L('Tháng')}</th><th>${L('Thu nhập (₫)')}</th><th>${L('Chi tiêu (₫)')}</th><th>${L('Thặng dư (₫)')}</th><th>${L('Tỷ lệ TK')}</th><th class="l">${L('Ghi chú / lưu ý')}</th></tr></thead>
      <tbody>${noteMonths.map(({a,i,note})=>{ const d=a.income-a.exp; return `<tr class="click ${note?'':'muted-row'}" data-goto-row="${i+1}"><td><b>${mShort(i+1)}</b></td><td>${vnd(a.income)}</td><td>${vnd(a.exp)}</td><td class="${d<0?'neg':'pos'}">${signed(d)}</td><td>${a.income?pctPlain(d/a.income):'—'}</td><td class="wrap">${note? esc(note) : `<span class="muted">${L('Chưa có ghi chú')}</span>`}</td></tr>`; }).join('')}</tbody>
    </table></div>` : `<div class="empty"><b>${L('Chưa có ghi chú')}</b>${L('Nhập “Mô tả tháng” trong phần số liệu tháng.')}</div>`}
  </div>
  ${historyCard(y)}`;
}
/** What happened to a month's surplus: moved to the emergency fund and/or withdrawn as cash. */
function surplusFoot(sur, moved, withdrawn){
  const out = [];
  if(moved) out.push(`<span class="chip pos">${L('Đã chuyển {v} vào quỹ khẩn cấp', {v:compact(moved.amount)})}</span>`);
  if(withdrawn) out.push(`<span class="chip gold">${L('Đã rút {v}', {v:compact(withdrawn.amount)})}</span>${S.canWrite && !moved? ` <button class="btn xs ghost" type="button" data-undo-withdraw>${L('Hoàn tác')}</button>`:''}`);
  const left = sur - (withdrawn? +withdrawn.amount||0 : 0);
  if(!moved && left>0 && S.canWrite) out.push(`<span class="surplus-acts"><button class="btn xs" type="button" data-move-surplus="${left}">${L('Chuyển vào Quỹ khẩn cấp')}</button>${withdrawn? '' : `<button class="btn xs" type="button" data-withdraw-surplus="${left}">${L('Rút tiền')}</button>`}</span>`);
  return out.join(' ');
}
/** Difference vs average: positive → green "+amount (+x%)", negative → red "−amount (−x%)". */
function cmpRow(name, color, curV, avgV, isTotal=false, baseLabel=L('TB')){
  const d = Math.round(curV-avgV), r = avgV? d/avgV : NaN;
  const cls = d>0?'pos':d<0?'neg':'muted';
  const txt = !avgV && !curV ? '—' : !avgV ? `${signed(d)} (${L('mới phát sinh')})` : `${signed(d)} (${pct(r,0)})`;
  return `<div class="cmp ${isTotal?'total':''}"><div class="n"><i class="swatch" style="background:${color}"></i><span>${name}</span></div><div class="v">${vnd(curV)}</div>
    <div class="s">${baseLabel} ${vnd(avgV)}</div><div class="d ${cls}">${txt}</div></div>`;
}
/** Comparison base for the selected month: previous months, same month last year, or last year's monthly average. */
function compareBase(mode, y, m){
  const avgOf = s => { const cats={}; for(const c of CATS) cats[c.id]=s.cats[c.id]/s.months; return {income:s.income/s.months, exp:s.exp/s.months, cats}; };
  if(mode==='yoy'){
    const a = monthAgg(y-1)[m-1]; if(a.n) return {label:L('cùng kỳ {month}', {month:monthIn(y-1,m)}), short:mYShort(m,y-1), income:a.income, exp:a.exp, cats:a.cats};
    const s = yearSummary(y-1); return s? {label:L('trung bình tháng năm {y} (năm này chỉ có số tổng)', {y:y-1}), short:L('TB {y}', {y:y-1}), ...avgOf(s)} : null;
  }
  if(mode==='lastyear'){ const s = yearSummary(y-1); return s? {label:L('trung bình mỗi tháng năm {y}', {y:y-1}), short:L('TB {y}', {y:y-1}), ...avgOf(s)} : null; }
  const p = prevAverage(y,m); return p.n? {label:L('trung bình {n} tháng trước có số liệu', {n:p.n}), short:L('TB'), ...p} : null;
}
function compareCard(y, m, cur){
  const mode = S.cmpMode || 'prev'; const base = compareBase(mode, y, m);
  const modes = [['prev',L('TB các tháng trước')],['yoy',L('Cùng kỳ năm trước')],['lastyear',L('TB năm {y}', {y:y-1})]];
  return `<div class="card"><div class="card-h"><h2>${L('So sánh {month}', {month:monthIn(y,m)})}</h2></div>
    <div class="seg" role="group" aria-label="${L('So sánh với')}" style="margin:-4px 0 10px">${modes.map(([k,l])=>`<button type="button" data-cmp="${k}" aria-pressed="${mode===k}">${l}</button>`).join('')}</div>
    ${base? `<p class="hint" style="margin:0 0 6px">${L('So với {base}.', {base:base.label})}</p><div class="list">
      ${cmpRow(L('Tổng chi'), 'var(--exp)', cur.exp, base.exp, true, base.short)}
      ${CATS.map(c=>cmpRow(c.name, `var(--c-${c.id})`, cur.cats[c.id], base.cats[c.id], false, base.short)).join('')}
      ${cmpRow(L('Thu nhập'), 'var(--accent)', cur.income, base.income, false, base.short)}
    </div><p class="hint" style="margin:10px 0 0">${L('Chênh lệch = tháng này − mốc so sánh. Xanh lá: cao hơn (+); đỏ: thấp hơn (−).')}</p>`
    : `<div class="empty"><b>${L('Chưa có số liệu để so sánh')}</b>${mode==='prev'? L('Cần ít nhất một tháng trước có số liệu.') : L('Năm {y} chưa có số liệu.', {y:y-1})}</div>`}
  </div>`;
}
function yoyFoot(y, m, field){
  const a = monthAgg(y-1)[m-1]; if(a.n){ const d=(field==='income'? monthAgg(y)[m-1].income : monthAgg(y)[m-1].exp) - a[field]; return `${L('Cùng kỳ {y}', {y:y-1})} <b>${compact(a[field])}</b> · <span class="${d>=0?'pos':'neg'}">${signedC(d)}</span>`; }
  const p = prevAverage(y,m); return p.n? `${L('TB các tháng trước')} <b>${compact(p[field])}</b>` : '';
}
/** All years side by side with a cumulative row — the long-term record. */
function historyCard(sel){
  const rows = []; for(let k=firstYear(); k<=Math.max(curYear(), sel); k++){ const s=yearSummary(k); if(s) rows.push({y:k, ...s}); }
  if(!rows.length) return '';
  const T = {income:sum(rows,r=>r.income), exp:sum(rows,r=>r.exp), months:sum(rows,r=>r.months)};
  return `<div class="card section-gap"><div class="card-h"><h2>${L('Thu chi qua các năm (lũy kế)')}</h2><span class="sub">${L('Bấm vào một năm để chuyển sang năm đó')}</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>${L('Năm')}</th><th>${L('Số tháng')}</th><th>${L('Thu nhập (₫)')}</th><th>${L('Chi tiêu (₫)')}</th><th>${L('Thặng dư (₫)')}</th><th>${L('Tỷ lệ TK')}</th><th>${L('Chi TB/tháng')}</th></tr></thead>
    <tbody>${rows.map(r=>{ const d=r.income-r.exp; return `<tr class="click ${r.y===sel?'sel':''}" data-set-year="${r.y}"><td><b>${r.y}</b>${r.source==='history'?` <span class="chip">${L('số tổng năm')}</span>`:''}${r.y===curYear()?` <span class="chip acc">${L('đến nay')}</span>`:''}</td><td>${r.months}</td><td>${vnd(r.income)}</td><td>${vnd(r.exp)}</td><td class="${d<0?'neg':'pos'}">${signed(d)}</td><td>${r.income?pctPlain(d/r.income):'—'}</td><td>${vnd(r.exp/r.months)}</td></tr>`; }).join('')}
      <tr class="total"><td>${L('Lũy kế')}</td><td>${T.months}</td><td>${vnd(T.income)}</td><td>${vnd(T.exp)}</td><td class="${T.income-T.exp<0?'neg':'pos'}">${signed(T.income-T.exp)}</td><td>${T.income?pctPlain((T.income-T.exp)/T.income):'—'}</td><td>${vnd(T.exp/(T.months||1))}</td></tr></tbody></table></div></div>`;
}
function updateMonthLive(){
  const y=S.year, m=S.month; if(!$('#monthForm')) return;
  const dv = monthDraftValues(y,m);
  const inc = isNaN(dv.income.v)?0:dv.income.v, exp = sum(CATS,c=>isNaN(dv[c.id].v)?0:dv[c.id].v), s=inc-exp;
  $('#mt-inc').textContent=vnd(inc); $('#mt-exp').textContent=vnd(exp); const ms=$('#mt-sur'); ms.textContent=signed(s); ms.className=s<0?'neg':'pos';
  $('#mt-rate').textContent=pctPlain(inc? s/inc : NaN);
  for(const f of MONTH_FIELDS){ const row=$(`[data-mrow="${f}"]`); if(row) row.classList.toggle('dirty', dv[f].dirty); }
  if($('#mSave')){ $('#mSave').disabled=!dv._dirty; $('#mReset').disabled=!dv._dirty; $('#mUnsaved').hidden=!dv._dirty; }
}
async function saveMonth(){
  const y=S.year, m=S.month, key=ymKey(y,m); const dv = monthDraftValues(y,m);
  const ops=[];
  for(const f of MONTH_FIELDS){
    const d = dv[f]; if(!d.dirty) continue;
    const fname = f==='income'? L('Thu nhập') : CAT[f].name;
    if(isNaN(d.v)){ toast(L('{name}: chưa đọc được số tiền', {name:fname})); $('#mf-'+f)?.focus(); return; }
    const baseAmt = d.v - d.mf.othersSum;
    if(baseAmt<0){ toast(L('{name}: nhỏ hơn tổng các khoản ghi lẻ ({v} ₫)', {name:fname, v:vnd(d.mf.othersSum)})); $('#mf-'+f)?.focus(); return; }
    const ref = db.collection('tx').doc(d.mf.baseId);
    if(baseAmt===0){ if(d.mf.base) ops.push(()=>ref.delete()); }
    else ops.push(()=>ref.set({date:lastDayISO(y,m), kind:f==='income'?'income':'expense', cat:f, amount:baseAmt, note:d.mf.base?.note||'',
      expr: (!d.mf.others.length && String(d.raw).includes('+'))? String(d.raw).trim() : '', src:'month', by:S.meId, at:Date.now()}));
  }
  if(dv._note.dirty) ops.push(()=>db.collection('months').doc(key).set({...(S.months[key]||{}), note:String(dv._note.raw).trim(), by:S.meId, at:Date.now()}));
  if(!ops.length) return;
  const btn=$('#mSave'); if(btn) btn.disabled=true;
  for(const op of ops){ if(!(await write(op))){ if(btn) btn.disabled=false; return; } }
  for(const k of Object.keys(S.drafts)) if(k.startsWith(`m:${key}:`)) delete S.drafts[k];
  toast(L('Đã lưu số liệu {month}', {month:monthIn(y,m)}));
  render();
}

/* =========================================================
   Views — Tiết kiệm & đầu tư
   ========================================================= */
function investTabs(){ return `<nav class="subtabs" aria-label="${L('Tiết kiệm & đầu tư')}">${INVEST_TABS.map(([id,l])=>`<a href="#${id}" ${S.view===id?'aria-current="page"':''}>${l}</a>`).join('')}</nav>`; }
function viewInvest(){
  const N = nav(); const em = emergencyStats(); const v = vcbfStats(); const act = activeDeposits();
  const principal = sum(act,d=>d.amount), accrued = sum(act,d=>depCalc(d).accrued);
  const rows = [['savings',L('Sổ tiết kiệm'),'#deposits'],['kids',L('Quỹ cho con'),'#kids'],['emergency',L('Quỹ khẩn cấp'),'#emergency'],['risk',L('Đầu tư rủi ro cao'),'#settings']];
  const more = `<span class="card-link">${L('Xem & cập nhật')} ${ico(ICONS.arrow)}</span>`;
  return `${investTabs()}
  ${heroCard()}
  <p class="hint" style="margin:14px 2px 0">${L('Trang này chỉ để xem. Muốn thay đổi số liệu, bấm vào từng hạng mục bên dưới.')}</p>
  <div class="grid g-4 section-gap">
    <a class="card kpi" href="#deposits"><div class="label"><i class="swatch" style="background:var(--f-savings)"></i>${L('Sổ tiết kiệm')}</div><div class="value">${compact(N.parts.savings)}</div>
      <div class="foot">${L('Gốc đang gửi {v} · {n} sổ', {v:`<b>${compact(principal)}</b>`, n:act.length})}</div><div class="foot">${L('Lãi tạm tính')} <b class="pos" data-live="accrued">+${vnd(accrued)}</b> ₫</div>${more}</a>
    <a class="card kpi" href="#emergency"><div class="label"><i class="swatch" style="background:var(--f-emergency)"></i>${L('Quỹ khẩn cấp')}</div><div class="value">${compact(em.bal)}</div>
      <div class="foot">${L('Đủ {n} tháng chi tiêu · mục tiêu {target}', {n:`<b>${fmt1(em.months)}</b>`, target:em.target})}</div><div class="foot">${L('Thu – chi {y}:', {y:S.year})} <b class="${em.yearNet<0?'neg':'pos'}">${signedC(em.yearNet)}</b></div>${more}</a>
    <a class="card kpi" href="#kids"><div class="label"><i class="swatch" style="background:var(--f-kids)"></i>${L('Quỹ cho con')}</div><div class="value">${compact(v.value)}</div>
      <div class="foot">${L('Vốn góp')} <b>${compact(v.cost)}</b></div><div class="foot">${L('Lãi/lỗ')} <b class="${v.pl>=0?'pos':'neg'}">${pct(v.plPct,2)}</b> · <b>${signedC(v.pl)}</b></div>${more}</a>
    <a class="card kpi" href="#settings"><div class="label"><i class="swatch" style="background:var(--f-risk)"></i>${L('Đầu tư rủi ro cao')}</div><div class="value">${compact(N.parts.risk)}</div>
      <div class="foot">${esc(cfg().highRiskNote)||L('Chưa có danh mục')}</div><span class="card-link">${L('Cập nhật trong Thiết lập')} ${ico(ICONS.arrow)}</span></a>
  </div>
  <div class="card section-gap"><div class="card-h"><h2>${L('Phân bổ tài sản')}</h2><span class="sub">${L('Tổng {v} ₫', {v:`<b>${vnd(N.total)}</b>`})}</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>${L('Hạng mục')}</th><th>${L('Giá trị (₫)')}</th><th>${L('Tỷ trọng')}</th><th class="l" style="min-width:180px"></th></tr></thead>
    <tbody>${rows.map(([k,l,h])=>`<tr class="click" data-href="${h}"><td><i class="swatch" style="background:var(--f-${k});margin-right:8px"></i>${l}</td><td>${vnd(N.parts[k])}</td><td>${N.total?pctPlain(N.parts[k]/N.total):'—'}</td><td class="l"><div class="meter"><i style="width:${N.total?N.parts[k]/N.total*100:0}%;background:var(--f-${k})"></i></div></td></tr>`).join('')}
      <tr class="total"><td>${L('Tổng tài sản ròng')}</td><td>${vnd(N.total)}</td><td>100%</td><td></td></tr></tbody></table></div>
  </div>`;
}

function reconTable(fund, principal, nBooks, diff, ok){
  const c = cfg(); const led = S.fund.filter(e=>e.fund==='savings');
  const sumT = t => sum(led.filter(e=>e.type===t), e=>e.amount), cnt = t => led.filter(e=>e.type===t).length;
  return `<div class="recon">
    <span>${L('Số dư đầu kỳ ({date})', {date:fmtDate(c.openings.asOf)})}</span><span class="v">${vnd(c.openings.savings)}</span>
    <span>+ ${L('Nạp vào · {n} giao dịch', {n:cnt('in')})}</span><span class="v pos">+${vnd(sumT('in'))}</span>
    <span>− ${L('Rút ra · {n} giao dịch', {n:cnt('out')})}</span><span class="v neg">−${vnd(sumT('out'))}</span>
    <span>+ ${L('Nhận lãi · {n} giao dịch', {n:cnt('interest')})}</span><span class="v pos">+${vnd(sumT('interest'))}</span>
    <span class="sep"></span>
    <b>${L('Số dư quỹ theo nhật ký')}</b><b class="v">${vnd(fund)}</b>
    <span>${L('Tổng gốc {n} sổ đang gửi', {n:nBooks})}</span><span class="v">${vnd(principal)}</span>
    <span class="sep"></span>
    <b>${L('Chênh lệch')}</b><b class="v ${ok?'pos':'warn'}">${signed(diff)}</b></div>`;
}
const daysTone = k => k.status==='closed'?'muted':k.status==='matured'?'neg':k.status==='soon'?'warn':'pos';
/** Live countdown to maturity (midnight of the maturity date): "37 ngày" + "14:22:05". */
function daysText(d, nowMs=Date.now()){
  if(isClosed(d)) return '<span class="muted">—</span>';
  const mat = depMaturity(d); const ms = parseISO(mat).getTime() - nowMs;
  if(ms<=0) return `<b>${L('Quá {n} ngày', {n:Math.floor(-ms/86400000)})}</b><small>${L('hạn {date}', {date:fmtDate(mat)})}</small>`;
  const days = Math.floor(ms/86400000), r = ms%86400000;
  return `<b>${L('{n} ngày', {n:days})}</b><small>${pad(Math.floor(r/3600000))}:${pad(Math.floor(r%3600000/60000))}:${pad(Math.floor(r%60000/1000))}</small>`;
}
function viewDeposits(){
  const act = activeDeposits(); const all = S.deposits.map(d=>({d,k:depCalc(d)}));
  const fund = fundBalance('savings'); const principal = sum(act,d=>d.amount);
  const accrued = sum(act,d=>depCalc(d).accrued), atMat = sum(act,d=>depCalc(d).atMat);
  const diff = fund-principal, ok = Math.abs(diff)<100000;
  const banks = {}; for(const d of act){ const b=bankName(d.bank); banks[b]=banks[b]||{n:0,v:0}; banks[b].n++; banks[b].v+=+d.amount||0; }
  const bankRows = Object.entries(banks).sort((a,b)=>b[1].v-a[1].v);
  const sched = all.filter(x=>x.k.status!=='closed').sort((a,b)=>a.k.mat.localeCompare(b.k.mat));
  const table = [...all].sort((a,b)=> (a.k.status==='closed')-(b.k.status==='closed') || a.k.mat.localeCompare(b.k.mat));
  const statusChip = k => k.status==='closed'? `<span class="chip">${L('Đã tất toán')}</span>` : k.status==='matured'? `<span class="chip neg">${L('Đến hạn')}</span>` : k.status==='soon'? `<span class="chip warn">${L('Đang gửi · còn {n} ngày', {n:k.left})}</span>` : `<span class="chip pos">${L('Đang gửi')}</span>`;
  const termTxt = n => L('{n} tháng', {n});
  return `${investTabs()}
  <div class="grid g-4">
    ${kpi(`<i class="swatch" style="background:var(--f-savings)"></i>${L('Số dư Quỹ tiết kiệm')}`, `${compact(fund)}`, `<b>${vnd(fund)}</b> ₫`, 'accent')}
    ${kpi(L('Tổng gốc đang gửi'), `${compact(principal)}`, L('{n} sổ · {v} ₫', {n:act.length, v:`<b>${vnd(principal)}</b>`}))}
    ${kpi(L('Lãi tạm tính đến hiện tại'), `<span class="pos">+${vnd(accrued)}</span>`, L('Tính đến hết ngày {date} · cập nhật mỗi ngày', {date:`<b>${fmtDate(todayISO())}</b>`}))}
    ${kpi(L('Lãi dự kiến khi đến hạn'), `+${compact(atMat)}`, `${L('Gốc + lãi')} <b>${compact(principal+atMat)}</b>`)}
  </div>
  <div class="grid g-split section-gap">
    <div class="card"><div class="card-h"><h2>${L('Đối chiếu số dư quỹ và sổ đang gửi')}</h2></div>
      ${reconTable(fund, principal, act.length, diff, ok)}
      <div class="recon-status ${ok?'ok':'bad'}">${ico(ok?ICONS.check:ICONS.alert)}<div><b>${ok?L('Khớp số liệu'):L('Có chênh lệch')}</b><span>${ok?L('Tổng gốc các sổ khớp với số dư quỹ.'): diff>0? L('Nhật ký cao hơn tổng gốc {v} ₫. Kiểm tra số dư đầu kỳ và các dòng rút/nạp; nếu số gốc trên sổ đã đúng, ghi một bút toán điều chỉnh.', {v:vnd(diff)}) : L('Tổng gốc cao hơn nhật ký {v} ₫. Thường do tiền lãi nhập gốc (tái tục) chưa ghi “Nhận lãi” trong nhật ký.', {v:vnd(-diff)})}</span>${!ok && S.canWrite? `<button class="btn sm" type="button" data-fix-diff="${Math.round(diff)}" style="margin-top:8px">${L('Ghi bút toán điều chỉnh {v} ₫', {v:signed(-diff)})}</button>`:''}</div></div>
    </div>
    <div class="card"><div class="card-h"><h2>${L('Phân loại theo ngân hàng')}</h2><span class="sub">${L('Sổ đang gửi')}</span></div>
      ${bankRows.length? `<div class="tbl-wrap"><table><thead><tr><th>${L('Ngân hàng')}</th><th>${L('Số sổ')}</th><th>${L('Giá trị (₫)')}</th><th>${L('Tỷ trọng')}</th></tr></thead>
        <tbody>${bankRows.map(([b,x])=>`<tr><td>${bankBadge(b)}</td><td>${x.n}</td><td>${vnd(x.v)}</td><td>${pctPlain(x.v/principal)}</td></tr>`).join('')}
        <tr class="total"><td>${L('Tổng')}</td><td>${act.length}</td><td>${vnd(principal)}</td><td>100%</td></tr></tbody></table></div>` : `<div class="empty"><b>${L('Chưa có sổ đang gửi')}</b></div>`}
    </div>
  </div>
  <div class="grid g-split section-gap">
    <div class="card"><div class="card-h"><h2>${L('Lịch đáo hạn')}</h2><span class="sub">${L('{n} sổ đang gửi', {n:sched.length})}</span></div>
      <div class="list">${sched.length? sched.map(({d,k})=>`<div class="mat"><div class="date"><b>${k.mat.slice(8,10)}</b><span>${k.mat.slice(5,7)}/${k.mat.slice(0,4)}</span></div>
        <div style="min-width:0"><div class="t">${bankBadge(d.bank,'sm')} <span>${esc(d.label||L('Kỳ hạn {n} tháng', {n:d.term}))}</span></div><div class="s">${L('{term} · {rate}%/năm · lãi đáo hạn +{v} ₫', {term:termTxt(d.term), rate:I.num(d.rate,2), v:vnd(k.atMat)})}</div></div>
        <div class="amt">${compact(d.amount)}<div>${statusChip(k)}</div></div></div>`).join('') : `<div class="empty"><b>${L('Không có sổ sắp đáo hạn')}</b></div>`}</div>
    </div>
    <div class="card"><div class="card-h"><h2>${L('Nhập giao dịch quỹ tiết kiệm')}</h2><span class="sub">${L('Nạp vào, rút ra, nhận lãi')}</span></div>
      ${S.canWrite? fundForm('savings') : `<p class="hint">${L('Tài khoản chỉ xem không ghi được giao dịch.')}</p>`}</div>
  </div>
  <div class="card section-gap"><div class="card-h"><h2>${L('Chi tiết các sổ tiết kiệm')}</h2>${S.canWrite?`<button class="btn sm primary" type="button" data-add-dep>${ico(ICONS.plus)}${L('Thêm sổ')}</button>`:''}</div>
    ${table.length? `<div class="tbl-wrap"><table>
      <thead><tr><th>${L('Ngân hàng')}</th><th class="l">${L('Kỳ hạn')}</th><th>${L('Ngày gửi')}</th><th>${L('Ngày đáo hạn')}</th><th>${L('Số tiền (₫)')}</th><th>${L('Lãi %/năm')}</th><th>${L('Lãi tạm tính')}</th><th>${L('Tổng tiền<br><small>(lãi tạm tính)</small>')}</th><th>${L('Tổng tiền<br><small>(đến hạn)</small>')}</th><th class="l">${L('Trạng thái')}</th><th>${L('Số ngày')}</th><th class="l">${L('Ghi chú / nguồn')}</th>${S.canWrite?'<th></th>':''}</tr></thead>
      <tbody>${table.map(({d,k})=>`<tr class="${k.status==='closed'?'muted-row':''}"><td>${bankBadge(d.bank)}</td><td class="txt">${termTxt(d.term)}</td><td>${fmtDate(d.start)}</td><td>${fmtDate(k.mat)}</td><td><b>${vnd(d.amount)}</b></td><td>${I.num(d.rate,2)}%</td><td class="pos">+${vnd(k.accrued)}<div class="sub-date">${L('{a}/{b} ngày', {a:k.elapsed, b:k.totalDays})}</div></td><td><b>${vnd((+d.amount||0)+k.accrued)}</b></td><td>${vnd((+d.amount||0)+k.atMat)}<div class="sub-date">${L('lãi +{v}', {v:vnd(k.atMat)})}</div></td><td class="txt">${statusChip(k)}</td><td class="days ${daysTone(k)}" ${k.status==='closed'?'':`data-live-days="${esc(d.id)}"`}>${daysText(d)}</td><td class="wrap">${esc(d.note||'')}</td>
        ${S.canWrite?`<td><span class="act"><button class="btn xs" type="button" data-edit-dep="${esc(d.id)}">${L('Sửa')}</button>${k.status==='closed'?`<button class="btn xs" type="button" data-reopen-dep="${esc(d.id)}">${L('Mở lại')}</button>`:`<button class="btn xs" type="button" data-close-dep="${esc(d.id)}">${L('Tất toán')}</button>`}${delBtn('deposits',d.id)}</span></td>`:''}</tr>`).join('')}
        <tr class="total"><td>${L('Tổng đang gửi')}</td><td></td><td></td><td></td><td>${vnd(principal)}</td><td></td><td class="pos">+${vnd(accrued)}</td><td>${vnd(principal+accrued)}</td><td>${vnd(principal+atMat)}</td><td></td><td></td><td></td>${S.canWrite?'<td></td>':''}</tr></tbody>
    </table></div>` : `<div class="empty"><b>${L('Chưa có sổ tiết kiệm')}</b>${L('Bấm “Thêm sổ” để nhập sổ đầu tiên.')}</div>`}
    <p class="hint" style="margin:10px 0 0">${L('Lãi tạm tính = Tiền gửi × Lãi suất × Số ngày đã gửi / 365, tính đến hết ngày {date}. Lãi đến hạn tính theo ngày đáo hạn đã lưu trên từng sổ.', {date:fmtDate(todayISO())})}</p>
  </div>
  <div class="card section-gap"><div class="card-h"><h2>${L('Nhật ký giao dịch quỹ tiết kiệm')}</h2>${journalSub('savings')}</div>${fundJournal('savings')}</div>`;
}

function viewEmergency(){
  const em = emergencyStats(); const y = S.year;
  const flows = fundYearFlows('emergency'); const years = Object.keys(flows).sort();
  let run = 0; const fRows = years.map(k=>{ const f=flows[k]; run += f.in-f.out; return {y:k, in:f.in, out:f.out, net:f.in-f.out, end:run}; });
  const tIn = sum(fRows,r=>r.in), tOut = sum(fRows,r=>r.out);
  const pts = [{label:L('Đầu'), full:L('Đầu năm {y}', {y}), v: fundBalance('emergency', (y-1)+'-12-31')}];
  for(let i=1;i<=monthsElapsed(y);i++) pts.push({label:mShort(i), full:L('Cuối {month}', {month:monthIn(y,i)}), v:fundBalance('emergency', lastDayISO(y,i))});
  const minPct = em.minProgress;
  return `${investTabs()}
  <div class="grid g-3">
    ${kpi(`<i class="swatch" style="background:var(--f-emergency)"></i>${L('Số dư quỹ khẩn cấp')}`, `${vnd(em.bal)}<small>₫</small>`, L('Cập nhật ngay khi ghi nhận thu/chi'), 'accent')}
    ${kpi(L('Chi tiêu trung bình / tháng'), `${vnd(em.avg)}<small>₫</small>`, L('Tính trên {basis}', {basis:esc(em.basis)}))}
    ${kpi(L('Mục tiêu {n} tháng', {n:em.target}), `${vnd(em.targetAmt)}<small>₫</small>`, em.gap>=0? `<span class="chip pos">${L('Dư {v} ₫', {v:vnd(em.gap)})}</span>` : `<span class="chip neg">${L('Còn thiếu {v} ₫', {v:vnd(-em.gap)})}</span>`)}
    <div class="card kpi"><div class="label">${L('Số dư hiện đủ dùng')}</div><div class="value">${fmt1(em.months)}<small>${L('tháng ≈ {n} ngày', {n:em.days})}</small></div>
      <div class="meter ${em.months>=em.target?'pos':em.months>=EMERGENCY_MIN?'gold':'warn'}" style="margin-top:9px"><i style="width:${Math.min(100,em.months/em.target*100)}%"></i></div>
      <div class="foot">${L('So với mục tiêu {n} tháng ({d} ngày): {p}', {n:em.target, d:em.target*30, p:pctPlain(Math.min(1,em.months/em.target),0)})}</div></div>
    ${kpi(L('Thu – Chi quỹ năm {y}', {y}), `<span class="${em.yearNet<0?'neg':'pos'}">${signed(em.yearNet)}</span><small>₫</small>`, L('Thu {in} · Chi {out} (đến nay)', {in:`<b>${compact(em.yearIn)}</b>`, out:`<b>${compact(em.yearOut)}</b>`}))}
    <div class="card kpi"><div class="label">${L('Tiến độ mốc an toàn tối thiểu {n} tháng', {n:EMERGENCY_MIN})}</div><div class="value ${minPct>=1?'pos':''}">${pctPlain(Math.min(minPct,9.99),0)}</div>
      <div class="meter ${minPct>=1?'pos':'gold'}" style="margin-top:9px"><i style="width:${Math.min(100,minPct*100)}%"></i></div>
      <div class="foot">${L('Mốc {v} ₫', {v:`<b>${vnd(em.minAmt)}</b>`})} · ${minPct>=1? `<span class="chip pos">${L('Đã vượt {v}', {v:compact(em.bal-em.minAmt)})}</span>` : `<span class="chip warn">${L('Còn thiếu {v} ₫', {v:vnd(em.minAmt-em.bal)})}</span>`}</div></div>
  </div>
  <div class="grid g-split section-gap">
    <div class="card"><div class="card-h"><h2>${L('Dòng tiền quỹ theo năm')}</h2><span class="sub">${L('{y} – hiện tại', {y:years[0]||y})}</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>${L('Năm')}</th><th>${L('Thu vào (₫)')}</th><th>${L('Chi ra (₫)')}</th><th>${L('Tiền ròng (₫)')}</th><th>${L('Số dư cuối kỳ')}</th></tr></thead>
        <tbody>${fRows.map(r=>`<tr><td><b>${r.y}</b>${+r.y===y?` <span class="chip acc">${L('đến nay')}</span>`:''}</td><td class="pos">${vnd(r.in)}</td><td class="neg">${vnd(r.out)}</td><td class="${r.net<0?'neg':'pos'}"><b>${signed(r.net)}</b></td><td>${vnd(r.end)}</td></tr>`).join('')}
        <tr class="total"><td>${L('Tổng cộng')}</td><td class="pos">${vnd(tIn)}</td><td class="neg">${vnd(tOut)}</td><td class="${tIn-tOut<0?'neg':'pos'}">${signed(tIn-tOut)}</td><td>${vnd(em.bal)}</td></tr></tbody></table></div>
      <div style="margin-top:16px">${chartArea(pts,'var(--f-emergency)',L('Số dư quỹ khẩn cấp theo tháng'),'emg')}</div>
    </div>
    <div class="card"><div class="card-h"><h2>${L('Ghi nhận thu / chi quỹ khẩn cấp')}</h2></div>${S.canWrite? fundForm('emergency') : `<p class="hint">${L('Tài khoản chỉ xem không ghi được giao dịch.')}</p>`}</div>
  </div>
  <div class="card section-gap"><div class="card-h"><h2>${L('Nhật ký thu – chi quỹ khẩn cấp')}</h2>${journalSub('emergency')}</div>${fundJournal('emergency')}</div>`;
}

function viewKids(){
  const P = portfolio(); const items = P.items;
  if(!S.product || !items.some(i=>i.p.id===S.product)) S.product = items[0]?.p.id || null;
  const sel = items.find(i=>i.p.id===S.product);
  const sip = items.filter(i=>i.p.mode==='sip').length;
  return `${investTabs()}
  <div class="grid g-4">
    ${kpi(`<i class="swatch" style="background:var(--f-kids)"></i>${L('Giá trị hiện tại')}`, compact(P.value), L('{v} ₫ · {n} sản phẩm', {v:`<b>${vnd(P.value)}</b>`, n:items.length}), 'accent')}
    ${kpi(L('Vốn đã góp'), compact(P.cost), L('Vốn của phần đang nắm giữ · {v} ₫', {v:`<b>${vnd(P.cost)}</b>`}))}
    ${kpi(L('Lãi / lỗ'), `<span class="${P.pl>=0?'pos':'neg'}">${signedC(P.pl)}</span>`, `<span class="chip ${P.unreal>=0?'pos':'neg'}">${pct(P.plPct,2)}</span> ${P.realized? `${L('đã chốt')} <b class="${P.realized>=0?'pos':'neg'}">${signedC(P.realized)}</b>`:L('chưa chốt lời/lỗ')}`)}
    ${kpi(L('Giao dịch'), `${P.tx}`, L('{a} sản phẩm định kỳ · {b} mua một lần', {a:sip, b:items.length-sip}))}
  </div>
  <div class="card section-gap"><div class="card-h"><h2>${L('Danh mục đầu tư')}</h2>${S.canWrite?`<div class="top-actions"><button class="btn sm" type="button" data-add-product>${ico(ICONS.plus)}${L('Thêm sản phẩm')}</button><button class="btn sm primary" type="button" data-add-lot="">${ico(ICONS.plus)}${L('Thêm giao dịch')}</button></div>`:''}</div>
    ${items.length? `<div class="tbl-wrap"><table>
      <thead><tr><th>${L('Sản phẩm')}</th><th class="l">${L('Hình thức')}</th><th>${L('Số lượng')}</th><th>${L('Giá vốn BQ')}</th><th>${L('Giá hiện tại')}</th><th>${L('Giá trị (₫)')}</th><th>${L('Vốn (₫)')}</th><th>${L('Lãi / lỗ')}</th><th>${L('Tỷ trọng')}</th></tr></thead>
      <tbody>${items.map(i=>`<tr class="click ${i.p.id===S.product?'sel':''}" data-product="${esc(i.p.id)}"><td><div class="prod"><i class="swatch" style="background:${i.p.color}"></i><div><b>${esc(productLabel(i.p))}</b><span>${esc(i.p.manager? L(i.p.manager) : '—')} · ${PRODUCT_TYPES[i.p.type]||L('Khác')}</span></div></div></td>
        <td class="txt"><span class="chip ${i.p.mode==='sip'?'acc':'gold'}">${PRODUCT_MODES[i.p.mode]||PRODUCT_MODES.lump}</span></td>
        <td>${fmtUnits(i.units)} <span class="muted">${esc(unitLabel(i.p.unit))}</span></td><td>${fmtPrice(i.avg)}</td><td>${fmtPrice(i.price)}<div class="sub-date">${i.p.priceDate? fmtDate(i.p.priceDate):L('chưa cập nhật')}</div></td>
        <td><b>${vnd(i.value)}</b></td><td>${vnd(i.cost)}</td><td class="${i.pl>=0?'pos':'neg'}">${signed(i.pl)}<div class="sub-date">${pct(i.plPct,2)}</div></td><td>${P.value? pctPlain(i.value/P.value):'—'}</td></tr>`).join('')}
      <tr class="total"><td>${L('Tổng danh mục')}</td><td></td><td></td><td></td><td></td><td>${vnd(P.value)}</td><td>${vnd(P.cost)}</td><td class="${P.pl>=0?'pos':'neg'}">${signed(P.pl)}</td><td>100%</td></tr></tbody></table></div>
      <p class="hint" style="margin:10px 0 0">${L('Bấm vào một sản phẩm để xem chi tiết, cập nhật giá và giao dịch của riêng sản phẩm đó.')}</p>`
    : `<div class="empty"><b>${L('Chưa có sản phẩm đầu tư')}</b>${L('Bấm “Thêm sản phẩm” để tạo quỹ đầu tiên, rồi thêm giao dịch mua.')}</div>`}
  </div>
  ${kidsByYear()}
  ${sel? productDetail(sel, items) : ''}`;
}
function kidsByYear(){
  const rows={}; for(const l of S.vcbf){ const y=(l.date||'').slice(0,4); if(!y) continue; rows[y]=rows[y]||{buy:0,sell:0,n:0}; const v=(+l.units||0)*(+l.price||0); if(l.side==='sell') rows[y].sell+=v-(+l.fee||0); else rows[y].buy+=v+(+l.fee||0); rows[y].n++; }
  const ys=Object.keys(rows).sort(); if(!ys.length) return '';
  let cum=0; const T={buy:sum(ys,y=>rows[y].buy), sell:sum(ys,y=>rows[y].sell), n:sum(ys,y=>rows[y].n)};
  return `<div class="card section-gap"><div class="card-h"><h2>${L('Vốn góp theo năm')}</h2><span class="sub">${L('Tất cả sản phẩm · lũy kế qua các năm')}</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>${L('Năm')}</th><th>${L('Giao dịch')}</th><th>${L('Mua vào (₫)')}</th><th>${L('Bán / rút (₫)')}</th><th>${L('Góp ròng (₫)')}</th><th>${L('Lũy kế góp ròng (₫)')}</th></tr></thead>
    <tbody>${ys.map(y=>{ const r=rows[y], net=r.buy-r.sell; cum+=net; return `<tr class="click ${+y===S.year?'sel':''}" data-set-year="${y}"><td><b>${y}</b></td><td>${r.n}</td><td>${vnd(r.buy)}</td><td>${r.sell?vnd(r.sell):'—'}</td><td>${vnd(net)}</td><td><b>${vnd(cum)}</b></td></tr>`; }).join('')}
      <tr class="total"><td>${L('Tổng')}</td><td>${T.n}</td><td>${vnd(T.buy)}</td><td>${T.sell?vnd(T.sell):'—'}</td><td>${vnd(T.buy-T.sell)}</td><td>${vnd(T.buy-T.sell)}</td></tr></tbody></table></div></div>`;
}
function productDetail(i, items){
  const p = i.p; const buys = i.lots.filter(l=>l.side!=='sell');
  return `<div class="card section-gap" id="productDetail">
    <div class="card-h"><h2>${esc(productLabel(p))}${p.name && p.code? ` <span class="muted" style="font-weight:500;font-size:13px">· ${esc(p.name)}</span>`:''}</h2>
      ${S.canWrite?`<div class="top-actions"><button class="btn sm" type="button" data-edit-product="${esc(p.id)}">${L('Sửa thông tin')}</button><button class="btn sm primary" type="button" data-add-lot="${esc(p.id)}">${ico(ICONS.plus)}${L('Giao dịch {p}', {p:esc(productLabel(p))})}</button></div>`:''}</div>
    ${items.length>1? `<div class="pills" style="margin-bottom:14px" role="group" aria-label="${L('Chọn sản phẩm')}">${items.map(x=>`<button type="button" class="pill" data-product="${esc(x.p.id)}" aria-pressed="${x.p.id===p.id}"><i class="swatch" style="background:${x.p.color}"></i>${esc(productLabel(x.p))}</button>`).join('')}</div>` : ''}
    <div class="grid g-4">
      <div class="mini"><span>${L('Công ty quản lý')}</span><b>${esc(p.manager? L(p.manager) : '—')}</b><em>${PRODUCT_TYPES[p.type]||L('Khác')} · ${PRODUCT_MODES[p.mode]||PRODUCT_MODES.lump}</em></div>
      <div class="mini"><span>${L('Đang nắm giữ')}</span><b>${fmtUnits(i.units)} ${esc(unitLabel(p.unit))}</b><em>${L('Giá vốn BQ')} ${fmtPrice(i.avg)}</em></div>
      <div class="mini"><span>${L('Giá trị hiện tại')}</span><b>${vnd(i.value)}</b><em>${L('Vốn')} ${vnd(i.cost)}</em></div>
      <div class="mini"><span>${L('Lãi / lỗ')}</span><b class="${i.pl>=0?'pos':'neg'}">${signed(i.pl)}</b><em>${pct(i.plPct,2)}${i.realized? ` · ${L('đã chốt')} ${signedC(i.realized)}`:''}</em></div>
    </div>
    <div class="price-row">
      <div class="field" style="flex:1;min-width:200px"><label for="price-${esc(p.id)}">${L('Giá {unit} hiện tại · {p}', {unit:esc(unitLabel(p.unit||'đơn vị')), p:esc(productLabel(p))})}</label>
        ${S.canWrite? `<div style="display:flex;gap:6px"><input class="input num" id="price-${esc(p.id)}" inputmode="decimal" value="${i.price? I.decIn(i.price):''}" placeholder="${L('vd: 13732,75')}"><button class="btn primary" type="button" data-save-price="${esc(p.id)}">${L('Cập nhật giá')}</button></div>` : `<b class="num">${fmtPrice(i.price)}</b>`}</div>
      <p class="hint" style="margin:0;flex:1;min-width:200px">${p.priceDate? L('Cập nhật lần cuối {date}.', {date:fmtDate(p.priceDate)}) : L('Chưa cập nhật giá.')} ${L('Giá này chỉ áp dụng cho {p}; mỗi sản phẩm giữ giá riêng.', {p:esc(productLabel(p))})}</p>
    </div>
    ${buys.length? `<div class="section-gap"><div class="flabel" style="margin-bottom:6px">${L('Lãi/lỗ % từng lần mua theo thời gian')}</div>${chartLotPL(buys, i.price)}</div>`:''}
    <div class="section-gap">${i.lots.length? `<div class="tbl-wrap"><table>
      <thead><tr><th>${L('Ngày')}</th><th class="l">${L('Loại')}</th><th>${L('Số lượng')}</th><th>${L('Giá')}</th><th>${L('Giá trị giao dịch')}</th><th>${L('Giá trị hiện tại')}</th><th>${L('Lãi / lỗ')}</th><th class="l" style="min-width:140px">${L('% lãi/lỗ')}</th>${S.isOwner?'<th></th>':''}</tr></thead>
      <tbody>${i.lots.map(l=>{ const u=+l.units||0, pr=+l.price||0, fee=+l.fee||0, sell=l.side==='sell';
        const amount = u*pr + (sell? -fee : fee), val = u*i.price, r = pr? (i.price-pr)/pr : 0, w = Math.min(50, Math.abs(r)*250);
        return `<tr class="click" data-edit-lot="${esc(l.id)}"><td class="num">${fmtDate(l.date)}</td><td class="txt"><span class="chip ${sell?'neg':'pos'}">${sell?L('Bán / rút'):L('Mua')}</span></td><td>${fmtUnits(u)}</td><td>${fmtPrice(pr)}</td><td>${vnd(amount)}</td>
          <td>${sell?'—':vnd(val)}</td><td class="${sell?'':val-amount>=0?'pos':'neg'}">${sell?'—':signed(val-amount)}</td>
          <td class="l">${sell? `<span class="muted">${L('Đã chốt')}</span>` : `<div style="display:flex;align-items:center;gap:8px"><div style="position:relative;width:80px;height:8px;background:var(--sunken);border-radius:4px;flex:none"><span style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:var(--line)"></span><span style="position:absolute;top:0;bottom:0;border-radius:4px;${r>=0?`left:50%;width:${w}%;background:var(--pos)`:`right:50%;width:${w}%;background:var(--neg)`}"></span></div><span class="${r>=0?'pos':'neg'}">${pct(r,1)}</span></div>`}</td>${S.isOwner?`<td>${delBtn('vcbf',l.id)}</td>`:''}</tr>`; }).join('')}
        <tr class="total"><td>${L('Tổng')}</td><td></td><td>${fmtUnits(i.units)}</td><td>${fmtPrice(i.avg)}</td><td>${vnd(i.cost)}</td><td>${vnd(i.value)}</td><td class="${i.pl>=0?'pos':'neg'}">${signed(i.pl)}</td><td class="l ${i.pl>=0?'pos':'neg'}">${pct(i.plPct,2)}</td>${S.isOwner?'<td></td>':''}</tr>
      </tbody></table></div>` : `<div class="empty"><b>${L('Chưa có giao dịch')}</b>${L('Bấm “Giao dịch {p}” để thêm lần mua đầu tiên.', {p:esc(productLabel(p))})}</div>`}</div>
  </div>`;
}

/* =========================================================
   Views — Thiết lập
   ========================================================= */
function viewSettings(){
  const c = cfg(); const ro = S.canWrite? '' : 'readonly';
  const budTotal = sum(CATS,cc=>c.budgets[cc.id]);
  return `<div class="grid g-2">
    <div class="card"><div class="card-h"><h2>${L('Ngân sách chi tiêu tháng')}</h2><span class="sub num">${L('Tổng {v} ₫', {v:vnd(budTotal)})}</span></div>
      <div class="stack" style="gap:10px">${CATS.map(cc=>`<div class="field"><label for="bud-${cc.id}"><i class="swatch" style="background:var(--c-${cc.id});margin-right:6px"></i>${cc.name}</label><input class="input num" id="bud-${cc.id}" data-budget="${cc.id}" value="${c.budgets[cc.id]?vnd(c.budgets[cc.id]):''}" placeholder="${L('vd: 12tr')}" ${ro}></div>`).join('')}</div>
      <p class="hint">${L('Dùng để cảnh báo khi một khoản chi vượt ngân sách. Tự lưu khi rời ô.')}</p>
    </div>
    <div class="stack">
      <div class="card"><div class="card-h"><h2>${L('Đầu tư rủi ro cao')}</h2></div>
        <div class="field"><label for="riskVal">${L('Giá trị hiện tại (₫)')}</label><input class="input num" id="riskVal" data-cfg-amount="highRisk" value="${c.highRisk?vnd(c.highRisk):'0'}" ${ro}></div>
        <div class="field" style="margin-top:10px"><label for="riskNote">${L('Ghi chú danh mục')}</label><input class="input" id="riskNote" data-cfg-text="highRiskNote" value="${esc(c.highRiskNote)}" placeholder="${L('vd: cổ phiếu, vàng…')}" ${ro}></div>
      </div>
      <div class="card"><div class="card-h"><h2>${L('Quỹ khẩn cấp')}</h2></div>
        <div class="field"><label for="emgTarget">${L('Mục tiêu (số tháng chi tiêu)')}</label><input class="input num" id="emgTarget" data-cfg-int="emergencyTarget" value="${c.emergencyTarget}" inputmode="numeric" ${ro}><span class="hint">${L('Mốc an toàn tối thiểu cố định {n} tháng.', {n:EMERGENCY_MIN})}</span></div>
      </div>
      <div class="card"><div class="card-h"><h2>${L('Số dư đầu kỳ')}</h2><span class="sub">${L('tính đến {date}', {date:fmtDate(c.openings.asOf)})}</span></div>
        <div class="row2"><div class="field"><label for="opE">${L('Quỹ khẩn cấp')}</label><input class="input num" id="opE" data-opening="emergency" value="${vnd(c.openings.emergency)}" ${ro}></div>
        <div class="field"><label for="opS">${L('Quỹ tiết kiệm')}</label><input class="input num" id="opS" data-opening="savings" value="${vnd(c.openings.savings)}" ${ro}></div></div>
      </div>
    </div>
  </div>
  <div class="grid g-2 section-gap">
    <div class="card"><div class="card-h"><h2>${L('Tài sản ròng các năm trước')}</h2><span class="sub">${L('Dùng để so sánh tăng trưởng')}</span></div>
      <div class="row2">${navYears().map(k=>`<div class="field"><label for="nav-${k}">${L('Cuối năm {y}', {y:k})}</label><input class="input num" id="nav-${k}" data-nav="${k}" value="${c.navHistory[k]?vnd(c.navHistory[k]):''}" placeholder="${L('chưa chốt')}" ${ro}></div>`).join('')}</div>
      ${S.canWrite && curYear()-1>ledgerStartYear()? `<div style="margin-top:12px"><button class="btn sm" type="button" data-close-year="${curYear()-1}">${L('Chốt lại tài sản ròng cuối năm {y} từ sổ quỹ', {y:curYear()-1})}</button></div>`:''}
      <p class="hint">${L('Mỗi đầu năm, hệ thống tự chốt tài sản ròng cuối năm trước để làm mốc so sánh.')}</p>
    </div>
    <div class="card"><div class="card-h"><h2>${L('Xuất dữ liệu')}</h2></div>
      <p class="hint" style="margin-top:0">${L('Tải về để mở bằng Excel hoặc sao lưu toàn bộ.')}</p>
      <div class="top-actions">
        <button class="btn" type="button" data-export="tx">${ico(ICONS.down)}${L('Thu chi (.csv)')}</button>
        <button class="btn" type="button" data-export="fund">${ico(ICONS.down)}${L('Sổ quỹ (.csv)')}</button>
        <button class="btn" type="button" data-export="json">${ico(ICONS.down)}${L('Sao lưu (.json)')}</button>
      </div>
    </div>
  </div>
  ${viewLanguage()}
  ${viewAppearance()}
  ${viewMembers()}`;
}
function navYears(){ const ys=[]; for(let k=firstYear(); k<curYear(); k++) ys.push(k); return ys; }
/* ---------- appearance: light / dark / follow device ---------- */
const THEME_LABEL = i18nize({auto:'Theo thiết bị', light:'Sáng', dark:'Tối'});
const THEME_ICON = {
  auto: '<path d="M12 3a9 9 0 1 0 0 18z" fill="currentColor"/><circle cx="12" cy="12" r="9"/>',
  light: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  dark: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
};
const themeMode = () => window.STCTheme? STCTheme.get() : 'auto';
function paintThemeBtn(){ const b=$('#themeBtn'); if(!b) return; const m=themeMode(); b.querySelector('svg').innerHTML=THEME_ICON[m]; b.title=L('Giao diện: {mode} (bấm để đổi)', {mode:THEME_LABEL[m]}); b.setAttribute('aria-label', b.title); }
function setTheme(m){ if(!window.STCTheme) return; STCTheme.set(m); paintThemeBtn(); }
function viewAppearance(){
  const m = themeMode();
  return `<div class="card section-gap"><div class="card-h"><h2>${L('Giao diện')}</h2><span class="sub">${L('Lưu riêng trên thiết bị này')}</span></div>
    <div class="theme-pick" role="radiogroup" aria-label="${L('Chế độ giao diện')}">${['auto','light','dark'].map(k=>`<button type="button" role="radio" aria-checked="${m===k}" data-theme-set="${k}" class="theme-opt ${m===k?'on':''}"><span class="theme-prev ${k}"><i></i><i></i><i></i></span><span class="theme-name">${ico(THEME_ICON[k])}${THEME_LABEL[k]}</span><span class="hint">${k==='auto'?L('Tự đổi theo cài đặt sáng/tối của điện thoại, máy tính'):k==='light'?L('Nền sáng, chữ đậm — dễ đọc ban ngày'):L('Nền tối, dịu mắt — dùng buổi tối')}</span></button>`).join('')}</div>
    <p class="hint" style="margin:10px 0 0">${L('Có thể đổi nhanh bằng nút {icon} ở góc trên.', {icon:ico(THEME_ICON[m])})}</p></div>`;
}
/* ---------- privacy: blur money on screen (per device, remembered) ---------- */
const EYE = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF = '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a10.7 10.7 0 0 0 5.4-1.4"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';
const PRIV_KEY = 'stc.privacy';
const isPrivate = () => document.documentElement.classList.contains('privacy');
function setPrivacy(on){
  document.documentElement.classList.toggle('privacy', on);
  try{ if(on) localStorage.setItem(PRIV_KEY,'1'); else localStorage.removeItem(PRIV_KEY); }catch(e){}
  paintPrivacy();
}
/** Open eye = amounts shown (tap to hide); crossed eye = amounts hidden (tap to show). */
function privacyBtnInner(){ return ico(isPrivate()? EYE_OFF : EYE); }
function paintPrivacy(){
  const label = isPrivate()? L('Hiện số tiền') : L('Ẩn số tiền');
  $$('#privacyBtn, [data-privacy]').forEach(b=>{ b.innerHTML = privacyBtnInner(); b.setAttribute('aria-label', label); b.title = label; b.setAttribute('aria-pressed', String(isPrivate())); });
}
try{ if(localStorage.getItem(PRIV_KEY)==='1') document.documentElement.classList.add('privacy'); }catch(e){}

/* ---------- language ---------- */
const LANG_HINT = {vi:'Mặc định', en:'Giao diện tiếng Anh', ja:'Giao diện tiếng Nhật'};
function viewLanguage(){
  const cur = I.get();
  const others = ['Ngôn ngữ','Language','言語'].filter(x=>x!==L('Ngôn ngữ')).join(' · ');   // so anyone can find this card
  return `<div class="card section-gap"><div class="card-h"><h2>${L('Ngôn ngữ')} <span class="muted" style="font-weight:500;font-size:13px">· ${others}</span></h2><span class="sub">${L('Lưu riêng trên thiết bị này')}</span></div>
    <div class="lang-pick" role="radiogroup" aria-label="${L('Ngôn ngữ')}">${Object.entries(I.LANGS).map(([k,v])=>`<button type="button" role="radio" aria-checked="${cur===k}" data-lang-set="${k}" class="lang-opt ${cur===k?'on':''}" lang="${k}"><span class="lang-code">${v.short}</span><span class="lang-name">${v.name}</span><span class="hint">${L(LANG_HINT[k])}</span></button>`).join('')}</div>
    <p class="hint" style="margin:10px 0 0">${L('Ngày tháng luôn hiển thị theo dạng DD/MM/YYYY ở mọi ngôn ngữ. Số tiền vẫn tính bằng đồng (₫).')}</p></div>`;
}
/** Greeting by the device's local time: morning 05:00–11:59, afternoon 12:00–17:59, evening otherwise. */
function paintGreeting(){
  const el=$('#greeting'), me=window.FIN?.session(); if(!el) return;
  if(!me){ el.textContent=''; return; }
  const h=new Date().getHours();
  const key = h>=5 && h<12 ? 'Chào buổi sáng, {name}' : h>=12 && h<18 ? 'Chào buổi chiều, {name}' : 'Chào buổi tối, {name}';
  // the salutation and the name are styled apart (italic serif + upright name), so build both parts as text nodes
  const sig = I.get()+'|'+key+'|'+me.name; if(el.dataset.sig===sig) return; el.dataset.sig = sig;
  const [pre, post=''] = L(key, {name:'\u2063'}).split('\u2063');
  const nm = document.createElement('span'); nm.className='g-name'; nm.textContent = me.name;
  el.replaceChildren(document.createTextNode(pre), nm, document.createTextNode(post));
}
function setLang(v){ if(!I.LANGS[v] || v===I.get()) return; I.set(v); }
function paintLangSel(){ const s=$('#langSel'); if(s) s.value = I.get(); const c=$('#langCode'); if(c) c.textContent = I.LANGS[I.get()].short; }
const ROLE_LABEL = i18nize({owner:'Chủ sổ', member:'Thành viên', viewer:'Chỉ xem'});
const ROLE_HINT = i18nize({owner:'Toàn quyền, quản lý thành viên và khôi phục dữ liệu', member:'Ghi chép và sửa dữ liệu', viewer:'Chỉ xem, không sửa được'});
let restoreData=null;
function viewMembers(){
  const me = window.FIN?.session(); if(!me) return '';
  const isOwner = me.role==='owner'; const list = S.members || [];
  return `<div class="grid g-2 section-gap">
    <div class="card"><div class="card-h"><h2>${L('Thành viên gia đình')}</h2><span class="sub">${L('{n} tài khoản', {n:list.length})}</span></div>
      <div class="list">${list.map(m=>`<div class="row member-row">
        <img class="avatar" data-uid="${esc(m.id)}" alt="" src="${BLANK}">
        <div style="min-width:0"><div class="t">${esc(m.name)}${m.id===me.id?` <span class="chip acc">${L('Bạn')}</span>`:''}</div><div class="s">@${esc(m.username)} · ${ROLE_LABEL[m.role]||m.role}</div></div>
        <div class="member-actions">${isOwner && m.id!==me.id ? `
          <label class="sr-only" for="role-${esc(m.id)}">${L('Vai trò của {name}', {name:esc(m.name)})}</label>
          <select class="input sel-sm" id="role-${esc(m.id)}" data-member-role="${esc(m.id)}">${Object.entries(ROLE_LABEL).map(([k,l])=>`<option value="${k}" ${m.role===k?'selected':''}>${l}</option>`).join('')}</select>
          <button class="btn sm" type="button" data-member-reset="${esc(m.id)}" data-name="${esc(m.name)}">${L('Đặt lại mật khẩu')}</button>
          <button class="btn sm danger" type="button" data-member-del="${esc(m.id)}" data-name="${esc(m.name)}">${L('Xóa')}</button>` : ''}</div></div>`).join('')}</div>
      ${isOwner? `<form id="addMember" class="stack" style="gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--line)" novalidate>
        <h3 class="flabel" style="font-size:13.5px">${L('Thêm thành viên')}</h3>
        <div class="row2">
          <div class="field"><label for="am-name">${L('Tên hiển thị')}</label><input class="input" id="am-name" autocomplete="off" placeholder="${L('vd: Bà ngoại')}" maxlength="40"></div>
          <div class="field"><label for="am-user">${L('Tên đăng nhập')}</label><input class="input" id="am-user" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${L('vd: ba.ngoai')}"></div>
        </div>
        <div class="row2">
          <div class="field"><label for="am-pass">${L('Mật khẩu tạm')}</label><input class="input" id="am-pass" type="text" autocomplete="new-password" placeholder="${L('Ít nhất 8 ký tự')}"></div>
          <div class="field"><label for="am-role">${L('Vai trò')}</label><select class="input" id="am-role"><option value="member">${ROLE_LABEL.member}</option><option value="viewer">${ROLE_LABEL.viewer}</option><option value="owner">${ROLE_LABEL.owner}</option></select></div>
        </div>
        <p class="hint" id="am-hint" style="margin:0">${memberHint('member')}</p>
        <div><button class="btn primary" type="submit">${L('Thêm thành viên')}</button></div>
      </form>` : `<p class="hint">${L('Chỉ chủ sổ mới thêm hoặc xóa được thành viên.')}</p>`}
    </div>
    <div class="stack">
      <div class="card"><div class="card-h"><h2>${L('Đổi mật khẩu của bạn')}</h2></div>
        <form id="changePass" class="stack" style="gap:12px" novalidate>
          <input type="text" autocomplete="username" value="${esc(me.username)}" hidden readonly>
          <div class="field"><label for="cp-cur">${L('Mật khẩu hiện tại')}</label><input class="input" id="cp-cur" type="password" autocomplete="current-password"></div>
          <div class="field"><label for="cp-new">${L('Mật khẩu mới')}</label><input class="input" id="cp-new" type="password" autocomplete="new-password"><span class="hint">${L('Ít nhất 8 ký tự. Các thiết bị khác sẽ bị đăng xuất.')}</span></div>
          <div class="top-actions"><button class="btn" type="submit">${L('Đổi mật khẩu')}</button><button class="btn ghost" type="button" id="logoutBtn2">${L('Đăng xuất')}</button></div>
        </form>
      </div>
      ${isOwner? `<div class="card"><div class="card-h"><h2>${L('Khôi phục từ bản sao lưu')}</h2></div>
        <p class="hint" style="margin-top:0">${L('Chọn tệp .json đã tải bằng nút “Sao lưu”. Toàn bộ dữ liệu hiện tại sẽ được thay thế; máy chủ tự lưu một bản trước khi khôi phục.')}</p>
        <div class="field"><label for="restoreFile">${L('Tệp sao lưu')}</label><input class="input" id="restoreFile" type="file" accept=".json,application/json"></div>
        <div style="margin-top:10px"><button class="btn danger" type="button" id="restoreBtn" ${restoreData?'':'disabled'}>${L('Khôi phục dữ liệu')}</button></div>
      </div>` : ''}
    </div>
  </div>`;
}
const memberHint = role => L('{role}. Gửi tên đăng nhập và mật khẩu tạm cho người nhà; họ tự đổi mật khẩu sau khi đăng nhập.', {role:ROLE_HINT[role]});

function viewLoading(){
  return `<div class="loading"><div class="hero"><div class="eyebrow">${L('Đang mở sổ…')}</div><div class="skel" style="width:46%;height:36px;margin-top:12px;opacity:.25"></div></div>
  <div class="grid g-4 section-gap">${'<div class="card"><div class="skel" style="width:50%"></div><div class="skel" style="width:70%;height:22px;margin-top:12px"></div></div>'.repeat(4)}</div></div>`;
}
function viewOffline(){ return `<div class="card"><div class="empty"><b>${L('Chưa kết nối được máy chủ')}</b>${L('Kiểm tra kết nối mạng rồi tải lại trang.')}</div></div>`; }

/* =========================================================
   Render
   ========================================================= */
let pendingRender=false, rafId=0;
function scheduleRender(){ aggCache.clear(); if(rafId) return; rafId=requestAnimationFrame(()=>{rafId=0; render();}); }
function renderYearPicker(){
  const sel = $('#yearSel'); if(!sel) return;
  const from = firstYear(), to = lastYear(), key = from+'-'+to+'-'+curYear();
  const key2 = key+'-'+I.get();
  if(sel.dataset.range!==key2){ let o=''; for(let k=to;k>=from;k--) o += `<option value="${k}">${k}${k===curYear()?' · '+L('năm nay'):''}</option>`; sel.innerHTML=o; sel.dataset.range=key2; }
  sel.value = String(S.year);
}
function yearBanner(){
  const cy = curYear(); if(S.year===cy) return '';
  const past = S.year<cy;
  return `<div class="year-banner ${past?'past':'future'}">${ico(ICONS.cal)}<div><b>${past? L('Đang xem năm {y} (đã qua)', {y:S.year}) : L('Đang xem năm {y} (năm tới)', {y:S.year})}</b><span>${L('Thu chi, biểu đồ, nhận định và nhật ký hiển thị theo năm {y}. Số dư quỹ, sổ tiết kiệm và danh mục đầu tư là số lũy kế hiện tại.', {y:S.year})}</span></div><button class="btn sm" type="button" data-year-now>${L('Về năm {y}', {y:cy})}</button></div>`;
}
function render(){
  const ae = document.activeElement;
  if(ae && $('#main').contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.type!=='radio' && ae.type!=='file'){ pendingRender=true; return; }
  pendingRender=false; aggCache.clear();
  if(S.pendingQuick && S.canWrite && Object.values(S.loaded).every(Boolean)){ const k=S.pendingQuick; S.pendingQuick=null; setTimeout(()=>openTx({kind:k}),50); }
  if(!S._yearChecked && Object.values(S.loaded).every(Boolean)){ S._yearChecked=true; setTimeout(maybeCloseYear, 500); }
  const v = VIEWS[S.view] || VIEWS.overview; const g = v.group;
  $('#pageTitle').textContent = v.title;
  $('#brandYear').textContent = curYear();
  paintGreeting();
  renderYearPicker();
  $('#pageEyebrow').textContent = g==='overview'? L('Tổng quan')+' · '+S.year : GROUPS.find(x=>x.id===g).label;
  $('#nav').innerHTML = GROUPS.map(x=>`<a href="#${x.id}" ${x.id===g?'aria-current="page"':''}>${ico(ICONS[x.id])}${x.label}</a>${x.id==='invest'? `<div class="sub">${INVEST_TABS.map(([id,l])=>`<a href="#${id}" ${S.view===id?'aria-current="page"':''}>${l}</a>`).join('')}</div>`:''}`).join('');
  $('#tabbar').innerHTML = GROUPS.map(x=>`<a href="#${x.id}" ${x.id===g?'aria-current="page"':''}>${ico(ICONS[x.id])}${x.tab}</a>`).join('');
  const show = S.canWrite && S.conn!=='off';
  $('#addBtn').hidden = !show; $('#fab').hidden = !show;
  $('#syncDot').className = 'dot '+(S.conn==='on'?'on':S.conn==='off'?'off':'');
  $('#syncText').textContent = S.conn==='on' ? (S.canWrite? L('Đã đồng bộ · cả nhà cùng xem') : L('Chỉ xem')) : S.conn==='off' ? L('Chưa kết nối máy chủ') : L('Đang kết nối lại…');
  const mr = $('#meBox .me-role'); if(mr) mr.textContent = ROLE_LABEL[window.FIN?.session()?.role]||'';
  let html;
  const ready = Object.values(S.loaded).every(Boolean);
  if(S.conn==='off' && !ready) html = viewOffline();
  else if(!ready) html = viewLoading();
  else html = yearBanner() + (S.canWrite?'':`<div class="banner">${L('Tài khoản của bạn chỉ có quyền xem. Nhờ chủ sổ đổi vai trò thành “Thành viên” để ghi chép.')}</div>`) +
    ({overview:viewOverview, spending:viewSpending, invest:viewInvest, deposits:viewDeposits, emergency:viewEmergency, kids:viewKids, settings:viewSettings}[S.view] || viewOverview)();
  $('#main').innerHTML = html;
  hydrateAvatars();
}
document.addEventListener('focusout', ()=>{ setTimeout(()=>{ if(pendingRender) render(); }, 0); });
async function hydrateAvatars(){
  if(!user) return;
  const imgs = $$('img[data-uid]'); if(!imgs.length) return;
  try{ const ps = await user.profiles([...new Set(imgs.map(i=>i.dataset.uid))]);
    imgs.forEach(i=>{ const p=ps[i.dataset.uid]; if(p){ i.src=p.avatarUrl; i.title=p.name||L('Thành viên'); i.alt=p.name||''; } }); }catch(e){}
}
/* real-time interest ticker */
setInterval(()=>{
  const t = Date.now();
  $$('[data-clock]').forEach(el=>{ el.textContent = fmtDateTime(new Date(t)); });
  const by=$('#brandYear'); if(by && by.textContent!==String(curYear())) by.textContent=curYear();
  if(t%60000<1000) paintGreeting();
  if(S.view!=='deposits' && S.view!=='invest') return;
  const act = activeDeposits();
  $$('[data-live-days]').forEach(el=>{ const d=S.deposits.find(x=>x.id===el.dataset.liveDays); if(d) el.innerHTML=daysText(d,t); });
}, 1000);

/* =========================================================
   Routing & events
   ========================================================= */
function route(){ let h=(location.hash||'').slice(1); if(h==='funds') h='emergency';
  if(h==='ghi-chep'||h==='ghi-chi'||h==='ghi-thu'){ S.pendingQuick = h==='ghi-thu'? 'income' : 'expense'; h='overview'; try{ history.replaceState(null,'','#overview'); }catch(e){} } S.view = VIEWS[h]? h : 'overview'; render(); window.scrollTo(0,0); }
window.addEventListener('hashchange', route);
const main = $('#main');
document.addEventListener('input', e=>{
  const el=e.target; if(!el.matches || !el.matches('[data-date]')) return;
  if(!(e.inputType||'').startsWith('delete')){
    const digits = el.value.replace(/\D/g,'').slice(0,8);
    const v = digits.length>4? digits.slice(0,2)+'/'+digits.slice(2,4)+'/'+digits.slice(4) : digits.length>2? digits.slice(0,2)+'/'+digits.slice(2) : digits;
    if(v!==el.value) el.value=v;
  }
  el.toggleAttribute('aria-invalid', el.value.length===10 && !parseDMY(el.value));
}, true);
document.addEventListener('click', e=>{
  const b=e.target.closest && e.target.closest('[data-pick]'); if(!b) return;
  const txt=document.getElementById(b.dataset.pick); const nat=b.parentElement.querySelector('.date-native');
  nat.value = parseDMY(txt.value) || todayISO();
  try{ nat.showPicker(); }catch(err){ nat.focus(); }
});
document.addEventListener('change', e=>{
  const nat=e.target; if(!nat.matches || !nat.matches('.date-native')) return;
  const txt=document.getElementById(nat.dataset.nativeFor); if(!txt||!nat.value) return;
  txt.value = fmtDate(nat.value); txt.removeAttribute('aria-invalid');
  txt.dispatchEvent(new Event('input',{bubbles:true}));
});
main.addEventListener('pointermove', chartPointer);
main.addEventListener('pointerdown', chartPointer);
main.addEventListener('pointerleave', chartLeave, true);

function arm(btn, label, ms=4000){
  if(btn.classList.contains('armed')) return true;
  const orig = btn.textContent; btn.classList.add('armed','danger'); btn.textContent=label;
  setTimeout(()=>{ if(btn.isConnected){ btn.classList.remove('armed'); btn.textContent=orig; } }, ms);
  return false;
}
main.addEventListener('click', async e=>{
  const t = e.target.closest('button, a, td[data-goto], tr[data-edit-lot], tr[data-product], tr[data-goto-row], tr[data-href], tr[data-set-year], path[data-seg]'); if(!t) return;
  const d = t.dataset;
  if(d.seg){ revealDonut(d.seg); return; }
  if('privacy' in d){ setPrivacy(!isPrivate()); return; }
  if(d.themeSet){ setTheme(d.themeSet); render(); toast(L('Giao diện: {mode}', {mode:THEME_LABEL[d.themeSet]})); return; }
  if(d.langSet){ setLang(d.langSet); return; }
  if(d.setYear){ setYear(+d.setYear); return; }
  if('yearNow' in d){ setYear(curYear()); return; }
  if(d.cmp){ S.cmpMode=d.cmp; render(); return; }
  if(d.closeYear){ const yy=+d.closeYear; const est=navEstimate(yy); if(await saveCfg({navHistory:{...cfg().navHistory,[yy]:Math.round(est.total)}, navParts:{...(cfg().navParts||{}),[yy]:est.parts}})) toast(L('Đã chốt tài sản ròng cuối năm {y}: {v} ₫', {y:yy, v:vnd(est.total)})); return; }
  if(d.insight){ S.openInsights.has(d.insight)? S.openInsights.delete(d.insight) : S.openInsights.add(d.insight); render(); return; }
  if(d.donut){ S.donutPeriod=d.donut; render(); return; }
  if(d.line){ S.lineHidden.has(d.line)? S.lineHidden.delete(d.line) : S.lineHidden.add(d.line); render(); return; }
  if(d.href){ location.hash=d.href; return; }
  if(d.gotoMonth){ const [yy,mm]=d.gotoMonth.split('-').map(Number); S.year=yy; S.month=mm; }
  if(d.mstep){ let m=S.month+ +d.mstep, y=S.year; if(m<1){m=12;y--;} if(m>12){m=1;y++;} if(y<firstYear()||y>lastYear()) return; S.month=m; S.year=y; try{ sessionStorage.setItem('stc.year', String(y)); }catch(e){} render(); return; }
  if(d.year){ S.year=+d.year; render(); return; }
  if(d.goto){ S.month=+d.goto; render(); $('#monthForm')?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  if(d.gotoRow){ S.month=+d.gotoRow; render(); window.scrollTo({top:0,behavior:'smooth'}); return; }
  if(d.editFund){ const x=S.fund.find(q=>q.id===d.editFund); if(x && S.canWrite) openTx({kind:x.fund, doc:x}); return; }
  if(d.fixDiff){ const v=+d.fixDiff; const k='ff:savings:'; S.drafts[k+'type']= v>0?'out':'in'; S.drafts[k+'amt']=vnd(Math.abs(v)); S.drafts[k+'note']=L('Điều chỉnh cho khớp số dư sổ tại ngân hàng'); S.drafts[k+'date']=fmtDate(todayISO()); render(); const f=document.querySelector('[data-fund-form="savings"]'); f?.scrollIntoView({behavior:'smooth',block:'center'}); f?.querySelector('#ff-savings-note')?.focus(); toast(L('Đã điền sẵn bút toán điều chỉnh. Kiểm tra lại rồi bấm Ghi nhận.')); return; }
  if(d.editTx){ const x=S.tx.find(q=>q.id===d.editTx); if(x && S.canWrite) openTx({kind:x.kind==='income'?'income':'expense', doc:x}); return; }
  if('addDep' in d){ openDeposit(); return; }
  if(d.editDep){ if(S.canWrite) openDeposit(S.deposits.find(q=>q.id===d.editDep)); return; }
  if(d.closeDep){ const dep=S.deposits.find(q=>q.id===d.closeDep); if(!dep) return; if(!arm(t,L('Xác nhận tất toán'))) return;
    if(await write(()=>db.collection('deposits').doc(dep.id).set({...stripId(dep), status:'closed', closedAt:todayISO()}))) toast(L('Đã đánh dấu tất toán sổ {bank} {amt}', {bank:dep.bank||'', amt:compact(dep.amount)})); return; }
  if(d.reopenDep){ const dep=S.deposits.find(q=>q.id===d.reopenDep); if(!dep) return;
    const body={...stripId(dep), status:'active'}; delete body.closedAt;
    if(await write(()=>db.collection('deposits').doc(dep.id).set(body))) toast(L('Đã mở lại sổ')); return; }
  if(d.del){ if(!arm(t,L('Bấm lần nữa để xóa'))) return; const [col,id]=d.del.split('/'); t.disabled=true;
    if(await write(()=>db.collection(col).doc(id).delete())) toast(L('Đã xóa')); else t.disabled=false; return; }
  if('addLot' in d){ openLot(null, d.addLot||null); return; }
  if(d.editLot){ if(S.canWrite) openLot(S.vcbf.find(q=>q.id===d.editLot)); return; }
  if('addProduct' in d){ openProduct(); return; }
  if(d.editProduct){ openProduct(products().find(p=>p.id===d.editProduct)); return; }
  if(d.product && !d.addLot){ S.product=d.product; render(); $('#productDetail')?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  if(d.savePrice){ const p = products().find(x=>x.id===d.savePrice); const v=parseDecimal($('#price-'+CSS.escape(d.savePrice)).value);
    if(!p) return; if(!(v>0)){ toast(L('Giá chưa hợp lệ. Ví dụ: 13732,75')); return; }
    const body = {...stripId(p), price:v, priceDate:todayISO()}; delete body._virtual; delete body.color;
    if(await write(()=>db.collection('products').doc(p.id).set(body))) toast(L('Đã cập nhật giá {p}: {v}', {p:productLabel(p), v:fmtPrice(v)})); return; }
  if(d.moveSurplus){ const amt=+d.moveSurplus; const key=ymKey(S.year,S.month); t.disabled=true;
    const ok = await write(()=>db.collection('fund').doc('surplus-'+key).set({date:lastDayISO(S.year,S.month), fund:'emergency', type:'in', amount:amt, note:L('Thặng dư sinh hoạt {month}', {month:mYShort(S.month,S.year)}), ref:'surplus-'+key, by:S.meId, at:Date.now()}));
    if(ok) toast(L('Đã chuyển {v} ₫ vào Quỹ khẩn cấp', {v:vnd(amt)})); else t.disabled=false; return; }
  if(d.withdrawSurplus){ openWithdraw(+d.withdrawSurplus); return; }
  if('undoWithdraw' in d){ const key=ymKey(S.year,S.month); const body={...(S.months[key]||{})}; delete body.withdrawn;
    if(await write(()=>db.collection('months').doc(key).set(body))) toast(L('Đã hoàn tác rút tiền')); return; }
  if(t.id==='mReset'){ const key=ymKey(S.year,S.month); for(const k of Object.keys(S.drafts)) if(k.startsWith(`m:${key}:`)) delete S.drafts[k]; render(); return; }
  if(d.export){ exportData(d.export); return; }
  if(t.id==='logoutBtn2'){ FIN.logout(); return; }
  if(d.memberReset){ openResetPassword(d.memberReset, d.name); return; }
  if(d.memberDel){ if(!arm(t,L('Bấm lần nữa để xóa'))) return; t.disabled=true;
    try{ await FIN.removeMember(d.memberDel); toast(L('Đã xóa tài khoản {name}', {name:d.name})); }catch(err){ toast(errMsg(err)); t.disabled=false; } return; }
  if(t.id==='restoreBtn' && restoreData){ if(!arm(t,L('Bấm lần nữa để thay toàn bộ dữ liệu'),5000)) return; t.disabled=true;
    try{ const r = await FIN.importBackup(restoreData); toast(L('Đã khôi phục {n} bản ghi', {n:r.imported})); restoreData=null; }catch(err){ toast(errMsg(err)); t.disabled=false; } return; }
});
const stripId = o => { const {id, ...rest} = o; return rest; };
main.addEventListener('input', e=>{
  const el = e.target; const k = el.dataset.draft;
  if('exact' in el.dataset){ const n = formatExact(el); const p = el.dataset.exactPrev && $('#'+el.dataset.exactPrev); if(p) p.innerHTML = exactPreview(n); }
  if(el.dataset.mfield) liveGroup(el);
  if(k){ S.drafts[k] = el.value; }
  if(el.dataset.mfield || el.id==='mf-note') updateMonthLive();
});
main.addEventListener('submit', async e=>{
  const f = e.target; e.preventDefault();
  if(f.id==='monthForm'){ saveMonth(); return; }
  if(f.dataset.fundForm){
    const fund = f.dataset.fundForm, k='ff:'+fund+':';
    const type = (f.querySelector('input[type=radio]:checked')||{}).value || 'in';
    const date = readDate(`ff-${fund}-date`); if(!date) return;
    const amt = readExactAmount(f.querySelector(`#ff-${fund}-amt`)); const note = f.querySelector(`#ff-${fund}-note`).value.trim();
    if(!(amt>0)){ toast(L('Nhập số tiền lớn hơn 0')); f.querySelector(`#ff-${fund}-amt`).focus(); return; }
    const btn=f.querySelector('button[type=submit]'); btn.disabled=true;
    const ok = await write(()=>db.collection('fund').add({date, fund, type, amount:amt, note, by:S.meId, at:Date.now()}));
    btn.disabled=false;
    if(ok){ for(const x of ['amt','note','date','type']) delete S.drafts[k+x]; toast(L('Đã ghi nhận: {type} {v} ₫', {type:fundTypeLabel(fund,type), v:vnd(amt)})); render(); }
    return;
  }
  if(f.id==='addMember'){
    const b = {name:$('#am-name').value.trim(), username:$('#am-user').value.trim(), password:$('#am-pass').value, role:$('#am-role').value};
    if(!b.name){ toast(L('Nhập tên hiển thị')); $('#am-name').focus(); return; }
    if(!/^[a-zA-Z0-9._-]{3,32}$/.test(b.username)){ toast(L('Tên đăng nhập gồm 3–32 ký tự không dấu')); $('#am-user').focus(); return; }
    if(b.password.length<8){ toast(L('Mật khẩu tạm cần ít nhất 8 ký tự')); $('#am-pass').focus(); return; }
    const btn=f.querySelector('button[type=submit]'); btn.disabled=true;
    try{ const m = await FIN.addMember(b); toast(L('Đã thêm {name} (@{user})', {name:m.name, user:m.username})); f.reset(); }catch(err){ toast(errMsg(err)); } finally{ btn.disabled=false; }
    return;
  }
  if(f.id==='changePass'){
    const cur=$('#cp-cur').value, nw=$('#cp-new').value;
    if(nw.length<8){ toast(L('Mật khẩu mới cần ít nhất 8 ký tự')); $('#cp-new').focus(); return; }
    const btn=f.querySelector('button[type=submit]'); btn.disabled=true;
    try{ await FIN.updateMember(FIN.session().id, {currentPassword:cur, password:nw}); toast(L('Đã đổi mật khẩu')); f.reset(); }catch(err){ toast(errMsg(err)); } finally{ btn.disabled=false; }
  }
});
main.addEventListener('change', async e=>{
  const el = e.target; const d = el.dataset;
  if(el.type==='radio' && d.draft){ S.drafts[d.draft]=el.value; return; }
  if(d.memberRole){ try{ const m = await FIN.updateMember(d.memberRole, {role:el.value}); toast(`${m.name}: ${ROLE_LABEL[m.role]}`); }catch(err){ toast(errMsg(err)); render(); } return; }
  if(el.id==='am-role'){ $('#am-hint').textContent = memberHint(el.value); return; }
  if(el.id==='restoreFile'){ restoreData=null; $('#restoreBtn').disabled=true; const file = el.files && el.files[0]; if(!file) return;
    try{ const obj = JSON.parse(await file.text()); if(!obj || !Array.isArray(obj.tx)) throw new Error('bad'); restoreData=obj; $('#restoreBtn').disabled=false; toast(L('Tệp hợp lệ: {a} thu chi, {b} biến động quỹ', {a:obj.tx.length, b:(obj.fund||[]).length})); }
    catch(err){ toast(L('Tệp này không phải bản sao lưu của Sổ Tài Chính.')); } return; }
  if(!S.canWrite) return;
  const bad = () => toast(L('Số tiền chưa đọc được. Ví dụ: 12tr'));
  if(d.budget){ const v = el.value.trim()? parseAmount(el.value) : 0; if(isNaN(v)){ bad(); return; }
    if(await saveCfg({budgets:{...cfg().budgets, [d.budget]:v}})) toast(L('Đã lưu ngân sách {cat}', {cat:CAT[d.budget].name})); }
  else if(d.cfgAmount){ const v=parseAmount(el.value); if(isNaN(v)){ bad(); return; } if(await saveCfg({[d.cfgAmount]:v})) toast(L('Đã lưu')); }
  else if(d.cfgText){ if(await saveCfg({[d.cfgText]:el.value.trim()})) toast(L('Đã lưu')); }
  else if(d.cfgInt){ const v=parseInt(el.value,10); if(!(v>0)){ toast(L('Nhập số tháng lớn hơn 0')); return; } if(await saveCfg({[d.cfgInt]:v})) toast(L('Đã lưu mục tiêu')); }
  else if(d.opening){ const v=parseAmount(el.value); if(isNaN(v)){ bad(); return; } if(await saveCfg({openings:{...cfg().openings,[d.opening]:v}})) toast(L('Đã lưu số dư đầu kỳ')); }
  else if(d.nav){ const v=parseAmount(el.value); if(isNaN(v)){ bad(); return; } if(await saveCfg({navHistory:{...cfg().navHistory,[d.nav]:v}})) toast(L('Đã lưu tài sản ròng {y}', {y:d.nav})); }
});
async function saveCfg(patch){
  const ref = db && db.doc('config/main');
  if(S.cfgExists) return write(()=>ref.update(patch));
  return write(()=>ref.set({...cfg(), ...patch}));
}
const quickKind = () => S.view==='emergency'? 'emergency' : S.view==='deposits'? 'savings' : 'expense';
$('#themeBtn')?.addEventListener('click', ()=>{ const order=['auto','light','dark']; const next=order[(order.indexOf(themeMode())+1)%3]; setTheme(next); if(S.view==='settings') render(); toast(L('Giao diện: {mode}', {mode:THEME_LABEL[next]})); });
document.addEventListener('themechange', ()=>{ paintThemeBtn(); scheduleRender(); });
paintThemeBtn();
$('#langSel')?.addEventListener('change', e=>setLang(e.target.value));
document.addEventListener('langchange', ()=>{ paintLangSel(); paintPrivacy(); paintThemeBtn(); if(!$('#sheet').hidden) closeSheet(); render(); toast(L('Đã chuyển sang tiếng Việt')); });
paintLangSel();
$('#logoutTop')?.addEventListener('click', ()=>FIN.logout());
$('#privacyBtn')?.addEventListener('click', ()=>{ setPrivacy(!isPrivate()); toast(isPrivate()? L('Đã ẩn số tiền') : L('Đã hiện số tiền')); });
paintPrivacy();
$('#addBtn').addEventListener('click', ()=>openTx({kind:quickKind()}));
$('#fab').addEventListener('click', ()=>openTx({kind:quickKind()}));
window.addEventListener('beforeunload', e=>{ if(Object.keys(S.drafts).some(k=>k.startsWith('m:'))){ const dv=monthDraftValues(S.year,S.month); if(dv._dirty){ e.preventDefault(); e.returnValue=''; } } });

/* =========================================================
   Sheets (dialog forms)
   ========================================================= */
let lastFocus=null;
function openSheet(html){
  lastFocus = document.activeElement;
  $('#panel').innerHTML = html; $('#sheet').hidden=false;
  const h = $('#panel h2'); if(h) h.id='panelTitle';
  const f = $('#panel input:not([type=hidden]):not([hidden]), #panel select'); if(f) setTimeout(()=>f.focus(),30);
}
function closeSheet(){ $('#sheet').hidden=true; $('#panel').innerHTML=''; if(lastFocus) try{lastFocus.focus()}catch(e){} if(pendingRender) render(); }
$('#sheet').addEventListener('click', e=>{ if(e.target.closest('[data-close]')) closeSheet(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#sheet').hidden) closeSheet(); });
function armDelete(btn, fn){
  btn.addEventListener('click', async ()=>{
    if(!btn.classList.contains('armed')){ btn.classList.add('armed'); btn.textContent=L('Bấm lần nữa để xóa'); setTimeout(()=>{ btn.classList.remove('armed'); btn.textContent=L('Xóa'); },4000); return; }
    btn.disabled=true; if(await fn()) closeSheet(); else btn.disabled=false;
  });
}
const closeBtn = () => `<button type="button" class="icon-btn" data-close aria-label="${L('Đóng')}">${ico(ICONS.close)}</button>`;

function openResetPassword(id, name){
  openSheet(`<form id="resetForm" novalidate style="display:flex;flex-direction:column;gap:14px">
    <div class="panel-h"><h2>${L('Đặt lại mật khẩu')}</h2>${closeBtn()}</div>
    <p class="hint" style="margin:0">${L('Đặt mật khẩu tạm cho {name}. Tài khoản này sẽ bị đăng xuất khỏi mọi thiết bị.', {name:`<b>${esc(name)}</b>`})}</p>
    <div class="field"><label for="rp-pass">${L('Mật khẩu tạm mới')}</label><input class="input" id="rp-pass" type="text" autocomplete="new-password" placeholder="${L('Ít nhất 8 ký tự')}"></div>
    <div class="panel-actions"><button type="button" class="btn" data-close>${L('Hủy')}</button><button type="submit" class="btn primary">${L('Đặt lại')}</button></div>
  </form>`);
  $('#resetForm').addEventListener('submit', async e=>{ e.preventDefault();
    const p=$('#rp-pass').value; if(p.length<8){ toast(L('Mật khẩu cần ít nhất 8 ký tự')); return; }
    const btn=e.target.querySelector('button[type=submit]'); btn.disabled=true;
    try{ await FIN.updateMember(id,{password:p}); toast(L('Đã đặt lại mật khẩu cho {name}', {name})); closeSheet(); }catch(err){ toast(errMsg(err)); btn.disabled=false; }
  });
}

function openTx({kind='expense', doc=null}={}){
  const isEdit = !!doc;
  const st = { kind, cat: doc?.cat || (kind==='income'?'income':'food'), type: doc?.type || 'in' };
  const kinds = [['expense',L('Chi tiêu')],['income',L('Thu nhập')],['emergency',L('Quỹ khẩn cấp')],['savings',L('Quỹ tiết kiệm')]];
  const draw = ()=>{
    const isFund = st.kind==='emergency'||st.kind==='savings';
    if(isFund && !FUND_TYPES[st.kind][st.type]) st.type='in';
    $('#kindSeg').innerHTML = kinds.map(([k,l])=>`<button type="button" data-k="${k}" aria-pressed="${st.kind===k}" ${isEdit && k!==st.kind ?'disabled':''}>${l}</button>`).join('');
    $('#catPills').innerHTML = st.kind==='expense' ? CATS.map(c=>`<button type="button" class="pill" data-c="${c.id}" aria-pressed="${st.cat===c.id}"><i class="swatch" style="background:var(--c-${c.id})"></i>${c.name}</button>`).join('')
      : st.kind==='income' ? INCOME_CATS.map(c=>`<button type="button" class="pill" data-c="${c.id}" aria-pressed="${st.cat===c.id}">${c.name}</button>`).join('')
      : Object.entries(FUND_TYPES[st.kind]).map(([k,l])=>`<button type="button" class="pill" data-t="${k}" aria-pressed="${st.type===k}">${l}</button>`).join('');
    $('#catLabel').textContent = isFund? L('Loại giao dịch') : L('Danh mục');
  };
  const quick = [50000, 100000, 200000, 500000, 1000000, 5000000];
  openSheet(`<form id="txForm" novalidate style="display:flex;flex-direction:column;gap:16px">
    <div class="panel-h"><h2>${isEdit?L('Sửa ghi chép'):L('Ghi chép nhanh')}</h2>${closeBtn()}</div>
    <div class="seg" id="kindSeg" role="group" aria-label="${L('Loại')}"></div>
    <div class="field"><label for="f-amt">${L('Số tiền')}</label>
      <div class="amt-box"><input id="f-amt" autocomplete="off" inputmode="numeric" placeholder="0" value="${doc? vnd(doc.amount):''}"><span>₫</span></div>
      <div class="amt-prev" id="f-prev"></div>
      <div class="pills" id="quick">${quick.map(q=>`<button type="button" class="pill" data-q="${q}">+${compact(q)}</button>`).join('')}</div>
    </div>
    <div class="field"><span class="flabel" id="catLabel">${L('Danh mục')}</span><div class="pills" id="catPills"></div></div>
    <div class="row2">
      <div class="field"><label for="f-date">${L('Ngày')}</label>${dateInput('f-date', doc?.date || defaultDateISO())}</div>
      <div class="field"><label for="f-note">${L('Ghi chú')}</label><input class="input" id="f-note" value="${esc(doc?.note||'')}" placeholder="${L('vd: Đi chợ cuối tuần')}"></div>
    </div>
    ${!isEdit? `<p class="hint" style="margin:0">${L('Khoản ghi lẻ được cộng vào tổng tháng tương ứng trong mục Chi tiêu.')}</p>`:''}
    <div class="panel-actions">${isEdit?`<button type="button" class="btn danger" id="delBtn">${L('Xóa')}</button><span class="spacer"></span>`:''}<button type="button" class="btn" data-close>${L('Hủy')}</button><button type="submit" class="btn primary">${isEdit?L('Lưu thay đổi'):L('Lưu')}</button></div>
  </form>`);
  draw();
  const amt=$('#f-amt'); bindExactAmount(amt, $('#f-prev'));
  $('#kindSeg').addEventListener('click', e=>{ const b=e.target.closest('button[data-k]'); if(!b||b.disabled) return; st.kind=b.dataset.k; if(st.kind==='expense' && !CAT[st.cat]) st.cat='food'; if(st.kind==='income' && !INC[st.cat]) st.cat='income'; draw(); });
  $('#catPills').addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b) return; if(b.dataset.c) st.cat=b.dataset.c; if(b.dataset.t) st.type=b.dataset.t; draw(); });
  $('#quick').addEventListener('click', e=>{ const b=e.target.closest('button[data-q]'); if(!b) return; amt.value = I.int((readExactAmount(amt)||0) + +b.dataset.q); amt.dispatchEvent(new Event('input')); amt.focus(); });
  $('#txForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const a = readExactAmount(amt); if(!(a>0)){ toast(L('Nhập số tiền lớn hơn 0')); amt.focus(); return; }
    const date = readDate('f-date'); if(!date) return; const note=$('#f-note').value.trim();
    const isFund = st.kind==='emergency'||st.kind==='savings';
    const btn = e.submitter || $('#txForm button[type=submit]'); btn.disabled=true;
    let ok;
    if(isFund){
      const body = {date, fund:st.kind, type:st.type, amount:a, note, by: doc?.by ?? S.meId, at: doc?.at || Date.now()}; if(doc?.ref) body.ref=doc.ref;
      ok = await write(()=> doc? db.collection('fund').doc(doc.id).set(body) : db.collection('fund').add(body));
      if(ok) toast(`${isEdit?L('Đã sửa'):L('Đã lưu')}: ${FUNDS[st.kind].name} ${st.type==='out'?'−':'+'}${vnd(a)} ₫`);
    } else {
      const body = {date, kind:st.kind, cat:st.cat, amount:a, note, by: doc?.by ?? S.meId, at: doc?.at || Date.now()}; if(doc?.src) body.src=doc.src; if(doc?.expr) body.expr='';
      ok = await write(()=> doc? db.collection('tx').doc(doc.id).set(body) : db.collection('tx').add(body));
      if(ok) toast(`${isEdit?L('Đã sửa'):L('Đã lưu')}: ${st.kind==='income'?INC[st.cat].name+' +':CAT[st.cat].name+' −'}${vnd(a)} ₫`);
    }
    if(ok) closeSheet(); else btn.disabled=false;
  });
  if(isEdit) armDelete($('#delBtn'), async ()=>{ const col = (st.kind==='emergency'||st.kind==='savings')?'fund':'tx'; const ok = await write(()=>db.collection(col).doc(doc.id).delete()); if(ok) toast(L('Đã xóa ghi chép')); return ok; });
}

/** Amount in words in the current language, e.g. 2.500.000.000 → "Hai tỷ năm trăm triệu đồng". */
const readVND = n => I.words(n);
/** Put the caret back after the same number of significant characters once a value has been reformatted. */
function keepCaret(input, out, before, sig){ let p=0, c=0; while(p<out.length && c<before){ if(sig.test(out[p])) c++; p++; } try{ input.setSelectionRange(p,p); }catch(e){} }
/** Exact amount: digits only, thousand separators shown while typing (2.500.000). Returns the number. */
function formatExact(input){
  const raw = input.value, pos = input.selectionStart ?? raw.length;
  const digits = raw.replace(/\D/g,'').replace(/^0+(?=\d)/,'').slice(0,15);
  const out = digits? I.int(+digits) : '';
  if(out!==raw){ const before = raw.slice(0,pos).replace(/\D/g,'').length; input.value = out; keepCaret(input, out, before, /\d/); }
  return digits? +digits : NaN;
}
const exactPreview = n => n>0 ? `= ${vnd(n)} ₫ · <span class="words">${esc(readVND(n))}</span>` : L('Nhập đầy đủ số tiền đến hàng đơn vị, ví dụ {ex}', {ex:I.int(2500000000)});
/** Exact amount field in a sheet: formats while typing and reads the amount out in words. */
function bindExactAmount(input, prev, onChange){
  const upd = ()=>{ const n = formatExact(input); if(prev){ prev.innerHTML = exactPreview(n); prev.classList.remove('bad'); } if(onChange) onChange(n); };
  input.addEventListener('input', upd); upd();
}
/** Monthly figures keep their shorthand (12tr, 250k+300k); plain numbers get separators while typing. */
function liveGroup(input){
  const raw = input.value, pos = input.selectionStart ?? raw.length; let changed = false;
  const out = raw.split('+').map(p=>{ const t=p.trim(); if(!/^[\d.,]+$/.test(t)) return p;
    const d = t.replace(/[.,]/g,'').replace(/^0+(?=\d)/,'').slice(0,15); if(!d) return p;
    const g = I.int(+d); if(g!==p) changed = true; return g; }).join('+');
  if(!changed) return;
  const before = raw.slice(0,pos).replace(/[^\d+]/g,'').length; input.value = out; keepCaret(input, out, before, /[\d+]/);
}
const readExactAmount = el => { const d = String(el.value).replace(/\D/g,''); return d? +d : NaN; };
const depMaturity = d => d.maturity || addMonths(d.start, +d.term||1);

function openDeposit(doc=null){
  const curKey = doc? bankKey(doc.bank) : null;
  const other = doc && doc.bank && !curKey;
  const opts = Object.entries(BANK_GROUPS).map(([g,label])=>`<optgroup label="${label}">${Object.entries(BANKS).filter(([,b])=>b.g===g).sort((a,b)=>a[1].ab.localeCompare(b[1].ab)).map(([k,b])=>`<option value="${k}" ${k===curKey?'selected':''}>${b.ab} · ${esc(b.name)}</option>`).join('')}</optgroup>`).join('');
  const suggested0 = doc? addMonths(doc.start, +doc.term||1) : addMonths(defaultDateISO(), 12);
  let matManual = !!(doc?.maturity && doc.maturity!==suggested0);
  openSheet(`<form id="depForm" novalidate style="display:flex;flex-direction:column;gap:14px">
    <div class="panel-h"><h2>${doc?L('Sửa sổ tiết kiệm'):L('Thêm sổ tiết kiệm')}</h2>${closeBtn()}</div>
    <div class="row2">
      <div class="field"><label for="d-bank">${L('Ngân hàng')}</label>
        <div class="bank-pick"><span id="d-bank-badge">${bankBadge(doc?.bank||'vcb','sm')}</span><select class="input" id="d-bank"><option value="" ${!doc?'selected':''} disabled>${L('Chọn ngân hàng…')}</option>${opts}<option value="__other" ${other?'selected':''}>${L('Ngân hàng khác (tự nhập)…')}</option></select></div>
        <input class="input" id="d-bank-other" value="${other?esc(doc.bank):''}" placeholder="${L('Tên ngân hàng')}" ${other?'':'hidden'} style="margin-top:6px" maxlength="40">
        <span class="hint" id="d-bank-full">${curKey? esc(BANKS[curKey].full) : ''}</span></div>
      <div class="field"><label for="d-label">${L('Tên sổ')}</label><input class="input" id="d-label" value="${esc(doc?.label||'')}" placeholder="${L('vd: Sổ học phí')}"></div>
    </div>
    <div class="field"><label for="d-amt">${L('Số tiền gửi (₫)')}</label><div class="amt-box"><input id="d-amt" inputmode="numeric" autocomplete="off" value="${doc?vnd(doc.amount):''}" placeholder="${I.int(2500000000)}"><span>₫</span></div><div class="amt-prev" id="d-prev"></div></div>
    <div class="row2">
      <div class="field"><label for="d-term">${L('Kỳ hạn')}</label><select class="input" id="d-term">${[1,2,3,6,9,12,13,15,18,24,36,48,60].map(t=>`<option value="${t}" ${(+doc?.term||12)===t?'selected':''}>${L('{n} tháng', {n:t})}</option>`).join('')}</select></div>
      <div class="field"><label for="d-rate">${L('Lãi suất (%/năm)')}</label><input class="input num" id="d-rate" inputmode="decimal" value="${doc? I.decIn(doc.rate):''}" placeholder="${L('vd: 4,6')}"></div>
    </div>
    <div class="row2">
      <div class="field"><label for="d-start">${L('Ngày gửi')}</label>${dateInput('d-start', doc?.start||defaultDateISO())}</div>
      <div class="field"><label for="d-mat">${L('Ngày đáo hạn')}</label>${dateInput('d-mat', doc? depMaturity(doc) : suggested0)}
        <span class="hint" id="d-mat-hint"></span></div>
    </div>
    <div class="row2">
      <div class="field"><label for="d-status">${L('Trạng thái')}</label><select class="input" id="d-status"><option value="active" ${!isClosed(doc||{})?'selected':''}>${L('Đang gửi')}</option><option value="closed" ${isClosed(doc||{})?'selected':''}>${L('Đã tất toán')}</option></select></div>
      <div class="field"><label for="d-note">${L('Ghi chú / nguồn')}</label><input class="input" id="d-note" value="${esc(doc?.note||'')}" placeholder="${L('vd: Từ lương thưởng Tết')}"></div>
    </div>
    <div class="panel-actions">${doc?`<button type="button" class="btn danger" id="delBtn">${L('Xóa')}</button><span class="spacer"></span>`:''}<button type="button" class="btn" data-close>${L('Hủy')}</button><button type="submit" class="btn primary">${L('Lưu sổ')}</button></div>
  </form>`);
  bindExactAmount($('#d-amt'),$('#d-prev'));
  const bankSel = $('#d-bank');
  const updBank = ()=>{ const v = bankSel.value; const isOther = v==='__other'; $('#d-bank-other').hidden = !isOther;
    $('#d-bank-badge').innerHTML = isOther? bankBadge($('#d-bank-other').value||L('Khác'),'sm') : v? bankBadge(v,'sm') : '';
    $('#d-bank-full').textContent = BANKS[v]? BANKS[v].full : isOther? L('Nhập tên ngân hàng chưa có trong danh sách') : '';
    if(isOther && document.activeElement===bankSel) $('#d-bank-other').focus(); };
  bankSel.addEventListener('change', updBank); $('#d-bank-other').addEventListener('input', updBank); updBank();
  // Maturity: suggested from the term, but the user's own date wins once edited.
  const suggest = ()=>{ const s=parseDMY($('#d-start').value); return s? addMonths(s, +$('#d-term').value) : null; };
  const updMat = ()=>{
    const sug = suggest(), cur = parseDMY($('#d-mat').value);
    if(!matManual && sug) $('#d-mat').value = fmtDate(sug);
    const shown = parseDMY($('#d-mat').value);
    $('#d-mat-hint').innerHTML = !sug? '' : shown===sug ? L('Theo kỳ hạn {n} tháng. Có thể sửa theo ngày thực tế trên sổ.', {n:$('#d-term').value})
      : `${L('Theo kỳ hạn:')} <b class="num">${fmtDate(sug)}</b> · <button type="button" class="btn xs ghost" id="d-mat-reset">${L('Dùng ngày này')}</button>`;
    $('#d-mat-reset')?.addEventListener('click', ()=>{ matManual=false; updMat(); });
  };
  $('#d-start').addEventListener('input', updMat); $('#d-term').addEventListener('change', updMat);
  $('#d-mat').addEventListener('input', ()=>{ matManual=true; updMat(); });
  updMat();
  $('#depForm').addEventListener('submit', async e=>{ e.preventDefault();
    const bank = bankSel.value==='__other' ? $('#d-bank-other').value.trim() : bankSel.value;
    if(!bank){ toast(L('Chọn ngân hàng')); bankSel.focus(); return; }
    const amount = readExactAmount($('#d-amt')); if(!(amount>0)){ toast(L('Nhập đầy đủ số tiền gửi')); $('#d-amt').focus(); return; }
    const rate = parseDecimal($('#d-rate').value); if(!(rate>=0)){ toast(L('Nhập lãi suất, ví dụ 4,6')); $('#d-rate').focus(); return; }
    const start = readDate('d-start'); if(!start) return;
    const maturity = readDate('d-mat'); if(!maturity) return;
    if(maturity<=start){ toast(L('Ngày đáo hạn phải sau ngày gửi')); $('#d-mat').setAttribute('aria-invalid','true'); $('#d-mat').focus(); return; }
    const status = $('#d-status').value;
    const body={bank, label:$('#d-label').value.trim(), amount, rate, term:+$('#d-term').value, start, maturity, status, note:$('#d-note').value.trim(), at:doc?.at||Date.now()};
    if(status==='closed') body.closedAt = doc?.closedAt || todayISO();
    if(await write(()=> doc? db.collection('deposits').doc(doc.id).set(body) : db.collection('deposits').add(body))){ toast(L('Đã lưu sổ tiết kiệm')); closeSheet(); }
  });
  if(doc) armDelete($('#delBtn'), async ()=>{ const ok=await write(()=>db.collection('deposits').doc(doc.id).delete()); if(ok) toast(L('Đã xóa sổ')); return ok; });
}

/** Withdraw (part of) a month's surplus as cash instead of moving it to the emergency fund. */
function openWithdraw(max){
  const y=S.year, m=S.month, key=ymKey(y,m);
  openSheet(`<form id="wdForm" novalidate style="display:flex;flex-direction:column;gap:14px">
    <div class="panel-h"><h2>${L('Rút tiền thặng dư {month}', {month:monthIn(y,m)})}</h2>${closeBtn()}</div>
    <p class="hint" style="margin:0">${L('Ghi nhận khoản thặng dư đã rút ra dùng, không chuyển vào Quỹ khẩn cấp. Thặng dư tháng này: {v} ₫.', {v:`<b class="num">${vnd(max)}</b>`})}</p>
    <div class="field"><label for="w-amt">${L('Số tiền rút')}</label><div class="amt-box"><input id="w-amt" inputmode="numeric" autocomplete="off" value="${vnd(max)}"><span>₫</span></div><div class="amt-prev" id="w-prev"></div></div>
    <div class="field"><label for="w-note">${L('Ghi chú')}</label><input class="input" id="w-note" maxlength="200" placeholder="${L('vd: Rút tiền mặt chi tiêu gia đình')}"></div>
    <div class="panel-actions"><button type="button" class="btn" data-close>${L('Hủy')}</button><button type="submit" class="btn primary">${L('Xác nhận rút tiền')}</button></div>
  </form>`);
  bindExactAmount($('#w-amt'), $('#w-prev'));
  $('#wdForm').addEventListener('submit', async e=>{ e.preventDefault();
    const a = readExactAmount($('#w-amt'));
    if(!(a>0)){ toast(L('Nhập số tiền lớn hơn 0')); $('#w-amt').focus(); return; }
    if(a>max){ toast(L('Số tiền rút không vượt quá thặng dư {v} ₫', {v:vnd(max)})); $('#w-amt').focus(); return; }
    const btn=e.target.querySelector('button[type=submit]'); btn.disabled=true;
    const body = {...(S.months[key]||{}), withdrawn:{amount:a, note:$('#w-note').value.trim(), date:todayISO(), by:S.meId, at:Date.now()}};
    if(await write(()=>db.collection('months').doc(key).set(body))){ toast(L('Đã ghi nhận rút {v} ₫', {v:vnd(a)})); closeSheet(); } else btn.disabled=false;
  });
}

function openLot(doc=null, productId=null){
  const plist = products();
  if(!plist.length){ toast(L('Tạo sản phẩm đầu tư trước, rồi thêm giao dịch.')); openProduct(); return; }
  const pid = doc? (doc.product||LEGACY_PRODUCT) : (productId || S.product || plist[0].id);
  const prod = plist.find(p=>p.id===pid) || plist[0];
  const side0 = doc?.side==='sell' ? 'sell' : 'buy';
  const price0 = doc?.price || prod.price || '';
  openSheet(`<form id="lotForm" novalidate style="display:flex;flex-direction:column;gap:14px">
    <div class="panel-h"><h2>${doc?L('Sửa giao dịch'):L('Thêm giao dịch đầu tư')}</h2>${closeBtn()}</div>
    <div class="field"><label for="l-prod">${L('Sản phẩm')}</label><select class="input" id="l-prod">${plist.map(p=>`<option value="${esc(p.id)}" ${p.id===prod.id?'selected':''}>${esc(productLabel(p))}${p.manager?' · '+esc(L(p.manager)):''}</option>`).join('')}</select>
      <span class="hint">${L('Chưa có quỹ cần nhập?')} <button type="button" class="btn xs ghost" id="l-newprod">${L('Thêm sản phẩm mới')}</button></span></div>
    <div class="typeseg" role="radiogroup" aria-label="${L('Loại giao dịch')}">
      <label><input type="radio" name="l-side" value="buy" ${side0==='buy'?'checked':''}><span>${L('Mua')}</span></label>
      <label><input type="radio" name="l-side" value="sell" ${side0==='sell'?'checked':''}><span class="out">${L('Bán / rút')}</span></label>
    </div>
    <div class="row2">
      <div class="field"><label for="l-date">${L('Ngày giao dịch')}</label>${dateInput('l-date', doc?.date||defaultDateISO())}</div>
      <div class="field"><label for="l-price">${L('Giá / đơn vị')}</label><input class="input num" id="l-price" inputmode="decimal" value="${price0? I.decIn(price0):''}" placeholder="${L('vd: 13732,75')}"></div>
    </div>
    <div class="field"><label for="l-amt">${L('Số tiền giao dịch')}</label><div class="amt-box"><input id="l-amt" autocomplete="off" inputmode="numeric" value="${doc? vnd((+doc.units)*(+doc.price)) : ''}" placeholder="${I.int(10000000)}"><span>₫</span></div><div class="amt-prev" id="l-prev"></div></div>
    <div class="row2">
      <div class="field"><label for="l-units">${L('Số lượng')}</label><input class="input num" id="l-units" inputmode="decimal" value="${doc? I.decIn(doc.units):''}"><span class="hint">${L('Tự tính = số tiền ÷ giá. Sửa theo sao kê nếu khác.')}</span></div>
      <div class="field"><label for="l-fee">${L('Phí giao dịch (nếu có)')}</label><input class="input num" id="l-fee" inputmode="numeric" autocomplete="off" value="${doc?.fee? vnd(doc.fee):''}" placeholder="0"></div>
    </div>
    <div class="field"><label for="l-note">${L('Ghi chú')}</label><input class="input" id="l-note" value="${esc(doc?.note||'')}" placeholder="${L('vd: Mua định kỳ tháng 10')}"></div>
    <p class="hint" style="margin:0" id="l-sellhint" ${side0==='sell'?'':'hidden'}>${L('Khi bán, lãi/lỗ đã chốt được tính theo giá vốn bình quân của sản phẩm.')}</p>
    <div class="panel-actions">${doc && S.isOwner?`<button type="button" class="btn danger" id="delBtn">${L('Xóa')}</button><span class="spacer"></span>`:''}<button type="button" class="btn" data-close>${L('Hủy')}</button><button type="submit" class="btn primary">${L('Lưu giao dịch')}</button></div>
  </form>`);
  const calc=()=>{ const a=readExactAmount($('#l-amt')), p=parseDecimal($('#l-price').value); if(a>0&&p>0) $('#l-units').value=I.decIn(Math.floor(a/p*100)/100); };
  bindExactAmount($('#l-amt'), $('#l-prev'), calc); bindExactAmount($('#l-fee'));
  $('#l-price').addEventListener('input',calc);
  $('#l-prod').addEventListener('change', ()=>{ const p = products().find(x=>x.id===$('#l-prod').value); if(p?.price && !doc){ $('#l-price').value=I.decIn(p.price); calc(); } });
  $('#l-newprod').addEventListener('click', ()=>openProduct());
  $$('#lotForm input[name=l-side]').forEach(r=>r.addEventListener('change', ()=>{ $('#l-sellhint').hidden = $('#lotForm input[name=l-side]:checked').value!=='sell'; }));
  $('#lotForm').addEventListener('submit', async e=>{ e.preventDefault();
    const product=$('#l-prod').value, side=$('#lotForm input[name=l-side]:checked').value;
    const price=parseDecimal($('#l-price').value), units=parseDecimal($('#l-units').value);
    const fee = $('#l-fee').value.trim()? readExactAmount($('#l-fee')) : 0;
    if(!(price>0)||!(units>0)){ toast(L('Nhập giá và số lượng lớn hơn 0')); return; }
    if(isNaN(fee)||fee<0){ toast(L('Phí giao dịch chưa hợp lệ')); return; }
    if(side==='sell'){ const p = products().find(x=>x.id===product); const held = productStats(p).units + (doc && doc.side==='sell' && (doc.product||LEGACY_PRODUCT)===product ? +doc.units||0 : 0) - (doc && doc.side!=='sell' && (doc.product||LEGACY_PRODUCT)===product ? +doc.units||0 : 0);
      if(units > held + 1e-6){ toast(L('Chỉ đang nắm giữ {n} {unit}', {n:fmtUnits(held), unit:unitLabel(p.unit)})); return; } }
    const lotDate = readDate('l-date'); if(!lotDate) return;
    const body={product, side, date:lotDate, price, units, fee, note:$('#l-note').value.trim(), at:doc?.at||Date.now()};
    if(await write(()=> doc? db.collection('vcbf').doc(doc.id).set(body) : db.collection('vcbf').add(body))){ S.product=product; toast(side==='sell'? L('Đã lưu giao dịch bán') : L('Đã lưu giao dịch mua')); closeSheet(); }
  });
  if(doc && S.isOwner) armDelete($('#delBtn'), async ()=>{ const ok=await write(()=>db.collection('vcbf').doc(doc.id).delete()); if(ok) toast(L('Đã xóa giao dịch')); return ok; });
}

function openProduct(doc=null){
  const hasLots = doc && S.vcbf.some(l=>(l.product||LEGACY_PRODUCT)===doc.id);
  openSheet(`<form id="prodForm" novalidate style="display:flex;flex-direction:column;gap:14px">
    <div class="panel-h"><h2>${doc?L('Sửa sản phẩm đầu tư'):L('Thêm sản phẩm đầu tư')}</h2>${closeBtn()}</div>
    <div class="row2">
      <div class="field"><label for="p-code">${L('Mã sản phẩm')}</label><input class="input" id="p-code" value="${esc(doc?.code||'')}" placeholder="${L('vd: VCBF-TBF, DCDS, VNM')}" maxlength="24"></div>
      <div class="field"><label for="p-manager">${L('Công ty quản lý / nơi mua')}</label><input class="input" id="p-manager" list="managerList" value="${esc(doc?.manager||'')}" placeholder="${L('vd: VCBF')}"><datalist id="managerList">${MANAGERS.map(m=>`<option value="${esc(m)}" label="${esc(L(m))}">`).join('')}</datalist></div>
    </div>
    <div class="field"><label for="p-name">${L('Tên đầy đủ')}</label><input class="input" id="p-name" value="${esc(doc?.name||'')}" placeholder="${L('vd: Quỹ Đầu tư Trái phiếu VCBF')}" maxlength="120"></div>
    <div class="row2">
      <div class="field"><label for="p-type">${L('Loại')}</label><select class="input" id="p-type">${Object.entries(PRODUCT_TYPES).map(([k,l])=>`<option value="${k}" ${(doc?.type||'equity')===k?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="p-mode">${L('Hình thức')}</label><select class="input" id="p-mode">${Object.entries(PRODUCT_MODES).map(([k,l])=>`<option value="${k}" ${(doc?.mode||'sip')===k?'selected':''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="row2">
      <div class="field"><label for="p-price">${L('Giá hiện tại / đơn vị')}</label><input class="input num" id="p-price" inputmode="decimal" value="${doc?.price? I.decIn(doc.price):''}" placeholder="${L('vd: 10250,5')}"></div>
      <div class="field"><label for="p-unit">${L('Đơn vị')}</label><input class="input" id="p-unit" list="unitList" value="${esc(doc?.unit||'CCQ')}" maxlength="12"><datalist id="unitList">${['CCQ','cổ phiếu','chỉ','lượng','đơn vị'].map(u=>`<option value="${esc(u)}" label="${esc(unitLabel(u))}">`).join('')}</datalist></div>
    </div>
    <div class="field"><label for="p-note">${L('Ghi chú')}</label><input class="input" id="p-note" value="${esc(doc?.note||'')}" placeholder="${L('vd: Mua định kỳ 10tr/tháng cho Dâu')}"></div>
    <div class="panel-actions">${doc && !doc._virtual? `<button type="button" class="btn danger" id="delBtn" ${hasLots?`disabled title="${L('Xóa các giao dịch của sản phẩm trước')}"`:''}>${L('Xóa')}</button><span class="spacer"></span>`:''}<button type="button" class="btn" data-close>${L('Hủy')}</button><button type="submit" class="btn primary">${L('Lưu sản phẩm')}</button></div>
  </form>`);
  $('#prodForm').addEventListener('submit', async e=>{ e.preventDefault();
    const code=$('#p-code').value.trim(); if(!code){ toast(L('Nhập mã sản phẩm')); $('#p-code').focus(); return; }
    const price = $('#p-price').value.trim()? parseDecimal($('#p-price').value) : 0;
    if(isNaN(price)||price<0){ toast(L('Giá chưa hợp lệ. Ví dụ: 13732,75')); return; }
    const body={code, name:$('#p-name').value.trim(), manager:$('#p-manager').value.trim(), type:$('#p-type').value, mode:$('#p-mode').value, unit:$('#p-unit').value.trim()||'đơn vị',
      price, priceDate: price && price!==(+doc?.price||0) ? todayISO() : (doc?.priceDate||''), note:$('#p-note').value.trim(), at:doc?.at||Date.now()};
    let newId = doc?.id;
    const ok = await write(async ()=>{ if(doc) await db.collection('products').doc(doc.id).set(body); else { const ref = await db.collection('products').add(body); newId = ref.id; } });
    if(ok){ S.product = newId; toast(L('Đã lưu {code}', {code})); closeSheet(); }
  });
  if(doc && !doc._virtual && !hasLots) armDelete($('#delBtn'), async ()=>{ const ok=await write(()=>db.collection('products').doc(doc.id).delete()); if(ok){ S.product=null; toast(L('Đã xóa sản phẩm')); } return ok; });
}

/* =========================================================
   Export
   ========================================================= */
async function exportData(kind){
  const dl = window.claude?.use ? await claude.use('downloads') : null;
  if(!dl){ toast(L('Không tải được tệp trên trình duyệt này.')); return; }
  const csv = rows => '﻿'+rows.map(r=>r.map(v=>{ const s=String(v??''); return /[",\n;]/.test(s)? '"'+s.replace(/"/g,'""')+'"' : s; }).join(',')).join('\n');
  let filename, data;
  if(kind==='tx'){ filename=L('thu-chi-gia-dinh.csv'); data=csv([[L('Ngày'),L('Loại'),L('Danh mục'),L('Số tiền (VND)'),L('Ghi chú')], ...[...S.tx].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(t=>[fmtDate(t.date), t.kind==='income'?L('Thu'):L('Chi'), txLabel(t), Math.round(t.amount), t.note||''])]); }
  else if(kind==='fund'){ filename=L('so-quy-gia-dinh.csv'); data=csv([[L('Ngày'),L('Quỹ'),L('Loại'),L('Số tiền (VND)'),L('Ghi chú')], ...[...S.fund].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(e=>[fmtDate(e.date), FUNDS[e.fund]?.name||e.fund, fundTypeLabel(e.fund,e.type), Math.round(e.amount), e.note||''])]); }
  else { filename='sao-luu-tai-chinh-'+todayISO()+'.json'; data=JSON.stringify({exportedAt:new Date().toISOString(), config:S.cfg, tx:S.tx, fund:S.fund, deposits:S.deposits, vcbf:S.vcbf, products:S.products, months:S.months},null,2); }
  try{ await dl.save({filename, data}); toast(L('Đã tải {file}', {file:filename})); }
  catch(e){ if(e?.code==='declined') return; toast(L('Không tải được tệp.')); }
}

/* =========================================================
   Boot
   ========================================================= */
async function boot(){
  try{ const sy=+sessionStorage.getItem('stc.year'); if(sy){ S.year=sy; S.month=refMonth(sy); } }catch(e){}
  $('#yearSel')?.addEventListener('change', e=>setYear(+e.target.value));
  route();
  if(!window.claude?.use){ S.conn='off'; render(); return; }
  const [d,u] = await Promise.all([claude.use('db'), claude.use('user')]);
  db=d; user=u;
  if(!db){ S.conn='off'; render(); return; }
  S.conn='on';
  if(user){
    try{ S.meId = await user.id(); }catch(e){}
    try{ const w = await user.can('data.write'); if(w===false) S.canWrite=false; }catch(e){}
    S.isOwner = window.FIN?.session()?.role==='owner';
    try{ const me = await user.me(); const role = window.FIN?.session()?.role;
      $('#meBox').innerHTML = `<img alt="" src="${esc(me.avatarUrl)}"><div style="min-width:0;flex:1"><b class="me-name"></b><span class="me-role">${ROLE_LABEL[role]||''}</span></div><button class="icon-btn" type="button" id="logoutBtn" aria-label="Đăng xuất" title="Đăng xuất" data-i18n-attr="aria-label,title">${ico('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>')}</button>`;
      I.apply($('#meBox'));
      $('#meBox .me-name').textContent = me.name || L('Bạn');
      $('#logoutBtn').addEventListener('click', ()=>FIN.logout());
    }catch(e){}
  }
  if(window.FIN){
    FIN.onMembers(list=>{ S.members=list; scheduleRender(); });
    FIN.onConnection(on=>{ S.conn = on? 'on' : 'pending'; scheduleRender(); });
  }
  const onErr = e => { if(e && (e.code==='revoked'||e.code==='not_granted')){ S.conn='off'; scheduleRender(); } };
  const listen = name => db.collection(name).onSnapshot(snap=>{ S[name]=snap.docs.map(x=>({id:x.id, ...x.data()})); S.loaded[name]=true; scheduleRender(); }, onErr);
  listen('tx'); listen('fund'); listen('deposits'); listen('vcbf'); listen('products');
  try{ const r = await fetch('/api/bank-logos',{credentials:'same-origin'}); if(r.ok){ BANK_LOGOS=(await r.json()).logos||{}; scheduleRender(); } }catch(e){}
  db.collection('months').onSnapshot(snap=>{ const o={}; snap.docs.forEach(x=>o[x.id]=x.data()); S.months=o; S.loaded.months=true; scheduleRender(); }, onErr);
  db.doc('config/main').onSnapshot(snap=>{ S.cfgExists=snap.exists; S.cfg = snap.exists? snap.data() : null; S.loaded.cfg=true; scheduleRender(); }, onErr);
}
boot();
