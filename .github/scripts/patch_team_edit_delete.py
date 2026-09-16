from pathlib import Path

path = Path('admin.html')
text = path.read_text()

old = '''  function renderTeam(rows){
    if(rows===null)return;
    const grid=$(\'teamGrid\');if(!grid)return;
    grid.innerHTML=rows.length?rows.map(m=>`<article class="team-card">
      <div class="team-top"><div class="team-avatar">${html((m.name||\'?\').slice(0,1).toUpperCase())}</div><div><h3>${html(m.name||\'—\')}</h3><div class="role">${html(m.role||\'\')}</div></div></div>
      <div class="team-meta"><div><i class="fa-regular fa-calendar"></i><span>${html(Array.isArray(m.days)?m.days.join(\', \'):(m.availability||\'No schedule set\'))}</span></div></div>
    </article>`).join(\'\'):\'<div class="empty">No team members yet</div>\';
  }
'''

new = '''  function renderTeam(rows){
    if(rows===null)return;
    const grid=$(\'teamGrid\');if(!grid)return;

    grid.innerHTML=rows.length?rows.map(m=>{
      const initials=String(m.name||\'TM\').trim().split(/\\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()||\'\').join(\'\')||\'TM\';
      const days=Array.isArray(m.days)&&m.days.length?m.days.join(\', \'):(m.availability||\'No schedule set\');
      const start=m.start_time?shortTime(m.start_time):\'\';
      const end=m.end_time?shortTime(m.end_time):\'\';
      const hours=start&&end?`${fmtTime(start)} – ${fmtTime(end)}`:\'No hours set\';
      const varies=m.day_hours&&typeof m.day_hours===\'object\'&&Object.keys(m.day_hours).length;

      return `<article class="team-card">
        <div class="team-top">
          <div class="team-avatar">${html(initials)}</div>
          <div><h3>${html(m.name||\'—\')}</h3><div class="role">${html(m.role||\'\')}</div></div>
        </div>
        <div class="team-meta">
          <div><i class="fa-regular fa-calendar"></i><span>${html(days)}</span></div>
          <div><i class="fa-regular fa-clock"></i><span>${html(hours)}${varies?\' · Hours vary by day\':\'\'}</span></div>
        </div>
        <div class="unified-actions">
          <button class="unified-action" type="button" data-team-edit="${html(m.id)}" title="Edit team member" aria-label="Edit team member"><i class="fa-solid fa-pen"></i></button>
          <button class="unified-action danger" type="button" data-team-delete="${html(m.id)}" title="Delete team member" aria-label="Delete team member"><i class="fa-solid fa-trash"></i></button>
        </div>
      </article>`;
    }).join(\'\'):\'<div class="panel" style="grid-column:1/-1"><div class="empty"><i class="fa-solid fa-user-group"></i><strong>No team members yet</strong>Add a team member when you are ready.</div></div>\';

    grid.querySelectorAll(\'[data-team-edit]\').forEach(btn=>btn.onclick=()=>{
      if(typeof data===\'undefined\'||typeof openTeam!==\'function\')return;
      const member=data.team.find(x=>String(x.id)===String(btn.dataset.teamEdit));
      if(member)openTeam(member);
    });

    grid.querySelectorAll(\'[data-team-delete]\').forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.teamDelete;
      const member=rows.find(x=>String(x.id)===String(id));
      pendingDelete={type:\'team\',id};
      deleteText.textContent=`Are you sure you want to delete ${member?.name||\'this team member\'}? This cannot be undone.`;
      deleteDialog.showModal();
    });
  }
'''

if old not in text:
    raise SystemExit('Target live renderTeam block was not found; admin.html was left unchanged.')

path.write_text(text.replace(old, new, 1))
print('Patched live Team renderer with edit/delete controls.')
