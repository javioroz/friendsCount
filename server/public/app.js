async function fetchGroups(){
  const status = document.getElementById('status');
  const list = document.getElementById('groups');
  const raw = document.getElementById('raw');
  // Ensure elements exist
  if(!status || !list || !raw){
    console.warn('UI elements missing', {status: !!status, list: !!list, raw: !!raw});
    return;
  }
  try{
    status.textContent = 'Conectando al servidor...';
    const res = await fetch('/api/groups');
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    raw.textContent = JSON.stringify(data, null, 2);
    const groups = data.groups || [];
    list.innerHTML = '';
    if(groups.length===0){
      list.innerHTML = '<li>No hay grupos</li>'
    } else {
      groups.forEach(g => {
        const li = document.createElement('li');
        const title = document.createElement('div');
        title.textContent = g.name || ('Grupo ' + g.id);
        const meta = document.createElement('div');
        meta.className = 'meta';
        let memberText = '';
        if(Array.isArray(g.members)){
          memberText = g.members.map(m => (m && m.name) ? m.name : (typeof m === 'string' ? m : '')).filter(Boolean).join(', ');
        } else {
          memberText = (g.memberCount || (g.members && typeof g.members === 'number' ? g.members : 0)).toString();
        }
        meta.textContent = `ID: ${g.id} — Miembros: ${memberText}`;
        li.appendChild(title);
        li.appendChild(meta);
        list.appendChild(li);
      })
    }
    status.textContent = `Conectado — ${groups.length} grupos`;
  }catch(err){
    status.textContent = 'Error: ' + (err.message || err);
    raw.textContent = '';
    list.innerHTML = '';
  }
}

window.addEventListener('load', ()=>{
  fetchGroups();
  // refresh every 8s
  setInterval(fetchGroups, 8000);
});
