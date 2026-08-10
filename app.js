const KEY='lets-talk-project-v1';
const uid=()=>`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const defaults=()=>({name:"LET'S TALK",nodes:[{id:uid(),type:'dialogue',speaker:'小明',text:'你好，欢迎来到 LET\'S TALK。',speed:45,avatar:null,media:null},{id:uid(),type:'narration',speaker:'',text:'夜幕降临，新的故事即将开始。',speed:45,avatar:null,media:null}],floors:[{id:uid(),username:'楼主',content:'欢迎来到我的故事论坛。',image:null}],bgm:null,bgmLoop:true});
let project=load(),editingNode=null,editingFloor=null,current=0,shown=0,typeTimer=null,autoTimer=null,deferredPrompt=null,currentBg=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function load(){try{return JSON.parse(localStorage.getItem(KEY))||defaults()}catch{return defaults()}}
function save(){localStorage.setItem(KEY,JSON.stringify(project));renderAll()}
function esc(v=''){return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
const label=t=>({dialogue:'人物对话',narration:'旁白',image:'图片',animation:'动画'}[t]);
function fileData(file){return new Promise((ok,no)=>{if(!file)return ok(null);const r=new FileReader();r.onload=()=>ok({name:file.name,type:file.type,data:r.result});r.onerror=no;r.readAsDataURL(file)})}
function renderAll(){renderNodes();renderFloors();$('#projectName').value=project.name;$('#bgmLoop').checked=project.bgmLoop;$('#bgmStatus').textContent=project.bgm?`已选择：${project.bgm.name}`:'未选择背景音乐'}
function renderNodes(){
 $('#nodeCount').textContent=`${project.nodes.length} 条内容`;
 $('#nodeList').innerHTML=project.nodes.map((n,i)=>`<article class="card" data-edit-node="${n.id}"><div class="card-head"><span class="badge">${i+1}</span><strong>${label(n.type)}${n.speaker?` · ${esc(n.speaker)}`:''}</strong><div class="mini-actions"><button data-up="${n.id}">↑</button><button data-down="${n.id}">↓</button><button data-delete-node="${n.id}">删</button></div></div>${n.text?`<p>${esc(n.text)}</p>`:''}${n.media?mediaHtml(n.media,'media-thumb'):''}</article>`).join('')||'<div class="empty">暂无剧情，使用下方按钮添加。</div>';
}
function mediaHtml(m,cls){return m.type.startsWith('video/')?`<video class="${cls}" src="${m.data}" controls></video>`:`<img class="${cls}" src="${m.data}" alt="剧情媒体" />`}
function renderFloors(){
 $('#floorCount').textContent=`${project.floors.length} 个楼层`;
 $('#floorList').innerHTML=project.floors.map((f,i)=>`<article class="card" data-edit-floor="${f.id}"><div class="card-head"><span class="badge">${i+1}楼</span><strong>${esc(f.username)}</strong><div class="mini-actions"><button data-delete-floor="${f.id}">删除</button></div></div><p>${esc(f.content)}</p>${f.image?`<img class="media-thumb" src="${f.image.data}" alt="帖子图片" />`:''}</article>`).join('')||'<div class="empty">暂无楼层。</div>';
}
function openNode(n){editingNode=n.id;$('#nodeId').value=n.id;$('#nodeDialogTitle').textContent=`编辑${label(n.type)}`;$('#speakerInput').value=n.speaker||'';$('#textInput').value=n.text||'';$('#speedInput').value=n.speed||45;$('#speedValue').textContent=n.speed||45;const media=['image','animation'].includes(n.type);$('#speakerField').classList.toggle('hidden',n.type!=='dialogue');$('#avatarField').classList.toggle('hidden',n.type!=='dialogue');$('#textField').classList.toggle('hidden',media);$('#speedField').classList.toggle('hidden',media);$('#mediaField').classList.toggle('hidden',!media);$('#nodeDialog').showModal()}
function openFloor(f){editingFloor=f.id;$('#floorId').value=f.id;$('#usernameInput').value=f.username;$('#contentInput').value=f.content;$('#floorDialog').showModal()}
function moveNode(id,delta){const i=project.nodes.findIndex(n=>n.id===id),j=i+delta;if(i<0||j<0||j>=project.nodes.length)return;[project.nodes[i],project.nodes[j]]=[project.nodes[j],project.nodes[i]];save()}
function showPage(name){document.body.classList.toggle('player-mode',name==='player');$$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${name}`));$$('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.page===name));if(name==='player'){current=Math.min(current,Math.max(0,project.nodes.length-1));startNode()}else stopPlayback()}
function stopPlayback(){clearInterval(typeTimer);clearTimeout(autoTimer);typeTimer=autoTimer=null;pauseBgm()}
function startNode(){
 stopPlayback();
 const n=project.nodes[current];
 $('#playerProgress').textContent=project.nodes.length?`${current+1} / ${project.nodes.length}`:'0 / 0';
 if(!n){$('#stage').innerHTML='<div class="empty med-empty">请先添加剧情内容</div>';return}
 shown=0;
 if(['image','animation'].includes(n.type)){
   if(n.media)currentBg=n.media;
   renderStage(n);
   scheduleAuto(1800);
 }else{
   renderStage(n);
   typeTimer=setInterval(()=>{shown++;renderStage(n);if(shown>=n.text.length){clearInterval(typeTimer);scheduleAuto(n.type==='narration'?1600:1200)}},n.speed||45)
 }
 playBgm()
}
function subjectData(n){const name=n?.speaker||'未命名角色';return{speaker:name,avatar:n?.avatar||null,code:codeFor(name),role:roleFor(name)}}
function codeFor(name='SUBJ'){let v=0;for(const ch of name)v=(v*31+ch.charCodeAt(0))%997;return `SUBJ-${String(v).padStart(3,'0')}`}
function roleFor(name=''){if(/医|doctor|med/i.test(name))return '医疗人员 / OBSERVED';if(/管|警|审|队|ctu/i.test(name))return '管控人员 / ACTIVE';if(/旁白|系统/i.test(name))return 'SYSTEM LOG';return '异常相关个体 / LIMITED'}
function participantPair(active){
 const pool=[];
 const add=n=>{if(n&&n.type==='dialogue'&&n.speaker&&!pool.some(x=>x.speaker===n.speaker))pool.push(subjectData(n))};
 add(active);
 for(let i=current-1;i>=0&&pool.length<2;i--)add(project.nodes[i]);
 for(let i=current+1;i<project.nodes.length&&pool.length<2;i++)add(project.nodes[i]);
 while(pool.length<2)pool.push({speaker:'未识别对象',avatar:null,code:'SUBJ-???',role:'身份待核验'});
 return pool.slice(0,2)
}
function avatarCard(p,active){const img=p.avatar?`<img src="${p.avatar.data}" alt="${esc(p.speaker)}头像"/>`:`<span>${esc((p.speaker||'?')[0])}</span>`;return `<div class="interro-avatar ${active?'active':''}"><div class="portrait">${img}</div><b>${esc(p.speaker)}</b><small>${esc(p.code)} · ${esc(p.role)}</small></div>`}
function playbackShell(inner,{mode='dialogue',activeSpeaker=''}={}){
 const n=project.nodes[current];
 const bg=currentBg?.data?`<div class="playback-bg" style="background-image:url('${currentBg.data}')"></div>`:'';
 const pair=participantPair(n);
 return `<div class="interro-stage ${mode}">${bg}<div class="scan-layer"></div><div class="playback-top"><div><b>MEDGRID</b><span>INTERROGATION PLAYBACK</span></div><small>INC-${String(current+1).padStart(2,'0')}-${String(project.nodes.length).padStart(3,'0')} / ZONE-07 / ACCESS: LIMITED</small></div><div class="duel-row">${avatarCard(pair[0],pair[0].speaker===activeSpeaker)}${avatarCard(pair[1],pair[1].speaker===activeSpeaker)}</div>${inner}<div class="playback-foot"><span>CH.${String(current+1).padStart(2,'0')} / ${esc(project.name||'未命名项目')}</span><span class="reading-dot">● 记录读取中</span></div></div>`
}
function renderStage(n){
 if(['image','animation'].includes(n.type)){
   const notice=n.media?'背景影像载入完成':'尚未选择背景影像文件';
   $('#stage').innerHTML=playbackShell(`<div class="system-note warning"><b>SCENE DATA</b><p>${notice}</p></div>`,{mode:'media'});
   return
 }
 const text=esc((n.text||'').slice(0,shown));
 if(n.type==='narration'){
   $('#stage').innerHTML=playbackShell(`<div class="system-note narrative"><b>NARRATIVE LOG</b><p>${text}</p></div>`,{mode:'narration'});
   return
 }
 const subj=subjectData(n);
 $('#stage').innerHTML=playbackShell(`<div class="record-panel"><div class="record-head"><div><b>${esc(subj.speaker)}</b><small>${esc(subj.code)} / ${esc(subj.role)}</small></div><time>${new Date(Date.now()+current*37000).toTimeString().slice(0,8)}</time></div><div class="record-text">${text}</div></div>`,{mode:'dialogue',activeSpeaker:n.speaker})
}
function scheduleAuto(ms){clearTimeout(autoTimer);if($('#autoPlay').checked)autoTimer=setTimeout(next,ms)}
function next(){if(current<project.nodes.length-1){current++;startNode()}else{$('#autoPlay').checked=false;pauseBgm()}}
function action(){const n=project.nodes[current];if(!n)return;if(!['image','animation'].includes(n.type)&&shown<n.text.length){shown=n.text.length;clearInterval(typeTimer);renderStage(n);scheduleAuto(1200)}else next()}
let audio=null;function playBgm(){if(!project.bgm)return;if(!audio||audio.src!==project.bgm.data){audio=new Audio(project.bgm.data);audio.loop=project.bgmLoop}audio.play().catch(()=>{})}function pauseBgm(){if(audio)audio.pause()}
$$('.tabs button').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$$('[data-add-node]').forEach(b=>b.onclick=()=>{const type=b.dataset.addNode,n={id:uid(),type,speaker:type==='dialogue'?'新角色':'',text:['image','animation'].includes(type)?'':'请输入内容',speed:45,avatar:null,media:null};project.nodes.push(n);save();openNode(n)});
$('#nodeList').onclick=e=>{const del=e.target.closest('[data-delete-node]'),up=e.target.closest('[data-up]'),down=e.target.closest('[data-down]');if(del){e.stopPropagation();project.nodes=project.nodes.filter(n=>n.id!==del.dataset.deleteNode);save()}else if(up){e.stopPropagation();moveNode(up.dataset.up,-1)}else if(down){e.stopPropagation();moveNode(down.dataset.down,1)}else{const c=e.target.closest('[data-edit-node]');if(c)openNode(project.nodes.find(n=>n.id===c.dataset.editNode))}};
$('#speedInput').oninput=e=>$('#speedValue').textContent=e.target.value;
$('#saveNode').onclick=async e=>{e.preventDefault();const n=project.nodes.find(x=>x.id===editingNode);if(!n)return;const av=$('#avatarInput').files[0],media=$('#mediaInput').files[0];n.speaker=$('#speakerInput').value.trim();n.text=$('#textInput').value;n.speed=Number($('#speedInput').value);if(av)n.avatar=await fileData(av);if(media)n.media=await fileData(media);save();$('#nodeForm').reset();$('#nodeDialog').close();toast('节点已保存')};
$('#addFloor').onclick=()=>{const f={id:uid(),username:'新用户',conttent:'请输入楼层内容',image:null};project.floors.push(f);save();openFloor(f)};
$('#floorList').onclick=e=>{const d=e.target.closest('[data-delete-floor]');if(d){e.stopPropagation();project.floors=project.floors.filter(f=>f.id!==d.dataset.deleteFloor);save()}else{const c=e.target.closest('[data-edit-floor]');if(c)openFloor(project.floors.find(f=>f.id===c.dataset.editFloor))}};
$('#saveFloor').onclick=async e=>{e.preventDefault();const f=project.floors.find(x=>x.id===editingFloor);if(!f)return;f.username=$('#usernameInput').value.trim();f.content=$('#contentInput').value;const image=$('#floorImageInput').files[0];if(image)f.image=await fileData(image);save();$('#floorForm').reset();$('#floorDialog').close();toast('楼层已保存')};
$('#txtInput').onchange=async e=>{const text=await e.target.files[0]?.text();if(!text)return;const added=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(line=>{const m=line.match(/^([^：:]+)[：:]\s*(.+)$/);if(!m)return null;return{id:uid(),type:/^(旁白|narration)$/i.test(m[1].trim())?'narration':'dialogue',speaker:/^(旁白|narration)$/i.test(m[1].trim())?'':m[1].trim(),text:m[2],speed:45,avatar:null,media:null}}).filter(Boolean);project.nodes.push(...added);save();toast(`已导入 ${added.length} 条`);e.target.value=''};
$('#projectName').onchange=e=>{project.name=e.target.value.trim()||"LET'S TALK";save()};$('#bgmLoop').onchange=e=>{project.bgmLoop=e.target.checked;if(audio)audio.loop=e.target.checked;save()};$('#bgmInput').onchange=async e=>{project.bgm=await fileData(e.target.files[0]);save();toast('背景音乐已保存')};
$('#prevNode').onclick=()=>{if(current>0){current--;startNode()}};$('#nextNode').onclick=next;$('#playAction').onclick=action;$('#autoPlay').onchange=()=>startNode();
$('#exportProject').onclick=()=>{const blob=new Blob([JSON.stringify(project)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${project.name.replace(/[^\w\u4e00-\u9fa5-]+/g,'_')}.letstalk`;a.click();URL.revokeObjectURL(a.href)};
$('#importProject').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!Array.isArray(data.nodes)||!Array.isArray(data.floors))throw Error('格式错误');project=data;save();toast('项目导入成功')}catch(err){toast(`导入失败：${err.message}`)}e.target.value=''};
$('#resetProject').onclick=()=>{if(confirm('确定清空当前项目吗？此操作不能撤销。')){project=defaults();save();toast('项目已重置')}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});async function install(){if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else alert('Android：浏览器菜单 → 安装应用/添加到主屏幕\niPhone：Safari 分享 → 添加到主屏幕')}$('#installBtn').onclick=install;$('#installBtn2').onclick=install;
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
renderAll();
