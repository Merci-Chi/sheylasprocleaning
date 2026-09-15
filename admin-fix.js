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
  const byName=(rows,name)=>{
    const needle=String(name||'').trim().toLowerCase();
    return rows.find(row=>String(row.name||'').trim().toLowerCase()===needle)||null;
  };

  const ready=()=>typeof sheylasDb!=='undefined'&&typeof data!=='undefined'&&typeof render==='function';

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
      data.clients=clients.map(x=>({
        id:x.id,name:x.name||'',phone:x.phone||'',email:x.email||'',address:x.address||'',
        notes:x.notes||'',active:x.active!==false
      }));
    }

    if(services!==null){
      data.services=services.map(x=>({
        id:x.id,name:x.name||'',price:x.price||String(x.price_label||'').replace(/^\$/,''),
        description:x.description||'',imageUrl:x.image_url||'',icon:x.icon||'',
        isLive:x.is_live!==false,sortOrder:x.sort_order||0
      }));
    }

    if(team!==null){
      data.team=team.map(x=>({
        id:x.id,name:x.name||'',role:x.role||'',days:Array.isArray(x.days)?x.days:[],
        start:cleanTime(x.start_time),end:cleanTime(x.end_time),
        dayHours:x.day_hours&&typeof x.day_hours==='object'?x.day_hours:{},active:x.active!==false
      }));
    }

    if(appointments!==null){
      data.appointments=appointments.map(x=>{
        const linkedClient=x.client_id?data.clients.find(c=>c.id===x.client_id):null;
        const fallbackClient=!linkedClient?byName(data.clients,x.client_name):null;
        const linkedService=x.service_id?data.services.find(s=>s.id===x.service_id):null;
        const fallbackService=!linkedService?byName(data.services,x.service):null;
        return {
          id:x.id,
          clientId:linkedClient?.id||fallbackClient?.id||'',
          guestName:x.guest_name||((linkedClient||fallbackClient)?'':x.client_name||''),
          guestPhone:x.guest_phone||((linkedClient||fallbackClient)?'':x.phone||''),
          serviceId:linkedService?.id||fallbackService?.id||'',
          teamIds:Array.isArray(x.team_ids)?x.team_ids.filter(Boolean):[],teamId:'',
          date:x.appointment_date||'',time:cleanTime(x.appointment_time),notes:x.notes||'',status:x.status||'pending'
        };
      });
    }

    if(estimates!==null){
      data.estimates=estimates.map(x=>{
        const linkedClient=x.client_id?data.clients.find(c=>c.id===x.client_id):null;
        const fallbackClient=!linkedClient?byName(data.clients,x.client_name):null;
        const linkedService=x.service_id?data.services.find(s=>s.id===x.service_id):null;
        const fallbackService=!linkedService?byName(data.services,x.service):null;
        return {
          id:x.id,
          clientId:linkedClient?.id||fallbackClient?.id||'',
          guestName:x.guest_name||((linkedClient||fallbackClient)?'':x.client_name||''),
          guestPhone:x.guest_phone||((linkedClient||fallbackClient)?'':x.phone||''),
          serviceId:linkedService?.id||fallbackService?.id||'',
          amount:x.amount==null?'':String(x.amount),
          date:x.estimate_date||String(x.created_at||'').slice(0,10),
          notes:x.notes||x.details||'',status:x.status||'new',
          photoPaths:Array.isArray(x.photo_paths)?x.photo_paths:[],roomCount:x.room_count||null,
          clientName:x.client_name||'',serviceName:x.service||''
        };
      });
    }
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
      render();
      if(typeof syncCustomSelects==='function')syncCustomSelects();
    }catch(error){
      console.error('Could not refresh admin pages.',error);
    }finally{
      refreshing=false;
    }
  }

  window.refreshSheylasAdmin=refreshAdminPages;

  try{
    if(typeof loadSheylasData==='function')loadSheylasData=refreshAdminPages;
  }catch(_error){}

  document.addEventListener('click',event=>{
    if(event.target.closest('.nav-item[data-page],[data-go]'))setTimeout(refreshAdminPages,40);
  });

  ['focus','pageshow'].forEach(name=>window.addEventListener(name,refreshAdminPages));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAdminPages()});

  setTimeout(refreshAdminPages,100);
  setTimeout(refreshAdminPages,700);
  setTimeout(refreshAdminPages,1800);
})();
