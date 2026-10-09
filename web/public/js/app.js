'use strict';
/* =========================================================
   Sổ Tài Chính Gia Đình — app
   Every number on every screen is derived from the same store (tx, fund, deposits, vcbf, months, config),
   so sub-pages and the overview always agree and update live together.
   ========================================================= */

/* ---------- constants ---------- */
const CATS = [
  {id:'mgmt',      name:'Phí quản lý',           ab:'QL'},
  {id:'util',      name:'Điện, nước, wifi',      ab:'ĐN'},
  {id:'helper',    name:'Giúp việc, dọn dẹp',    ab:'GV'},
  {id:'transport', name:'Đi lại',                ab:'ĐL'},
  {id:'food',      name:'Ăn uống & sinh hoạt',   ab:'ĂU'},
  {id:'other',     name:'Mua sắm, sửa chữa',     ab:'MS'},
  {id:'kids',      name:'Bỉm sữa, khám cho con', ab:'BS'},
];
const CAT = Object.fromEntries(CATS.map(c=>[c.id,c]));
const INCOME_CATS = [
  {id:'income', name:'Thu nhập tháng'},
  {id:'salary', name:'Lương'},
  {id:'bonus',  name:'Thưởng'},
  {id:'side',   name:'Thu nhập phụ'},
];
const INC = Object.fromEntries(INCOME_CATS.map(c=>[c.id,c]));
const FUNDS = {
  savings:   {name:'Sổ tiết kiệm',          short:'Tiết kiệm'},
  kids:      {name:'Quỹ cho con',           short:'Cho con'},
  risk:      {name:'Đầu tư rủi ro cao',     short:'Đầu tư'},
  emergency: {name:'Quỹ khẩn cấp',          short:'Khẩn cấp'},
};
const FUND_TYPES = {
  savings:   {in:'Nạp vào', out:'Rút ra', interest:'Nhận lãi'},
  emergency: {in:'Thu vào', out:'Chi ra'},
};
const fundTypeLabel = (f,t) => FUND_TYPES[f]?.[t] || ({in:'Thu vào',out:'Chi ra',interest:'Nhận lãi'})[t] || t;
const EMERGENCY_MIN = 3;
/* Banks operating in Vietnam. `ab` is the 3-letter mark shown on badges: the stock ticker for listed banks,
   otherwise the bank's common short code. Colours approximate each brand; an official logo file in
   /banks/<key>.svg replaces the badge. */
const BANK_GROUPS = {state:'Ngân hàng thương mại có vốn Nhà nước', jsc:'Ngân hàng TMCP', foreign:'Ngân hàng 100% vốn nước ngoài & liên doanh', policy:'Ngân hàng chính sách & hợp tác'};
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
  return `<span class="bk ${size}" style="--b1:var(--ink-2);--b2:var(--muted)" title="${esc(name||'Khác')}">${esc(noAccent(name||'khac').replace(/[^a-z0-9]/gi,'').slice(0,3).toUpperCase()||'—')}</span>`;
}
const bankName = name => { const k=bankKey(name); return k? BANKS[k].name : (String(name||'').trim()||'Khác'); };
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
];
const VIEWS = {
  overview:  {group:'overview', title:'Tài sản gia đình'},
  spending:  {group:'spending', title:'Chi tiêu sinh hoạt'},
  invest:    {group:'invest',   title:'Tiết kiệm & đầu tư', sub:'Tổng hợp thông tin'},
  deposits:  {group:'invest',   title:'Sổ tiết kiệm'},
  emergency: {group:'invest',   title:'Quỹ khẩn cấp'},
  kids:      {group:'invest',   title:'Quỹ cho con'},
  settings:  {group:'settings', title:'Thiết lập & dữ liệu'},
};
const INVEST_TABS = [['invest','Tổng hợp thông tin'],['deposits','Sổ tiết kiệm'],['emergency','Quỹ khẩn cấp'],['kids','Quỹ cho con']];
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
  conn:'pending', canWrite:true, meId:null,
  drafts:{}, openInsights:new Set(),
};
let db=null, user=null;

/* ---------- helpers ---------- */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf = new Intl.NumberFormat('vi-VN');
const vnd = n => nf.format(Math.round(n||0));
function compact(n){
  n = +n||0; const a=Math.abs(n), s=n<0?'−':'';
  if(a>=1e9) return s+(a/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ';
  if(a>=1e6) return s+(a/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' tr';
  if(a>=1e3) return s+Math.round(a/1e3)+'k';
  return s+Math.round(a);
}
const pct = (x,d=1) => (!isFinite(x)? '—' : (x>=0?'+':'−')+Math.abs(x*100).toLocaleString('vi-VN',{minimumFractionDigits:d,maximumFractionDigits:d})+'%');
const pctPlain = (x,d=1) => (!isFinite(x)? '—' : (x*100).toLocaleString('vi-VN',{minimumFractionDigits:d,maximumFractionDigits:d})+'%');
const signed = n => (n>0?'+':n<0?'−':'')+vnd(Math.abs(n));
const signedC = n => (n>0?'+':n<0?'−':'')+compact(Math.abs(n));
const fmt1 = n => (+n||0).toLocaleString('vi-VN',{maximumFractionDigits:1});
const pad = n => String(n).padStart(2,'0');
const toISO = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const todayISO = () => toISO(new Date());
const fmtDate = iso => iso ? iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4) : '—';
const fmtDateTime = d => pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
function parseDMY(str){ const m=String(str||'').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/); if(!m) return null;
  const dt=new Date(+m[3],+m[2]-1,+m[1]); return (dt.getFullYear()===+m[3] && dt.getMonth()===+m[2]-1 && dt.getDate()===+m[1]) ? toISO(dt) : null; }
/** Date input that always reads/writes DD/MM/YYYY; the calendar button opens the browser picker. */
function dateInput(id, val, attrs=''){ const shown = /^\d{4}-\d{2}-\d{2}$/.test(val||'')? fmtDate(val) : (val||'');
  return `<div class="date-box"><input class="input num" id="${id}" data-date inputmode="numeric" autocomplete="off" placeholder="DD/MM/YYYY" maxlength="10" value="${esc(shown)}" ${attrs}><button type="button" class="date-btn" data-pick="${id}" aria-label="Chọn ngày trên lịch">${ico(ICONS.cal)}</button><input type="date" class="date-native" tabindex="-1" aria-hidden="true" data-native-for="${id}"></div>`; }
function readDate(id){ const el=document.getElementById(id); const v=parseDMY(el?.value); if(!v && el){ el.setAttribute('aria-invalid','true'); el.focus(); toast('Ngày chưa đúng định dạng DD/MM/YYYY'); } return v; }
function parseISO(s){ const [y,m,d]=String(s).split('-').map(Number); return new Date(y,(m||1)-1,d||1); }
function addMonths(iso,n){ const d=parseISO(iso); const day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n); const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(day,last)); return toISO(d); }
const daysBetween = (a,b) => Math.round((parseISO(b)-parseISO(a))/86400000);
const ymKey = (y,m) => y+'-'+pad(m);
const lastDayISO = (y,m) => toISO(new Date(y,m,0));
const monthLabel = (y,m) => 'Tháng '+m+'/'+y;
const sum = (arr,f=x=>x) => arr.reduce((s,x)=>s+(+f(x)||0),0);
function niceMax(v){ if(v<=0) return 1; const p=10**Math.floor(Math.log10(v)); const n=v/p; return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p; }
const ico = (paths,cls='ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const normCat = c => CAT[c]? c : 'other';
const isClosed = d => d.status==='closed';

/* Vietnamese shorthand: 250k, 1tr2, 2.5tr, 1ty5, 150k+80k+1tr */
function parseAmount(str){
  let s = String(str??'').toLowerCase().replace(/\s+/g,'').replace(/₫|vnđ|vnd|đ/g,'');
  if(!s) return NaN;
  const units = {'tỷ':1e9,ty:1e9,b:1e9,'triệu':1e6,trieu:1e6,tr:1e6,m:1e6,'nghìn':1e3,nghin:1e3,k:1e3,n:1e3};
  let total = 0;
  for(const p of s.split('+')){
    if(!p) return NaN;
    const m = p.match(/^(\d+(?:[.,]\d+)?)(tỷ|ty|b|triệu|trieu|tr|m|nghìn|nghin|k|n)(\d*)$/);
    if(m){ const u = units[m[2]]; let v = parseFloat(m[1].replace(',','.'))*u; if(m[3]) v += parseFloat('0.'+m[3])*u; total += v; continue; }
    if(/^\d{1,3}([.,]\d{3})+$/.test(p) || /^\d+$/.test(p)){ total += parseInt(p.replace(/[.,]/g,''),10); continue; }
    return NaN;
  }
  return Math.round(total);
}
function parseDecimal(str){ const s=String(str??'').trim().replace(/\s/g,''); if(!s) return NaN;
  if(/,\d+$/.test(s)) return parseFloat(s.replace(/\./g,'').replace(',','.'));
  return parseFloat(s.replace(/,/g,'')); }
const cfg = () => ({...DEFAULT_CFG, ...(S.cfg||{}), openings:{...DEFAULT_CFG.openings, ...((S.cfg||{}).openings||{})}, budgets:{...((S.cfg||{}).budgets||{})}, emergencyHistory:{...((S.cfg||{}).emergencyHistory||{})}});

let toastT;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2800); }
function errMsg(e){
  const c = e && e.code;
  if(e && e.message && /[À-ỹ]/.test(e.message) && c!=='unavailable') return e.message;
  if(c==='permission_denied') return 'Tài khoản của bạn không có quyền thực hiện thao tác này.';
  if(c==='invalid_argument') return 'Không lưu được: dữ liệu chưa hợp lệ.';
  if(c==='resource_exhausted') return 'Thao tác quá nhanh. Đợi vài giây rồi thử lại.';
  if(c==='revoked') return 'Phiên đăng nhập đã thay đổi. Tải lại trang.';
  return 'Không lưu được. Kiểm tra kết nối rồi thử lại.';
}
async function write(fn){
  if(!db){ toast('Chưa kết nối được máy chủ. Kiểm tra mạng rồi tải lại trang.'); return false; }
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
  if(rows.length){ const o=rows[rows.length-1], l=rows[0]; return {avg: sum(rows,r=>r.exp)/rows.length, n:rows.length, basis:`${rows.length} tháng gần nhất có số liệu (${pad(o.m)}/${o.y} – ${pad(l.m)}/${l.y})`}; }
  const p = yearSummary(curYear()-1); if(p) return {avg:p.exp/p.months, n:p.months, basis:'năm '+(curYear()-1)};
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
const PRODUCT_TYPES = {equity:'Quỹ cổ phiếu', bond:'Quỹ trái phiếu', balanced:'Quỹ cân bằng', stock:'Cổ phiếu', gold:'Vàng', other:'Khác'};
const PRODUCT_MODES = {sip:'Định kỳ (SIP)', lump:'Mua một lần'};
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
const productLabel = p => p.code || p.name || 'Sản phẩm';
const fmtUnits = u => (+u||0).toLocaleString('vi-VN',{maximumFractionDigits:2});
const fmtPrice = p => (+p||0).toLocaleString('vi-VN',{maximumFractionDigits:2});
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
  if(await saveCfg({navHistory:{...c.navHistory,[py]:Math.round(est.total)}, navParts:{...(c.navParts||{}),[py]:est.parts}})) toast(`Đã chốt tài sản ròng cuối năm ${py}: ${vnd(est.total)} ₫`);
}
function emergencyStats(){
  const c = cfg(); const bal = fundBalance('emergency'); const {avg, basis} = avgMonthlyExpense();
  const target = +c.emergencyTarget||6; const months = avg? bal/avg : 0;
  const y = String(S.year); const fl = fundYearFlows('emergency')[y] || {in:0,out:0};
  return {bal, avg, basis, target, months, days: Math.round(months*30), targetAmt: avg*target, minAmt: avg*EMERGENCY_MIN,
    gap: bal-avg*target, minProgress: avg? bal/(avg*EMERGENCY_MIN) : 0, yearIn: fl.in, yearOut: fl.out, yearNet: fl.in-fl.out};
}
function txLabel(t){ return t.kind==='income' ? (INC[t.cat]?.name||'Thu nhập') : (CAT[t.cat]?.name||'Khác'); }

function alerts(){
  const out = []; const c = cfg();
  for(const d of activeDeposits()){
    const k = depCalc(d);
    if(k.status==='matured') out.push({lv:'neg', t:`Sổ ${d.bank||''} ${compact(d.amount)} đã đến hạn ${fmtDate(k.mat)}`, d:'Cập nhật: tái tục (sửa ngày gửi) hoặc đánh dấu Đã tất toán.', go:'deposits'});
    else if(k.status==='soon') out.push({lv:'warn', t:`Sổ ${d.bank||''} ${compact(d.amount)} đáo hạn sau ${k.left} ngày`, d:`Ngày ${fmtDate(k.mat)} · lãi dự kiến ${compact(k.atMat)}.`, go:'deposits'});
  }
  const y=curYear(), m=curMonth(); const a = monthAgg(y)[m-1];
  for(const cat of CATS){ const b=+c.budgets[cat.id]||0; if(b && a.cats[cat.id]>b) out.push({lv:'warn', t:`${cat.name} vượt ngân sách tháng ${m}`, d:`Đã chi ${compact(a.cats[cat.id])} / ${compact(b)} (+${compact(a.cats[cat.id]-b)}).`, go:'spending'}); }
  const pm = m===1? {y:y-1,m:12} : {y, m:m-1};
  const pa = monthAgg(pm.y)[pm.m-1]; const sur = pa.income - pa.exp;
  if(pa.n && sur>0 && !S.fund.some(e=>e.ref==='surplus-'+ymKey(pm.y,pm.m))) out.push({lv:'info', t:`Thặng dư T${pm.m}: ${compact(sur)} chưa chuyển quỹ`, d:'Chuyển vào Quỹ khẩn cấp để chốt sổ tháng.', go:'spending', month:pm});
  const act = activeDeposits();
  if(act.length){ const diff = fundBalance('savings') - sum(act,d=>d.amount);
    if(Math.abs(diff) >= 100000) out.push({lv:'info', t:`Sổ tiết kiệm lệch số dư quỹ ${compact(Math.abs(diff))}`, d:`Tổng gốc đang gửi ${compact(sum(act,d=>d.amount))} so với số dư quỹ ${compact(fundBalance('savings'))}.`, go:'deposits'}); }
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
      plan = [
        `Mục tiêu: giữ lại ${pctPlain(SAVE_TARGET,0)} thu nhập. Với thu nhập bình quân ${b(vnd(avgInc)+' ₫')}/tháng, chi tiêu cần ở mức tối đa ${b(vnd(capExp)+' ₫')}/tháng (hiện ${vnd(avgExp)} ₫ → giảm ${b(vnd(cut)+' ₫')}/tháng, tức ${pctPlain(cut/avgExp,0)}).`,
        `Chia mức giảm cho 3 khoản lớn nhất: ${top3.map(x=>{ const m=x.v/n, c=cut*x.v/top3Sum; return `${x.c.name} ${b('−'+vnd(c))} (từ ${compact(m)} xuống ${compact(m-c)}/tháng)`; }).join('; ')}.`,
        left? (needAnnual/left < avgInc ? `Để cả năm ${y} đạt ${pctPlain(SAVE_TARGET,0)}: ${left} tháng còn lại mỗi tháng cần thặng dư ${b(vnd(needAnnual/left)+' ₫')}, tức chi tối đa ${b(vnd(avgInc-needAnnual/left)+' ₫')}/tháng nếu thu nhập giữ mức hiện tại.` : `Khó đạt ${pctPlain(SAVE_TARGET,0)} cho riêng năm ${y} (cần thặng dư ${vnd(needAnnual/left)} ₫/tháng, vượt thu nhập bình quân). Hãy áp dụng mức chi ${vnd(capExp)} ₫/tháng ngay từ tháng tới để đạt mục tiêu cho năm ${y+1}.`) : `Áp dụng mức chi tối đa ${vnd(capExp)} ₫/tháng cho năm ${y+1}.`,
        `Hoặc tăng thu nhập thêm ${b(vnd(avgExp/(1-SAVE_TARGET)-avgInc)+' ₫')}/tháng (lên ${vnd(avgExp/(1-SAVE_TARGET))} ₫) nếu giữ nguyên mức chi.`,
        `Cuối mỗi tháng, bấm “Chuyển vào Quỹ khẩn cấp” ở mục Chi tiêu để chốt phần thặng dư, tránh tiêu lẫn sang tháng sau.`,
      ];
    }
    items.push({key:'rate', tone, ic: tone==='good'?ICONS.trendUp:ICONS.trendDown, t:`Tỷ lệ tiết kiệm năm ${y}: ${pctPlain(rate)}`,
      d:`Giữ lại ${compact(yt.income-yt.exp)} trên ${compact(yt.income)} thu nhập sau ${yt.months} tháng. ${tone==='good'?`Đạt mức tốt (từ ${pctPlain(SAVE_TARGET,0)} trở lên).`:`Mục tiêu thường dùng là ${pctPlain(SAVE_TARGET,0)}.`}`, plan});
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
        `Mục tiêu: đưa chi tiêu về mức trung bình trước đó ${b(vnd(bAvg)+' ₫')}/tháng, tức giảm ${b(vnd(l-bAvg)+' ₫')}/tháng so với 3 tháng gần nhất (${vnd(l)} ₫).`,
        rises.length? `Các khoản tăng nhiều nhất: ${rises.slice(0,3).map(x=>`${x.c.name} ${b('+'+vnd(x.d))}/tháng (${compact(x.p)} → ${compact(x.a)})`).join('; ')}.` : 'Mức tăng đến từ nhiều khoản nhỏ; kiểm tra lại mục Mua sắm và Ăn uống.',
        rises.length? `Đặt ngân sách tháng cho ${rises.slice(0,2).map(x=>`${x.c.name} ở mức ${b(vnd(x.p))} ₫`).join(' và ')} trong mục Thiết lập để nhận cảnh báo khi vượt.` : 'Đặt ngân sách tháng trong mục Thiết lập để nhận cảnh báo khi vượt.',
        `Nếu khoản tăng là chi phí một lần (đám cưới, khám bệnh, sửa nhà…), ghi rõ trong “Mô tả tháng” để tách khỏi chi tiêu thường xuyên.`,
      ];
    }
    items.push({key:'trend', tone, ic: ch>0?ICONS.trendUp:ICONS.trendDown, t:`Chi tiêu 3 tháng gần nhất ${ch>=0?'tăng':'giảm'} ${pctPlain(Math.abs(ch))}`,
      d:`Trung bình ${compact(l)}/tháng (T${last3[0].i+1}–T${last3[2].i+1}) so với ${compact(bAvg)}/tháng các tháng trước đó.`, plan});
  }

  // 3. Expense structure
  if(yt.exp){
    const share = topCats[0].v/yt.exp;
    const tone = share>.35? 'mid' : 'info';
    const plan = tone==='mid'? [
      `Mục tiêu: không khoản nào vượt 30% tổng chi. ${topCats[0].c.name} cần giảm ${b(vnd((topCats[0].v-.3*yt.exp)/n)+' ₫')}/tháng (từ ${compact(topCats[0].v/n)} xuống ${compact(.3*yt.exp/n)}/tháng).`,
      `Theo dõi khoản này hằng tuần bằng nút “Ghi chép” để thấy sớm khi vượt mức.`,
    ] : null;
    items.push({key:'struct', tone, ic:ICONS.info, t:`Khoản chi lớn nhất: ${topCats[0].c.name} (${pctPlain(share)})`,
      d:`Tiếp theo là ${topCats[1].c.name} (${pctPlain(topCats[1].v/yt.exp)}) và ${topCats[2].c.name} (${pctPlain(topCats[2].v/yt.exp)}). Ba nhóm này chiếm ${pctPlain((topCats[0].v+topCats[1].v+topCats[2].v)/yt.exp,0)} tổng chi.`, plan});
  }

  // 4. Emergency fund
  if(em.avg){
    const tone = em.months>=em.target?'good':em.months>=EMERGENCY_MIN?'mid':'low'; score += em.months>=em.target?2:em.months>=EMERGENCY_MIN?1:0;
    let plan = null;
    if(tone!=='good'){
      const toMin = Math.max(0, em.minAmt-em.bal), toTarget = Math.max(0, em.targetAmt-em.bal);
      const monthsSoFar = Math.max(1, monthsElapsed(y)), inflow = em.yearNet/monthsSoFar;
      plan = [
        toMin>0? `Mốc an toàn ${EMERGENCY_MIN} tháng là ${b(vnd(em.minAmt)+' ₫')}: còn thiếu ${b(vnd(toMin)+' ₫')}. Nạp thêm ${b(vnd(toMin/3))} ₫/tháng để đạt trong 3 tháng, hoặc ${b(vnd(toMin/6))} ₫/tháng trong 6 tháng.` : `Đã qua mốc an toàn ${EMERGENCY_MIN} tháng (${vnd(em.minAmt)} ₫).`,
        `Mục tiêu ${em.target} tháng là ${b(vnd(em.targetAmt)+' ₫')}: còn thiếu ${b(vnd(toTarget)+' ₫')}, tương đương nạp ${b(vnd(toTarget/12))} ₫/tháng trong 12 tháng.`,
        `Năm ${y}, quỹ đang tăng ròng bình quân ${b(signed(inflow)+' ₫')}/tháng${inflow>0? ` → với tốc độ này cần khoảng ${b(Math.ceil(toTarget/inflow)+' tháng')} để đạt mục tiêu.` : '. Các khoản chi từ quỹ đang lớn hơn khoản nạp vào.'}`,
        `Nguồn nạp gợi ý: thặng dư sinh hoạt hằng tháng (bình quân ${vnd(avgSur)} ₫) và các khoản thưởng, thu nhập phụ. Hạn chế dùng quỹ cho chi tiêu không khẩn cấp.`,
      ];
    }
    items.push({key:'emergency', tone, ic: tone==='good'?ICONS.check:ICONS.alert, t:`Quỹ khẩn cấp đủ ${fmt1(em.months)} tháng chi tiêu`,
      d: tone==='good' ? `Đạt mục tiêu ${em.target} tháng (${compact(em.targetAmt)}).` : tone==='mid' ? `Đã qua mốc an toàn ${EMERGENCY_MIN} tháng; còn thiếu ${compact(-em.gap)} để đạt ${em.target} tháng.` : `Chưa tới mốc an toàn tối thiểu ${EMERGENCY_MIN} tháng (${compact(em.minAmt)}); còn thiếu ${compact(em.minAmt-em.bal)}.`, plan});
  }

  // 5. Net worth vs last year
  const prev = navAt(y-1).total||0;
  if(prev && N.total && y<=curYear()){
    const g=(N.total-prev)/prev; score += g>0?1:0;
    const plan = g<0? [
      `Tài sản ròng giảm ${b(vnd(prev-N.total)+' ₫')} so với cuối ${y-1}.${N.parts? ` Thành phần: sổ tiết kiệm ${compact(N.parts.savings)}, quỹ cho con ${compact(N.parts.kids)}, quỹ khẩn cấp ${compact(N.parts.emergency)}, đầu tư ${compact(N.parts.risk)}.`:''}`,
      `Để lấy lại mức cuối ${y-1} trước hết năm, cần tăng ${b(vnd((prev-N.total)/Math.max(1,left))+' ₫')}/tháng trong ${Math.max(1,left)} tháng còn lại.`,
      `Kiểm tra các khoản rút lớn trong nhật ký Quỹ tiết kiệm và Quỹ khẩn cấp để xác định nguyên nhân.`,
    ] : null;
    items.push({key:'nav', tone: g>=0?'good':'low', ic: g>=0?ICONS.trendUp:ICONS.trendDown, t:`Tài sản ròng ${g>=0?'tăng':'giảm'} ${pctPlain(Math.abs(g))} so với cuối ${y-1}`, d:`Từ ${compact(prev)} lên ${compact(N.total)} (${signedC(N.total-prev)}).`, plan});
  }

  // 6. Allocation (descriptive only)
  if(N.total && N.parts){
    items.push({key:'alloc', tone:'info', ic:ICONS.info, t:`Phân bổ: ${pctPlain(N.parts.savings/N.total)} tài sản nằm ở sổ tiết kiệm`, d:`Quỹ cho con ${pctPlain(N.parts.kids/N.total)}, quỹ khẩn cấp ${pctPlain(N.parts.emergency/N.total)}, đầu tư rủi ro cao ${pctPlain(N.parts.risk/N.total)}. Sổ tiết kiệm an toàn về vốn nhưng chỉ rút linh hoạt khi đến hạn.`});
  }

  // 7. Children's portfolio
  if(v.cost){
    const P = portfolio(); const losers = P.items.filter(i=>i.unreal<0 && i.cost>0);
    const plan = v.pl<0? [
      ...losers.map(i=>`${productLabel(i.p)}: giá vốn bình quân ${b(fmtPrice(i.avg))}, giá hiện tại ${fmtPrice(i.price)} → cần tăng ${b(pctPlain((i.avg-i.price)/i.price))} để hòa vốn (lỗ tạm tính ${vnd(-i.unreal)} ₫).`),
      `Đây là lỗ tạm tính, chưa phát sinh khi chưa bán. Cập nhật giá hằng tháng trong mục Quỹ cho con để theo dõi sát.`,
    ] : null;
    items.push({key:'kids', tone: v.pl>=0?'good':'mid', ic: v.pl>=0?ICONS.trendUp:ICONS.trendDown, t:`Quỹ cho con ${v.pl>=0?'đang lãi':'đang lỗ'} ${pct(v.plPct,2)}`, d:`Giá trị ${compact(v.value)} trên vốn góp ${compact(v.cost)} · ${v.n} sản phẩm, ${v.tx} giao dịch.`, plan});
  }

  const order = {low:0, mid:1, info:2, good:3};
  items.sort((p,q)=>order[p.tone]-order[q.tone]);
  const maxScore = 6;
  const verdict = score>=5 ? {tone:'good', t:'Vững vàng'} : score>=3 ? {tone:'mid', t:'Ổn định'} : {tone:'low', t:'Cần cải thiện'};
  return {score, maxScore, verdict, items, flagged: items.filter(i=>i.tone==='low'||i.tone==='mid').length};
}
function insightRow(it){
  const flag = it.tone==='low' || it.tone==='mid';
  const open = S.openInsights.has(it.key);
  const title = flag && it.plan
    ? `<button type="button" class="ins-t" data-insight="${it.key}" aria-expanded="${open}"><span>${esc(it.t)}</span><span class="chip neg">${it.tone==='low'?'Cần cải thiện':'Cần lưu ý'}</span>${ico('<path d="M6 9l6 6 6-6"/>','ico chev')}</button>`
    : `<div class="t">${esc(it.t)}</div>`;
  return `<div class="insight ${it.tone} ${flag?'flag':''}"><span class="ic">${ico(flag? ICONS.warn : it.ic)}</span><div style="min-width:0">${title}<div class="d">${esc(it.d)}</div>
    ${flag && it.plan && open? `<div class="plan"><b>Cách cải thiện</b><ol>${it.plan.map(p=>`<li>${p}</li>`).join('')}</ol></div>` : ''}</div></div>`;
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
    g += `<text x="${x0+bw/2}" y="${H-8}" text-anchor="middle" ${i===curM?'style="fill:var(--ink);font-weight:700"':''}>T${i+1}</text>`;
  });
  CH.cash = {W, x0:pl+bw/2, step:bw, n:12, tip:i=>{ const m=agg[i]; if(!m.n) return ''; const s=m.income-m.exp;
    return `<b>Tháng ${i+1}/${year}</b>`+tipRows([{n:'Thu nhập',c:'var(--accent)',v:vnd(m.income)},{n:'Chi tiêu',c:'var(--exp)',v:vnd(m.exp)},{n:'Thặng dư',v:`<span class="${s<0?'neg':''}">${signed(s)}</span>`},{n:'Tỷ lệ tiết kiệm',v:m.income?pctPlain(s/m.income):'—'}]); }};
  return `<div class="chart" data-chart="cash"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Thu nhập và chi tiêu theo tháng năm ${year}">${g}</svg></div>
  <div class="legend"><span><i class="swatch" style="background:var(--accent)"></i>Thu nhập</span><span><i class="swatch" style="background:var(--exp)"></i>Chi tiêu</span><span class="muted">Chạm vào biểu đồ để xem số liệu</span></div>`;
}
function chartLines(agg, year, selM){
  const W=1040,H=320,pl=58,pr=18,pt=14,pb=28,ih=H-pt-pb,iw=W-pl-pr,step=iw/11;
  const series = [...CATS.map(c=>({id:c.id, name:c.name, color:`var(--c-${c.id})`, val:i=>agg[i].cats[c.id]})), {id:'_total', name:'Tổng chi', color:'var(--ink)', val:i=>agg[i].exp, dash:true}];
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
  agg.forEach((m,i)=>{ g += `<text x="${X(i)}" y="${H-8}" text-anchor="middle" ${i===selM-1?'style="fill:var(--ink);font-weight:700"':''}>T${i+1}</text>`; });
  CH.lines = {W, x0:pl, step, n:12, tip:i=>{ const m=agg[i]; if(!m.n) return '';
    const rows = vis.filter(s=>s.id!=='_total').map(s=>({n:s.name,c:s.color,v:vnd(s.val(i)),raw:s.val(i)})).sort((a,b)=>b.raw-a.raw);
    return `<b>Tháng ${i+1}/${year}</b>`+tipRows(rows)+`<div class="r" style="border-top:1px solid rgba(255,255,255,.2);margin-top:4px;padding-top:4px"><span>Tổng chi</span><em>${vnd(m.exp)}</em></div>`; }};
  return `<div class="chart" data-chart="lines"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chi tiêu theo danh mục từng tháng năm ${year}">${g}</svg></div>
  <div class="legend" role="group" aria-label="Ẩn hoặc hiện danh mục">${series.map(s=>`<button type="button" data-line="${s.id}" aria-pressed="${!S.lineHidden.has(s.id)}"><i class="swatch" style="background:${s.color}"></i>${s.name}</button>`).join('')}</div>`;
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
  CH[id] = {W, x0:pl, step, n:points.length, tip:i=>`<b>${esc(points[i].full||points[i].label)}</b>`+tipRows([{n:'Số dư',c:color,v:vnd(points[i].v)}])};
  return `<div class="chart" data-chart="${id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}</svg></div>`;
}
function chartLotPL(lots, price){
  const W=1040,H=260,pl=56,pt=14,pb=34,ih=H-pt-pb,iw=W-pl-10;
  const n = lots.length; if(!n) return '';
  const rs = lots.map(l=> (+l.price? (price-(+l.price))/(+l.price) : 0));
  const mx = Math.max(.05, ...rs.map(Math.abs)); const lim = Math.ceil(mx*20)/20;
  const bw = iw/n, Y = r => pt + ih/2 - (ih/2)*(r/lim);
  let g='';
  for(const t of [lim, lim/2, 0, -lim/2, -lim]){ const y=Y(t); g += `<line x1="${pl}" x2="${W-8}" y1="${y}" y2="${y}" stroke="${t===0?'var(--line)':'var(--line-2)'}"/><text x="${pl-8}" y="${y+3.5}" text-anchor="end">${(t*100).toLocaleString('vi-VN',{maximumFractionDigits:1})}%</text>`; }
  g += `<line class="guide" x1="0" x2="0" y1="${pt}" y2="${pt+ih}" stroke="var(--muted)" stroke-dasharray="3 3" style="opacity:0"/>`;
  lots.forEach((l,i)=>{ const r=rs[i], x=pl+i*bw+bw*.2, w=Math.max(3,bw*.6), y0=Y(0), y1=Y(r);
    g += `<rect x="${x}" y="${Math.min(y0,y1)}" width="${w}" height="${Math.max(1,Math.abs(y1-y0))}" rx="2.5" fill="${r>=0?'var(--pos)':'var(--neg)'}"/>`;
    if(n<=24 && (i%Math.ceil(n/12)===0 || i===n-1)) g += `<text x="${pl+i*bw+bw/2}" y="${H-16}" text-anchor="middle">${l.date.slice(5,7)}/${l.date.slice(0,4)}</text>`; });
  CH.lots = {W, x0:pl+bw/2, step:bw, n, tip:i=>{ const l=lots[i], u=+l.units||0, p=+l.price||0, r=rs[i];
    return `<b>Mua ngày ${fmtDate(l.date)}</b>`+tipRows([{n:'Giá mua',v:p.toLocaleString('vi-VN',{maximumFractionDigits:2})},{n:'Vốn',v:vnd(u*p)},{n:'Giá trị hiện tại',v:vnd(u*price)},{n:'Lãi/lỗ',v:`<span style="color:${r>=0?'var(--pos)':'var(--neg)'}">${pct(r,2)}</span>`}]); }};
  return `<div class="chart" data-chart="lots"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Lãi lỗ phần trăm từng lần mua chứng chỉ quỹ">${g}</svg></div>
  <div class="legend"><span><i class="swatch" style="background:var(--pos)"></i>Đang lãi</span><span><i class="swatch" style="background:var(--neg)"></i>Đang lỗ</span><span class="muted">Theo giá CCQ hiện tại · chạm để xem chi tiết</span></div>`;
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
  return `<div class="donut"><svg viewBox="0 0 200 200" role="img" aria-label="Cơ cấu chi phí ${esc(periodLabel)}">${paths}
    <text class="c1" id="dn1" x="100" y="88" text-anchor="middle">Cơ cấu chi phí</text>
    <text class="c2" id="dn2" x="100" y="110" text-anchor="middle">${esc(periodLabel)}</text>
    <text class="c3" id="dn3" x="100" y="127" text-anchor="middle">Chạm để xem số tiền</text></svg></div>`;
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
  donutTimer = setTimeout(()=>{ if(!$('#dn1')) return; $('#dn1').textContent='Cơ cấu chi phí'; $('#dn2').textContent=st.label; $('#dn3').textContent='Chạm để xem số tiền';
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
  if(kind==='income') return `<span class="cat-ico" style="background:var(--accent)">${ico('<path d="M12 19V5M6 11l6-6 6 6"/>')}</span>`;
  const c = CAT[normCat(id)]; return `<span class="cat-ico" style="background:var(--c-${c.id})">${c.ab}</span>`;
}
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
function whoTag(t){ return t.by ? `<img class="who" data-uid="${esc(t.by)}" alt="" src="${BLANK}">` : ''; }
function txRow(t){
  const sign = t.kind==='income'? '+' : '−';
  return `<button class="row" type="button" data-edit-tx="${esc(t.id)}">${catIcon(t.cat,t.kind)}
    <div style="min-width:0"><div class="t">${esc(t.note || txLabel(t))}</div><div class="s">${whoTag(t)}${esc(txLabel(t))} · ${fmtDate(t.date)}</div></div>
    <div class="amt ${t.kind==='income'?'pos':''}">${sign}${vnd(t.amount)}</div></button>`;
}
const delBtn = (col,id) => S.canWrite? `<button class="btn xs danger" type="button" data-del="${col}/${esc(id)}">Xóa</button>` : '';
function kpi(label, value, foot='', cls=''){ return `<div class="card kpi ${cls}"><div class="label">${label}</div><div class="value">${value}</div>${foot?`<div class="foot">${foot}</div>`:''}</div>`; }
function amountField(id, draftKey, label, placeholder){
  return `<div class="field"><label for="${id}">${label}</label><div class="amt-box sm"><input id="${id}" data-draft="${draftKey}" data-amount-prev="${id}-p" autocomplete="off" value="${esc(draft(draftKey,''))}" placeholder="${placeholder}"><span>₫</span></div><div class="amt-prev" id="${id}-p">${amountPreview(draft(draftKey,''))}</div></div>`;
}
function amountPreview(v){ if(!String(v||'').trim()) return 'Gõ tắt: 250k · 1tr2 · 2,5tr · 150k+80k'; const n=parseAmount(v); return isNaN(n)? '<span class="neg">Chưa đọc được số tiền</span>' : '= '+vnd(n)+' ₫'; }

/** Inline entry form for a fund ledger (savings / emergency). */
function fundForm(f){
  const types = FUND_TYPES[f]; const k = 'ff:'+f+':';
  const curType = draft(k+'type','in');
  return `<form class="inline-form" data-fund-form="${f}" novalidate>
    <div class="typeseg" role="radiogroup" aria-label="Loại giao dịch">${Object.entries(types).map(([t,l])=>`<label><input type="radio" name="ff-${f}-type" value="${t}" data-draft="${k}type" ${curType===t?'checked':''}><span class="${t==='out'?'out':''}">${l}</span></label>`).join('')}</div>
    <div class="row2">
      <div class="field"><label for="ff-${f}-date">Ngày</label>${dateInput(`ff-${f}-date`, draft(k+'date', fmtDate(defaultDateISO())), `data-draft="${k}date"`)}</div>
      ${amountField(`ff-${f}-amt`, k+'amt', 'Số tiền', 'vd: 20tr')}
    </div>
    <div class="field"><label for="ff-${f}-note">Nguồn / ghi chú</label><input class="input" id="ff-${f}-note" data-draft="${k}note" value="${esc(draft(k+'note',''))}" placeholder="${f==='savings'?'vd: Tất toán sổ VCB 6 tháng':'vd: Lương tháng 10, khám bệnh cho Dâu'}" maxlength="200"></div>
    <div><button class="btn primary" type="submit">${ico(ICONS.plus)}Ghi nhận</button></div>
  </form>`;
}
function journalSub(f){
  const y = S.year; const startY = ledgerStartYear();
  if(y<=startY) return `<span class="sub">Năm ${y} · số dư đầu kỳ ${fmtDate(cfg().openings.asOf)}: ${vnd(cfg().openings[f])} ₫</span>`;
  return `<span class="sub">Năm ${y} · đầu năm <b class="num">${vnd(fundBalance(f,(y-1)+'-12-31'))}</b> → cuối năm <b class="num">${vnd(fundBalance(f,y+'-12-31'))}</b> ₫</span>`;
}
function fundJournal(f){
  const list = S.fund.filter(e=>e.fund===f && (e.date||'').startsWith(String(S.year))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.at||0)-(a.at||0));
  if(!list.length) return `<div class="empty"><b>Chưa có giao dịch năm ${S.year}</b>Dùng mục nhập liệu để ghi nhận khoản đầu tiên.</div>`;
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>Ngày</th><th class="l">Loại</th><th>Số tiền (₫)</th><th class="l">Ghi chú / nguồn</th>${S.canWrite?'<th></th>':''}</tr></thead>
    <tbody>${list.map(e=>{ const out=e.type==='out'; return `<tr><td class="num">${fmtDate(e.date)}</td><td class="txt"><span class="chip ${out?'neg':e.type==='interest'?'gold':'pos'}">${fundTypeLabel(f,e.type)}</span></td><td class="${out?'neg':'pos'}">${out?'−':'+'}${vnd(e.amount)}</td><td class="wrap">${whoTag(e)}${esc(e.note||'')}</td>${S.canWrite?`<td><span class="act"><button class="btn xs" type="button" data-edit-fund="${esc(e.id)}">Sửa</button>${delBtn('fund',e.id)}</span></td>`:''}</tr>`; }).join('')}</tbody>
  </table></div>`;
}

/* =========================================================
   Views — Tổng quan
   ========================================================= */
const emptyYear = y => `<div class="empty"><b>Chưa có số liệu năm ${y}</b>${y>curYear()? `Số liệu sẽ hiện khi bắt đầu nhập cho năm ${y}.` : `Nhập số liệu tháng trong mục Chi tiêu để xem biểu đồ.`}</div>`;
function heroCard(){
  const y = S.year; const future = y>curYear(); const N = navAt(y); const P = navAt(y-1); const prevNav = future? 0 : (P.total||0);
  const growth = prevNav && N.total? (N.total-prevNav)/prevNav : NaN;
  const hv = []; const top = future? curYear() : y;
  for(let k=top-3;k<top;k++){ const t=navAt(k).total; if(t) hv.push({y:k, v:t}); } if(N.total) hv.push({y:top, v:N.total, now:true});
  const hmax = Math.max(1,...hv.map(h=>h.v)); const yt = yearTotals(y);
  const keys = ['savings','kids','risk','emergency'];
  const label = N.kind==='live' ? `Tổng tài sản ròng (NAV)${future?' hiện tại':''} · <span class="num" data-clock>${fmtDateTime(new Date())}</span>`
    : N.kind==='snapshot' ? `Tài sản ròng chốt cuối năm ${y} · 31/12/${y}`
    : N.kind==='estimate' ? `Tài sản ròng cuối năm ${y} · ước tính từ sổ quỹ` : `Chưa có số liệu tài sản ròng năm ${y}`;
  return `<section class="hero" aria-label="Tổng tài sản ròng">
    <div class="hero-row">
      <div style="min-width:0">
        <div class="eyebrow">${label}</div>
        <div class="hero-nav">${N.total? vnd(N.total) : '—'}<small>₫</small></div>
        <div class="hero-meta">${prevNav && N.total? `<span>So với cuối ${y-1}: <b class="up">${pct(growth)}</b> (${signedC(N.total-prevNav)})</span>`:''}<span>Thu ${y}: <b>${compact(yt.income)}</b></span><span>Chi ${y}: <b>${compact(yt.exp)}</b></span></div>
      </div>
      <div class="hero-years" aria-hidden="true">${hv.map(h=>`<div class="hy ${h.now?'now':''}"><span class="v">${compact(h.v)}</span><span class="bar" style="height:${Math.max(4,60*h.v/hmax)}px"></span><span>${h.y}</span></div>`).join('')}</div>
    </div>
    ${N.parts? `<div class="alloc">${keys.map(k=>N.parts[k]>0?`<span style="width:${N.parts[k]/N.total*100}%;background:var(--f-${k})" title="${FUNDS[k].name}"></span>`:'').join('')}</div>
    <div class="alloc-legend">${keys.map(k=>`<div><div class="t"><i class="swatch" style="background:var(--f-${k})"></i>${FUNDS[k].short}</div><div class="a">${compact(N.parts[k])}</div><div class="p">${N.total?pctPlain(N.parts[k]/N.total):'—'}</div></div>`).join('')}</div>`
    : `<p class="hero-meta" style="margin-top:16px">Năm này chỉ có số tổng tài sản ròng, chưa có chi tiết từng quỹ.</p>`}
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
  const plabel = per==='month'? `T${m}/${y}` : `Năm ${y}`;
  S._donut = {items, total, label:plabel};
  const ins = insights(); const al = alerts();
  const recent = [...S.tx].sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.at||0)-(a.at||0)).slice(0,5);
  return `${heroCard()}
  <div class="grid g-4 section-gap">
    ${kpi(`<i class="swatch" style="background:var(--accent)"></i>Thu nhập T${m}`, `${compact(cur.income)}`, cur.n? `<b>${vnd(cur.income)}</b> ₫` : 'Chưa ghi tháng này')}
    ${kpi(`<i class="swatch" style="background:var(--exp)"></i>Chi tiêu T${m}`, `${compact(cur.exp)}`, cur.income? `${pctPlain(cur.exp/cur.income,0)} thu nhập · <b>${vnd(cur.exp)}</b> ₫` : '—')}
    <div class="card kpi accent"><div class="label">Tỷ lệ tiết kiệm T${m}</div><div class="value ${rate<0?'neg':rate>=.2?'pos':''}">${pctPlain(rate)}</div>
      <div class="foot">Thặng dư <b class="${sur<0?'neg':'pos'}">${signed(sur)}</b> ₫</div>
      <div class="foot">Cả năm ${y}: <b>${pctPlain(yrate)}</b> · thặng dư <b class="${ysur<0?'neg':'pos'}">${signedC(ysur)}</b></div>${py? `<div class="foot">Năm ${y-1}: <b>${pctPlain(py.income?(py.income-py.exp)/py.income:NaN)}</b> · thặng dư ${signedC(py.income-py.exp)}</div>`:''}</div>
    <div class="card kpi"><div class="label">Quỹ khẩn cấp đủ dùng</div><div class="value">${fmt1(em.months)}<small>tháng</small></div>
      <div class="meter ${emTone==='pos'?'pos':emTone==='gold'?'gold':'warn'}" style="margin-top:9px"><i style="width:${Math.min(100,em.months/em.target*100)}%"></i></div>
      <div class="foot"><span class="chip ${emTone}">${em.months>=em.target?'Đạt mục tiêu':em.months>=EMERGENCY_MIN?'Đạt mức tối thiểu':'Dưới mức an toàn'}</span> mục tiêu ${em.target} tháng</div></div>
  </div>
  <div class="grid g-main section-gap">
    <div class="card"><div class="card-h"><h2>Dòng tiền ${y}</h2><span class="sub">Thặng dư lũy kế <b class="num ${ysur<0?'neg':'pos'}">${signed(ysur)} ₫</b></span></div>${yt.months? chartCashflow(agg,y) : emptyYear(y)}</div>
    <div class="card"><div class="card-h"><h2>Cơ cấu chi phí</h2>
        <div class="seg" role="group" aria-label="Kỳ"><button type="button" data-donut="month" aria-pressed="${per==='month'}">T${m}</button><button type="button" data-donut="year" aria-pressed="${per==='year'}">Năm ${y}</button></div></div>
      ${total? `<div class="donut-wrap">${donut(items,total,plabel)}
        <div class="dlegend">${items.map(it=>`<button type="button" data-seg="${it.id}"><i class="swatch" style="background:var(--c-${it.id})"></i><span class="n">${it.name}</span><b>${pctPlain(it.v/total)}</b></button>`).join('')}</div></div>`
      : '<div class="empty"><b>Chưa có chi phí</b>Nhập số liệu trong mục Chi tiêu.</div>'}
    </div>
  </div>
  <div class="grid g-main section-gap">
    <div class="card"><div class="card-h"><h2>Nhận định tài chính gia đình</h2><span class="sub">Tự động · cập nhật theo số liệu</span></div>
      ${yt.months? '' : `<div class="verdict"><div class="badge" style="background:var(--muted)">—</div><div><b>Chưa có thu chi năm ${y}</b><span>Nhận định về tỷ lệ tiết kiệm và xu hướng chi tiêu sẽ có khi nhập số liệu tháng đầu tiên. Các mục dưới đây là tình hình hiện tại.</span></div></div>`}
      <div class="verdict ${ins.verdict.tone}" ${yt.months?'':'hidden'}><div class="badge">${ins.score}/${ins.maxScore}</div><div><b>${ins.verdict.t}</b><span>${ins.flagged? `${ins.flagged} mục cần lưu ý · bấm vào tiêu đề màu đỏ để xem cách cải thiện` : 'Không có mục cần cải thiện'}. Chấm theo tỷ lệ tiết kiệm, quỹ khẩn cấp, xu hướng chi tiêu và tài sản ròng.</span></div></div>
      <div>${ins.items.map(insightRow).join('')}</div>
      <p class="disclaimer">Nhận định được tính tự động từ số liệu đã ghi, chỉ để tham khảo, không phải tư vấn đầu tư.</p>
    </div>
    <div class="stack">
      <div class="card"><div class="card-h"><h2>Cần chú ý</h2><span class="sub">${al.length} mục</span></div>
        <div class="list">${al.length? al.map(a=>`<div class="alert ${a.lv}"><span class="bar"></span><div style="min-width:0"><div class="t">${esc(a.t)}</div><div class="d">${esc(a.d)}</div></div><a class="btn sm ghost" href="#${a.go}" ${a.month?`data-goto-month="${a.month.y}-${a.month.m}"`:''}>Xem</a></div>`).join('') : '<div class="empty"><b>Mọi thứ ổn</b>Không có việc cần xử lý.</div>'}</div></div>
      <div class="card"><div class="card-h"><h2>Ghi chép gần đây</h2><a class="btn sm ghost" href="#spending">Tất cả</a></div>
        <div class="list">${recent.length? recent.map(txRow).join('') : '<div class="empty"><b>Chưa có ghi chép</b></div>'}</div></div>
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
  const ro = S.canWrite? '' : 'readonly';
  const noteMonths = agg.map((a,i)=>({a,i,note:(S.months[ymKey(y,i+1)]||{}).note||''})).filter(x=>x.a.n||x.note);
  const surSaved = cur.income-cur.exp;
  return `
  <div class="top-actions" style="margin-bottom:16px;justify-content:space-between">
    <div class="month-nav"><button type="button" data-mstep="-1" aria-label="Tháng trước">${ico('<path d="M15 6l-6 6 6 6"/>')}</button><b>${monthLabel(y,m)}</b><button type="button" data-mstep="1" aria-label="Tháng sau">${ico(ICONS.arrow)}</button></div>
    <span class="hint">Năm đang xem: <b>${y}</b> · đổi năm ở góc trên bên phải</span>
  </div>
  <div class="grid g-4">
    ${kpi('<i class="swatch" style="background:var(--accent)"></i>Thu nhập', `${vnd(cur.income)}<small>₫</small>`, yoyFoot(y,m,'income'))}
    ${kpi('<i class="swatch" style="background:var(--exp)"></i>Tổng chi', `${vnd(cur.exp)}<small>₫</small>`, yoyFoot(y,m,'exp'))}
    ${kpi('Thặng dư / lỗ', `<span class="${surSaved<0?'neg':surSaved>0?'pos':''}">${signed(surSaved)}</span><small>₫</small>`, moved? `<span class="chip pos">Đã chuyển ${compact(moved.amount)} vào quỹ khẩn cấp</span>` : surSaved>0 && S.canWrite ? `<button class="btn xs" type="button" data-move-surplus="${surSaved}">Chuyển vào Quỹ khẩn cấp</button>` : '')}
    ${kpi('Tỷ lệ tiết kiệm', `<span class="${surSaved<0?'neg':''}">${pctPlain(cur.income? surSaved/cur.income : NaN)}</span>`, `Năm ${y}: <b>${pctPlain(yt.income?(yt.income-yt.exp)/yt.income:NaN)}</b>`, 'accent')}
  </div>

  <div class="grid g-split section-gap">
    <div class="card"><div class="card-h"><h2>Số liệu ${monthLabel(y,m).toLowerCase()}</h2><span class="sub">Nhập tổng từng khoản như bảng Excel</span></div>
      <form class="mform" id="monthForm" novalidate>
        <div class="mrow income ${dv.income.dirty?'dirty':''}" data-mrow="income"><label class="n" for="mf-income"><i class="swatch" style="background:var(--accent)"></i><span>Thu nhập tháng</span></label>
          <input class="input" id="mf-income" data-draft="m:${ymKey(y,m)}:income" data-mfield="income" inputmode="text" autocomplete="off" value="${esc(dv.income.raw)}" placeholder="0" ${ro}>
          ${dv.income.mf.others.length? `<span class="hint">Gồm ${dv.income.mf.others.length} khoản ghi lẻ: ${vnd(dv.income.mf.othersSum)} ₫</span>`:''}</div>
        <div class="mgroup">Chi phí</div>
        ${CATS.map(c=>{ const f=dv[c.id]; return `<div class="mrow ${f.dirty?'dirty':''}" data-mrow="${c.id}"><label class="n" for="mf-${c.id}"><i class="swatch" style="background:var(--c-${c.id})"></i><span>${c.name}</span></label>
          <input class="input" id="mf-${c.id}" data-draft="m:${ymKey(y,m)}:${c.id}" data-mfield="${c.id}" inputmode="text" autocomplete="off" value="${esc(f.raw)}" placeholder="0" ${ro}>
          ${f.mf.others.length? `<span class="hint">Gồm ${f.mf.others.length} khoản ghi lẻ: ${vnd(f.mf.othersSum)} ₫</span>`:''}</div>`; }).join('')}
        <div class="field" style="margin-top:14px"><label for="mf-note">Mô tả tháng</label>
          <textarea class="input" id="mf-note" data-draft="m:${ymKey(y,m)}:note" placeholder="vd: 5tr đưa bà ngoại, 2tr đám cưới, 1tr mua quạt…" ${ro}>${esc(dv._note.raw)}</textarea></div>
        <div class="mtotals" aria-live="polite">
          <div><span>Thu nhập</span><b id="mt-inc">${vnd(liveInc)}</b></div>
          <div><span>Tổng chi</span><b id="mt-exp">${vnd(liveExp)}</b></div>
          <div><span>Thặng dư</span><b id="mt-sur" class="${liveSur<0?'neg':'pos'}">${signed(liveSur)}</b></div>
          <div><span>Tỷ lệ tiết kiệm</span><b id="mt-rate">${pctPlain(liveInc? liveSur/liveInc : NaN)}</b></div>
        </div>
        ${S.canWrite? `<div class="mfoot"><span class="unsaved" id="mUnsaved" ${dv._dirty?'':'hidden'}>Có thay đổi chưa lưu</span><span></span>
          <div class="top-actions"><button class="btn" type="button" id="mReset" ${dv._dirty?'':'disabled'}>Hoàn tác</button><button class="btn primary" type="submit" id="mSave" ${dv._dirty?'':'disabled'}>Lưu số liệu tháng</button></div></div>
          <p class="hint" style="margin:8px 0 0">Gõ tắt được: 12tr, 2tr5, 250k, hoặc cộng nhiều khoản 250k+300k+1tr.</p>` : ''}
      </form>
    </div>
    ${compareCard(y,m,cur)}
  </div>

  <div class="card section-gap"><div class="card-h"><h2>Diễn biến chi tiêu theo danh mục · ${y}</h2><span class="sub">Chạm vào biểu đồ để xem số liệu từng tháng; bấm chú thích để ẩn/hiện</span></div>${yt.months? chartLines(agg,y,m) : emptyYear(y)}</div>

  <div class="card section-gap"><div class="card-h"><h2>Bảng tổng hợp ${y}</h2><span class="sub">Bấm vào tháng để mở số liệu tháng đó</span></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Khoản mục</th>${agg.map((a,i)=>`<th class="${i===m-1?'cur':''}">T${i+1}</th>`).join('')}<th>Cả năm</th></tr></thead>
      <tbody>
        <tr class="click"><td><b>Thu nhập</b></td>${agg.map((a,i)=>`<td class="${i===m-1?'cur':''} ${a.income?'':'zero'}" data-goto="${i+1}">${a.income?compact(a.income):'·'}</td>`).join('')}<td><b>${compact(yt.income)}</b></td></tr>
        ${CATS.map(cc=>`<tr><td><i class="swatch" style="background:var(--c-${cc.id});margin-right:7px"></i>${cc.name}</td>${agg.map((a,i)=>`<td class="${i===m-1?'cur':''} ${a.cats[cc.id]?'':'zero'}" data-goto="${i+1}">${a.cats[cc.id]?compact(a.cats[cc.id]):'·'}</td>`).join('')}<td>${compact(yt.cats[cc.id])}</td></tr>`).join('')}
        <tr class="total"><td>Tổng chi</td>${agg.map((a,i)=>`<td class="${i===m-1?'cur':''}" data-goto="${i+1}">${a.exp?compact(a.exp):'·'}</td>`).join('')}<td>${compact(yt.exp)}</td></tr>
        <tr><td>Thặng dư / lỗ</td>${agg.map((a,i)=>{const d=a.income-a.exp; return `<td class="${i===m-1?'cur':''} ${!a.n?'zero':d<0?'neg':'pos'}" data-goto="${i+1}">${a.n?compact(d):'·'}</td>`;}).join('')}<td class="${yt.income-yt.exp<0?'neg':'pos'}">${compact(yt.income-yt.exp)}</td></tr>
      </tbody></table></div>
  </div>

  <div class="card section-gap"><div class="card-h"><h2>Ghi chú theo tháng · ${y}</h2><span class="sub">Tổng hợp từ ô “Mô tả tháng”</span></div>
    ${noteMonths.length? `<div class="tbl-wrap"><table>
      <thead><tr><th>Tháng</th><th>Thu nhập</th><th>Chi tiêu</th><th>Thặng dư</th><th>Tỷ lệ TK</th><th class="l">Ghi chú / lưu ý</th></tr></thead>
      <tbody>${noteMonths.map(({a,i,note})=>{ const d=a.income-a.exp; return `<tr class="click ${note?'':'muted-row'}" data-goto-row="${i+1}"><td><b>T${i+1}</b></td><td>${compact(a.income)}</td><td>${compact(a.exp)}</td><td class="${d<0?'neg':'pos'}">${signedC(d)}</td><td>${a.income?pctPlain(d/a.income):'—'}</td><td class="wrap">${note? esc(note) : '<span class="muted">Chưa có ghi chú</span>'}</td></tr>`; }).join('')}</tbody>
    </table></div>` : '<div class="empty"><b>Chưa có ghi chú</b>Nhập “Mô tả tháng” trong phần số liệu tháng.</div>'}
  </div>
  ${historyCard(y)}`;
}
/** Difference vs average: positive → green "+amount (+x%)", negative → red "−amount (−x%)". */
function cmpRow(name, color, curV, avgV, isTotal=false, baseLabel='TB'){
  const d = Math.round(curV-avgV), r = avgV? d/avgV : NaN;
  const cls = d>0?'pos':d<0?'neg':'muted';
  const txt = !avgV && !curV ? '—' : !avgV ? `${signed(d)} (mới phát sinh)` : `${signed(d)} (${pct(r,0)})`;
  return `<div class="cmp ${isTotal?'total':''}"><div class="n"><i class="swatch" style="background:${color}"></i><span>${name}</span></div><div class="v">${vnd(curV)}</div>
    <div class="s">${baseLabel} ${vnd(avgV)}</div><div class="d ${cls}">${txt}</div></div>`;
}
/** Comparison base for the selected month: previous months, same month last year, or last year's monthly average. */
function compareBase(mode, y, m){
  const avgOf = s => { const cats={}; for(const c of CATS) cats[c.id]=s.cats[c.id]/s.months; return {income:s.income/s.months, exp:s.exp/s.months, cats}; };
  if(mode==='yoy'){
    const a = monthAgg(y-1)[m-1]; if(a.n) return {label:`cùng kỳ tháng ${m}/${y-1}`, short:`T${m}/${y-1}`, income:a.income, exp:a.exp, cats:a.cats};
    const s = yearSummary(y-1); return s? {label:`trung bình tháng năm ${y-1} (năm này chỉ có số tổng)`, short:`TB ${y-1}`, ...avgOf(s)} : null;
  }
  if(mode==='lastyear'){ const s = yearSummary(y-1); return s? {label:`trung bình mỗi tháng năm ${y-1}`, short:`TB ${y-1}`, ...avgOf(s)} : null; }
  const p = prevAverage(y,m); return p.n? {label:`trung bình ${p.n} tháng trước có số liệu`, short:'TB', ...p} : null;
}
function compareCard(y, m, cur){
  const mode = S.cmpMode || 'prev'; const base = compareBase(mode, y, m);
  const modes = [['prev','TB các tháng trước'],['yoy','Cùng kỳ năm trước'],['lastyear',`TB năm ${y-1}`]];
  return `<div class="card"><div class="card-h"><h2>So sánh tháng ${m}/${y}</h2></div>
    <div class="seg" role="group" aria-label="So sánh với" style="margin:-4px 0 10px">${modes.map(([k,l])=>`<button type="button" data-cmp="${k}" aria-pressed="${mode===k}">${l}</button>`).join('')}</div>
    ${base? `<p class="hint" style="margin:0 0 6px">So với ${base.label}.</p><div class="list">
      ${cmpRow('Tổng chi', 'var(--exp)', cur.exp, base.exp, true, base.short)}
      ${CATS.map(c=>cmpRow(c.name, `var(--c-${c.id})`, cur.cats[c.id], base.cats[c.id], false, base.short)).join('')}
      ${cmpRow('Thu nhập', 'var(--accent)', cur.income, base.income, false, base.short)}
    </div><p class="hint" style="margin:10px 0 0">Chênh lệch = tháng này − mốc so sánh. Xanh lá: cao hơn (+); đỏ: thấp hơn (−).</p>`
    : `<div class="empty"><b>Chưa có số liệu để so sánh</b>${mode==='prev'? 'Cần ít nhất một tháng trước có số liệu.' : `Năm ${y-1} chưa có số liệu.`}</div>`}
  </div>`;
}
function yoyFoot(y, m, field){
  const a = monthAgg(y-1)[m-1]; if(a.n){ const d=(field==='income'? monthAgg(y)[m-1].income : monthAgg(y)[m-1].exp) - a[field]; return `Cùng kỳ ${y-1} <b>${compact(a[field])}</b> · <span class="${d>=0?'pos':'neg'}">${signedC(d)}</span>`; }
  const p = prevAverage(y,m); return p.n? `TB các tháng trước <b>${compact(p[field])}</b>` : '';
}
/** All years side by side with a cumulative row — the long-term record. */
function historyCard(sel){
  const rows = []; for(let k=firstYear(); k<=Math.max(curYear(), sel); k++){ const s=yearSummary(k); if(s) rows.push({y:k, ...s}); }
  if(!rows.length) return '';
  const T = {income:sum(rows,r=>r.income), exp:sum(rows,r=>r.exp), months:sum(rows,r=>r.months)};
  return `<div class="card section-gap"><div class="card-h"><h2>Thu chi qua các năm (lũy kế)</h2><span class="sub">Bấm vào một năm để chuyển sang năm đó</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>Năm</th><th>Số tháng</th><th>Thu nhập (₫)</th><th>Chi tiêu (₫)</th><th>Thặng dư (₫)</th><th>Tỷ lệ TK</th><th>Chi TB/tháng</th></tr></thead>
    <tbody>${rows.map(r=>{ const d=r.income-r.exp; return `<tr class="click ${r.y===sel?'sel':''}" data-set-year="${r.y}"><td><b>${r.y}</b>${r.source==='history'?' <span class="chip">số tổng năm</span>':''}${r.y===curYear()?' <span class="chip acc">đến nay</span>':''}</td><td>${r.months}</td><td>${vnd(r.income)}</td><td>${vnd(r.exp)}</td><td class="${d<0?'neg':'pos'}">${signed(d)}</td><td>${r.income?pctPlain(d/r.income):'—'}</td><td>${vnd(r.exp/r.months)}</td></tr>`; }).join('')}
      <tr class="total"><td>Lũy kế</td><td>${T.months}</td><td>${vnd(T.income)}</td><td>${vnd(T.exp)}</td><td class="${T.income-T.exp<0?'neg':'pos'}">${signed(T.income-T.exp)}</td><td>${T.income?pctPlain((T.income-T.exp)/T.income):'—'}</td><td>${vnd(T.exp/(T.months||1))}</td></tr></tbody></table></div></div>`;
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
    if(isNaN(d.v)){ toast(`${f==='income'?'Thu nhập':CAT[f].name}: chưa đọc được số tiền`); $('#mf-'+f)?.focus(); return; }
    const baseAmt = d.v - d.mf.othersSum;
    if(baseAmt<0){ toast(`${f==='income'?'Thu nhập':CAT[f].name}: nhỏ hơn tổng các khoản ghi lẻ (${vnd(d.mf.othersSum)} ₫)`); $('#mf-'+f)?.focus(); return; }
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
  toast(`Đã lưu số liệu ${monthLabel(y,m).toLowerCase()}`);
  render();
}

/* =========================================================
   Views — Tiết kiệm & đầu tư
   ========================================================= */
function investTabs(){ return `<nav class="subtabs" aria-label="Tiết kiệm & đầu tư">${INVEST_TABS.map(([id,l])=>`<a href="#${id}" ${S.view===id?'aria-current="page"':''}>${l}</a>`).join('')}</nav>`; }
function viewInvest(){
  const N = nav(); const em = emergencyStats(); const v = vcbfStats(); const act = activeDeposits();
  const principal = sum(act,d=>d.amount), accrued = sum(act,d=>depCalc(d).accrued);
  const rows = [['savings','Sổ tiết kiệm','#deposits'],['kids','Quỹ cho con','#kids'],['emergency','Quỹ khẩn cấp','#emergency'],['risk','Đầu tư rủi ro cao','#settings']];
  return `${investTabs()}
  ${heroCard()}
  <p class="hint" style="margin:14px 2px 0">Trang này chỉ để xem. Muốn thay đổi số liệu, bấm vào từng hạng mục bên dưới.</p>
  <div class="grid g-4 section-gap">
    <a class="card kpi" href="#deposits"><div class="label"><i class="swatch" style="background:var(--f-savings)"></i>Sổ tiết kiệm</div><div class="value">${compact(N.parts.savings)}</div>
      <div class="foot">Gốc đang gửi <b>${compact(principal)}</b> · ${act.length} sổ</div><div class="foot">Lãi tạm tính <b class="pos" data-live="accrued">+${vnd(accrued)}</b> ₫</div><span class="card-link">Xem & cập nhật ${ico(ICONS.arrow)}</span></a>
    <a class="card kpi" href="#emergency"><div class="label"><i class="swatch" style="background:var(--f-emergency)"></i>Quỹ khẩn cấp</div><div class="value">${compact(em.bal)}</div>
      <div class="foot">Đủ <b>${fmt1(em.months)}</b> tháng chi tiêu · mục tiêu ${em.target}</div><div class="foot">Thu – chi ${S.year}: <b class="${em.yearNet<0?'neg':'pos'}">${signedC(em.yearNet)}</b></div><span class="card-link">Xem & cập nhật ${ico(ICONS.arrow)}</span></a>
    <a class="card kpi" href="#kids"><div class="label"><i class="swatch" style="background:var(--f-kids)"></i>Quỹ cho con</div><div class="value">${compact(v.value)}</div>
      <div class="foot">Vốn góp <b>${compact(v.cost)}</b></div><div class="foot">Lãi/lỗ <b class="${v.pl>=0?'pos':'neg'}">${pct(v.plPct,2)}</b> · ${signedC(v.pl)}</div><span class="card-link">Xem & cập nhật ${ico(ICONS.arrow)}</span></a>
    <a class="card kpi" href="#settings"><div class="label"><i class="swatch" style="background:var(--f-risk)"></i>Đầu tư rủi ro cao</div><div class="value">${compact(N.parts.risk)}</div>
      <div class="foot">${esc(cfg().highRiskNote)||'Chưa có danh mục'}</div><span class="card-link">Cập nhật trong Thiết lập ${ico(ICONS.arrow)}</span></a>
  </div>
  <div class="card section-gap"><div class="card-h"><h2>Phân bổ tài sản</h2><span class="sub">Tổng ${vnd(N.total)} ₫</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>Hạng mục</th><th>Giá trị (₫)</th><th>Tỷ trọng</th><th class="l" style="min-width:180px"></th></tr></thead>
    <tbody>${rows.map(([k,l,h])=>`<tr class="click" data-href="${h}"><td><i class="swatch" style="background:var(--f-${k});margin-right:8px"></i>${l}</td><td>${vnd(N.parts[k])}</td><td>${N.total?pctPlain(N.parts[k]/N.total):'—'}</td><td class="l"><div class="meter"><i style="width:${N.total?N.parts[k]/N.total*100:0}%;background:var(--f-${k})"></i></div></td></tr>`).join('')}
      <tr class="total"><td>Tổng tài sản ròng</td><td>${vnd(N.total)}</td><td>100%</td><td></td></tr></tbody></table></div>
  </div>`;
}

function reconTable(fund, principal, nBooks, diff, ok){
  const c = cfg(); const L = S.fund.filter(e=>e.fund==='savings');
  const sumT = t => sum(L.filter(e=>e.type===t), e=>e.amount), cnt = t => L.filter(e=>e.type===t).length;
  return `<div class="recon">
    <span>Số dư đầu kỳ (${fmtDate(c.openings.asOf)})</span><span class="v">${vnd(c.openings.savings)}</span>
    <span>+ Nạp vào · ${cnt('in')} giao dịch</span><span class="v pos">+${vnd(sumT('in'))}</span>
    <span>− Rút ra · ${cnt('out')} giao dịch</span><span class="v neg">−${vnd(sumT('out'))}</span>
    <span>+ Nhận lãi · ${cnt('interest')} giao dịch</span><span class="v pos">+${vnd(sumT('interest'))}</span>
    <span class="sep"></span>
    <b>Số dư quỹ theo nhật ký</b><b class="v">${vnd(fund)}</b>
    <span>Tổng gốc ${nBooks} sổ đang gửi</span><span class="v">${vnd(principal)}</span>
    <span class="sep"></span>
    <b>Chênh lệch</b><b class="v ${ok?'pos':'warn'}">${signed(diff)}</b></div>`;
}
const daysTone = k => k.status==='closed'?'muted':k.status==='matured'?'neg':k.status==='soon'?'warn':'pos';
/** Live countdown to maturity (midnight of the maturity date): "37 ngày" + "14:22:05". */
function daysText(d, nowMs=Date.now()){
  if(isClosed(d)) return '<span class="muted">—</span>';
  const mat = depMaturity(d); const ms = parseISO(mat).getTime() - nowMs;
  if(ms<=0) return `<b>Quá ${Math.floor(-ms/86400000)} ngày</b><small>hạn ${fmtDate(mat)}</small>`;
  const days = Math.floor(ms/86400000), r = ms%86400000;
  return `<b>${days} ngày</b><small>${pad(Math.floor(r/3600000))}:${pad(Math.floor(r%3600000/60000))}:${pad(Math.floor(r%60000/1000))}</small>`;
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
  const statusChip = k => k.status==='closed'? '<span class="chip">Đã tất toán</span>' : k.status==='matured'? '<span class="chip neg">Đến hạn</span>' : k.status==='soon'? `<span class="chip warn">Đang gửi · còn ${k.left} ngày</span>` : '<span class="chip pos">Đang gửi</span>';
  return `${investTabs()}
  <div class="grid g-4">
    ${kpi('<i class="swatch" style="background:var(--f-savings)"></i>Số dư Quỹ tiết kiệm', `${compact(fund)}`, `<b>${vnd(fund)}</b> ₫`, 'accent')}
    ${kpi('Tổng gốc đang gửi', `${compact(principal)}`, `${act.length} sổ · <b>${vnd(principal)}</b> ₫`)}
    ${kpi('Lãi tạm tính đến hiện tại', `<span class="pos">+${vnd(accrued)}</span>`, `Tính đến hết ngày <b>${fmtDate(todayISO())}</b> · cập nhật mỗi ngày`)}
    ${kpi('Lãi dự kiến khi đến hạn', `+${compact(atMat)}`, `Gốc + lãi <b>${compact(principal+atMat)}</b>`)}
  </div>
  <div class="grid g-split section-gap">
    <div class="card"><div class="card-h"><h2>Đối chiếu số dư quỹ và sổ đang gửi</h2></div>
      ${reconTable(fund, principal, act.length, diff, ok)}
      <div class="recon-status ${ok?'ok':'bad'}">${ico(ok?ICONS.check:ICONS.alert)}<div><b>${ok?'Khớp số liệu':'Có chênh lệch'}</b><span>${ok?'Tổng gốc các sổ khớp với số dư quỹ.': diff>0? `Nhật ký cao hơn tổng gốc ${vnd(diff)} ₫. Kiểm tra số dư đầu kỳ và các dòng rút/nạp; nếu số gốc trên sổ đã đúng, ghi một bút toán điều chỉnh.` : `Tổng gốc cao hơn nhật ký ${vnd(-diff)} ₫. Thường do tiền lãi nhập gốc (tái tục) chưa ghi “Nhận lãi” trong nhật ký.`}</span>${!ok && S.canWrite? `<button class="btn sm" type="button" data-fix-diff="${Math.round(diff)}" style="margin-top:8px">Ghi bút toán điều chỉnh ${signed(-diff)} ₫</button>`:''}</div></div>
    </div>
    <div class="card"><div class="card-h"><h2>Phân loại theo ngân hàng</h2><span class="sub">Sổ đang gửi</span></div>
      ${bankRows.length? `<div class="tbl-wrap"><table><thead><tr><th>Ngân hàng</th><th>Số sổ</th><th>Giá trị (₫)</th><th>Tỷ trọng</th></tr></thead>
        <tbody>${bankRows.map(([b,x])=>`<tr><td>${bankBadge(b)}</td><td>${x.n}</td><td>${vnd(x.v)}</td><td>${pctPlain(x.v/principal)}</td></tr>`).join('')}
        <tr class="total"><td>Tổng</td><td>${act.length}</td><td>${vnd(principal)}</td><td>100%</td></tr></tbody></table></div>` : '<div class="empty"><b>Chưa có sổ đang gửi</b></div>'}
    </div>
  </div>
  <div class="grid g-split section-gap">
    <div class="card"><div class="card-h"><h2>Lịch đáo hạn</h2><span class="sub">${sched.length} sổ đang gửi</span></div>
      <div class="list">${sched.length? sched.map(({d,k})=>`<div class="mat"><div class="date"><b>${k.mat.slice(8,10)}</b><span>${k.mat.slice(5,7)}/${k.mat.slice(0,4)}</span></div>
        <div style="min-width:0"><div class="t">${bankBadge(d.bank,'sm')} <span>${esc(d.label||'Kỳ hạn '+d.term+' tháng')}</span></div><div class="s">${d.term} tháng · ${(+d.rate||0).toLocaleString('vi-VN')}%/năm · lãi đáo hạn +${vnd(k.atMat)} ₫</div></div>
        <div class="amt">${compact(d.amount)}<div>${statusChip(k)}</div></div></div>`).join('') : '<div class="empty"><b>Không có sổ sắp đáo hạn</b></div>'}</div>
    </div>
    <div class="card"><div class="card-h"><h2>Nhập giao dịch quỹ tiết kiệm</h2><span class="sub">Nạp vào, rút ra, nhận lãi</span></div>
      ${S.canWrite? fundForm('savings') : '<p class="hint">Tài khoản chỉ xem không ghi được giao dịch.</p>'}</div>
  </div>
  <div class="card section-gap"><div class="card-h"><h2>Chi tiết các sổ tiết kiệm</h2>${S.canWrite?`<button class="btn sm primary" type="button" data-add-dep>${ico(ICONS.plus)}Thêm sổ</button>`:''}</div>
    ${table.length? `<div class="tbl-wrap"><table>
      <thead><tr><th>Ngân hàng</th><th class="l">Kỳ hạn</th><th>Ngày gửi</th><th>Ngày đáo hạn</th><th>Số tiền (₫)</th><th>Lãi %/năm</th><th>Lãi tạm tính</th><th>Tổng tiền<br><small>(lãi tạm tính)</small></th><th>Tổng tiền<br><small>(đến hạn)</small></th><th class="l">Trạng thái</th><th>Số ngày</th><th class="l">Ghi chú / nguồn</th>${S.canWrite?'<th></th>':''}</tr></thead>
      <tbody>${table.map(({d,k})=>`<tr class="${k.status==='closed'?'muted-row':''}"><td>${bankBadge(d.bank)}</td><td class="txt">${d.term} tháng</td><td>${fmtDate(d.start)}</td><td>${fmtDate(k.mat)}</td><td><b>${vnd(d.amount)}</b></td><td>${(+d.rate||0).toLocaleString('vi-VN')}%</td><td class="pos">+${vnd(k.accrued)}<div class="sub-date">${k.elapsed}/${k.totalDays} ngày</div></td><td><b>${vnd((+d.amount||0)+k.accrued)}</b></td><td>${vnd((+d.amount||0)+k.atMat)}<div class="sub-date">lãi +${vnd(k.atMat)}</div></td><td class="txt">${statusChip(k)}</td><td class="days ${daysTone(k)}" ${k.status==='closed'?'':`data-live-days="${esc(d.id)}"`}>${daysText(d)}</td><td class="wrap">${esc(d.note||'')}</td>
        ${S.canWrite?`<td><span class="act"><button class="btn xs" type="button" data-edit-dep="${esc(d.id)}">Sửa</button>${k.status==='closed'?`<button class="btn xs" type="button" data-reopen-dep="${esc(d.id)}">Mở lại</button>`:`<button class="btn xs" type="button" data-close-dep="${esc(d.id)}">Tất toán</button>`}${delBtn('deposits',d.id)}</span></td>`:''}</tr>`).join('')}
        <tr class="total"><td>Tổng đang gửi</td><td></td><td></td><td></td><td>${vnd(principal)}</td><td></td><td class="pos">+${vnd(accrued)}</td><td>${vnd(principal+accrued)}</td><td>${vnd(principal+atMat)}</td><td></td><td></td><td></td>${S.canWrite?'<td></td>':''}</tr></tbody>
    </table></div>` : `<div class="empty"><b>Chưa có sổ tiết kiệm</b>Bấm “Thêm sổ” để nhập sổ đầu tiên.</div>`}
    <p class="hint" style="margin:10px 0 0">Lãi tạm tính = Tiền gửi × Lãi suất × Số ngày đã gửi / 365, tính đến hết ngày ${fmtDate(todayISO())}. Lãi đến hạn tính theo ngày đáo hạn đã lưu trên từng sổ.</p>
  </div>
  <div class="card section-gap"><div class="card-h"><h2>Nhật ký giao dịch quỹ tiết kiệm</h2>${journalSub('savings')}</div>${fundJournal('savings')}</div>`;
}

function viewEmergency(){
  const em = emergencyStats(); const y = S.year;
  const flows = fundYearFlows('emergency'); const years = Object.keys(flows).sort();
  let run = 0; const fRows = years.map(k=>{ const f=flows[k]; run += f.in-f.out; return {y:k, in:f.in, out:f.out, net:f.in-f.out, end:run}; });
  const tIn = sum(fRows,r=>r.in), tOut = sum(fRows,r=>r.out);
  const pts = [{label:'Đầu', full:'Đầu năm '+y, v: fundBalance('emergency', (y-1)+'-12-31')}];
  for(let i=1;i<=monthsElapsed(y);i++) pts.push({label:'T'+i, full:`Cuối tháng ${i}/${y}`, v:fundBalance('emergency', lastDayISO(y,i))});
  const minPct = em.minProgress;
  return `${investTabs()}
  <div class="grid g-3">
    ${kpi('<i class="swatch" style="background:var(--f-emergency)"></i>Số dư quỹ khẩn cấp', `${vnd(em.bal)}<small>₫</small>`, 'Cập nhật ngay khi ghi nhận thu/chi', 'accent')}
    ${kpi('Chi tiêu trung bình / tháng', `${vnd(em.avg)}<small>₫</small>`, `Tính trên ${esc(em.basis)}`)}
    ${kpi(`Mục tiêu ${em.target} tháng`, `${vnd(em.targetAmt)}<small>₫</small>`, em.gap>=0? `<span class="chip pos">Dư ${vnd(em.gap)} ₫</span>` : `<span class="chip neg">Còn thiếu ${vnd(-em.gap)} ₫</span>`)}
    <div class="card kpi"><div class="label">Số dư hiện đủ dùng</div><div class="value">${fmt1(em.months)}<small>tháng ≈ ${em.days} ngày</small></div>
      <div class="meter ${em.months>=em.target?'pos':em.months>=EMERGENCY_MIN?'gold':'warn'}" style="margin-top:9px"><i style="width:${Math.min(100,em.months/em.target*100)}%"></i></div>
      <div class="foot">So với mục tiêu ${em.target} tháng (${em.target*30} ngày): ${pctPlain(Math.min(1,em.months/em.target),0)}</div></div>
    ${kpi(`Thu – Chi quỹ năm ${y}`, `<span class="${em.yearNet<0?'neg':'pos'}">${signed(em.yearNet)}</span><small>₫</small>`, `Thu <b>${compact(em.yearIn)}</b> · Chi <b>${compact(em.yearOut)}</b> (đến nay)`)}
    <div class="card kpi"><div class="label">Tiến độ mốc an toàn tối thiểu ${EMERGENCY_MIN} tháng</div><div class="value ${minPct>=1?'pos':''}">${pctPlain(Math.min(minPct,9.99),0)}</div>
      <div class="meter ${minPct>=1?'pos':'gold'}" style="margin-top:9px"><i style="width:${Math.min(100,minPct*100)}%"></i></div>
      <div class="foot">Mốc ${vnd(em.minAmt)} ₫ · ${minPct>=1? `<span class="chip pos">Đã vượt ${compact(em.bal-em.minAmt)}</span>` : `<span class="chip warn">Còn thiếu ${vnd(em.minAmt-em.bal)} ₫</span>`}</div></div>
  </div>
  <div class="grid g-split section-gap">
    <div class="card"><div class="card-h"><h2>Dòng tiền quỹ theo năm</h2><span class="sub">${years[0]||y} – hiện tại</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>Năm</th><th>Thu vào (₫)</th><th>Chi ra (₫)</th><th>Tiền ròng (₫)</th><th>Số dư cuối kỳ</th></tr></thead>
        <tbody>${fRows.map(r=>`<tr><td><b>${r.y}</b>${+r.y===y?' <span class="chip acc">đến nay</span>':''}</td><td class="pos">${vnd(r.in)}</td><td class="neg">${vnd(r.out)}</td><td class="${r.net<0?'neg':'pos'}"><b>${signed(r.net)}</b></td><td>${vnd(r.end)}</td></tr>`).join('')}
        <tr class="total"><td>Tổng cộng</td><td class="pos">${vnd(tIn)}</td><td class="neg">${vnd(tOut)}</td><td class="${tIn-tOut<0?'neg':'pos'}">${signed(tIn-tOut)}</td><td>${vnd(em.bal)}</td></tr></tbody></table></div>
      <div style="margin-top:16px">${chartArea(pts,'var(--f-emergency)','Số dư quỹ khẩn cấp theo tháng','emg')}</div>
    </div>
    <div class="card"><div class="card-h"><h2>Ghi nhận thu / chi quỹ khẩn cấp</h2></div>${S.canWrite? fundForm('emergency') : '<p class="hint">Tài khoản chỉ xem không ghi được giao dịch.</p>'}</div>
  </div>
  <div class="card section-gap"><div class="card-h"><h2>Nhật ký thu – chi quỹ khẩn cấp</h2>${journalSub('emergency')}</div>${fundJournal('emergency')}</div>`;
}

function viewKids(){
  const P = portfolio(); const items = P.items;
  if(!S.product || !items.some(i=>i.p.id===S.product)) S.product = items[0]?.p.id || null;
  const sel = items.find(i=>i.p.id===S.product);
  const sip = items.filter(i=>i.p.mode==='sip').length;
  return `${investTabs()}
  <div class="grid g-4">
    ${kpi('<i class="swatch" style="background:var(--f-kids)"></i>Giá trị hiện tại', compact(P.value), `<b>${vnd(P.value)}</b> ₫ · ${items.length} sản phẩm`, 'accent')}
    ${kpi('Vốn đã góp', compact(P.cost), `Vốn của phần đang nắm giữ · <b>${vnd(P.cost)}</b> ₫`)}
    ${kpi('Lãi / lỗ', `<span class="${P.pl>=0?'pos':'neg'}">${signedC(P.pl)}</span>`, `<span class="chip ${P.unreal>=0?'pos':'neg'}">${pct(P.plPct,2)}</span> ${P.realized? `đã chốt <b class="${P.realized>=0?'pos':'neg'}">${signedC(P.realized)}</b>`:'chưa chốt lời/lỗ'}`)}
    ${kpi('Giao dịch', `${P.tx}`, `${sip} sản phẩm định kỳ · ${items.length-sip} mua một lần`)}
  </div>
  <div class="card section-gap"><div class="card-h"><h2>Danh mục đầu tư</h2>${S.canWrite?`<div class="top-actions"><button class="btn sm" type="button" data-add-product>${ico(ICONS.plus)}Thêm sản phẩm</button><button class="btn sm primary" type="button" data-add-lot="">${ico(ICONS.plus)}Thêm giao dịch</button></div>`:''}</div>
    ${items.length? `<div class="tbl-wrap"><table>
      <thead><tr><th>Sản phẩm</th><th class="l">Hình thức</th><th>Số lượng</th><th>Giá vốn BQ</th><th>Giá hiện tại</th><th>Giá trị (₫)</th><th>Vốn (₫)</th><th>Lãi / lỗ</th><th>Tỷ trọng</th></tr></thead>
      <tbody>${items.map(i=>`<tr class="click ${i.p.id===S.product?'sel':''}" data-product="${esc(i.p.id)}"><td><div class="prod"><i class="swatch" style="background:${i.p.color}"></i><div><b>${esc(productLabel(i.p))}</b><span>${esc(i.p.manager||'—')} · ${PRODUCT_TYPES[i.p.type]||'Khác'}</span></div></div></td>
        <td class="txt"><span class="chip ${i.p.mode==='sip'?'acc':'gold'}">${PRODUCT_MODES[i.p.mode]||PRODUCT_MODES.lump}</span></td>
        <td>${fmtUnits(i.units)} <span class="muted">${esc(i.p.unit||'')}</span></td><td>${fmtPrice(i.avg)}</td><td>${fmtPrice(i.price)}<div class="sub-date">${i.p.priceDate? fmtDate(i.p.priceDate):'chưa cập nhật'}</div></td>
        <td><b>${vnd(i.value)}</b></td><td>${vnd(i.cost)}</td><td class="${i.pl>=0?'pos':'neg'}">${signed(i.pl)}<div class="sub-date">${pct(i.plPct,2)}</div></td><td>${P.value? pctPlain(i.value/P.value):'—'}</td></tr>`).join('')}
      <tr class="total"><td>Tổng danh mục</td><td></td><td></td><td></td><td></td><td>${vnd(P.value)}</td><td>${vnd(P.cost)}</td><td class="${P.pl>=0?'pos':'neg'}">${signed(P.pl)}</td><td>100%</td></tr></tbody></table></div>
      <p class="hint" style="margin:10px 0 0">Bấm vào một sản phẩm để xem chi tiết, cập nhật giá và giao dịch của riêng sản phẩm đó.</p>`
    : `<div class="empty"><b>Chưa có sản phẩm đầu tư</b>Bấm “Thêm sản phẩm” để tạo quỹ đầu tiên, rồi thêm giao dịch mua.</div>`}
  </div>
  ${kidsByYear()}
  ${sel? productDetail(sel, items) : ''}`;
}
function kidsByYear(){
  const rows={}; for(const l of S.vcbf){ const y=(l.date||'').slice(0,4); if(!y) continue; rows[y]=rows[y]||{buy:0,sell:0,n:0}; const v=(+l.units||0)*(+l.price||0); if(l.side==='sell') rows[y].sell+=v-(+l.fee||0); else rows[y].buy+=v+(+l.fee||0); rows[y].n++; }
  const ys=Object.keys(rows).sort(); if(!ys.length) return '';
  let cum=0; const T={buy:sum(ys,y=>rows[y].buy), sell:sum(ys,y=>rows[y].sell), n:sum(ys,y=>rows[y].n)};
  return `<div class="card section-gap"><div class="card-h"><h2>Vốn góp theo năm</h2><span class="sub">Tất cả sản phẩm · lũy kế qua các năm</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>Năm</th><th>Giao dịch</th><th>Mua vào (₫)</th><th>Bán / rút (₫)</th><th>Góp ròng (₫)</th><th>Lũy kế góp ròng (₫)</th></tr></thead>
    <tbody>${ys.map(y=>{ const r=rows[y], net=r.buy-r.sell; cum+=net; return `<tr class="click ${+y===S.year?'sel':''}" data-set-year="${y}"><td><b>${y}</b></td><td>${r.n}</td><td>${vnd(r.buy)}</td><td>${r.sell?vnd(r.sell):'—'}</td><td>${vnd(net)}</td><td><b>${vnd(cum)}</b></td></tr>`; }).join('')}
      <tr class="total"><td>Tổng</td><td>${T.n}</td><td>${vnd(T.buy)}</td><td>${T.sell?vnd(T.sell):'—'}</td><td>${vnd(T.buy-T.sell)}</td><td>${vnd(T.buy-T.sell)}</td></tr></tbody></table></div></div>`;
}
function productDetail(i, items){
  const p = i.p; const buys = i.lots.filter(l=>l.side!=='sell');
  return `<div class="card section-gap" id="productDetail">
    <div class="card-h"><h2>${esc(productLabel(p))}${p.name && p.code? ` <span class="muted" style="font-weight:500;font-size:13px">· ${esc(p.name)}</span>`:''}</h2>
      ${S.canWrite?`<div class="top-actions"><button class="btn sm" type="button" data-edit-product="${esc(p.id)}">Sửa thông tin</button><button class="btn sm primary" type="button" data-add-lot="${esc(p.id)}">${ico(ICONS.plus)}Giao dịch ${esc(productLabel(p))}</button></div>`:''}</div>
    ${items.length>1? `<div class="pills" style="margin-bottom:14px" role="group" aria-label="Chọn sản phẩm">${items.map(x=>`<button type="button" class="pill" data-product="${esc(x.p.id)}" aria-pressed="${x.p.id===p.id}"><i class="swatch" style="background:${x.p.color}"></i>${esc(productLabel(x.p))}</button>`).join('')}</div>` : ''}
    <div class="grid g-4">
      <div class="mini"><span>Công ty quản lý</span><b>${esc(p.manager||'—')}</b><em>${PRODUCT_TYPES[p.type]||'Khác'} · ${PRODUCT_MODES[p.mode]||PRODUCT_MODES.lump}</em></div>
      <div class="mini"><span>Đang nắm giữ</span><b>${fmtUnits(i.units)} ${esc(p.unit||'')}</b><em>Giá vốn BQ ${fmtPrice(i.avg)}</em></div>
      <div class="mini"><span>Giá trị hiện tại</span><b>${vnd(i.value)}</b><em>Vốn ${vnd(i.cost)}</em></div>
      <div class="mini"><span>Lãi / lỗ</span><b class="${i.pl>=0?'pos':'neg'}">${signed(i.pl)}</b><em>${pct(i.plPct,2)}${i.realized? ` · đã chốt ${signedC(i.realized)}`:''}</em></div>
    </div>
    <div class="price-row">
      <div class="field" style="flex:1;min-width:200px"><label for="price-${esc(p.id)}">Giá ${esc(p.unit||'đơn vị')} hiện tại · ${esc(productLabel(p))}</label>
        ${S.canWrite? `<div style="display:flex;gap:6px"><input class="input num" id="price-${esc(p.id)}" inputmode="decimal" value="${i.price? String(i.price).replace('.',','):''}" placeholder="vd: 13732,75"><button class="btn primary" type="button" data-save-price="${esc(p.id)}">Cập nhật giá</button></div>` : `<b class="num">${fmtPrice(i.price)}</b>`}</div>
      <p class="hint" style="margin:0;flex:1;min-width:200px">${p.priceDate? 'Cập nhật lần cuối '+fmtDate(p.priceDate)+'.' : 'Chưa cập nhật giá.'} Giá này chỉ áp dụng cho ${esc(productLabel(p))}; mỗi sản phẩm giữ giá riêng.</p>
    </div>
    ${buys.length? `<div class="section-gap"><div class="flabel" style="margin-bottom:6px">Lãi/lỗ % từng lần mua theo thời gian</div>${chartLotPL(buys, i.price)}</div>`:''}
    <div class="section-gap">${i.lots.length? `<div class="tbl-wrap"><table>
      <thead><tr><th>Ngày</th><th class="l">Loại</th><th>Số lượng</th><th>Giá</th><th>Giá trị giao dịch</th><th>Giá trị hiện tại</th><th>Lãi / lỗ</th><th class="l" style="min-width:140px">% lãi/lỗ</th></tr></thead>
      <tbody>${i.lots.map(l=>{ const u=+l.units||0, pr=+l.price||0, fee=+l.fee||0, sell=l.side==='sell';
        const amount = u*pr + (sell? -fee : fee), val = u*i.price, r = pr? (i.price-pr)/pr : 0, w = Math.min(50, Math.abs(r)*250);
        return `<tr class="click" data-edit-lot="${esc(l.id)}"><td class="num">${fmtDate(l.date)}</td><td class="txt"><span class="chip ${sell?'neg':'pos'}">${sell?'Bán / rút':'Mua'}</span></td><td>${fmtUnits(u)}</td><td>${fmtPrice(pr)}</td><td>${vnd(amount)}</td>
          <td>${sell?'—':vnd(val)}</td><td class="${sell?'':val-amount>=0?'pos':'neg'}">${sell?'—':signed(val-amount)}</td>
          <td class="l">${sell? '<span class="muted">Đã chốt</span>' : `<div style="display:flex;align-items:center;gap:8px"><div style="position:relative;width:80px;height:8px;background:var(--sunken);border-radius:4px;flex:none"><span style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:var(--line)"></span><span style="position:absolute;top:0;bottom:0;border-radius:4px;${r>=0?`left:50%;width:${w}%;background:var(--pos)`:`right:50%;width:${w}%;background:var(--neg)`}"></span></div><span class="${r>=0?'pos':'neg'}">${pct(r,1)}</span></div>`}</td></tr>`; }).join('')}
        <tr class="total"><td>Tổng</td><td></td><td>${fmtUnits(i.units)}</td><td>${fmtPrice(i.avg)}</td><td>${vnd(i.cost)}</td><td>${vnd(i.value)}</td><td class="${i.pl>=0?'pos':'neg'}">${signed(i.pl)}</td><td class="l ${i.pl>=0?'pos':'neg'}">${pct(i.plPct,2)}</td></tr>
      </tbody></table></div>` : `<div class="empty"><b>Chưa có giao dịch</b>Bấm “Giao dịch ${esc(productLabel(p))}” để thêm lần mua đầu tiên.</div>`}</div>
  </div>`;
}

/* =========================================================
   Views — Thiết lập
   ========================================================= */
function viewSettings(){
  const c = cfg(); const ro = S.canWrite? '' : 'readonly';
  const budTotal = sum(CATS,cc=>c.budgets[cc.id]);
  return `<div class="grid g-2">
    <div class="card"><div class="card-h"><h2>Ngân sách chi tiêu tháng</h2><span class="sub num">Tổng ${vnd(budTotal)} ₫</span></div>
      <div class="stack" style="gap:10px">${CATS.map(cc=>`<div class="field"><label for="bud-${cc.id}"><i class="swatch" style="background:var(--c-${cc.id});margin-right:6px"></i>${cc.name}</label><input class="input num" id="bud-${cc.id}" data-budget="${cc.id}" value="${c.budgets[cc.id]?vnd(c.budgets[cc.id]):''}" placeholder="vd: 12tr" ${ro}></div>`).join('')}</div>
      <p class="hint">Dùng để cảnh báo khi một khoản chi vượt ngân sách. Tự lưu khi rời ô.</p>
    </div>
    <div class="stack">
      <div class="card"><div class="card-h"><h2>Đầu tư rủi ro cao</h2></div>
        <div class="field"><label for="riskVal">Giá trị hiện tại (₫)</label><input class="input num" id="riskVal" data-cfg-amount="highRisk" value="${c.highRisk?vnd(c.highRisk):'0'}" ${ro}></div>
        <div class="field" style="margin-top:10px"><label for="riskNote">Ghi chú danh mục</label><input class="input" id="riskNote" data-cfg-text="highRiskNote" value="${esc(c.highRiskNote)}" placeholder="vd: cổ phiếu, vàng…" ${ro}></div>
      </div>
      <div class="card"><div class="card-h"><h2>Quỹ khẩn cấp</h2></div>
        <div class="field"><label for="emgTarget">Mục tiêu (số tháng chi tiêu)</label><input class="input num" id="emgTarget" data-cfg-int="emergencyTarget" value="${c.emergencyTarget}" inputmode="numeric" ${ro}><span class="hint">Mốc an toàn tối thiểu cố định ${EMERGENCY_MIN} tháng.</span></div>
      </div>
      <div class="card"><div class="card-h"><h2>Số dư đầu kỳ</h2><span class="sub">tính đến ${fmtDate(c.openings.asOf)}</span></div>
        <div class="row2"><div class="field"><label for="opE">Quỹ khẩn cấp</label><input class="input num" id="opE" data-opening="emergency" value="${vnd(c.openings.emergency)}" ${ro}></div>
        <div class="field"><label for="opS">Quỹ tiết kiệm</label><input class="input num" id="opS" data-opening="savings" value="${vnd(c.openings.savings)}" ${ro}></div></div>
      </div>
    </div>
  </div>
  <div class="grid g-2 section-gap">
    <div class="card"><div class="card-h"><h2>Tài sản ròng các năm trước</h2><span class="sub">Dùng để so sánh tăng trưởng</span></div>
      <div class="row2">${navYears().map(k=>`<div class="field"><label for="nav-${k}">Cuối năm ${k}</label><input class="input num" id="nav-${k}" data-nav="${k}" value="${c.navHistory[k]?vnd(c.navHistory[k]):''}" placeholder="chưa chốt" ${ro}></div>`).join('')}</div>
      ${S.canWrite && curYear()-1>ledgerStartYear()? `<div style="margin-top:12px"><button class="btn sm" type="button" data-close-year="${curYear()-1}">Chốt lại tài sản ròng cuối năm ${curYear()-1} từ sổ quỹ</button></div>`:''}
      <p class="hint">Mỗi đầu năm, hệ thống tự chốt tài sản ròng cuối năm trước để làm mốc so sánh.</p>
    </div>
    <div class="card"><div class="card-h"><h2>Xuất dữ liệu</h2></div>
      <p class="hint" style="margin-top:0">Tải về để mở bằng Excel hoặc sao lưu toàn bộ.</p>
      <div class="top-actions">
        <button class="btn" type="button" data-export="tx">${ico(ICONS.down)}Thu chi (.csv)</button>
        <button class="btn" type="button" data-export="fund">${ico(ICONS.down)}Sổ quỹ (.csv)</button>
        <button class="btn" type="button" data-export="json">${ico(ICONS.down)}Sao lưu (.json)</button>
      </div>
    </div>
  </div>
  ${viewMembers()}
  ${viewShortcuts()}`;
}
function navYears(){ const ys=[]; for(let k=firstYear(); k<curYear(); k++) ys.push(k); return ys; }
/* ---------- iPhone Shortcuts (widget) ---------- */
function loadTokens(){ if(S._tokensLoading || !window.FIN) return; S._tokensLoading=true;
  FIN.listTokens().then(t=>{ S.tokens=t; }).catch(()=>{ S.tokens=[]; }).finally(()=>{ S._tokensLoading=false; scheduleRender(); }); }
function copyBtn(text, label='Sao chép'){ return `<button class="btn xs" type="button" data-copy="${esc(text)}">${label}</button>`; }
function viewShortcuts(){
  const me = window.FIN?.session(); if(!me) return '';
  if(!S.tokens) loadTokens();
  const origin = location.origin, sumUrl = origin+'/api/shortcut/summary', addUrl = origin+'/api/shortcut/add';
  const canAdd = me.role!=='viewer';
  const fmtTs = ms => ms? fmtDateTime(new Date(ms)).slice(0,16) : 'chưa dùng';
  return `<div class="card section-gap" id="shortcutCard"><div class="card-h"><h2>Phím tắt & widget iPhone</h2><span class="sub">Dùng ứng dụng Phím tắt có sẵn của Apple</span></div>
    <div class="grid g-split">
      <div class="stack" style="gap:14px">
        <p class="hint" style="margin:0">Ứng dụng web không tạo được widget riêng; ứng dụng <b>Phím tắt</b> của iPhone làm thay: đặt widget ra màn hình chính để <b>xem tình hình</b> hoặc <b>ghi chi tiêu</b> mà không cần mở ứng dụng. Mỗi người tạo một mã cho iPhone của mình; mã chỉ dùng được cho hai việc này và có thể thu hồi bất cứ lúc nào.</p>
        <form id="tokenForm" class="row2" novalidate style="align-items:end">
          <div class="field"><label for="tk-name">Tên thiết bị</label><input class="input" id="tk-name" maxlength="40" value="iPhone của ${esc(me.name)}"></div>
          <div><button class="btn primary" type="submit">${ico(ICONS.plus)}Tạo mã phím tắt</button></div>
        </form>
        ${S.newToken? `<div class="token-box"><b>Mã của bạn — chỉ hiện một lần, hãy sao chép ngay:</b><code id="newToken">${esc(S.newToken)}</code><div class="top-actions">${copyBtn(S.newToken,'Sao chép mã')}${copyBtn('Bearer '+S.newToken,'Sao chép “Bearer + mã”')}<button class="btn xs ghost" type="button" data-hide-token>Đã lưu, ẩn đi</button></div></div>` : ''}
        <div class="list">${!S.tokens? '<div class="hint">Đang tải…</div>' : !S.tokens.length? '<div class="hint">Chưa có mã nào.</div>' :
          S.tokens.map(t=>`<div class="row" style="grid-template-columns:auto minmax(0,1fr) auto"><span class="cat-ico" style="background:var(--accent)">${ico('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>')}</span><div style="min-width:0"><div class="t">${esc(t.name)}</div><div class="s">Tạo ${fmtTs(t.createdAt)} · dùng gần nhất ${fmtTs(t.lastUsed)}</div></div><button class="btn xs danger" type="button" data-revoke-token="${esc(t.id)}">Thu hồi</button></div>`).join('')}</div>
      </div>
      <div class="guide">
        <b class="flabel">Thông tin để điền vào Phím tắt</b>
        <dl class="kv1">
          <div><dt>Xem tình hình (GET)</dt><dd><code>${esc(sumUrl)}</code>${copyBtn(sumUrl)}</dd></div>
          ${canAdd? `<div><dt>Ghi chi tiêu (POST, JSON)</dt><dd><code>${esc(addUrl)}</code>${copyBtn(addUrl)}</dd></div>` : ''}
          <div><dt>Tiêu đề (Headers)</dt><dd><code>Authorization</code> = <code>Bearer &lt;mã&gt;</code></dd></div>
          ${canAdd? `<div><dt>Trường gửi đi</dt><dd><code>danh_muc</code> (vd: ăn uống, xăng, khám bệnh) · <code>so_tien</code> (250000 hoặc 250k) · <code>ghi_chu</code> · <code>loai</code> = chi / thu</dd></div>` : ''}
        </dl>
        <details class="howto" open><summary>Tạo phím tắt “Xem tình hình”</summary><ol>
          <li>Mở ứng dụng <b>Phím tắt</b> › <b>+</b> › <b>Thêm tác vụ</b> › <b>Lấy nội dung của URL</b>; dán địa chỉ “Xem tình hình”.</li>
          <li>Bấm <b>›</b> mở rộng › <b>Tiêu đề</b> › Thêm: khóa <code>Authorization</code>, giá trị <code>Bearer</code> + mã (dùng nút “Sao chép Bearer + mã”).</li>
          <li>Thêm tác vụ <b>Hiển thị kết quả</b>. Đặt tên phím tắt “Tài chính hôm nay”.</li>
        </ol></details>
        ${canAdd? `<details class="howto"><summary>Tạo phím tắt “Ghi chi tiêu”</summary><ol>
          <li><b>Danh sách</b>: nhập các mục Ăn uống, Đi lại, Giúp việc, Điện nước, Mua sắm, Khám cho con, Phí quản lý.</li>
          <li><b>Chọn từ danh sách</b> (lời nhắc: “Chi cho gì?”).</li>
          <li><b>Yêu cầu đầu vào</b> › Số (lời nhắc: “Số tiền?”); thêm một <b>Yêu cầu đầu vào</b> Văn bản cho ghi chú nếu muốn.</li>
          <li><b>Lấy nội dung của URL</b>: dán địa chỉ “Ghi chi tiêu”, <b>Phương thức</b> POST, thêm tiêu đề Authorization như trên, <b>Nội dung yêu cầu</b> JSON với các trường <code>danh_muc</code> = Mục đã chọn, <code>so_tien</code> = Đầu vào đã cung cấp, <code>ghi_chu</code> = ghi chú.</li>
          <li>Thêm <b>Hiển thị thông báo</b> với kết quả để thấy “Đã ghi … ₫”.</li>
        </ol></details>` : ''}
        <details class="howto"><summary>Đặt widget ra màn hình chính</summary><ol>
          <li>Chạm giữ màn hình chính › <b>Sửa</b> › <b>Thêm tiện ích</b> › <b>Phím tắt</b>.</li>
          <li>Chọn cỡ widget, bấm <b>Thêm tiện ích</b>, rồi chạm vào widget để chọn phím tắt “Tài chính hôm nay” / “Ghi chi tiêu”.</li>
          <li>Có thể thêm vào màn hình khóa hoặc Trung tâm điều khiển theo cách tương tự.</li>
        </ol></details>
        <p class="hint">Mở thẳng ô ghi chép trong ứng dụng: <code>${esc(origin)}/#ghi-chep</code> ${copyBtn(origin+'/#ghi-chep')}</p>
      </div>
    </div>
  </div>`;
}
const ROLE_LABEL = {owner:'Chủ sổ', member:'Thành viên', viewer:'Chỉ xem'};
const ROLE_HINT = {owner:'Toàn quyền, quản lý thành viên và khôi phục dữ liệu', member:'Ghi chép và sửa dữ liệu', viewer:'Chỉ xem, không sửa được'};
let restoreData=null;
function viewMembers(){
  const me = window.FIN?.session(); if(!me) return '';
  const isOwner = me.role==='owner'; const list = S.members || [];
  return `<div class="grid g-2 section-gap">
    <div class="card"><div class="card-h"><h2>Thành viên gia đình</h2><span class="sub">${list.length} tài khoản</span></div>
      <div class="list">${list.map(m=>`<div class="row member-row">
        <img class="avatar" data-uid="${esc(m.id)}" alt="" src="${BLANK}">
        <div style="min-width:0"><div class="t">${esc(m.name)}${m.id===me.id?' <span class="chip acc">Bạn</span>':''}</div><div class="s">@${esc(m.username)} · ${ROLE_LABEL[m.role]||m.role}</div></div>
        <div class="member-actions">${isOwner && m.id!==me.id ? `
          <label class="sr-only" for="role-${esc(m.id)}">Vai trò của ${esc(m.name)}</label>
          <select class="input sel-sm" id="role-${esc(m.id)}" data-member-role="${esc(m.id)}">${Object.entries(ROLE_LABEL).map(([k,l])=>`<option value="${k}" ${m.role===k?'selected':''}>${l}</option>`).join('')}</select>
          <button class="btn sm" type="button" data-member-reset="${esc(m.id)}" data-name="${esc(m.name)}">Đặt lại mật khẩu</button>
          <button class="btn sm danger" type="button" data-member-del="${esc(m.id)}" data-name="${esc(m.name)}">Xóa</button>` : ''}</div></div>`).join('')}</div>
      ${isOwner? `<form id="addMember" class="stack" style="gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--line)" novalidate>
        <h3 class="flabel" style="font-size:13.5px">Thêm thành viên</h3>
        <div class="row2">
          <div class="field"><label for="am-name">Tên hiển thị</label><input class="input" id="am-name" autocomplete="off" placeholder="vd: Bà ngoại" maxlength="40"></div>
          <div class="field"><label for="am-user">Tên đăng nhập</label><input class="input" id="am-user" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="vd: ba.ngoai"></div>
        </div>
        <div class="row2">
          <div class="field"><label for="am-pass">Mật khẩu tạm</label><input class="input" id="am-pass" type="text" autocomplete="new-password" placeholder="Ít nhất 8 ký tự"></div>
          <div class="field"><label for="am-role">Vai trò</label><select class="input" id="am-role"><option value="member">Thành viên</option><option value="viewer">Chỉ xem</option><option value="owner">Chủ sổ</option></select></div>
        </div>
        <p class="hint" id="am-hint" style="margin:0">${ROLE_HINT.member}. Gửi tên đăng nhập và mật khẩu tạm cho người nhà; họ tự đổi mật khẩu sau khi đăng nhập.</p>
        <div><button class="btn primary" type="submit">Thêm thành viên</button></div>
      </form>` : `<p class="hint">Chỉ chủ sổ mới thêm hoặc xóa được thành viên.</p>`}
    </div>
    <div class="stack">
      <div class="card"><div class="card-h"><h2>Đổi mật khẩu của bạn</h2></div>
        <form id="changePass" class="stack" style="gap:12px" novalidate>
          <input type="text" autocomplete="username" value="${esc(me.username)}" hidden readonly>
          <div class="field"><label for="cp-cur">Mật khẩu hiện tại</label><input class="input" id="cp-cur" type="password" autocomplete="current-password"></div>
          <div class="field"><label for="cp-new">Mật khẩu mới</label><input class="input" id="cp-new" type="password" autocomplete="new-password"><span class="hint">Ít nhất 8 ký tự. Các thiết bị khác sẽ bị đăng xuất.</span></div>
          <div class="top-actions"><button class="btn" type="submit">Đổi mật khẩu</button><button class="btn ghost" type="button" id="logoutBtn2">Đăng xuất</button></div>
        </form>
      </div>
      ${isOwner? `<div class="card"><div class="card-h"><h2>Khôi phục từ bản sao lưu</h2></div>
        <p class="hint" style="margin-top:0">Chọn tệp .json đã tải bằng nút “Sao lưu”. Toàn bộ dữ liệu hiện tại sẽ được thay thế; máy chủ tự lưu một bản trước khi khôi phục.</p>
        <div class="field"><label for="restoreFile">Tệp sao lưu</label><input class="input" id="restoreFile" type="file" accept=".json,application/json"></div>
        <div style="margin-top:10px"><button class="btn danger" type="button" id="restoreBtn" ${restoreData?'':'disabled'}>Khôi phục dữ liệu</button></div>
      </div>` : ''}
    </div>
  </div>`;
}

function viewLoading(){
  return `<div class="loading"><div class="hero"><div class="eyebrow">Đang mở sổ…</div><div class="skel" style="width:46%;height:36px;margin-top:12px;opacity:.25"></div></div>
  <div class="grid g-4 section-gap">${'<div class="card"><div class="skel" style="width:50%"></div><div class="skel" style="width:70%;height:22px;margin-top:12px"></div></div>'.repeat(4)}</div></div>`;
}
function viewOffline(){ return `<div class="card"><div class="empty"><b>Chưa kết nối được máy chủ</b>Kiểm tra kết nối mạng rồi tải lại trang.</div></div>`; }

/* =========================================================
   Render
   ========================================================= */
let pendingRender=false, rafId=0;
function scheduleRender(){ aggCache.clear(); if(rafId) return; rafId=requestAnimationFrame(()=>{rafId=0; render();}); }
function renderYearPicker(){
  const sel = $('#yearSel'); if(!sel) return;
  const from = firstYear(), to = lastYear(), key = from+'-'+to+'-'+curYear();
  if(sel.dataset.range!==key){ let o=''; for(let k=to;k>=from;k--) o += `<option value="${k}">${k}${k===curYear()?' · năm nay':''}</option>`; sel.innerHTML=o; sel.dataset.range=key; }
  sel.value = String(S.year);
}
function yearBanner(){
  const cy = curYear(); if(S.year===cy) return '';
  const past = S.year<cy;
  return `<div class="year-banner ${past?'past':'future'}">${ico(ICONS.cal)}<div><b>Đang xem năm ${S.year}${past?' (đã qua)':' (năm tới)'}</b><span>Thu chi, biểu đồ, nhận định và nhật ký hiển thị theo năm ${S.year}. Số dư quỹ, sổ tiết kiệm và danh mục đầu tư là số lũy kế hiện tại.</span></div><button class="btn sm" type="button" data-year-now>Về năm ${cy}</button></div>`;
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
  renderYearPicker();
  $('#pageEyebrow').textContent = g==='overview'? 'Tổng quan · '+S.year : g==='invest'? 'Tiết kiệm & đầu tư' : GROUPS.find(x=>x.id===g).label;
  $('#nav').innerHTML = GROUPS.map(x=>`<a href="#${x.id}" ${x.id===g?'aria-current="page"':''}>${ico(ICONS[x.id])}${x.label}</a>${x.id==='invest'? `<div class="sub">${INVEST_TABS.map(([id,l])=>`<a href="#${id}" ${S.view===id?'aria-current="page"':''}>${l}</a>`).join('')}</div>`:''}`).join('');
  $('#tabbar').innerHTML = GROUPS.map(x=>`<a href="#${x.id}" ${x.id===g?'aria-current="page"':''}>${ico(ICONS[x.id])}${x.tab}</a>`).join('');
  const show = S.canWrite && S.conn!=='off';
  $('#addBtn').hidden = !show; $('#fab').hidden = !show;
  $('#syncDot').className = 'dot '+(S.conn==='on'?'on':S.conn==='off'?'off':'');
  $('#syncText').textContent = S.conn==='on' ? (S.canWrite? 'Đã đồng bộ · cả nhà cùng xem' : 'Chỉ xem') : S.conn==='off' ? 'Chưa kết nối máy chủ' : 'Đang kết nối lại…';
  let html;
  const ready = Object.values(S.loaded).every(Boolean);
  if(S.conn==='off' && !ready) html = viewOffline();
  else if(!ready) html = viewLoading();
  else html = yearBanner() + (S.canWrite?'':'<div class="banner">Tài khoản của bạn chỉ có quyền xem. Nhờ chủ sổ đổi vai trò thành “Thành viên” để ghi chép.</div>') +
    ({overview:viewOverview, spending:viewSpending, invest:viewInvest, deposits:viewDeposits, emergency:viewEmergency, kids:viewKids, settings:viewSettings}[S.view] || viewOverview)();
  $('#main').innerHTML = html;
  hydrateAvatars();
}
document.addEventListener('focusout', ()=>{ setTimeout(()=>{ if(pendingRender) render(); }, 0); });
async function hydrateAvatars(){
  if(!user) return;
  const imgs = $$('img[data-uid]'); if(!imgs.length) return;
  try{ const ps = await user.profiles([...new Set(imgs.map(i=>i.dataset.uid))]);
    imgs.forEach(i=>{ const p=ps[i.dataset.uid]; if(p){ i.src=p.avatarUrl; i.title=p.name||'Thành viên'; i.alt=p.name||''; } }); }catch(e){}
}
/* real-time interest ticker */
setInterval(()=>{
  const t = Date.now();
  $$('[data-clock]').forEach(el=>{ el.textContent = fmtDateTime(new Date(t)); });
  const by=$('#brandYear'); if(by && by.textContent!==String(curYear())) by.textContent=curYear();
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
  if(d.copy!==undefined){ const txt=d.copy; try{ await navigator.clipboard.writeText(txt); toast('Đã sao chép'); }catch(e){ const r=document.createRange(); const el=t.parentElement.querySelector('code')||t; r.selectNodeContents(el); const sel=getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Đã chọn sẵn, nhấn Ctrl+C để sao chép'); } return; }
  if('hideToken' in d){ S.newToken=null; render(); return; }
  if(d.revokeToken){ if(!arm(t,'Bấm lần nữa để thu hồi')) return; t.disabled=true; try{ await FIN.revokeToken(d.revokeToken); S.tokens=S.tokens.filter(x=>x.id!==d.revokeToken); toast('Đã thu hồi mã. Phím tắt dùng mã này sẽ ngừng hoạt động.'); render(); }catch(err){ toast(errMsg(err)); t.disabled=false; } return; }
  if(d.setYear){ setYear(+d.setYear); return; }
  if('yearNow' in d){ setYear(curYear()); return; }
  if(d.cmp){ S.cmpMode=d.cmp; render(); return; }
  if(d.closeYear){ const yy=+d.closeYear; const est=navEstimate(yy); if(await saveCfg({navHistory:{...cfg().navHistory,[yy]:Math.round(est.total)}, navParts:{...(cfg().navParts||{}),[yy]:est.parts}})) toast(`Đã chốt tài sản ròng cuối năm ${yy}: ${vnd(est.total)} ₫`); return; }
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
  if(d.fixDiff){ const v=+d.fixDiff; const k='ff:savings:'; S.drafts[k+'type']= v>0?'out':'in'; S.drafts[k+'amt']=vnd(Math.abs(v)); S.drafts[k+'note']='Điều chỉnh cho khớp số dư sổ tại ngân hàng'; S.drafts[k+'date']=fmtDate(todayISO()); render(); const f=document.querySelector('[data-fund-form="savings"]'); f?.scrollIntoView({behavior:'smooth',block:'center'}); f?.querySelector('#ff-savings-note')?.focus(); toast('Đã điền sẵn bút toán điều chỉnh. Kiểm tra lại rồi bấm Ghi nhận.'); return; }
  if(d.editTx){ const x=S.tx.find(q=>q.id===d.editTx); if(x && S.canWrite) openTx({kind:x.kind==='income'?'income':'expense', doc:x}); return; }
  if('addDep' in d){ openDeposit(); return; }
  if(d.editDep){ if(S.canWrite) openDeposit(S.deposits.find(q=>q.id===d.editDep)); return; }
  if(d.closeDep){ const dep=S.deposits.find(q=>q.id===d.closeDep); if(!dep) return; if(!arm(t,'Xác nhận tất toán')) return;
    if(await write(()=>db.collection('deposits').doc(dep.id).set({...stripId(dep), status:'closed', closedAt:todayISO()}))) toast(`Đã đánh dấu tất toán sổ ${dep.bank||''} ${compact(dep.amount)}`); return; }
  if(d.reopenDep){ const dep=S.deposits.find(q=>q.id===d.reopenDep); if(!dep) return;
    const body={...stripId(dep), status:'active'}; delete body.closedAt;
    if(await write(()=>db.collection('deposits').doc(dep.id).set(body))) toast('Đã mở lại sổ'); return; }
  if(d.del){ if(!arm(t,'Bấm lần nữa để xóa')) return; const [col,id]=d.del.split('/'); t.disabled=true;
    if(await write(()=>db.collection(col).doc(id).delete())) toast('Đã xóa'); else t.disabled=false; return; }
  if('addLot' in d){ openLot(null, d.addLot||null); return; }
  if(d.editLot){ if(S.canWrite) openLot(S.vcbf.find(q=>q.id===d.editLot)); return; }
  if('addProduct' in d){ openProduct(); return; }
  if(d.editProduct){ openProduct(products().find(p=>p.id===d.editProduct)); return; }
  if(d.product && !d.addLot){ S.product=d.product; render(); $('#productDetail')?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  if(d.savePrice){ const p = products().find(x=>x.id===d.savePrice); const v=parseDecimal($('#price-'+CSS.escape(d.savePrice)).value);
    if(!p) return; if(!(v>0)){ toast('Giá chưa hợp lệ. Ví dụ: 13732,75'); return; }
    const body = {...stripId(p), price:v, priceDate:todayISO()}; delete body._virtual; delete body.color;
    if(await write(()=>db.collection('products').doc(p.id).set(body))) toast(`Đã cập nhật giá ${productLabel(p)}: ${fmtPrice(v)}`); return; }
  if(d.moveSurplus){ const amt=+d.moveSurplus; const key=ymKey(S.year,S.month); t.disabled=true;
    const ok = await write(()=>db.collection('fund').doc('surplus-'+key).set({date:lastDayISO(S.year,S.month), fund:'emergency', type:'in', amount:amt, note:`Thặng dư sinh hoạt T${S.month}/${S.year}`, ref:'surplus-'+key, by:S.meId, at:Date.now()}));
    if(ok) toast(`Đã chuyển ${vnd(amt)} ₫ vào Quỹ khẩn cấp`); else t.disabled=false; return; }
  if(t.id==='mReset'){ const key=ymKey(S.year,S.month); for(const k of Object.keys(S.drafts)) if(k.startsWith(`m:${key}:`)) delete S.drafts[k]; render(); return; }
  if(d.export){ exportData(d.export); return; }
  if(t.id==='logoutBtn2'){ FIN.logout(); return; }
  if(d.memberReset){ openResetPassword(d.memberReset, d.name); return; }
  if(d.memberDel){ if(!arm(t,'Bấm lần nữa để xóa')) return; t.disabled=true;
    try{ await FIN.removeMember(d.memberDel); toast('Đã xóa tài khoản '+d.name); }catch(err){ toast(errMsg(err)); t.disabled=false; } return; }
  if(t.id==='restoreBtn' && restoreData){ if(!arm(t,'Bấm lần nữa để thay toàn bộ dữ liệu',5000)) return; t.disabled=true;
    try{ const r = await FIN.importBackup(restoreData); toast(`Đã khôi phục ${r.imported} bản ghi`); restoreData=null; }catch(err){ toast(errMsg(err)); t.disabled=false; } return; }
});
const stripId = o => { const {id, ...rest} = o; return rest; };
main.addEventListener('input', e=>{
  const el = e.target; const k = el.dataset.draft;
  if(k){ S.drafts[k] = el.value; }
  if(el.dataset.amountPrev){ const p=$('#'+el.dataset.amountPrev); if(p) p.innerHTML = amountPreview(el.value); }
  if(el.dataset.mfield || el.id==='mf-note') updateMonthLive();
});
main.addEventListener('submit', async e=>{
  const f = e.target; e.preventDefault();
  if(f.id==='monthForm'){ saveMonth(); return; }
  if(f.id==='tokenForm'){ const btn=f.querySelector('button[type=submit]'); btn.disabled=true;
    try{ const r=await FIN.createToken($('#tk-name').value.trim()); S.newToken=r.token; S.tokens=[r.item, ...(S.tokens||[])]; render(); $('#shortcutCard')?.scrollIntoView({behavior:'smooth',block:'start'}); toast('Đã tạo mã. Sao chép ngay, mã chỉ hiện một lần.'); }
    catch(err){ toast(errMsg(err)); } finally{ btn.disabled=false; } return; }
  if(f.dataset.fundForm){
    const fund = f.dataset.fundForm, k='ff:'+fund+':';
    const type = (f.querySelector('input[type=radio]:checked')||{}).value || 'in';
    const date = readDate(`ff-${fund}-date`); if(!date) return;
    const amt = parseAmount(f.querySelector(`#ff-${fund}-amt`).value); const note = f.querySelector(`#ff-${fund}-note`).value.trim();
    if(!(amt>0)){ toast('Nhập số tiền lớn hơn 0'); f.querySelector(`#ff-${fund}-amt`).focus(); return; }
    const btn=f.querySelector('button[type=submit]'); btn.disabled=true;
    const ok = await write(()=>db.collection('fund').add({date, fund, type, amount:amt, note, by:S.meId, at:Date.now()}));
    btn.disabled=false;
    if(ok){ for(const x of ['amt','note','date','type']) delete S.drafts[k+x]; toast(`Đã ghi nhận: ${fundTypeLabel(fund,type)} ${vnd(amt)} ₫`); render(); }
    return;
  }
  if(f.id==='addMember'){
    const b = {name:$('#am-name').value.trim(), username:$('#am-user').value.trim(), password:$('#am-pass').value, role:$('#am-role').value};
    if(!b.name){ toast('Nhập tên hiển thị'); $('#am-name').focus(); return; }
    if(!/^[a-zA-Z0-9._-]{3,32}$/.test(b.username)){ toast('Tên đăng nhập gồm 3–32 ký tự không dấu'); $('#am-user').focus(); return; }
    if(b.password.length<8){ toast('Mật khẩu tạm cần ít nhất 8 ký tự'); $('#am-pass').focus(); return; }
    const btn=f.querySelector('button[type=submit]'); btn.disabled=true;
    try{ const m = await FIN.addMember(b); toast(`Đã thêm ${m.name} (@${m.username})`); f.reset(); }catch(err){ toast(errMsg(err)); } finally{ btn.disabled=false; }
    return;
  }
  if(f.id==='changePass'){
    const cur=$('#cp-cur').value, nw=$('#cp-new').value;
    if(nw.length<8){ toast('Mật khẩu mới cần ít nhất 8 ký tự'); $('#cp-new').focus(); return; }
    const btn=f.querySelector('button[type=submit]'); btn.disabled=true;
    try{ await FIN.updateMember(FIN.session().id, {currentPassword:cur, password:nw}); toast('Đã đổi mật khẩu'); f.reset(); }catch(err){ toast(errMsg(err)); } finally{ btn.disabled=false; }
  }
});
main.addEventListener('change', async e=>{
  const el = e.target; const d = el.dataset;
  if(el.type==='radio' && d.draft){ S.drafts[d.draft]=el.value; return; }
  if(d.memberRole){ try{ const m = await FIN.updateMember(d.memberRole, {role:el.value}); toast(`${m.name}: ${ROLE_LABEL[m.role]}`); }catch(err){ toast(errMsg(err)); render(); } return; }
  if(el.id==='am-role'){ $('#am-hint').textContent = ROLE_HINT[el.value]+'. Gửi tên đăng nhập và mật khẩu tạm cho người nhà; họ tự đổi mật khẩu sau khi đăng nhập.'; return; }
  if(el.id==='restoreFile'){ restoreData=null; $('#restoreBtn').disabled=true; const file = el.files && el.files[0]; if(!file) return;
    try{ const obj = JSON.parse(await file.text()); if(!obj || !Array.isArray(obj.tx)) throw new Error('bad'); restoreData=obj; $('#restoreBtn').disabled=false; toast(`Tệp hợp lệ: ${obj.tx.length} thu chi, ${(obj.fund||[]).length} biến động quỹ`); }
    catch(err){ toast('Tệp này không phải bản sao lưu của Sổ Tài Chính.'); } return; }
  if(!S.canWrite) return;
  if(d.budget){ const v = el.value.trim()? parseAmount(el.value) : 0; if(isNaN(v)){ toast('Số tiền chưa đọc được. Ví dụ: 12tr'); return; }
    if(await saveCfg({budgets:{...cfg().budgets, [d.budget]:v}})) toast('Đã lưu ngân sách '+CAT[d.budget].name); }
  else if(d.cfgAmount){ const v=parseAmount(el.value); if(isNaN(v)){ toast('Số tiền chưa đọc được'); return; } if(await saveCfg({[d.cfgAmount]:v})) toast('Đã lưu'); }
  else if(d.cfgText){ if(await saveCfg({[d.cfgText]:el.value.trim()})) toast('Đã lưu'); }
  else if(d.cfgInt){ const v=parseInt(el.value,10); if(!(v>0)){ toast('Nhập số tháng lớn hơn 0'); return; } if(await saveCfg({[d.cfgInt]:v})) toast('Đã lưu mục tiêu'); }
  else if(d.opening){ const v=parseAmount(el.value); if(isNaN(v)){ toast('Số tiền chưa đọc được'); return; } if(await saveCfg({openings:{...cfg().openings,[d.opening]:v}})) toast('Đã lưu số dư đầu kỳ'); }
  else if(d.nav){ const v=parseAmount(el.value); if(isNaN(v)){ toast('Số tiền chưa đọc được'); return; } if(await saveCfg({navHistory:{...cfg().navHistory,[d.nav]:v}})) toast('Đã lưu NAV '+d.nav); }
});
async function saveCfg(patch){
  const ref = db && db.doc('config/main');
  if(S.cfgExists) return write(()=>ref.update(patch));
  return write(()=>ref.set({...cfg(), ...patch}));
}
const quickKind = () => S.view==='emergency'? 'emergency' : S.view==='deposits'? 'savings' : 'expense';
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
    if(!btn.classList.contains('armed')){ btn.classList.add('armed'); btn.textContent='Bấm lần nữa để xóa'; setTimeout(()=>{ btn.classList.remove('armed'); btn.textContent='Xóa'; },4000); return; }
    btn.disabled=true; if(await fn()) closeSheet(); else btn.disabled=false;
  });
}
function bindAmount(input, prev){ const upd = ()=>{ prev.innerHTML = amountPreview(input.value); }; input.addEventListener('input', upd); upd(); }
const closeBtn = () => `<button type="button" class="icon-btn" data-close aria-label="Đóng">${ico(ICONS.close)}</button>`;

function openResetPassword(id, name){
  openSheet(`<form id="resetForm" novalidate style="display:flex;flex-direction:column;gap:14px">
    <div class="panel-h"><h2>Đặt lại mật khẩu</h2>${closeBtn()}</div>
    <p class="hint" style="margin:0">Đặt mật khẩu tạm cho <b></b>. Tài khoản này sẽ bị đăng xuất khỏi mọi thiết bị.</p>
    <div class="field"><label for="rp-pass">Mật khẩu tạm mới</label><input class="input" id="rp-pass" type="text" autocomplete="new-password" placeholder="Ít nhất 8 ký tự"></div>
    <div class="panel-actions"><button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn primary">Đặt lại</button></div>
  </form>`);
  $('#resetForm .hint b').textContent = name;
  $('#resetForm').addEventListener('submit', async e=>{ e.preventDefault();
    const p=$('#rp-pass').value; if(p.length<8){ toast('Mật khẩu cần ít nhất 8 ký tự'); return; }
    const btn=e.target.querySelector('button[type=submit]'); btn.disabled=true;
    try{ await FIN.updateMember(id,{password:p}); toast('Đã đặt lại mật khẩu cho '+name); closeSheet(); }catch(err){ toast(errMsg(err)); btn.disabled=false; }
  });
}

function openTx({kind='expense', doc=null}={}){
  const isEdit = !!doc;
  const st = { kind, cat: doc?.cat || (kind==='income'?'income':'food'), type: doc?.type || 'in' };
  const kinds = [['expense','Chi tiêu'],['income','Thu nhập'],['emergency','Quỹ khẩn cấp'],['savings','Quỹ tiết kiệm']];
  const draw = ()=>{
    const isFund = st.kind==='emergency'||st.kind==='savings';
    if(isFund && !FUND_TYPES[st.kind][st.type]) st.type='in';
    $('#kindSeg').innerHTML = kinds.map(([k,l])=>`<button type="button" data-k="${k}" aria-pressed="${st.kind===k}" ${isEdit && k!==st.kind ?'disabled':''}>${l}</button>`).join('');
    $('#catPills').innerHTML = st.kind==='expense' ? CATS.map(c=>`<button type="button" class="pill" data-c="${c.id}" aria-pressed="${st.cat===c.id}"><i class="swatch" style="background:var(--c-${c.id})"></i>${c.name}</button>`).join('')
      : st.kind==='income' ? INCOME_CATS.map(c=>`<button type="button" class="pill" data-c="${c.id}" aria-pressed="${st.cat===c.id}">${c.name}</button>`).join('')
      : Object.entries(FUND_TYPES[st.kind]).map(([k,l])=>`<button type="button" class="pill" data-t="${k}" aria-pressed="${st.type===k}">${l}</button>`).join('');
    $('#catLabel').textContent = isFund? 'Loại giao dịch' : 'Danh mục';
  };
  openSheet(`<form id="txForm" novalidate style="display:flex;flex-direction:column;gap:16px">
    <div class="panel-h"><h2>${isEdit?'Sửa ghi chép':'Ghi chép nhanh'}</h2>${closeBtn()}</div>
    <div class="seg" id="kindSeg" role="group" aria-label="Loại"></div>
    <div class="field"><label for="f-amt">Số tiền</label>
      <div class="amt-box"><input id="f-amt" autocomplete="off" inputmode="text" placeholder="0" value="${doc? vnd(doc.amount):''}"><span>₫</span></div>
      <div class="amt-prev" id="f-prev"></div>
      <div class="pills" id="quick">${['50k','100k','200k','500k','1tr','5tr'].map(q=>`<button type="button" class="pill" data-q="${q}">+${q}</button>`).join('')}</div>
    </div>
    <div class="field"><span class="flabel" id="catLabel">Danh mục</span><div class="pills" id="catPills"></div></div>
    <div class="row2">
      <div class="field"><label for="f-date">Ngày</label>${dateInput('f-date', doc?.date || defaultDateISO())}</div>
      <div class="field"><label for="f-note">Ghi chú</label><input class="input" id="f-note" value="${esc(doc?.note||'')}" placeholder="vd: Đi chợ cuối tuần"></div>
    </div>
    ${!isEdit? '<p class="hint" style="margin:0">Khoản ghi lẻ được cộng vào tổng tháng tương ứng trong mục Chi tiêu.</p>':''}
    <div class="panel-actions">${isEdit?'<button type="button" class="btn danger" id="delBtn">Xóa</button><span class="spacer"></span>':''}<button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn primary">${isEdit?'Lưu thay đổi':'Lưu'}</button></div>
  </form>`);
  draw();
  const amt=$('#f-amt'); bindAmount(amt, $('#f-prev'));
  $('#kindSeg').addEventListener('click', e=>{ const b=e.target.closest('button[data-k]'); if(!b||b.disabled) return; st.kind=b.dataset.k; if(st.kind==='expense' && !CAT[st.cat]) st.cat='food'; if(st.kind==='income' && !INC[st.cat]) st.cat='income'; draw(); });
  $('#catPills').addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b) return; if(b.dataset.c) st.cat=b.dataset.c; if(b.dataset.t) st.type=b.dataset.t; draw(); });
  $('#quick').addEventListener('click', e=>{ const b=e.target.closest('button[data-q]'); if(!b) return; const cur=amt.value.trim(); amt.value = cur? cur.replace(/\./g,'')+'+'+b.dataset.q : b.dataset.q; amt.dispatchEvent(new Event('input')); amt.focus(); });
  $('#txForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const a = parseAmount(amt.value); if(!(a>0)){ toast('Nhập số tiền lớn hơn 0'); amt.focus(); return; }
    const date = readDate('f-date'); if(!date) return; const note=$('#f-note').value.trim();
    const isFund = st.kind==='emergency'||st.kind==='savings';
    const btn = e.submitter || $('#txForm button[type=submit]'); btn.disabled=true;
    let ok;
    if(isFund){
      const body = {date, fund:st.kind, type:st.type, amount:a, note, by: doc?.by ?? S.meId, at: doc?.at || Date.now()}; if(doc?.ref) body.ref=doc.ref;
      ok = await write(()=> doc? db.collection('fund').doc(doc.id).set(body) : db.collection('fund').add(body));
      if(ok) toast(`${isEdit?'Đã sửa':'Đã lưu'}: ${FUNDS[st.kind].name} ${st.type==='out'?'−':'+'}${vnd(a)} ₫`);
    } else {
      const body = {date, kind:st.kind, cat:st.cat, amount:a, note, by: doc?.by ?? S.meId, at: doc?.at || Date.now()}; if(doc?.src) body.src=doc.src; if(doc?.expr) body.expr='';
      ok = await write(()=> doc? db.collection('tx').doc(doc.id).set(body) : db.collection('tx').add(body));
      if(ok) toast(`${isEdit?'Đã sửa':'Đã lưu'}: ${st.kind==='income'?INC[st.cat].name+' +':CAT[st.cat].name+' −'}${vnd(a)} ₫`);
    }
    if(ok) closeSheet(); else btn.disabled=false;
  });
  if(isEdit) armDelete($('#delBtn'), async ()=>{ const col = (st.kind==='emergency'||st.kind==='savings')?'fund':'tx'; const ok = await write(()=>db.collection(col).doc(doc.id).delete()); if(ok) toast('Đã xóa ghi chép'); return ok; });
}

/** Vietnamese reading of an amount, e.g. 2.500.000.000 → "Hai tỷ năm trăm triệu đồng". */
function readVND(n){
  n = Math.floor(+n||0); if(!n) return 'Không đồng';
  const D = ['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  const read3 = (x, full) => { const h=Math.floor(x/100), t=Math.floor(x%100/10), u=x%10, w=[];
    if(full || h) w.push(D[h]+' trăm');
    if(t===0){ if(u) w.push(((full||h)?'lẻ ':'')+D[u]); }
    else if(t===1) w.push('mười'+(u===5?' lăm':u?' '+D[u]:''));
    else w.push(D[t]+' mươi'+(u===1?' mốt':u===5?' lăm':u===4?' tư':u?' '+D[u]:''));
    return w.join(' '); };
  const groups=[]; while(n>0){ groups.push(n%1000); n=Math.floor(n/1000); }
  const unit = i => ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'][i];
  const out=[]; for(let i=groups.length-1;i>=0;i--){ const g=groups[i]; if(!g) continue; out.push(read3(g, i<groups.length-1) + (unit(i)?' '+unit(i):'')); }
  const s = out.join(' ').replace(/\s+/g,' ').trim(); return s.charAt(0).toUpperCase()+s.slice(1)+' đồng';
}
/** Exact amount field: digits only, thousands separators added while typing, amount read out in words. */
function bindExactAmount(input, prev){
  const upd = ()=>{ const digits = input.value.replace(/\D/g,'').replace(/^0+(?=\d)/,'').slice(0,16);
    const pos = input.selectionStart, before = input.value.length;
    input.value = digits? nf.format(+digits) : '';
    try{ const p = Math.max(0, pos + (input.value.length-before)); input.setSelectionRange(p,p); }catch(e){}
    prev.innerHTML = digits? `= ${input.value} ₫ · <span class="words">${esc(readVND(+digits))}</span>` : 'Nhập đầy đủ số tiền đến hàng đơn vị, ví dụ 2.500.000.000'; prev.classList.remove('bad'); };
  input.addEventListener('input', upd); upd();
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
    <div class="panel-h"><h2>${doc?'Sửa sổ tiết kiệm':'Thêm sổ tiết kiệm'}</h2>${closeBtn()}</div>
    <div class="row2">
      <div class="field"><label for="d-bank">Ngân hàng</label>
        <div class="bank-pick"><span id="d-bank-badge">${bankBadge(doc?.bank||'vcb','sm')}</span><select class="input" id="d-bank"><option value="" ${!doc?'selected':''} disabled>Chọn ngân hàng…</option>${opts}<option value="__other" ${other?'selected':''}>Ngân hàng khác (tự nhập)…</option></select></div>
        <input class="input" id="d-bank-other" value="${other?esc(doc.bank):''}" placeholder="Tên ngân hàng" ${other?'':'hidden'} style="margin-top:6px" maxlength="40">
        <span class="hint" id="d-bank-full">${curKey? esc(BANKS[curKey].full) : ''}</span></div>
      <div class="field"><label for="d-label">Tên sổ</label><input class="input" id="d-label" value="${esc(doc?.label||'')}" placeholder="vd: Sổ học phí"></div>
    </div>
    <div class="field"><label for="d-amt">Số tiền gửi (₫)</label><div class="amt-box"><input id="d-amt" inputmode="numeric" autocomplete="off" value="${doc?vnd(doc.amount):''}" placeholder="2.500.000.000"><span>₫</span></div><div class="amt-prev" id="d-prev"></div></div>
    <div class="row2">
      <div class="field"><label for="d-term">Kỳ hạn</label><select class="input" id="d-term">${[1,2,3,6,9,12,13,15,18,24,36,48,60].map(t=>`<option value="${t}" ${(+doc?.term||12)===t?'selected':''}>${t} tháng</option>`).join('')}</select></div>
      <div class="field"><label for="d-rate">Lãi suất (%/năm)</label><input class="input num" id="d-rate" inputmode="decimal" value="${doc? String(doc.rate).replace('.',','):''}" placeholder="vd: 4,6"></div>
    </div>
    <div class="row2">
      <div class="field"><label for="d-start">Ngày gửi</label>${dateInput('d-start', doc?.start||defaultDateISO())}</div>
      <div class="field"><label for="d-mat">Ngày đáo hạn</label>${dateInput('d-mat', doc? depMaturity(doc) : suggested0)}
        <span class="hint" id="d-mat-hint"></span></div>
    </div>
    <div class="row2">
      <div class="field"><label for="d-status">Trạng thái</label><select class="input" id="d-status"><option value="active" ${!isClosed(doc||{})?'selected':''}>Đang gửi</option><option value="closed" ${isClosed(doc||{})?'selected':''}>Đã tất toán</option></select></div>
      <div class="field"><label for="d-note">Ghi chú / nguồn</label><input class="input" id="d-note" value="${esc(doc?.note||'')}" placeholder="vd: Từ lương thưởng Tết"></div>
    </div>
    <div class="panel-actions">${doc?'<button type="button" class="btn danger" id="delBtn">Xóa</button><span class="spacer"></span>':''}<button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn primary">Lưu sổ</button></div>
  </form>`);
  bindExactAmount($('#d-amt'),$('#d-prev'));
  const bankSel = $('#d-bank');
  const updBank = ()=>{ const v = bankSel.value; const isOther = v==='__other'; $('#d-bank-other').hidden = !isOther;
    $('#d-bank-badge').innerHTML = isOther? bankBadge($('#d-bank-other').value||'Khác','sm') : v? bankBadge(v,'sm') : '';
    $('#d-bank-full').textContent = BANKS[v]? BANKS[v].full : isOther? 'Nhập tên ngân hàng chưa có trong danh sách' : '';
    if(isOther && document.activeElement===bankSel) $('#d-bank-other').focus(); };
  bankSel.addEventListener('change', updBank); $('#d-bank-other').addEventListener('input', updBank); updBank();
  // Maturity: suggested from the term, but the user's own date wins once edited.
  const suggest = ()=>{ const s=parseDMY($('#d-start').value); return s? addMonths(s, +$('#d-term').value) : null; };
  const updMat = ()=>{
    const sug = suggest(), cur = parseDMY($('#d-mat').value);
    if(!matManual && sug) $('#d-mat').value = fmtDate(sug);
    const shown = parseDMY($('#d-mat').value);
    $('#d-mat-hint').innerHTML = !sug? '' : shown===sug ? `Theo kỳ hạn ${$('#d-term').value} tháng. Có thể sửa theo ngày thực tế trên sổ.`
      : `Theo kỳ hạn: <b class="num">${fmtDate(sug)}</b> · <button type="button" class="btn xs ghost" id="d-mat-reset">Dùng ngày này</button>`;
    $('#d-mat-reset')?.addEventListener('click', ()=>{ matManual=false; updMat(); });
  };
  $('#d-start').addEventListener('input', updMat); $('#d-term').addEventListener('change', updMat);
  $('#d-mat').addEventListener('input', ()=>{ matManual=true; updMat(); });
  updMat();
  $('#depForm').addEventListener('submit', async e=>{ e.preventDefault();
    const bank = bankSel.value==='__other' ? $('#d-bank-other').value.trim() : bankSel.value;
    if(!bank){ toast('Chọn ngân hàng'); bankSel.focus(); return; }
    const amount = readExactAmount($('#d-amt')); if(!(amount>0)){ toast('Nhập đầy đủ số tiền gửi'); $('#d-amt').focus(); return; }
    const rate = parseDecimal($('#d-rate').value); if(!(rate>=0)){ toast('Nhập lãi suất, ví dụ 4,6'); $('#d-rate').focus(); return; }
    const start = readDate('d-start'); if(!start) return;
    const maturity = readDate('d-mat'); if(!maturity) return;
    if(maturity<=start){ toast('Ngày đáo hạn phải sau ngày gửi'); $('#d-mat').setAttribute('aria-invalid','true'); $('#d-mat').focus(); return; }
    const status = $('#d-status').value;
    const body={bank, label:$('#d-label').value.trim(), amount, rate, term:+$('#d-term').value, start, maturity, status, note:$('#d-note').value.trim(), at:doc?.at||Date.now()};
    if(status==='closed') body.closedAt = doc?.closedAt || todayISO();
    if(await write(()=> doc? db.collection('deposits').doc(doc.id).set(body) : db.collection('deposits').add(body))){ toast('Đã lưu sổ tiết kiệm'); closeSheet(); }
  });
  if(doc) armDelete($('#delBtn'), async ()=>{ const ok=await write(()=>db.collection('deposits').doc(doc.id).delete()); if(ok) toast('Đã xóa sổ'); return ok; });
}

function openLot(doc=null, productId=null){
  const plist = products();
  if(!plist.length){ toast('Tạo sản phẩm đầu tư trước, rồi thêm giao dịch.'); openProduct(); return; }
  const pid = doc? (doc.product||LEGACY_PRODUCT) : (productId || S.product || plist[0].id);
  const prod = plist.find(p=>p.id===pid) || plist[0];
  const side0 = doc?.side==='sell' ? 'sell' : 'buy';
  const price0 = doc?.price || prod.price || '';
  openSheet(`<form id="lotForm" novalidate style="display:flex;flex-direction:column;gap:14px">
    <div class="panel-h"><h2>${doc?'Sửa giao dịch':'Thêm giao dịch đầu tư'}</h2>${closeBtn()}</div>
    <div class="field"><label for="l-prod">Sản phẩm</label><select class="input" id="l-prod">${plist.map(p=>`<option value="${esc(p.id)}" ${p.id===prod.id?'selected':''}>${esc(productLabel(p))}${p.manager?' · '+esc(p.manager):''}</option>`).join('')}</select>
      <span class="hint">Chưa có quỹ cần nhập? <button type="button" class="btn xs ghost" id="l-newprod">Thêm sản phẩm mới</button></span></div>
    <div class="typeseg" role="radiogroup" aria-label="Loại giao dịch">
      <label><input type="radio" name="l-side" value="buy" ${side0==='buy'?'checked':''}><span>Mua</span></label>
      <label><input type="radio" name="l-side" value="sell" ${side0==='sell'?'checked':''}><span class="out">Bán / rút</span></label>
    </div>
    <div class="row2">
      <div class="field"><label for="l-date">Ngày giao dịch</label>${dateInput('l-date', doc?.date||defaultDateISO())}</div>
      <div class="field"><label for="l-price">Giá / đơn vị</label><input class="input num" id="l-price" inputmode="decimal" value="${price0? String(price0).replace('.',','):''}" placeholder="vd: 13732,75"></div>
    </div>
    <div class="field"><label for="l-amt">Số tiền giao dịch</label><div class="amt-box"><input id="l-amt" autocomplete="off" value="${doc? vnd((+doc.units)*(+doc.price)) : ''}" placeholder="vd: 10tr"><span>₫</span></div><div class="amt-prev" id="l-prev"></div></div>
    <div class="row2">
      <div class="field"><label for="l-units">Số lượng</label><input class="input num" id="l-units" inputmode="decimal" value="${doc? String(doc.units).replace('.',','):''}"><span class="hint">Tự tính = số tiền ÷ giá. Sửa theo sao kê nếu khác.</span></div>
      <div class="field"><label for="l-fee">Phí giao dịch (nếu có)</label><input class="input num" id="l-fee" inputmode="decimal" value="${doc?.fee? vnd(doc.fee):''}" placeholder="0"></div>
    </div>
    <div class="field"><label for="l-note">Ghi chú</label><input class="input" id="l-note" value="${esc(doc?.note||'')}" placeholder="vd: Mua định kỳ tháng 10"></div>
    <p class="hint" style="margin:0" id="l-sellhint" ${side0==='sell'?'':'hidden'}>Khi bán, lãi/lỗ đã chốt được tính theo giá vốn bình quân của sản phẩm.</p>
    <div class="panel-actions">${doc?'<button type="button" class="btn danger" id="delBtn">Xóa</button><span class="spacer"></span>':''}<button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn primary">Lưu giao dịch</button></div>
  </form>`);
  bindAmount($('#l-amt'),$('#l-prev'));
  const calc=()=>{ const a=parseAmount($('#l-amt').value), p=parseDecimal($('#l-price').value); if(a>0&&p>0) $('#l-units').value=(Math.floor(a/p*100)/100).toString().replace('.',','); };
  $('#l-amt').addEventListener('input',calc); $('#l-price').addEventListener('input',calc);
  $('#l-prod').addEventListener('change', ()=>{ const p = products().find(x=>x.id===$('#l-prod').value); if(p?.price && !doc){ $('#l-price').value=String(p.price).replace('.',','); calc(); } });
  $('#l-newprod').addEventListener('click', ()=>openProduct());
  $$('#lotForm input[name=l-side]').forEach(r=>r.addEventListener('change', ()=>{ $('#l-sellhint').hidden = $('#lotForm input[name=l-side]:checked').value!=='sell'; }));
  $('#lotForm').addEventListener('submit', async e=>{ e.preventDefault();
    const product=$('#l-prod').value, side=$('#lotForm input[name=l-side]:checked').value;
    const price=parseDecimal($('#l-price').value), units=parseDecimal($('#l-units').value);
    const fee = $('#l-fee').value.trim()? parseAmount($('#l-fee').value) : 0;
    if(!(price>0)||!(units>0)){ toast('Nhập giá và số lượng lớn hơn 0'); return; }
    if(isNaN(fee)||fee<0){ toast('Phí giao dịch chưa hợp lệ'); return; }
    if(side==='sell'){ const p = products().find(x=>x.id===product); const held = productStats(p).units + (doc && doc.side==='sell' && (doc.product||LEGACY_PRODUCT)===product ? +doc.units||0 : 0) - (doc && doc.side!=='sell' && (doc.product||LEGACY_PRODUCT)===product ? +doc.units||0 : 0);
      if(units > held + 1e-6){ toast(`Chỉ đang nắm giữ ${fmtUnits(held)} ${p.unit||''}`); return; } }
    const lotDate = readDate('l-date'); if(!lotDate) return;
    const body={product, side, date:lotDate, price, units, fee, note:$('#l-note').value.trim(), at:doc?.at||Date.now()};
    if(await write(()=> doc? db.collection('vcbf').doc(doc.id).set(body) : db.collection('vcbf').add(body))){ S.product=product; toast(`Đã lưu giao dịch ${side==='sell'?'bán':'mua'}`); closeSheet(); }
  });
  if(doc) armDelete($('#delBtn'), async ()=>{ const ok=await write(()=>db.collection('vcbf').doc(doc.id).delete()); if(ok) toast('Đã xóa giao dịch'); return ok; });
}

function openProduct(doc=null){
  const hasLots = doc && S.vcbf.some(l=>(l.product||LEGACY_PRODUCT)===doc.id);
  openSheet(`<form id="prodForm" novalidate style="display:flex;flex-direction:column;gap:14px">
    <div class="panel-h"><h2>${doc?'Sửa sản phẩm đầu tư':'Thêm sản phẩm đầu tư'}</h2>${closeBtn()}</div>
    <div class="row2">
      <div class="field"><label for="p-code">Mã sản phẩm</label><input class="input" id="p-code" value="${esc(doc?.code||'')}" placeholder="vd: VCBF-TBF, DCDS, VNM" maxlength="24"></div>
      <div class="field"><label for="p-manager">Công ty quản lý / nơi mua</label><input class="input" id="p-manager" list="managerList" value="${esc(doc?.manager||'')}" placeholder="vd: VCBF"><datalist id="managerList">${MANAGERS.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></div>
    </div>
    <div class="field"><label for="p-name">Tên đầy đủ</label><input class="input" id="p-name" value="${esc(doc?.name||'')}" placeholder="vd: Quỹ Đầu tư Trái phiếu VCBF" maxlength="120"></div>
    <div class="row2">
      <div class="field"><label for="p-type">Loại</label><select class="input" id="p-type">${Object.entries(PRODUCT_TYPES).map(([k,l])=>`<option value="${k}" ${(doc?.type||'equity')===k?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="p-mode">Hình thức</label><select class="input" id="p-mode">${Object.entries(PRODUCT_MODES).map(([k,l])=>`<option value="${k}" ${(doc?.mode||'sip')===k?'selected':''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="row2">
      <div class="field"><label for="p-price">Giá hiện tại / đơn vị</label><input class="input num" id="p-price" inputmode="decimal" value="${doc?.price? String(doc.price).replace('.',','):''}" placeholder="vd: 10250,5"></div>
      <div class="field"><label for="p-unit">Đơn vị</label><input class="input" id="p-unit" list="unitList" value="${esc(doc?.unit||'CCQ')}" maxlength="12"><datalist id="unitList"><option value="CCQ"><option value="cổ phiếu"><option value="chỉ"><option value="lượng"><option value="đơn vị"></datalist></div>
    </div>
    <div class="field"><label for="p-note">Ghi chú</label><input class="input" id="p-note" value="${esc(doc?.note||'')}" placeholder="vd: Mua định kỳ 10tr/tháng cho Dâu"></div>
    <div class="panel-actions">${doc && !doc._virtual? `<button type="button" class="btn danger" id="delBtn" ${hasLots?'disabled title="Xóa các giao dịch của sản phẩm trước"':''}>Xóa</button><span class="spacer"></span>`:''}<button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn primary">Lưu sản phẩm</button></div>
  </form>`);
  $('#prodForm').addEventListener('submit', async e=>{ e.preventDefault();
    const code=$('#p-code').value.trim(); if(!code){ toast('Nhập mã sản phẩm'); $('#p-code').focus(); return; }
    const price = $('#p-price').value.trim()? parseDecimal($('#p-price').value) : 0;
    if(isNaN(price)||price<0){ toast('Giá chưa hợp lệ. Ví dụ: 13732,75'); return; }
    const body={code, name:$('#p-name').value.trim(), manager:$('#p-manager').value.trim(), type:$('#p-type').value, mode:$('#p-mode').value, unit:$('#p-unit').value.trim()||'đơn vị',
      price, priceDate: price && price!==(+doc?.price||0) ? todayISO() : (doc?.priceDate||''), note:$('#p-note').value.trim(), at:doc?.at||Date.now()};
    let newId = doc?.id;
    const ok = await write(async ()=>{ if(doc) await db.collection('products').doc(doc.id).set(body); else { const ref = await db.collection('products').add(body); newId = ref.id; } });
    if(ok){ S.product = newId; toast(`Đã lưu ${code}`); closeSheet(); }
  });
  if(doc && !doc._virtual && !hasLots) armDelete($('#delBtn'), async ()=>{ const ok=await write(()=>db.collection('products').doc(doc.id).delete()); if(ok){ S.product=null; toast('Đã xóa sản phẩm'); } return ok; });
}

/* =========================================================
   Export
   ========================================================= */
async function exportData(kind){
  const dl = window.claude?.use ? await claude.use('downloads') : null;
  if(!dl){ toast('Không tải được tệp trên trình duyệt này.'); return; }
  const csv = rows => '﻿'+rows.map(r=>r.map(v=>{ const s=String(v??''); return /[",\n;]/.test(s)? '"'+s.replace(/"/g,'""')+'"' : s; }).join(',')).join('\n');
  let filename, data;
  if(kind==='tx'){ filename='thu-chi-gia-dinh.csv'; data=csv([['Ngày','Loại','Danh mục','Số tiền (VND)','Ghi chú'], ...[...S.tx].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(t=>[fmtDate(t.date), t.kind==='income'?'Thu':'Chi', txLabel(t), Math.round(t.amount), t.note||''])]); }
  else if(kind==='fund'){ filename='so-quy-gia-dinh.csv'; data=csv([['Ngày','Quỹ','Loại','Số tiền (VND)','Ghi chú'], ...[...S.fund].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(e=>[fmtDate(e.date), FUNDS[e.fund]?.name||e.fund, fundTypeLabel(e.fund,e.type), Math.round(e.amount), e.note||''])]); }
  else { filename='sao-luu-tai-chinh-'+todayISO()+'.json'; data=JSON.stringify({exportedAt:new Date().toISOString(), config:S.cfg, tx:S.tx, fund:S.fund, deposits:S.deposits, vcbf:S.vcbf, products:S.products, months:S.months},null,2); }
  try{ await dl.save({filename, data}); toast('Đã tải '+filename); }
  catch(e){ if(e?.code==='declined') return; toast('Không tải được tệp.'); }
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
    try{ const me = await user.me(); const role = window.FIN?.session()?.role;
      $('#meBox').innerHTML = `<img alt="" src="${esc(me.avatarUrl)}"><div style="min-width:0;flex:1"><b class="me-name"></b><span class="me-role">${ROLE_LABEL[role]||''}</span></div><button class="icon-btn" type="button" id="logoutBtn" aria-label="Đăng xuất" title="Đăng xuất">${ico('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>')}</button>`;
      $('#meBox .me-name').textContent = me.name || 'Bạn';
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
