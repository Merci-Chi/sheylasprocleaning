(()=>{
  const URL='https://wfxuxrvygyzonkflpwoq.supabase.co';
  const KEY='sb_publishable_e2h4t8AvCobzftt36UrDbw_NJGq8qlJ';
  const TABLES={
    clients:'sheylaspro-clients',
    services:'sheylaspro-services',
    team:'sheylaspro-team',
    appointments:'sheylaspro-appointments',
    estimates:'sheylaspro-estimates'
  };

  const liveDb=window.supabase.createClient(URL,KEY,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{headers:{'x-client-info':'sheylas-admin-live-fix'}}
  });

  let refreshing=false;

  const cleanTime=value=>value?String(value).slice(0,5):'';
  const byName=(rows,name)=>{
    const needle=String(name||'').trim().toLowerCase();
    return rows.find(row=>String(row.name||'').trim().toLowerCase()===needle)||null;
  };

  async function copyAdminSession(){
    try{
      if(typeof sheylasDb==='undefined')return;
      const {data:sessionData}=await sheylasDb.auth.getSession();
      const session=sessionData?.session;
      if(!session?.access_token||!session?.refresh_token)return;
      await liveDb.auth.setSession({
        access_token:session.access_token,
        refresh_token:session.refresh_token
      });
    }catch(error){
      console.warn('Admin session sync failed.',error);
    }
  }

  async function query(table,orderColumn,ascending=true){
    try{
      let request=liveDb.from(table).select('*');
      if(orderColumn)request=request.order(orderColumn,{ascending});
      const result=await request;
      if(result.error){
        console.warn(`Could not load ${table}:`,result.error);
        return null;
      }
      return result.data||[];
    }catch(error){
      console.warn(`Could not load ${table}:`,error);
      return null;
    }
  }

  async function refreshAdminPages(){
    if(refreshing||typeof data==='undefined'||typeof render!=='function')return;
    refreshing=true;
    try{
      await copyAdminSession();

      const [clients,services,team,appointments,estimates]=await Promise.all([
        query(TABLES.clients,'name',true),
        query(TABLES.services,'sort_order',true),
        query(TABLES.team,'sort_order',true),
        query(TABLES.appointments,'appointment_date',false),
        query(TABLES.estimates,'created_at',false)
      ]);

      if(clients){
        data.clients=clients.map(x=>({
          id:x.id,
          name:x.name||'',
          phone:x.phone||'',
          email:x.email||'',
          address:x.address||'',
          notes:x.notes||'',
          active:x.active!==false
        }));
      }

      if(services){
        data.services=services.map(x=>({
          id:x.id,
          name:x.name||'',
          price:x.price||String(x.price_label||'').replace(/^\$/,''),
          description:x.description||'',
          imageUrl:x.image_url||'',
          icon:x.icon||'',
          isLive:x.is_live!==false,
          sortOrder:x.sort_order||0
        }));
      }

      if(team){
        data.team=team.map(x=>({
          id:x.id,
          name:x.name||'',
          role:x.role||'',
          days:Array.isArray(x.days)?x.days:[],
          start:cleanTime(x.start_time),
          end:cleanTime(x.end_time),
          dayHours:x.day_hours&&typeof x.day_hours==='object'?x.day_hours:{},
          active:x.active!==false
        }));
      }

      if(appointments){
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
            teamIds:Array.isArray(x.team_ids)?x.team_ids.filter(Boolean):[],
            teamId:'',
            date:x.appointment_date||'',
            time:cleanTime(x.appointment_time),
            notes:x.notes||'',
            status:x.status||'pending'
          };
        });
      }

      if(estimates){
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
            notes:x.notes||x.details||'',
            status:x.status||'new',
            photoPaths:Array.isArray(x.photo_paths)?x.photo_paths:[],
            roomCount:x.room_count||null
          };
        });
      }

      try{save()}catch(_error){}
      render();
    }finally{
      refreshing=false;
    }
  }

  window.refreshSheylasAdmin=refreshAdminPages;

  document.addEventListener('click',event=>{
    if(event.target.closest('.nav-item[data-page],[data-go]')){
      setTimeout(refreshAdminPages,25);
    }
  });

  window.addEventListener('focus',refreshAdminPages);
  window.addEventListener('pageshow',refreshAdminPages);
  setTimeout(refreshAdminPages,250);
  setTimeout(refreshAdminPages,1500);
})();
