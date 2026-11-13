/* ---------- UI ---------- */
(function(){
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
var store={get:function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};

var token=store.get('mw_token',null),me=store.get('mw_me',null)||{};
var cur={sow:null,lp:null};
var docs=store.get('mw_docs',[]);

/* fill selects */
CLASSES.forEach(function(c){['s-class','l-class'].forEach(function(id){var o=document.createElement('option');o.textContent=c;$(id).appendChild(o);});});
MONTHS.forEach(function(c){var o=document.createElement('option');o.textContent=c;$('s-month').appendChild(o);});
var now=new Date();
$('s-year').value=now.getFullYear();
$('s-class').value='Standard IV';$('l-class').value='Standard IV';
try{$('l-date').value=now.toISOString().slice(0,10);}catch(e){}

/* profile */
var prof=store.get('mw_profile',{});
['school','teacher','lang','fmt'].forEach(function(k){if(prof[k])$('p-'+k).value=prof[k];});
['subject','class'].forEach(function(k){if(prof[k]){$('s-'+k).value=prof[k];$('l-'+k).value=prof[k];}});
/* subject picker: list follows the class; "Other" reveals a text box */
function syncSubj(p){
  var sel=$(p+'-subjsel'),inp=$(p+'-subject'),val=inp.value.trim(),g=subjGroups($(p+'-class').value),h='',found=false;
  g.forEach(function(gr){h+='<optgroup label="'+esc(gr[0])+'">'+gr[1].map(function(x){var on=!found&&x===val;if(on)found=true;return '<option'+(on?' selected':'')+'>'+esc(x)+'</option>';}).join('')+'</optgroup>';});
  h+='<option value="__other"'+(!found?' selected':'')+'>Other subject\u2026</option>';
  sel.innerHTML=h;
  if(!found&&!val&&g.length){sel.selectedIndex=0;inp.value=sel.value;found=true;}
  inp.dataset.custom=found?'':'1';
  inp.classList.toggle('hide',found);sel.classList.toggle('hide',!g.length);
}
['s','l'].forEach(function(p){
  $(p+'-subjsel').addEventListener('change',function(){var inp=$(p+'-subject');
    if(this.value==='__other'){inp.value='';inp.dataset.custom='1';inp.classList.remove('hide');inp.focus();}
    else{inp.value=this.value;inp.dataset.custom='';inp.classList.add('hide');}});
  $(p+'-class').addEventListener('change',function(){var inp=$(p+'-subject');if(inp.dataset.custom!=='1')inp.value='';syncSubj(p);});
  syncSubj(p);
});
function saveProf(){prof.school=$('p-school').value.trim();prof.teacher=$('p-teacher').value.trim();prof.lang=$('p-lang').value;prof.fmt=$('p-fmt').value;store.set('mw_profile',prof);profSum();}
function profSum(){$('profile-sum').textContent=prof.school?'· '+prof.school+(prof.teacher?', '+prof.teacher:''):'· add your school and name once';}
['p-school','p-teacher','p-lang','p-fmt'].forEach(function(id){$(id).addEventListener('change',saveProf);});
profSum();if(!prof.school)$('profile').open=true;
$('s-term').addEventListener('change',function(){$('s-month').value=this.value==='II'?'July':'January';});

/* routing */
function route(){
  var h=(location.hash||'#scheme').slice(1);if(['scheme','lesson','syllabus','saved'].indexOf(h)<0)h='scheme';
  ['scheme','lesson','syllabus','saved'].forEach(function(v){$('view-'+v).classList.toggle('hide',v!==h);if(v===h)$('tab-'+v).setAttribute('aria-current','page');else $('tab-'+v).removeAttribute('aria-current');});
  $('profile').classList.toggle('hide',h==='saved'||h==='syllabus');
  if(h==='saved')renderSaved();
}
window.addEventListener('hashchang
