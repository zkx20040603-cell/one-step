'use strict';
const KEY='one-step-tasks-v1';
const $=id=>document.getElementById(id);
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function weekBounds(now){const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());start.setDate(start.getDate()-(start.getDay()+6)%7);const end=new Date(start);end.setDate(end.getDate()+6);return [localDate(start),localDate(end)];}
function inView(t,view,today,bounds){return view==='all'||(view==='today'?t.date===today:t.date>=bounds[0]&&t.date<=bounds[1]);}
let tasks=[],view='today',editing=null,storageReady=false;
const simulation=new URLSearchParams(location.search).get('sim');
let simulateReadError=simulation==='error';
let simulateSaveError=simulation==='save-error';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(new Date(s+'T12:00:00').getTime())&&localDate(new Date(s+'T12:00:00'))===s;
function validTask(t){return t&&typeof t.id==='string'&&typeof t.title==='string'&&t.title.trim().length>0&&t.title.length<=120&&validDate(t.date)&&['공부','생활','건강','기타'].includes(t.category)&&typeof t.done==='boolean';}
function notice(message){$('status').textContent=message;}
function commit(next,message){try{if(!storageReady||simulateSaveError)throw Error('Storage unavailable');localStorage.setItem(KEY,JSON.stringify(next));tasks=next;$('storage-error').textContent='';$('retry').hidden=true;render();notice(message);return true;}catch(e){$('storage-error').textContent='저장하지 못했습니다. 브라우저의 저장 공간 및 설정을 확인한 후 다시 시도해 주세요. 변경 내용은 저장되지 않았습니다. 다시 시도 버튼을 누른 뒤 저장해 주세요.';$('retry').hidden=false;return false;}}
function row(t){const el=document.createElement('div');el.className='task'+(t.done?' done':'');const check=document.createElement('input');check.type='checkbox';check.checked=t.done;check.setAttribute('aria-label',t.title+' 완료');check.addEventListener('change',()=>{if(!commit(tasks.map(x=>x.id===t.id?{...x,done:check.checked}:x),'완료 상태가 변경되었습니다.'))check.checked=t.done;});const content=document.createElement('div');content.className='task-content';const title=document.createElement('span');title.className='task-title';title.textContent=t.title;const meta=document.createElement('div');meta.className='metadata';meta.textContent=t.category+' · '+t.date;content.append(title,meta);const actions=document.createElement('div');actions.className='task-actions';for(const [label,handler] of [['수정',()=>openEditor(t)],['삭제',()=>{if(confirm('이 할 일을 삭제할까요?'))commit(tasks.filter(x=>x.id!==t.id),'할 일이 삭제되었습니다.');}]]){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label',t.title+' '+label);b.onclick=handler;actions.append(b);}el.append(check,content,actions);return el;}
function render(){const today=localDate(new Date()),bounds=weekBounds(new Date());const selected=tasks.filter(t=>inView(t,view,today,bounds)).sort((a,b)=>a.date.localeCompare(b.date));const done=selected.filter(t=>t.done).length,percent=selected.length?Math.round(done/selected.length*100):0;$('percent').textContent=percent;$('progress').value=percent;$('counts').textContent=`${selected.length}개 중 ${done}개 완료`;$('date-label').textContent=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long'}).format(new Date());notice(`${view==='today'?'오늘':view==='week'?'이번 주':'전체'} 할 일 ${selected.length}개, ${done}개 완료`);$('range').textContent=view==='today'?today:view==='week'?`${bounds[0]} — ${bounds[1]} · 월요일부터 일요일까지`:'모든 날짜의 할 일';const list=$('task-list');list.replaceChildren();list.setAttribute('aria-busy','false');if(!selected.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='예정된 할 일이 없습니다.\n작은 한 걸음을 추가해 보세요.';list.append(empty);}const groups=[['해야 할 일',selected.filter(t=>!t.done)],['완료한 일',selected.filter(t=>t.done)]];for(const [name,items] of groups){if(!items.length)continue;const h=document.createElement('h3');h.className='group-heading';h.textContent=`${name} · ${items.length}`;list.append(h,...items.map(row));}if(view!=='all'){const overdue=tasks.filter(t=>!t.done&&t.date<today&&!selected.includes(t)).sort((a,b)=>a.date.localeCompare(b.date));if(overdue.length){const h=document.createElement('h3');h.className='group-heading';h.textContent='이전 날짜의 미완료 · '+overdue.length;list.append(h,...overdue.map(row));}}}
function openEditor(t){editing=t?t.id:null;$('dialog-title').textContent=t?'한 걸음 수정하기':'새로운 한 걸음';$('title').value=t?t.title:'';$('due').value=t?t.date:localDate(new Date());$('category').value=t?t.category:'공부';$('form-error').textContent='';for(const id of ['title','due']){$(id+'-error').textContent='';$(id).removeAttribute('aria-invalid');}$('editor').showModal();$('title').focus();}
$('new-task').onclick=()=>openEditor();$('close').onclick=()=>$('editor').close();document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
$('task-form').addEventListener('submit',e=>{
  e.preventDefault();
  const title=$('title').value.trim(),date=$('due').value;
  let first=null;
  for(const [id,message] of [
    ['title',!title?'할 일을 입력해 주세요.':title.length>120?`할 일은 1~120자로 입력하세요. 지금 ${title.length}자입니다.`:''],
    ['due',!validDate(date)?'올바른 예정일을 선택해 주세요. 예: 2026-10-21':'']
  ]){
    $(id+'-error').textContent=message;
    if(message){$(id).setAttribute('aria-invalid','true');first=first||id;}
    else $(id).removeAttribute('aria-invalid');
  }
  if(first){$(first).focus();return;}
  const task={id:editing||crypto.randomUUID(),title,date,category:$('category').value,done:editing?tasks.find(t=>t.id===editing).done:false};
  if(commit(editing?tasks.map(t=>t.id===editing?task:t):[...tasks,task],'할 일이 저장되었습니다.'))$('editor').close();
  else $('form-error').textContent='저장하지 못했습니다. 브라우저 저장 공간 또는 설정 때문에 저장할 수 없습니다. 입력값은 유지됩니다. 창을 닫고 다시 시도를 누른 뒤 저장해 주세요.';
});
function loadTasks(){
  storageReady=false;$('new-task').disabled=true;
  $('task-list').setAttribute('aria-busy','true');$('task-list').textContent='할 일을 불러오는 중입니다…';
  notice('할 일을 불러오는 중입니다.');
  const finish=()=>{
    try{
      if(simulateReadError)throw Error('Simulated read failure');
      const saved=localStorage.getItem(KEY);
      let parsed=[];
      if(saved!==null){parsed=JSON.parse(saved);if(!Array.isArray(parsed)||!parsed.every(validTask)||new Set(parsed.map(t=>t.id)).size!==parsed.length)throw Error('Invalid data');}
      tasks=parsed;storageReady=true;$('new-task').disabled=false;$('storage-error').textContent='';$('retry').hidden=true;render();
    }catch(e){
      $('task-list').setAttribute('aria-busy','false');$('task-list').textContent='할 일 목록을 표시할 수 없습니다.';
      $('storage-error').textContent='저장된 기록을 읽지 못했습니다. 브라우저의 저장 권한이 없거나 기록 형식이 손상되었을 수 있습니다. 브라우저 설정을 확인한 후 다시 시도를 눌러 주세요. 기존 기록은 덮어쓰지 않습니다.';
      $('retry').hidden=false;notice('');
    }
  };
  if(simulation==='slow')setTimeout(finish,3000);else finish();
}
$('retry').onclick=()=>{simulateReadError=false;simulateSaveError=false;loadTasks();};
// Failed reads must not be disguised as an empty task list by period controls.
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{
  if(!storageReady)return;
  view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();
});
loadTasks();
window.addEventListener('focus',()=>{if(storageReady)render();});
