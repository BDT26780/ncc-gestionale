import React,{useState,useEffect,useMemo,useRef}from"react";

import{createClient}from"@supabase/supabase-js";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
export const SUPA_URL="https://uqafkwmtwlooiituspas.supabase.co";
export const SUPA_KEY="sb_publishable_kJo4kjKyp7KaiT3v0fFRqQ_IPP_GuW7";
export const supa=createClient(SUPA_URL,SUPA_KEY);

// ── STORAGE (sostituisce window.storage) ──────────────────────────────────────
export const loadAll=async()=>{
  try{
    const[rc,rd,rs,rsp]=await Promise.all([
      supa.from("committenti").select("*").order("nome"),
      supa.from("driver").select("*").order("cognome"),
      supa.from("servizi").select("*").order("data",{ascending:false}),
      supa.from("spese").select("*").order("data",{ascending:false}),
    ]);
    const clienti=(rc.data||[]).map(r=>({
      id:r.id,nome:r.nome,piva:r.piva||"",cf:r.cf||"",
      email:r.email||"",telefono:r.telefono||"",
      referente:r.referente||"",indirizzo:r.indirizzo||"",note:r.note||"",
    }));
    const driver=(rd.data||[]).map(r=>({
      id:r.id,
      nome:r.nome_completo||((r.nome||"")+" "+(r.cognome||"")).trim(),
      genere:r.genere||"F",
      modello:r.modello||"",targa:r.targa||"",
      telefono:r.telefono||"",email:r.email||"",
      scadBollo:r.scad_bollo||"",scadPatente:r.scad_patente||"",
      scadAss:r.scad_assicurazione||"",scadRev:r.scad_revisione||"",
      note:r.note||"",ztl:r.ztl||[],
    }));
    const servizi=(rs.data||[]).map(r=>({
      id:r.id,data:r.data||"",ora:r.ora||"",
      tipo:r.tipo||"trasferimento",oreDisp:r.ore_disp||2,
      committenteId:r.committente_id||"",driverId:r.driver_id||"",
      nomeUtente:r.nome_passeggero||"",telefonoUtente:r.telefono_passeggero||"",
      numeroVolo:r.numero_volo||"",pickup:r.pickup||"",dropoff:r.dropoff||"",
      passeggeri:r.passeggeri||1,bagagli:r.bagagli||0,
      prezzo:r.prezzo||"",prezzoDriver:r.prezzo_driver||"",
      ivaSeparata:r.iva_separata||false,metodoPagamento:r.metodo_pagamento||"",
      dataPagamento:r.data_pagamento||"",dataFattura:r.data_fattura||"",
      inFattura:r.in_fattura||false,durataManuale:r.durata_manuale||null,statoFattura:r.stato_fattura||"mancante",commissione:r.commissione||null,metodoCommissione:r.metodo_commissione||null,gruppoFattura:r.gruppo_fattura||null,
      note:r.note||"",
    }));
    const spese=(rsp.data||[]).map(r=>({
      id:r.id,tipo:r.tipo||"",data:r.data||"",
      descrizione:r.descrizione||"",importo:r.importo||"",
      aliqIva:r.aliq_iva||"22",driverId:r.driver_id||"",
      isQuota:r.is_quota||false,quotaNum:r.quota_num||null,
      quotaTot:r.quota_tot||null,quotaManuale:r.quota_manuale||false,
      anniAmmort:r.anni_ammort||3,pctAmmort:r.pct_ammort||25,
      note:r.note||"",
    }));
    return{clienti,driver,servizi,spese,found:true};
  }catch(e){
    console.error("loadAll error",e);
    return{clienti:[],driver:[],servizi:[],spese:[],found:false};
  }
};

export const saveAll=async(clienti,driver,servizi,spese)=>{
  if(clienti.length){
    await supa.from("committenti").upsert(clienti.map(r=>({
      id:r.id,nome:r.nome,piva:r.piva||null,cf:r.cf||null,
      email:r.email||null,telefono:r.telefono||null,
      referente:r.referente||null,indirizzo:r.indirizzo||null,note:r.note||null,
    })));
  }
  if(driver.length){
    await supa.from("driver").upsert(driver.map(r=>{
      const parti=(r.nome||"").trim().split(" ");
      const nome=parti[0]||"";
      const cognome=parti.slice(1).join(" ")||"";
      return{
        id:r.id,nome,cognome,nome_completo:r.nome,
        genere:r.genere||"F",
        modello:r.modello||null,targa:r.targa||null,
        telefono:r.telefono||null,email:r.email||null,
        scad_bollo:r.scadBollo||null,scad_patente:r.scadPatente||null,
        scad_assicurazione:r.scadAss||null,scad_revisione:r.scadRev||null,
        note:r.note||null,ztl:r.ztl||[],
      };
    }));
  }
  if(servizi.length){
    await supa.from("servizi").upsert(servizi.map(r=>({
      id:r.id,data:r.data||null,ora:r.ora||null,
      tipo:r.tipo||"trasferimento",ore_disp:r.oreDisp||null,
      committente_id:r.committenteId||null,driver_id:r.driverId||null,
      nome_passeggero:r.nomeUtente||null,telefono_passeggero:r.telefonoUtente||null,
      numero_volo:r.numeroVolo||null,pickup:r.pickup||null,dropoff:r.dropoff||null,
      passeggeri:r.passeggeri||1,bagagli:r.bagagli||0,
      prezzo:r.prezzo?parseFloat(r.prezzo):null,
      prezzo_driver:r.prezzoDriver?parseFloat(r.prezzoDriver):null,
      iva_separata:r.ivaSeparata||false,
      metodo_pagamento:r.metodoPagamento||null,
      data_pagamento:r.dataPagamento||null,
      data_fattura:r.dataFattura||null,stato_fattura:r.statoFattura||"mancante",
      in_fattura:r.inFattura||false,commissione:r.commissione||null,metodo_commissione:r.metodoCommissione||null,gruppo_fattura:r.gruppoFattura||null,
      durata_manuale:r.durataManuale||null,
      note:r.note||null,
    })));
  }
  if(spese.length){
    await supa.from("spese").upsert(spese.map(r=>({
      id:r.id,tipo:r.tipo||null,data:r.data||null,
      descrizione:r.descrizione||null,
      importo:r.importo?parseFloat(r.importo):null,
      aliq_iva:r.aliqIva||null,driver_id:r.driverId||null,
      is_quota:r.isQuota||false,quota_num:r.quotaNum||null,
      quota_tot:r.quotaTot||null,quota_manuale:r.quotaManuale||false,
      anni_ammort:r.anniAmmort||null,pct_ammort:r.pctAmmort||null,
      note:r.note||null,
    })));
  }
};

export const deleteRecord=async(table,id)=>{
  await supa.from(table).delete().eq("id",id);
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
export const uid=()=>String(Math.floor(100000+Math.random()*900000));
export const fmt=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n||0);
export const fmtD=d=>{if(!d)return"—";const p=d.slice(0,10).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:d;};
export const today=()=>new Date().toISOString().slice(0,10);
export const isExp=d=>d&&new Date(d)<new Date();
export const isNear=d=>{if(!d)return false;const v=(new Date(d)-new Date())/864e5;return v>=0&&v<=30};
export const DCOL=["#3b82f6","#f59e0b","#10b981","#ec4899","#8b5cf6","#f97316","#06b6d4","#84cc16"];
export const dcol=(id,dr)=>{if(!id)return"#6b7280";const i=dr.findIndex(x=>x.id===id);return DCOL[i%DCOL.length]||"#6b7280"};
export const ALIQ_MAP={"4":0.04,"5":0.05,"10":0.10,"22":0.22};
export const ivaS=s=>{const p=parseFloat(s.prezzo)||0;return s.ivaSeparata?p*0.1:p-p/1.1};
export const ivaImpon=s=>{const p=parseFloat(s.prezzo)||0;return s.ivaSeparata?p/1.1*1.1:p}; // lordo
export const prezzoLordo=s=>{const p=parseFloat(s.prezzo)||0;return s.ivaSeparata?p*1.1:p};

// ── STILI ─────────────────────────────────────────────────────────────────────
export const S={
  pg:{background:"#0f1320",minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#e2e8f0"},
  hdr:{background:"#121827",borderBottom:"1px solid #1e2d45",padding:"0 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8},
  nav:{background:"#121827",borderBottom:"1px solid #1e2d45",display:"flex",overflowX:"auto",padding:"0 14px"},
  cnt:{padding:"18px 14px",maxWidth:1200,margin:"0 auto"},
  card:{background:"#1a1f2e",border:"1px solid #2d3550",borderRadius:8,padding:"11px 13px",marginBottom:8},
  inp:{width:"100%",background:"#0f1320",border:"1px solid #2d3550",borderRadius:6,color:"#e2e8f0",padding:"7px 10px",fontSize:13,fontFamily:"inherit",boxSizing:"border-box"},
  bG:{background:"#e8d5a3",color:"#0f1320",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:5},
  bGr:{background:"#2d3550",border:"none",color:"#8892a4",borderRadius:6,padding:"7px 14px",cursor:"pointer"},
  bR:{background:"#3d1515",border:"none",color:"#f87171",borderRadius:4,padding:"4px 7px",cursor:"pointer"},
  lbl:{display:"block",fontSize:11,color:"#8892a4",textTransform:"uppercase",letterSpacing:1,marginBottom:4},
  gld:{color:"#e8d5a3",fontFamily:"Georgia,serif"},
};

// ── COMPONENTI BASE ───────────────────────────────────────────────────────────
export const Ic=({n,z=16})=>{
  const P={
    home:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z",
    car:"M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v5 M14 17a3 3 0 100 6 3 3 0 000-6z M5 17a3 3 0 100 6 3 3 0 000-6z",
    list:"M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
    cal:"M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
    clk:"M12 22a10 10 0 100-20 10 10 0 000 20z M12 6v6l4 2",
    eur:"M13 2a10 10 0 100 20A10 10 0 0013 2z M8 12h8 M8 9h5",
    pls:"M12 5v14 M5 12h14",
    edt:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    trs:"M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6",
    x:"M18 6L6 18 M6 6l12 12",
    wrn:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
    src:"M11 17a6 6 0 100-12 6 6 0 000 12z M21 21l-4.35-4.35",
    fatt:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  };
  return <svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {(P[n]||"").split(" M").map((d,i)=><path key={i} d={i===0?d:"M"+d}/>)}
  </svg>;
};

export const Badge=({color,children})=>{
  const C={green:"#16a34a",red:"#dc2626",amber:"#d97706",blue:"#2563eb",gray:"#4b5563",teal:"#0d9488"};
  const col=C[color]||C.gray;
  return <span style={{background:col+"33",color:col,border:`1px solid ${col}55`,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{children}</span>;
};

export const Modal=({title,onClose,children})=>{
  useEffect(()=>{
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=prev;};
  },[]);
  const chiudi=()=>{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();onClose();};
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
    <div style={{background:"#1a1f2e",border:"1px solid #2d3550",borderRadius:12,width:"100%",maxWidth:600,maxHeight:"92vh",overflow:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:"1px solid #2d3550"}}>
        <h3 style={{margin:0,...S.gld,fontSize:16}}>{title}</h3>
        <button onClick={chiudi} style={{background:"none",border:"none",color:"#8892a4",cursor:"pointer",padding:8}}><Ic n="x"/></button>
      </div>
      <div style={{padding:18}}>{children}</div>
    </div>
  </div>;
};

export const DelModal=({title,onClose,onConfirm})=>(
  <Modal title={title} onClose={onClose}>
    <p style={{color:"#c8d3e0",marginTop:0}}>Operazione non reversibile.</p>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
      <button style={S.bGr} onClick={onClose}>Annulla</button>
      <button style={{...S.bR,padding:"8px 18px",borderRadius:6}} onClick={onConfirm}>Elimina</button>
    </div>
  </Modal>
);

export const SwipeToDelete=({onDelete,children})=>{
  const REVEAL=84;
  const[dx,setDx]=useState(0);
  const[revealed,setRevealed]=useState(false);
  const drag=useRef({active:false,startX:0,startY:0,axis:null,base:0});
  const onDown=e=>{
    if(e.clientX<24)return;
    drag.current={active:true,startX:e.clientX,startY:e.clientY,axis:null,base:revealed?-REVEAL:0};
  };
  const onMove=e=>{
    if(!drag.current.active)return;
    const diffX=e.clientX-drag.current.startX;
    const diffY=e.clientY-drag.current.startY;
    if(!drag.current.axis){
      if(Math.abs(diffX)<12&&Math.abs(diffY)<12)return;
      drag.current.axis=Math.abs(diffX)>Math.abs(diffY)?"x":"y";
    }
    if(drag.current.axis!=="x")return;
    let next=drag.current.base+diffX;
    next=Math.max(-REVEAL,Math.min(0,next));
    setDx(next);
  };
  const onUp=()=>{
    if(!drag.current.active)return;
    if(drag.current.axis==="x"){
      if(dx<-REVEAL/2){setDx(-REVEAL);setRevealed(true);drag.current.justOpened=true;setTimeout(()=>{drag.current.justOpened=false;},300);}
      else{setDx(0);setRevealed(false);}
    }
    drag.current.active=false;drag.current.axis=null;
  };
  return <div style={{position:"relative",overflow:"hidden",borderRadius:8,marginBottom:8}}>
    <div style={{position:"absolute",top:0,right:0,bottom:0,width:REVEAL,display:"flex",opacity:dx<0?1:0,pointerEvents:dx<0?"auto":"none",transition:"opacity 0.15s ease"}}>
      <button onClick={()=>{onDelete();setDx(0);setRevealed(false);}} style={{flex:1,background:"#dc2626",border:"none",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Elimina</button>
    </div>
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClick={e=>{if(revealed&&!drag.current.justOpened){setDx(0);setRevealed(false);}}}
      style={{transform:`translateX(${dx}px)`,transition:drag.current.active?"none":"transform 0.2s ease",touchAction:"pan-y",position:"relative",background:"inherit"}}
    >
      {children}
    </div>
  </div>;
};
export const PagModal=({onClose,onConfirm})=>{
  const [m,setM]=useState("bonifico");
  const [dataPag,setDataPag]=useState(today());
  const MT=["contanti","bonifico","carta","mypos","paypal"];
  const EMO={contanti:"💵",bonifico:"🏦",carta:"💳",mypos:"📱",paypal:"🅿️"};
  return <Modal title="Metodo di pagamento" onClose={onClose}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
      {MT.map(x=><button key={x} onClick={()=>setM(x)} style={{background:m===x?"#3b82f633":"#2d3550",border:`1px solid ${m===x?"#3b82f6":"#3d4a60"}`,borderRadius:8,padding:14,color:m===x?"#60a5fa":"#e2e8f0",fontSize:13,cursor:"pointer",fontWeight:600}}>{EMO[x]} {x}</button>)}
    </div>
    <div style={{marginBottom:14}}>
      <div style={{color:"#8892a4",fontSize:12,marginBottom:6}}>Data pagamento</div>
      <input type="date" style={{...S.inp,fontSize:16}} value={dataPag} onChange={e=>setDataPag(e.target.value)}/>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
      <button style={S.bGr} onClick={onClose}>Annulla</button>
      <button style={S.bG} onClick={()=>onConfirm(m,dataPag)}>Conferma</button>
    </div>
  </Modal>;
};

export const F=({label,children,w})=>(
  <div style={{marginBottom:11,width:w||"100%"}}>
    <label style={S.lbl}>{label}</label>{children}
  </div>
);

