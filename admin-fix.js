(()=>{
  const TABLES={
    clients:'sheylaspro-clients',
    services:'sheylaspro-services',
    team:'sheylaspro-team',
    appointments:'sheylaspro-appointments',
    estimates:'sheylaspro-estimates'
  };

  let refreshing=false;
  let retryTimer=null;

  const cleanTime=value=>value?String(value).slice(0,5):'';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const countLabel=n=>`${n} ${n===1?'record':'records'}`;
  const money=value=>value?`$${String(value).replace(/^\$/,'')}`:'—';
  const formatDate=value=>value?new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—';
  const byName=(rows,name)=>{
    const needle=String(name||'').trim().toLowerCase();
    return rows.find(row=>String(row.name||'').trim().toLowerCase()===needle)||null;
  };
  const ready=()=>typeof sheylasDb!=='undefined'&&typeof data!=='undefined';
  const el=id=>document.getElementById(id);

  async function query(table,orderColumn,ascending=true){
    try{
      let request=sheylasDb.from(table).select('*');
      if(orderColumn)request=request.order(orderColumn,{ascending});
      const result=await request;
      if(result.error){
        console.error(`Could not load ${table}:`,result.error);
        return null;
      }
      return result.data||[];
    }catch(error){
      console.error(`Could not load ${table}:`,error);
      return null;
    }
  }

  function mapData(clients,services,team,appointments,estimates){
    if(clients!==null){
      data.clients=clients.map(x=>({id:x.id,name:x.name||'',phone:x.phone||'',email:x.email||'',address:x.address||'',notes:x.notes||'',active:x.active!==false}));
    }
    if(services!==null){
      data.services=services.map(x=>({id:x.id,name:x.name||'',price:x.price||String(x.price_label||'').replace(/^\$/,''),description:x.description||'',imageUrl:x.image_url||'',icon:x.icon||'',isLive:x.is_live!==false,sortOrder:x.sort_order||0}));
    }
    if(team!==null){
      data.team=team.map(x=>({id:x.id,name:x.name||'',role:x.role||'',days:Array.isArray(x.days)?x.days:[],start:cleanTime(x.start_time),end:cleanTime(x.end_time),dayHours:x.day_hours&&typeof x.day_hours==='object'?x.day_hours:{},active:x.active!==false}));
    }
    if(appointments!==null){
      data.appointments=appointments.map(x=>{
        const linkedClient=x.client_id?data.clients.find(c=>c.id===x.client_id):null;
        const fallbackClient=!linkedClient?byName(data.clients,x.client_name):null;
        const linkedService=x.service_id?data.services.find(s=>s.id===x.service_id):null;
        const fallbackService=!linkedService?byName(data.services,x.service):null;
        return {id:x.id,clientId:linkedClient?.id||fallbackClient?.id||'',guestName:x.guest_name||((linkedClient||fallbackClient)?'':x.client_name||''),guestPhone:x.guest_phone||((linkedClient||fallbackClient)?'':x.phone||''),serviceId:linkedService?.id||fallbackService?.id||'',teamIds:Array.isArray(x.team_ids)?x.team_ids.filter(Boolean):[],teamId:'',date:x.appointment_date||'',time:cleanTime(x.appointment_time),notes:x.notes||'',status:x.status||'pending',clientName:x.client_name||'',phone:x.phone||'',serviceName:x.service||'',teamMember:x.team_member||''};
      });
    }
    if(estimates!==null){
      data.estimates=estimates.map(x=>{
        const linkedClient=x.client_id?data.clients.find(c=>c.id===x.client_id):null;
        const fallbackClient=!linkedClient?byName(data.clients,x.client_name):null;
        const linkedService=x.service_id?data.services.find(s=>s.id===x.service_id):null;
        const fallbackService=!linkedService?byName(data.services,x.service):null;
        return {id:x.id,clientId:linkedClient?.id||fallbackClient?.id||'',guestName:x.guest_name||((linkedClient||fallbackClient)?'':x.client_name||''),guestPhone:x.guest_phone||((linkedClient||fallbackClient)?'':x.phone||''),serviceId:linkedService?.id||fallbackService?.id||'',amount:x.amount==null?'':String(x.amount),date:x.estimate_date||String(x.created_at||'').slice(0,10),notes:x.notes||x.details||'',status:x.status||'new',photoPaths:Array.isArray(x.photo_paths)?x.photo_paths:[],roomCount:x.room_count||null,clientName:x.client_name||'',serviceName:x.service||'',phone:x.phone||''};
      });
    }
  }

  function directRender(){
    const clients=data.clients||[],services=data.services||[],team=data.team||[],appointments=data.appointments||[],estimates=data.estimates||[];

    const clientCount=el('clientCount'),clientRows=el('clientRows'),clientEmpty=el('clientEmpty');
    if(clientCount)clientCount.textContent=countLabel(clients.length);
    if(clientEmpty)clientEmpty.style.display=clients.length?'none':'block';
    if(clientRows)clientRows.innerHTML=clients.map(x=>`<tr><td data-label="Name"><strong>${esc(x.name)}</strong></td><td data-label="Phone">${x.phone?`<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>`:'—'}</td><td data-label="Email">${x.email?`<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>`:'—'}</td><td data-label="Address">${esc(x.address||'—')}</td><td data-label="Notes">${esc(x.notes||'—')}</td><td data-label="Actions"><div class="row-actions"><button class="icon-btn" data-edit-client="${esc(x.id)}"><i class="fa-solid fa-pen"></i></button><button class="icon-btn" data-del="clients" data-id="${esc(x.id)}"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join('');

    const estimateCount=el('estimateCount'),estimateRows=el('estimateRows'),estimateEmpty=el('estimateEmpty');
    if(estimateCount)estimateCount.textContent=countLabel(estimates.length);
    if(estimateEmpty)estimateEmpty.style.display=estimates.length?'none':'block';
    if(estimateRows)estimateRows.innerHTML=estimates.map(x=>{
      const client=clients.find(c=>c.id===x.clientId),service=services.find(s=>s.id===x.serviceId);
      const name=client?.name||x.clientName||x.guestName||'—';
      const serviceName=service?.name||x.serviceName||'—';
      const photoNote=x.photoPaths?.length?`${x.photoPaths.length} photo${x.photoPaths.length===1?'':'s'} attached`:'';
      return `<tr><td data-label="Client"><strong>${esc(name)}</strong>${x.phone||x.guestPhone?`<small>${esc(x.phone||x.guestPhone)}</small>`:''}</td><td data-label="Service"><strong>${esc(serviceName)}</strong>${x.roomCount?`<small>${esc(x.roomCount)} room${Number(x.roomCount)===1?'':'s'}</small>`:''}${photoNote?`<small>${esc(photoNote)}</small>`:''}</td><td data-label="Amount">${esc(money(x.amount))}</td><td data-label="Date">${esc(formatDate(x.date))}</td><td data-label="Notes">${esc(x.notes||'—')}</td><td data-label="Actions"><div class="row-actions"><button class="icon-btn" data-edit-est="${esc(x.id)}"><i class="fa-solid fa-pen"></i></button><button class="icon-btn" data-del="estimates" data-id="${esc(x.id)}"><i class="fa-solid fa-trash"></i></button></div></td></tr>`;
    }).join('');

    const serviceCount=el('serviceCount'),serviceRows=el('serviceRows'),serviceEmpty=el('serviceEmpty');
    if(serviceCount)serviceCount.textContent=countLabel(services.length);
    if(serviceEmpty)serviceEmpty.style.display=services.length?'none':'block';
    if(serviceRows)serviceRows.innerHTML=services.map(x=>`<tr><td data-label="Name"><strong>${esc(x.name)}</strong></td><td data-label="Price">${esc(money(x.price))}</td><td data-label="Description">${esc(x.description||'—')}</td><td data-label="Actions"><div class="row-actions"><button class="icon-btn" data-edit-service="${esc(x.id)}"><i class="fa-solid fa-pen"></i></button><button class="icon-btn" data-del="services" data-id="${esc(x.id)}"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join('');

    const teamGrid=el('teamGrid');
    if(teamGrid)teamGrid.innerHTML=team.length?team.map(x=>`<article class="team-card"><div class="team-top"><div class="team-avatar">${esc(x.name.trim().split(/\s+/).slice(0,2).map(v=>v[0]?.toUpperCase()||'').join('')||'TM')}</div><div><h3>${esc(x.name)}</h3><span class="role">${esc(x.role||'')}</span></div></div><div class="team-meta"><div><i class="fa-regular fa-calendar"></i><span>${esc((x.days||[]).join(', ')||'No days set')}</span></div><div><i class="fa-regular fa-clock"></i><span>${esc(x.start||'—')} – ${esc(x.end||'—')}</span></div></div></article>`).join(''):'<div class="empty"><i class="fa-solid fa-users"></i><strong>No team members yet</strong>Add your first team member when you are ready.</div>';

    const appointmentCount=el('appointmentCount'),appointmentRows=el('appointmentRows'),appointmentEmpty=el('appointmentEmpty');
    if(appointmentCount)appointmentCount.textContent=countLabel(appointments.length);
    if(appointmentEmpty)appointmentEmpty.style.display=appointments.length?'none':'block';
    if(appointmentRows)appointmentRows.innerHTML=appointments.map(x=>{
      const client=clients.find(c=>c.id===x.clientId),service=services.find(s=>s.id===x.serviceId);
      return `<tr><td data-label="Date">${esc(formatDate(x.date))}</td><td data-label="Time">${esc(x.time||'—')}</td><td data-label="Client"><strong>${esc(client?.name||x.clientName||x.guestName||'—')}</strong></td><td data-label="Service">${esc(service?.name||x.serviceName||'—')}</td><td data-label="Team">${esc(x.teamMember||'Unassigned')}</td><td data-label="Phone">${esc(client?.phone||x.phone||x.guestPhone||'—')}</td><td data-label="Actions"></td></tr>`;
    }).join('');

    const statAppointments=el('statAppointments'),statEstimates=el('statEstimates'),statClients=el('statClients'),statServices=el('statServices'),statTeam=el('statTeam');
    if(statAppointments)statAppointments.textContent=appointments.length;
    if(statEstimates)statEstimates.textContent=estimates.length;
    if(statClients)statClients.textContent=clients.length;
    if(statServices)statServices.textContent=services.length;
    if(statTeam)statTeam.textContent=team.length;

    try{if(typeof renderClients==='function')renderClients()}catch(error){console.warn('Client action binding skipped.',error)}
    try{if(typeof renderServices==='function')renderServices()}catch(error){console.warn('Service action binding skipped.',error)}
    try{if(typeof renderTeam==='function')renderTeam()}catch(error){console.warn('Team action binding skipped.',error)}
    try{if(typeof renderAppointments==='function')renderAppointments()}catch(error){console.warn('Appointment action binding skipped.',error)}
    try{if(typeof renderEstimates==='function')renderEstimates()}catch(error){console.warn('Estimate action binding skipped.',error)}
  }

  async function refreshAdminPages(){
    if(refreshing)return;
    if(!ready()){
      clearTimeout(retryTimer);
      retryTimer=setTimeout(refreshAdminPages,250);
      return;
    }
    refreshing=true;
    try{
      if(typeof requireSession==='function'){
        const ok=await requireSession();
        if(!ok)return;
      }else{
        const {data:sessionData}=await sheylasDb.auth.getSession();
        if(!sessionData?.session)return;
      }

      const [clients,services,team,appointments,estimates]=await Promise.all([
        query(TABLES.clients,'name',true),
        query(TABLES.services,'sort_order',true),
        query(TABLES.team,'sort_order',true),
        query(TABLES.appointments,'appointment_date',false),
        query(TABLES.estimates,'created_at',false)
      ]);

      mapData(clients,services,team,appointments,estimates);
      try{localStorage.setItem('cleaning_admin_data_v1',JSON.stringify(data))}catch(_error){}
      directRender();
      if(typeof syncCustomSelects==='function')syncCustomSelects();
    }catch(error){
      console.error('Could not refresh admin pages.',error);
    }finally{
      refreshing=false;
    }
  }

  window.refreshSheylasAdmin=refreshAdminPages;
  try{if(typeof loadSheylasData==='function')loadSheylasData=refreshAdminPages}catch(_error){}
  document.addEventListener('click',event=>{if(event.target.closest('.nav-item[data-page],[data-go]'))setTimeout(refreshAdminPages,40)});
  ['focus','pageshow'].forEach(name=>window.addEventListener(name,refreshAdminPages));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAdminPages()});
  setTimeout(refreshAdminPages,100);
  setTimeout(refreshAdminPages,700);
  setTimeout(refreshAdminPages,1800);
})();
