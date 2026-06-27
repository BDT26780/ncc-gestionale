import React,{useState,useEffect,useMemo,useRef}from"react";

import{createClient}from"@supabase/supabase-js";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPA_URL="https://uqafkwmtwlooiituspas.supabase.co";
const SUPA_KEY="sb_publishable_kJo4kjKyp7KaiT3v0fFRqQ_IPP_GuW7";
const supa=createClient(SUPA_URL,SUPA_KEY);

// ── STORAGE (sostituisce window.storage) ──────────────────────────────────────
const loadAll=async()=>{
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
      note:r.note||"",
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
      inFattura:r.in_fattura||false,durataManuale:r.durata_manuale||null,
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

const saveAll=async(clienti,driver,servizi,spese)=>{
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
        note:r.note||null,
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
      data_fattura:r.dataFattura||null,
      in_fattura:r.inFattura||false,
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

const deleteRecord=async(table,id)=>{
  await supa.from(table).delete().eq("id",id);
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
const uid=()=>String(Math.floor(100000+Math.random()*900000));
const fmt=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n||0);
const today=()=>new Date().toISOString().slice(0,10);
const isExp=d=>d&&new Date(d)<new Date();
const isNear=d=>{if(!d)return false;const v=(new Date(d)-new Date())/864e5;return v>=0&&v<=30};
const DCOL=["#3b82f6","#f59e0b","#10b981","#ec4899","#8b5cf6","#f97316","#06b6d4","#84cc16"];
const dcol=(id,dr)=>{if(!id)return"#6b7280";const i=dr.findIndex(x=>x.id===id);return DCOL[i%DCOL.length]||"#6b7280"};
const ALIQ_MAP={"4":0.04,"5":0.05,"10":0.10,"22":0.22};
const ivaS=s=>{const p=parseFloat(s.prezzo)||0;return s.ivaSeparata?p*0.1:p-p/1.1};
const ivaImpon=s=>{const p=parseFloat(s.prezzo)||0;return s.ivaSeparata?p/1.1*1.1:p}; // lordo
const prezzoLordo=s=>{const p=parseFloat(s.prezzo)||0;return s.ivaSeparata?p*1.1:p};

// ── STILI ─────────────────────────────────────────────────────────────────────
const S={
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
const Ic=({n,z=16})=>{
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

const Badge=({color,children})=>{
  const C={green:"#16a34a",red:"#dc2626",amber:"#d97706",blue:"#2563eb",gray:"#4b5563",teal:"#0d9488"};
  const col=C[color]||C.gray;
  return <span style={{background:col+"33",color:col,border:`1px solid ${col}55`,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{children}</span>;
};

const Modal=({title,onClose,children})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
    <div style={{background:"#1a1f2e",border:"1px solid #2d3550",borderRadius:12,width:"100%",maxWidth:600,maxHeight:"92vh",overflow:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:"1px solid #2d3550"}}>
        <h3 style={{margin:0,...S.gld,fontSize:16}}>{title}</h3>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#8892a4",cursor:"pointer"}}><Ic n="x"/></button>
      </div>
      <div style={{padding:18}}>{children}</div>
    </div>
  </div>
);

const DelModal=({title,onClose,onConfirm})=>(
  <Modal title={title} onClose={onClose}>
    <p style={{color:"#c8d3e0",marginTop:0}}>Operazione non reversibile.</p>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
      <button style={S.bGr} onClick={onClose}>Annulla</button>
      <button style={{...S.bR,padding:"8px 18px",borderRadius:6}} onClick={onConfirm}>Elimina</button>
    </div>
  </Modal>
);

const PagModal=({onClose,onConfirm})=>{
  const [m,setM]=useState("bonifico");
  const MT=["contanti","bonifico","carta","mypos","paypal"];
  const EMO={contanti:"💵",bonifico:"🏦",carta:"💳",mypos:"📱",paypal:"🅿️"};
  return <Modal title="Metodo di pagamento" onClose={onClose}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
      {MT.map(x=><button key={x} onClick={()=>setM(x)} style={{background:m===x?"#3b82f633":"#2d3550",border:`1px solid ${m===x?"#3b82f6":"#3d4a60"}`,borderRadius:8,padding:14,color:m===x?"#60a5fa":"#e2e8f0",fontSize:13,cursor:"pointer",fontWeight:600}}>{EMO[x]} {x}</button>)}
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
      <button style={S.bGr} onClick={onClose}>Annulla</button>
      <button style={S.bG} onClick={()=>onConfirm(m)}>Conferma</button>
    </div>
  </Modal>;
};

const F=({label,children,w})=>(
  <div style={{marginBottom:11,width:w||"100%"}}>
    <label style={S.lbl}>{label}</label>{children}
  </div>
);

// ── IVA TRIMESTRALE ───────────────────────────────────────────────────────────
const TRIM=[
  {label:"1° Trim.",months:[1,2,3],scad:"16 Maggio"},
  {label:"2° Trim.",months:[4,5,6],scad:"16 Agosto"},
  {label:"3° Trim.",months:[7,8,9],scad:"16 Novembre"},
  {label:"4° Trim.",months:[10,11,12],scad:"16 Feb."},
];

// ── IRPEF 2024 ────────────────────────────────────────────────────────────────
const calcIRPEF=base=>{
  const sc=[{f:28000,a:.23},{f:50000,a:.35},{f:Infinity,a:.43}];
  let tax=0,prev=0;
  for(const s of sc){if(base<=prev)break;tax+=(Math.min(base,s.f)-prev)*s.a;prev=s.f;}
  const det=base<=15000?1265:base<=55000?Math.max(0,1265*(55000-base)/40000):0;
  return Math.max(0,tax-det);
};

// ── HOME ──────────────────────────────────────────────────────────────────────
function Home({servizi,spese,anno,tutteSpese}){
  const [showSpeseDett,setShowSpeseDett]=useState(false);
  const st=useMemo(()=>{
    const pag=servizi.filter(s=>s.dataPagamento);
    const tot=pag.reduce((a,s)=>a+prezzoLordo(s),0);
    const xm={contanti:0,bonifico:0,carta:0,mypos:0,paypal:0};
    pag.forEach(s=>{if(s.metodoPagamento)xm[s.metodoPagamento]=(xm[s.metodoPagamento]||0)+prezzoLordo(s)});
    const dich=(xm.bonifico||0)+(xm.carta||0);
    const iva=pag.filter(s=>["bonifico","carta"].includes(s.metodoPagamento)).reduce((a,s)=>a+ivaS(s),0);
    const dichNetto=dich-iva;
    const ts=spese||[];
    const totSp=ts.filter(s=>s.tipo!=="inps_anno_prec"&&s.tipo!=="detrazioni_19"&&s.tipo!=="perdita_anno_prec").reduce((a,s)=>a+(parseFloat(s.importo)||0),0);
    const commB=ts.filter(s=>s.tipo==="comm_bon").reduce((a,s)=>a+(parseFloat(s.importo)||0),0);
    const inpsPre=ts.filter(s=>s.tipo==="inps_anno_prec").reduce((a,s)=>a+(parseFloat(s.importo)||0),0);
    const perditaPre=ts.filter(s=>s.tipo==="perdita_anno_prec").reduce((a,s)=>a+(parseFloat(s.importo)||0),0);
    const impDet=ts.filter(s=>s.tipo==="detrazioni_19").reduce((a,s)=>a+(parseFloat(s.importo)||0),0);
    const det19=impDet*0.19;
    const baseOrd=Math.max(0,dichNetto-totSp-inpsPre-perditaPre);
    const irpef=calcIRPEF(baseOrd);
    const irpefN=Math.max(0,irpef-det19);
    const inps=Math.min(baseOrd,113520)*0.2672;
    const baseForf=dich*0.67;
    const detIRPEF=[
      {label:"fino a 28.000 (23%)",base:Math.min(Math.max(0,baseOrd),28000),a:.23},
      {label:"28.001-50.000 (35%)",base:Math.min(Math.max(0,baseOrd-28000),22000),a:.35},
      {label:"oltre 50.000 (43%)",base:Math.max(0,baseOrd-50000),a:.43},
    ].filter(s=>s.base>0);
    const allSp=tutteSpese||[];
    const ivaCred=allSp.reduce((a,s)=>{const imp=parseFloat(s.importo)||0;const al=ALIQ_MAP[s.aliqIva]||0;return a+imp*(al/(1+al))},0);
    const ivaNet=iva-ivaCred;
    // IVA cumulativa: il credito non usato si riporta al trimestre successivo
    const trim=(()=>{
      let riporto=0;
      return TRIM.map(t=>{
        const mOk=d=>t.months.includes(parseInt(d?.slice(5,7)));
        const deb=pag.filter(s=>["bonifico","carta"].includes(s.metodoPagamento)&&mOk(s.dataPagamento)).reduce((a,s)=>a+ivaS(s),0);
        const cred=allSp.filter(s=>mOk(s.data)).reduce((a,s)=>{const imp=parseFloat(s.importo)||0;const al=ALIQ_MAP[s.aliqIva]||0;return a+imp*(al/(1+al))},0);
        const saldo=deb-(cred+riporto);
        const daVersare=Math.max(0,saldo);
        const nuovoCred=Math.max(0,-saldo);
        const rip=riporto;
        riporto=nuovoCred;
        return{...t,iva:deb,cred,riportoPre:rip,daVersare,nuovoCred};
      });
    })();
    const annoC=new Date().getFullYear();
    const ammort=Object.values(
      allSp.filter(s=>s.isQuota&&["acquisto_auto","beni_durevoli"].includes(s.tipo))
        .reduce((map,s)=>{
          const k=(s.descrizione||"").replace(/ quota \d+\/\d+.*/,"").replace(/ \[IVA.*/,"").trim()||s.id;
          if(!map[k])map[k]={desc:k,tipo:s.tipo,quote:[],totale:0};
          map[k].quote.push({anno:parseInt(s.data?.slice(0,4)),imp:parseFloat(s.importo)||0,n:s.quotaNum,tot:s.quotaTot});
          map[k].totale+=(parseFloat(s.importo)||0);
          return map;
        },{})
    ).map(b=>{
      const ded=b.quote.filter(q=>q.anno<=annoC).reduce((a,q)=>a+q.imp,0);
      return{...b,ded,res:b.totale-ded,future:b.quote.filter(q=>q.anno>annoC).sort((a,z)=>a.anno-z.anno)};
    }).filter(b=>b.totale>0);
    return{tot,xm,dich,dichNetto,iva,ivaCred,ivaNet,totSp,commB,inpsPre,perditaPre,det19,impDet,baseOrd,irpef,irpefN,inps,tassaOrd:irpefN+inps,baseForf,tassaForf:baseForf*0.15,detIRPEF,trim,ammort,annoC};
  },[servizi,spese,tutteSpese]);

  const Row=({l,v,s})=><div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #1e2435"}}>
    <span style={{color:s?"#8892a4":"#c8d3e0",fontSize:s?11:13}}>{l}</span>
    <span style={{color:s?"#8892a4":"#e8d5a3",fontWeight:600,fontFamily:"Georgia,serif"}}>{v}</span>
  </div>;
  const Card=({title,col,children})=><div style={{background:"#1a1f2e",border:`1px solid ${col||"#2d3550"}`,borderRadius:10,padding:14,marginBottom:12}}>
    <div style={{fontSize:11,color:col||"#8892a4",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>{title}</div>
    {children}
  </div>;
  const Big=({val,col})=><div style={{color:col||"#e8d5a3",fontSize:24,fontFamily:"Georgia,serif",fontWeight:700,marginBottom:8}}>{fmt(val)}</div>;

  return <div>
    <h2 style={{...S.gld,marginTop:0}}>Dashboard {anno!=="tutti"&&<span style={{fontSize:14,color:"#60a5fa"}}>— {anno}</span>}</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}}>
      <Card title="Entrate totali" col="#e8d5a3">
        <Big val={st.tot}/>
        {Object.entries(st.xm).map(([k,v])=><Row key={k} l={k} v={fmt(v)} s/>)}
      </Card>
      <Card title="Dichiarato (bonifico+carta)" col="#60a5fa">
        <Big val={st.dich} col="#60a5fa"/>
        <Row l="Imponibile netto" v={fmt(st.dichNetto)}/>
        <Row l="IVA 10% a debito" v={fmt(st.iva)}/>
      </Card>
      <Card title="Regime Forfettario ATECO 49.33.20" col="#a78bfa">
        <Row l="Ricavi dichiarati (bonifico+carta)" v={fmt(st.dich)}/>
        <Row l="× 67% = Reddito imponibile" v={fmt(st.baseForf)} s/>
        <div style={{background:"#a78bfa22",border:"1px solid #a78bfa66",borderRadius:6,padding:"8px 10px",margin:"8px 0"}}>
          <div style={{color:"#a78bfa",fontWeight:700,fontSize:13}}>Imposta sostitutiva 15%</div>
          <div style={{color:"#e8d5a3",fontFamily:"Georgia,serif",fontSize:22,fontWeight:700}}>{fmt(st.tassaForf)}</div>
          <div style={{fontSize:10,color:"#6b7280",marginTop:2}}>5% per i primi 5 anni</div>
        </div>
      </Card>
      <Card title="Regime Ordinario — IRPEF 2024" col="#f97316">
        <Row l="Dichiarato (bonifico+carta)" v={fmt(st.dich)}/>
        <Row l="IVA scorporata" v={fmt(st.iva)} s/>
        <Row l="Totale netto fiscale" v={fmt(st.dichNetto)}/>
        <Row l="Spese deducibili" v={fmt(st.totSp)} s/>
        {st.inpsPre>0&&<Row l="INPS anno prec. (dedotta)" v={fmt(st.inpsPre)} s/>}
        {st.perditaPre>0&&<Row l="Perdita anno prec. (dedotta)" v={fmt(st.perditaPre)} s/>}
        <Row l="Reddito imponibile" v={fmt(st.baseOrd)}/>
        <div style={{background:"#f9731622",border:"1px solid #f9731644",borderRadius:6,padding:"8px 10px",margin:"8px 0"}}>
          <div style={{color:"#f97316",fontSize:11,fontWeight:700,marginBottom:4}}>Scaglioni IRPEF 2024</div>
          {st.detIRPEF.map((s,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#c8d3e0",marginBottom:2}}>
            <span>{s.label}</span><span style={{color:"#e8d5a3",fontWeight:600}}>{fmt(s.base*s.a)}</span>
          </div>)}
          <div style={{borderTop:"1px solid #f9731644",marginTop:4,paddingTop:4,display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:700}}>
            <span style={{color:"#f97316"}}>IRPEF lorda</span><span style={{color:"#e8d5a3",fontFamily:"Georgia,serif"}}>{fmt(st.irpef)}</span>
          </div>
        </div>
        {st.det19>0&&<div style={{background:"#a78bfa22",border:"1px solid #a78bfa44",borderRadius:6,padding:"8px 10px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
            <span style={{color:"#a78bfa"}}>Detrazioni 19% (su {fmt(st.impDet)})</span>
            <span style={{color:"#e8d5a3",fontFamily:"Georgia,serif",fontWeight:700}}>- {fmt(st.det19)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:700,marginTop:4}}>
            <span style={{color:"#a78bfa"}}>IRPEF netta</span><span style={{color:"#e8d5a3",fontFamily:"Georgia,serif"}}>{fmt(st.irpefN)}</span>
          </div>
        </div>}
        <Row l="INPS gest. separata (26,72%)" v={fmt(st.inps)}/>
        <div style={{background:"#f9731633",border:"1px solid #f97316",borderRadius:6,padding:"8px 10px",marginTop:8}}>
          <div style={{color:"#f97316",fontWeight:700}}>Totale IRPEF netta + INPS</div>
          <div style={{color:"#e8d5a3",fontFamily:"Georgia,serif",fontSize:22,fontWeight:700}}>{fmt(st.tassaOrd)}</div>
        </div>
        <div style={{fontSize:10,color:"#6b7280",marginTop:6}}>* Verificare con commercialista.</div>
      </Card>
      <Card title="Spese totali (deducibili)" col="#f87171">
        <Big val={st.totSp} col="#f87171"/>
        <button onClick={()=>setShowSpeseDett(p=>!p)} style={{...S.bGr,fontSize:11,padding:"5px 10px"}}>{showSpeseDett?"Nascondi dettaglio":"Mostra dettaglio"}</button>
        {showSpeseDett&&<div style={{marginTop:10,maxHeight:300,overflowY:"auto"}}>
          {spese.filter(s=>s.tipo!=="inps_anno_prec"&&s.tipo!=="detrazioni_19"&&s.tipo!=="perdita_anno_prec").map(s=>(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #1e2435",fontSize:11}}>
              <span style={{color:"#c8d3e0"}}>{s.descrizione||s.tipo}<br/><span style={{color:"#6b7280"}}>{s.data} · {s.tipo}</span></span>
              <span style={{color:"#f87171",fontWeight:700}}>{fmt(s.importo)}</span>
            </div>
          ))}
          {spese.filter(s=>s.tipo!=="inps_anno_prec"&&s.tipo!=="detrazioni_19"&&s.tipo!=="perdita_anno_prec").length===0&&<div style={{color:"#6b7280",fontSize:11,padding:"6px 0"}}>Nessuna spesa in questo periodo</div>}
        </div>}
      </Card>
    </div>

    {/* IVA COMPENSAZIONE */}
    <div style={{marginTop:16}}>
      <h3 style={{...S.gld,margin:"0 0 12px",fontSize:15}}>IVA — Compensazione {anno!=="tutti"?anno:""}</h3>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10,marginBottom:12}}>
        {[
          {label:"IVA a Debito",val:st.iva,col:"#f87171",sub:"Servizi bonifico+carta"},
          {label:"IVA a Credito",val:st.ivaCred,col:"#4ade80",sub:"Dalle spese con IVA"},
          {label:st.ivaNet>0?"Netto annuale da versare":"Netto annuale a credito",val:Math.abs(st.ivaNet),col:st.ivaNet>0?"#fbbf24":"#4ade80",sub:st.ivaNet<=0?"Compensazione totale — versamento €0":"Debito totale - Credito totale"},
        ].map((x,i)=><div key={i} style={{background:"#1a1f2e",border:`1px solid ${x.col}`,borderRadius:8,padding:"10px 13px"}}>
          <div style={{fontSize:10,color:x.col,textTransform:"uppercase",marginBottom:3}}>{x.label}</div>
          <div style={{color:x.col,fontSize:20,fontFamily:"Georgia,serif",fontWeight:700}}>{fmt(x.val)}</div>
          <div style={{fontSize:10,color:"#6b7280",marginTop:2}}>{x.sub}</div>
        </div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10}}>
        {st.trim.map((t,i)=>{
          const mese=new Date().getMonth()+1;
          const cur=mese<=3?0:mese<=6?1:mese<=9?2:3;
          const past=i<cur,isCur=i===cur;
          const bc=t.daVersare>0?(past?"#dc2626":isCur?"#f59e0b":"#34d399"):"#16a34a";
          return <div key={i} style={{background:"#1a1f2e",border:`1px solid ${bc}`,borderRadius:10,padding:12,position:"relative"}}>
            {isCur&&<div style={{position:"absolute",top:0,right:0,background:"#f59e0b",color:"#0f1320",fontSize:9,fontWeight:700,padding:"2px 6px",borderBottomLeftRadius:6}}>IN CORSO</div>}
            {past&&t.daVersare>0&&<div style={{position:"absolute",top:0,right:0,background:"#dc2626",color:"white",fontSize:9,fontWeight:700,padding:"2px 6px",borderBottomLeftRadius:6}}>SCADUTO</div>}
            <div style={{fontSize:11,color:"#8892a4",marginBottom:5}}>{t.label}</div>
            <div style={{fontSize:11,color:"#f87171"}}>Debito: {fmt(t.iva)}</div>
            <div style={{fontSize:11,color:"#4ade80"}}>Credito: {fmt(t.cred)}</div>
            {t.riportoPre>0&&<div style={{fontSize:11,color:"#60a5fa"}}>Riporto prec.: {fmt(t.riportoPre)}</div>}
            <div style={{borderTop:"1px solid #2d3550",marginTop:6,paddingTop:5}}>
              {t.daVersare>0
                ?<div style={{color:isCur?"#fbbf24":"#e8d5a3",fontSize:16,fontFamily:"Georgia,serif",fontWeight:700}}>Da versare: {fmt(t.daVersare)}</div>
                :<div>
                  <div style={{color:"#4ade80",fontSize:12,fontWeight:700}}>Compensato ✓</div>
                  {t.nuovoCred>0&&<div style={{color:"#60a5fa",fontSize:11}}>Credito riportato: {fmt(t.nuovoCred)}</div>}
                </div>
              }
            </div>
            <div style={{fontSize:10,color:"#4b5563",marginTop:3}}>Scad: {t.scad}</div>
          </div>;
        })}
      </div>
    </div>

    {/* AMMORTAMENTI */}
    {st.ammort.length>0&&<div style={{marginTop:16}}>
      <h3 style={{...S.gld,margin:"0 0 12px",fontSize:15}}>Ammortamenti in corso</h3>
      {st.ammort.map((b,i)=>{
        const pct=b.totale>0?(b.ded/b.totale*100).toFixed(0):0;
        return <div key={i} style={{...S.card,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8}}>
            <div>
              <div style={{color:"#c8d3e0",fontWeight:600}}>{b.desc}</div>
              <div style={{color:"#8892a4",fontSize:11}}>{b.tipo==="acquisto_auto"?"Auto":"Bene Durevole"} · {b.quote.length} quote</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:"#f87171",fontSize:11}}>Totale: {fmt(b.totale)}</div>
              <div style={{color:"#4ade80",fontSize:11}}>Dedotto: {fmt(b.ded)}</div>
              <div style={{color:b.res>0?"#fbbf24":"#4ade80",fontWeight:700,fontFamily:"Georgia,serif"}}>{b.res>0?"Residuo: "+fmt(b.res):"Completato ✓"}</div>
            </div>
          </div>
          <div style={{background:"#0f1320",borderRadius:20,height:6,marginBottom:6,overflow:"hidden"}}>
            <div style={{background:"#4ade80",height:"100%",width:pct+"%",borderRadius:20}}/>
          </div>
          <div style={{fontSize:10,color:"#6b7280",marginBottom:b.future.length?6:0}}>{pct}% ammortizzato</div>
          {b.future.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {b.future.map((q,j)=><div key={j} style={{background:"#0f1320",border:"1px solid #2d3550",borderRadius:6,padding:"3px 9px",fontSize:11}}>
              <span style={{color:"#8892a4"}}>{q.anno}: </span><span style={{color:"#e8d5a3",fontFamily:"Georgia,serif",fontWeight:600}}>{fmt(q.imp)}</span>
            </div>)}
          </div>}
        </div>;
      })}
    </div>}
  </div>;
}

// ── COMMITTENTI ───────────────────────────────────────────────────────────────
function Clienti({clienti,setClienti}){
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [delId,setDelId]=useState(null);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const salva=()=>{
    if(!form.nome)return alert("Inserire nome");
    setClienti(p=>{const ex=p.find(c=>c.id===form.id);return ex?p.map(c=>c.id===form.id?form:c):[...p,form]});
    setModal(null);
  };
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{...S.gld,margin:0}}>Committenti</h2>
      <button style={S.bG} onClick={()=>{setForm({id:uid()});setModal(1)}}><Ic n="pls" z={14}/>Nuovo</button>
    </div>
    {clienti.map(c=><div key={c.id} style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{color:"#e2e8f0",fontWeight:600}}>{c.nome}</div>
          <div style={{color:"#8892a4",fontSize:12}}>{[c.piva&&"P.IVA "+c.piva,c.cf&&"CF "+c.cf,c.email].filter(Boolean).join(" · ")}</div>
          <div style={{color:"#8892a4",fontSize:12}}>{c.telefono}{c.referente&&" · "+c.referente}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button style={S.bGr} onClick={()=>{setForm({...c});setModal(1)}}><Ic n="edt" z={13}/></button>
          <button style={S.bR} onClick={()=>setDelId(c.id)}><Ic n="trs" z={13}/></button>
        </div>
      </div>
    </div>)}
    {clienti.length===0&&<div style={{color:"#4b5563",textAlign:"center",padding:40}}>Nessun committente</div>}
    {delId&&<DelModal title="Eliminare questo committente?" onClose={()=>setDelId(null)} onConfirm={()=>{deleteRecord("committenti",delId);setClienti(p=>p.filter(x=>x.id!==delId));setDelId(null);}}/>}
    {modal&&<Modal title={form.nome?"Modifica":"Nuovo committente"} onClose={()=>setModal(null)}>
      <F label="Ragione Sociale / Nome"><input style={S.inp} value={form.nome||""} onChange={set("nome")}/></F>
      <div style={{display:"flex",gap:10}}>
        <F label="P.IVA" w="50%"><input style={S.inp} value={form.piva||""} onChange={set("piva")}/></F>
        <F label="CF" w="50%"><input style={S.inp} value={form.cf||""} onChange={set("cf")}/></F>
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="Email" w="50%"><input style={S.inp} type="email" value={form.email||""} onChange={set("email")}/></F>
        <F label="Telefono" w="50%"><input style={S.inp} value={form.telefono||""} onChange={set("telefono")}/></F>
      </div>
      <F label="Referente"><input style={S.inp} value={form.referente||""} onChange={set("referente")}/></F>
      <F label="Indirizzo"><input style={S.inp} value={form.indirizzo||""} onChange={set("indirizzo")}/></F>
      <F label="Note"><textarea style={{...S.inp,minHeight:48,resize:"vertical"}} value={form.note||""} onChange={set("note")}/></F>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
        <button style={S.bGr} onClick={()=>setModal(null)}>Annulla</button>
        <button style={S.bG} onClick={salva}>Salva</button>
      </div>
    </Modal>}
  </div>;
}

// ── DRIVER ────────────────────────────────────────────────────────────────────
function Driver({driver,setDriver}){
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [delId,setDelId]=useState(null);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const salva=()=>{
    if(!form.nome)return alert("Inserire il nome");
    setDriver(p=>{const ex=p.find(d=>d.id===form.id);return ex?p.map(d=>d.id===form.id?form:d):[...p,form]});
    setModal(null);
  };
  const ScT=({label,data})=>{
    if(!data)return null;
    return <Badge color={isExp(data)?"red":isNear(data)?"amber":"green"}>{label}: {data}</Badge>;
  };
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{...S.gld,margin:0}}>Driver & Vetture</h2>
      <button style={S.bG} onClick={()=>{setForm({id:uid(),genere:"F"});setModal(1)}}><Ic n="pls" z={14}/>Nuovo</button>
    </div>
    {driver.map((d,i)=><div key={d.id} style={{...S.card,borderLeft:`4px solid ${DCOL[i%DCOL.length]}`}}>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <div>
          <div style={{color:"#e2e8f0",fontWeight:600}}>{d.nome}</div>
          <div style={{color:"#8892a4",fontSize:12}}>{[d.modello,d.targa].filter(Boolean).join(" · ")}</div>
          {d.telefono&&<div style={{color:"#8892a4",fontSize:12}}>WA: {d.telefono}</div>}
        </div>
        <div style={{display:"flex",gap:6}}>
          <button style={S.bGr} onClick={()=>{setForm({...d});setModal(1)}}><Ic n="edt" z={13}/></button>
          <button style={S.bR} onClick={()=>setDelId(d.id)}><Ic n="trs" z={13}/></button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:7}}>
        {!d.telefono&&<Badge color="amber">Nessun WhatsApp</Badge>}
        <ScT label="Bollo" data={d.scadBollo}/>
        <ScT label="Patente" data={d.scadPatente}/>
        <ScT label="Assicurazione" data={d.scadAss}/>
        <ScT label="Revisione" data={d.scadRev}/>
      </div>
    </div>)}
    {driver.length===0&&<div style={{color:"#4b5563",textAlign:"center",padding:40}}>Nessun driver</div>}
    {delId&&<DelModal title="Eliminare questo driver?" onClose={()=>setDelId(null)} onConfirm={()=>{deleteRecord("driver",delId);setDriver(p=>p.filter(x=>x.id!==delId));setDelId(null);}}/>}
    {modal&&<Modal title={form.nome?"Modifica driver":"Nuovo driver"} onClose={()=>setModal(null)}>
      <F label="Nome e Cognome"><input style={S.inp} value={form.nome||""} onChange={set("nome")}/></F>
      <F label="Genere (per messaggio WhatsApp)">
        <div style={{display:"flex",gap:8}}>
          {[["F","Femminile"],["M","Maschile"]].map(([v,l])=>(
            <button key={v} type="button" onClick={()=>setForm(p=>({...p,genere:v}))} style={{flex:1,padding:"7px",borderRadius:6,border:`1px solid ${form.genere===v?"#e8d5a3":"#2d3550"}`,background:form.genere===v?"#e8d5a322":"#0f1320",color:form.genere===v?"#e8d5a3":"#8892a4",cursor:"pointer",fontWeight:600,fontSize:13}}>{l}</button>
          ))}
        </div>
      </F>
      <div style={{display:"flex",gap:10}}>
        <F label="Modello Vettura" w="60%"><input style={S.inp} value={form.modello||""} onChange={set("modello")}/></F>
        <F label="Targa" w="40%"><input style={S.inp} value={form.targa||""} onChange={set("targa")} placeholder="AA000BB"/></F>
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="WhatsApp (+39...)" w="50%"><input style={S.inp} value={form.telefono||""} onChange={set("telefono")} placeholder="+393331234567"/></F>
        <F label="Email" w="50%"><input style={S.inp} value={form.email||""} onChange={set("email")}/></F>
      </div>
      <div style={{fontSize:11,color:"#6b7280",marginBottom:10}}>Formato internazionale per invio WA</div>
      <div style={{display:"flex",gap:10}}>
        <F label="Scad. Bollo" w="50%"><input style={S.inp} type="date" value={form.scadBollo||""} onChange={set("scadBollo")}/></F>
        <F label="Scad. Patente" w="50%"><input style={S.inp} type="date" value={form.scadPatente||""} onChange={set("scadPatente")}/></F>
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="Scad. Assicurazione" w="50%"><input style={S.inp} type="date" value={form.scadAss||""} onChange={set("scadAss")}/></F>
        <F label="Scad. Revisione" w="50%"><input style={S.inp} type="date" value={form.scadRev||""} onChange={set("scadRev")}/></F>
      </div>
      <F label="Note"><textarea style={{...S.inp,minHeight:48,resize:"vertical"}} value={form.note||""} onChange={set("note")}/></F>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
        <button style={S.bGr} onClick={()=>setModal(null)}>Annulla</button>
        <button style={S.bG} onClick={salva}>Salva</button>
      </div>
    </Modal>}
  </div>;
}

// ── WHATSAPP ──────────────────────────────────────────────────────────────────
const eur=String.fromCharCode(8364);
function msgDriver(s,drv){
  const dataFmt=s.data?new Date(s.data).toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"Non specificata";
  const tipo=s.tipo==="disposizione"?"Disposizione oraria "+(s.oreDisp||1)+"h":"Trasferimento";
  const compenso=s.prezzoDriver?(eur+parseFloat(s.prezzoDriver).toFixed(2)+(s.ivaSeparata?" + IVA":" IVA inclusa")):"Non indicato";
  const haBagagli=s.bagagli!==""&&s.bagagli!==undefined&&s.bagagli!==null;
  return[
    "*BLACK DIAMOND TRANSFERT*",
    "_Servizio di Noleggio con Conducente_","",
    "*ID:* "+s.id,"",
    "*Data:* "+dataFmt,
    "*Ora:* "+(s.ora||"Non specificata"),
    "*Tipo:* "+tipo,"",
    "*Passeggero:* "+(s.nomeUtente||"Non specificato"),
    "*Passeggeri:* "+(s.passeggeri||1),
    haBagagli?"*Bagagli:* "+s.bagagli:"",
    "*Volo/Treno:* "+(s.numeroVolo||"Non indicato"),"",
    "*Pick-up:* "+(s.pickup||"Non specificato"),
    "*Drop-off:* "+(s.dropoff||"Non specificato"),"",
    "*Compenso:* "+compenso,
    s.note?"\n*Note:* "+s.note:"",
    "","Buon servizio! Conferma ricezione con *OK*",
  ].filter(l=>l!==null&&l!==undefined&&l!=="").join("\n");
}
function msgUtente(s,drv){
  const nome=drv?.nome?.split(" ")[0]||"";
  const genere=drv?.genere||"F";
  const autista=genere==="M"?"il vostro autista":"la vostra autista";
  const pronto=genere==="M"?"pronto ad accogliervi":"pronta ad accogliervi";
  const pickup=s.pickup||"";
  const dropoff=s.dropoff||"";
  const tratta=pickup&&dropoff?` per il vostro servizio da ${pickup} a ${dropoff}`:"";
  return nome?`Salve, sono ${nome} ${autista} e sono già sul posto, ${pronto}${tratta}!`:"Salve, siamo già sul posto, pronti ad accogliervi!";
}
const apriWA=(tel,msg)=>{
  const t=tel.replace(/[^0-9+]/g,"");
  window.open("https://wa.me/"+t+"?text="+encodeURIComponent(msg),"_blank");
};
function apriGCal(s,drv,cli){
  const data=(s.data||"").replace(/-/g,"");
  const ora=(s.ora||"0800").replace(":","");
  const dur=parseFloat(s.durataManuale)||(s.tipo==="disposizione"?parseInt(s.oreDisp)||2:1.5);
  const durMin=Math.round(dur*60);
  const hS=parseInt(ora.slice(0,2)),mS=parseInt(ora.slice(2,4));
  const totMin=hS*60+mS+durMin;
  const hE=String(Math.floor(totMin/60)%24).padStart(2,"0");
  const mE=String(totMin%60).padStart(2,"0");
  const eDay=totMin>=1440?String(parseInt(data.slice(6,8))+1).padStart(2,"0"):data.slice(6,8);
  const dtS=data+"T"+ora+"00",dtE=data.slice(0,6)+eDay+"T"+hE+mE+"00";
  const titolo="Prenotazione "+(s.pickup||"—")+" - "+(s.dropoff||"—");
  const det=[
    "Committente: "+(cli?.nome||"—"),
    "Passeggero: "+(s.nomeUtente||"—"),
    s.passeggeri>1?"N° Passeggeri: "+s.passeggeri+(s.bagagli>0?" · Bagagli: "+s.bagagli:""):"",
    "Driver: "+(drv?.nome||"—")+(drv?.targa?" ("+drv.targa+")":""),
    s.numeroVolo?"Volo/Treno: "+s.numeroVolo:"",
    "Tipo: "+(s.tipo==="disposizione"?"Disposizione "+(s.oreDisp||2)+"h":"Trasferimento"),
    "Pick-up: "+(s.pickup||"—"),
    "Drop-off: "+(s.dropoff||"—"),
    "Prezzo: "+fmt(s.prezzo)+(s.ivaSeparata?" + IVA":" IVA inclusa"),
    "Metodo: "+(s.metodoPagamento||"—"),
    "ID: "+s.id,
    s.note?"Note: "+s.note:"",
  ].filter(Boolean).join("\n");
  window.open("https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(titolo)+"&dates="+dtS+"/"+dtE+"&location="+encodeURIComponent(s.pickup||"")+"&details="+encodeURIComponent(det),"_blank");
}

// ── STATO VOLO/TRENO ──────────────────────────────────────────────────────────
function StatoVolo({numero}){
  if(!numero)return null;
  const cod=numero.replace(/\s/g,"").toUpperCase();
  const isTreno=/^(FR|IC|REG|RV|FA|EC|EN|ES|\d)/i.test(cod);
  if(isTreno)return <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
    <a href="https://www.viaggiatreno.it/infomobilita/index.jsp" target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,background:"#1a2a1a",border:"1px solid #16a34a",borderRadius:5,padding:"4px 10px",color:"#4ade80",fontSize:11,fontWeight:700,textDecoration:"none"}}>Trenitalia</a>
    <a href="https://www.trenord.it/viaggia-con-noi/in-viaggio/" target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,background:"#1a2a1a",border:"1px solid #16a34a44",borderRadius:5,padding:"4px 10px",color:"#86efac",fontSize:11,fontWeight:700,textDecoration:"none"}}>Trenord</a>
  </div>;
  return <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
    <a href="https://it.flightaware.com" target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,background:"#1a1a3a",border:"1px solid #4285f4",borderRadius:5,padding:"4px 10px",color:"#60a5fa",fontSize:11,fontWeight:700,textDecoration:"none"}}>FlightAware</a>
    <a href="https://www.flightradar24.com" target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,background:"#1a1a3a",border:"1px solid #4285f488",borderRadius:5,padding:"4px 10px",color:"#93c5fd",fontSize:11,fontWeight:700,textDecoration:"none"}}>Flightradar24</a>
  </div>;
}

// ── SERVIZI ───────────────────────────────────────────────────────────────────
function Servizi({servizi,setServizi,clienti,driver,anno}){
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [filter,setFilter]=useState("");
  const [inline,setInline]=useState(null);
  const [pagId,setPagId]=useState(null);
  const [delId,setDelId]=useState(null);
  const [waPreview,setWaPreview]=useState(null);
  const MT=["contanti","bonifico","carta","mypos","paypal"];
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const upd=(id,patch)=>setServizi(p=>p.map(s=>s.id===id?{...s,...patch}:s));
  const submit=()=>{
    if(!form.data)return alert("Inserire la data");
    setServizi(p=>{const ex=p.find(s=>s.id===form.id);return ex?p.map(s=>s.id===form.id?form:s):[...p,form]});
    setModal(null);
  };
  const filtered=servizi.filter(s=>{
    if(s.dataPagamento&&!filter)return false;
    if(!filter)return true;
    const q=filter.toLowerCase();
    return s.id?.toLowerCase().includes(q)||
      s.nomeUtente?.toLowerCase().includes(q)||
      s.numeroVolo?.toLowerCase().includes(q)||
      clienti.find(c=>c.id===s.committenteId)?.nome?.toLowerCase().includes(q);
  }).sort((a,b)=>(b.data+(b.ora||""))>(a.data+(a.ora||""))?1:-1);
  const nPagati=servizi.filter(s=>s.dataPagamento).length;

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{...S.gld,margin:0}}>Servizi {anno!=="tutti"&&<span style={{fontSize:14,color:"#60a5fa"}}>— {anno}</span>}</h2>
      <button style={S.bG} onClick={()=>{setForm({id:uid(),data:today(),tipo:"trasferimento",oreDisp:2,aliqIva:"10",ivaSeparata:false,passeggeri:1});setModal("edit")}}><Ic n="pls" z={14}/>Nuovo</button>
    </div>
    <div style={{position:"relative",marginBottom:12}}>
      <input style={{...S.inp,paddingLeft:32}} placeholder="Cerca ID, utente, committente, volo..." value={filter} onChange={e=>setFilter(e.target.value)}/>
      <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#8892a4",pointerEvents:"none"}}><Ic n="src" z={14}/></span>
    </div>
    {!filter&&nPagati>0&&<div style={{fontSize:12,color:"#6b7280",marginBottom:10,padding:"6px 10px",background:"#1a1f2e",borderRadius:6,border:"1px solid #2d3550"}}>
      {nPagati} servizi pagati nascosti — cerca per ID, nome, committente o volo per trovarli
    </div>}

    {filtered.map(s=>{
      const drv=driver.find(d=>d.id===s.driverId);
      const cli=clienti.find(c=>c.id===s.committenteId);
      const col=dcol(s.driverId,driver);
      return <div key={s.id} style={{...S.card,borderLeft:`4px solid ${col}`,background:s.dataPagamento?"#0d1a0d":"#1a1f2e"}}>
        {inline!==s.id?<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:170}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
                <span style={{color:"#e8d5a3",fontFamily:"monospace",fontSize:11}}>{s.id}</span>
                <Badge color={s.tipo==="trasferimento"?"blue":"amber"}>{s.tipo==="trasferimento"?"Trasf.":"Disp. "+(s.oreDisp||"?")+"h"}</Badge>
                {s.ivaSeparata&&<Badge color="teal">+IVA</Badge>}
                {s.numeroVolo&&<Badge color="gray">{s.numeroVolo}</Badge>}
                {s.dataPagamento&&<Badge color="green">Pagato</Badge>}
                {s.inFattura&&!s.dataPagamento&&<Badge color="teal">In fattura</Badge>}
                {!s.dataFattura&&<Badge color="amber">Fattura mancante</Badge>}
              </div>
              {s.numeroVolo&&<StatoVolo numero={s.numeroVolo}/>}
              <div style={{color:"#c8d3e0",fontSize:13,fontWeight:600,marginTop:3}}>{s.data} {s.ora} — {s.nomeUtente||"—"}</div>
              <div style={{color:"#8892a4",fontSize:12}}>{cli?.nome||"—"} · <span style={{color:col}}>{drv?.nome||"—"} {drv?.targa&&"("+drv.targa+")"}</span></div>
              <div style={{color:"#8892a4",fontSize:12}}>{[s.pickup,s.dropoff].filter(Boolean).join(" → ")}</div>
              {(s.passeggeri>1||s.bagagli)&&<div style={{color:"#8892a4",fontSize:11}}>👥 {s.passeggeri||1} pax {s.bagagli?"· 🧳 "+s.bagagli+" bag":""}</div>}
              {s.telefonoUtente&&<div style={{color:"#8892a4",fontSize:11}}>Pass. WA: {s.telefonoUtente}</div>}
              {s.dataPagamento&&<div style={{color:"#4b5563",fontSize:11}}>Pagato {s.dataPagamento} · {s.metodoPagamento}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
              <div style={{textAlign:"right"}}>
                <span style={{color:"#4ade80",fontWeight:700,fontSize:16,fontFamily:"Georgia,serif"}}>{fmt(prezzoLordo(s))}</span>
                <div style={{fontSize:10,color:"#8892a4"}}>imp. {fmt(s.ivaSeparata?parseFloat(s.prezzo)||0:(parseFloat(s.prezzo)||0)/1.1)} + IVA {fmt(ivaS(s))}</div>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <button onClick={()=>upd(s.id,{dataFattura:s.dataFattura?null:today()})} style={{background:s.dataFattura?"#16a34a22":"#2d3550",border:"1px solid "+(s.dataFattura?"#16a34a":"#3d4a60"),borderRadius:4,padding:"3px 7px",color:s.dataFattura?"#4ade80":"#8892a4",cursor:"pointer",fontSize:11}}>
                  {s.dataFattura?"📄 "+s.dataFattura+"  ✕":"📄 Fattura"}
                </button>
                {!s.dataPagamento
                  ?<button onClick={()=>setPagId(s.id)} style={{background:"#2d3550",border:"1px solid #3d4a60",borderRadius:4,padding:"3px 7px",color:"#8892a4",cursor:"pointer",fontSize:11}}>💳 Paga</button>
                  :<button onClick={()=>upd(s.id,{dataPagamento:null,metodoPagamento:null})} style={{background:"#16a34a22",border:"1px solid #16a34a",borderRadius:4,padding:"3px 7px",color:"#4ade80",cursor:"pointer",fontSize:11}}>✓ {s.metodoPagamento} ✕</button>
                }
                <button onClick={()=>setInline(s.id)} style={{...S.bGr,padding:"3px 7px"}}><Ic n="edt" z={12}/></button>
                <button onClick={()=>setDelId(s.id)} style={{...S.bR,padding:"3px 7px"}}><Ic n="trs" z={12}/></button>
                <button onClick={()=>drv?.telefono?apriWA(drv.telefono,msgDriver(s,drv)):alert("Aggiungi WhatsApp al driver")} style={{background:"#1a3d20",border:"1px solid #25d36688",borderRadius:4,padding:"3px 7px",color:"#25d366",cursor:"pointer",fontSize:11,fontWeight:700,opacity:drv?.telefono?1:0.4}}>WA Driver</button>
                {s.telefonoUtente&&<button onClick={()=>{const msg=msgUtente(s,drv);setWaPreview({tel:s.telefonoUtente,msg});}} style={{background:"#1a3520",border:"1px solid #25d36644",borderRadius:4,padding:"3px 7px",color:"#86efac",cursor:"pointer",fontSize:11,fontWeight:700}}>WA Pass.</button>}
                <button onClick={()=>apriGCal(s,drv,cli)} style={{background:"#1a1a3a",border:"1px solid #4285f4",borderRadius:4,padding:"3px 7px",color:"#4285f4",cursor:"pointer",fontSize:11,fontWeight:700}}>GCal</button>
              </div>
            </div>
          </div>
        </div>:<div>
          <div style={{color:"#e8d5a3",fontSize:11,marginBottom:8,fontFamily:"monospace"}}>Modifica rapida — {s.id}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["Utente","nomeUtente","text"],["Pick-up","pickup","text"],["Drop-off","dropoff","text"],["Volo/Treno","numeroVolo","text"],["Tel. Passeggero","telefonoUtente","text"],["Prezzo","prezzo","number"],["Compenso driver","prezzoDriver","number"]].map(([l,f,t])=>(
              <div key={f} style={{flex:"1 1 130px"}}>
                <div style={S.lbl}>{l}</div>
                <input style={{...S.inp,padding:"5px 8px"}} type={t} defaultValue={s[f]||""} onBlur={e=>upd(s.id,{[f]:e.target.value})}/>
              </div>
            ))}
            <div style={{flex:"1 1 90px"}}>
              <div style={S.lbl}>N° Passeggeri</div>
              <input style={{...S.inp,padding:"5px 8px"}} type="number" min="1" defaultValue={s.passeggeri||1} onBlur={e=>upd(s.id,{passeggeri:parseInt(e.target.value)||1})}/>
            </div>
            <div style={{flex:"1 1 90px"}}>
              <div style={S.lbl}>N° Bagagli</div>
              <input style={{...S.inp,padding:"5px 8px"}} type="number" min="0" defaultValue={s.bagagli===undefined||s.bagagli===null?"":s.bagagli} onBlur={e=>{const v=e.target.value;upd(s.id,{bagagli:v===""?"":parseInt(v)})}}/>
            </div>
            <div style={{flex:"1 1 120px"}}>
              <div style={S.lbl}>Driver</div>
              <select style={{...S.inp,padding:"5px 8px"}} defaultValue={s.driverId||""} onBlur={e=>upd(s.id,{driverId:e.target.value})}>
                <option value="">—</option>{driver.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div style={{flex:"1 1 110px"}}>
              <div style={S.lbl}>Metodo pag.</div>
              <select style={{...S.inp,padding:"5px 8px"}} defaultValue={s.metodoPagamento||""} onBlur={e=>upd(s.id,{metodoPagamento:e.target.value})}>
                <option value="">—</option>{MT.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{flex:"1 1 100px"}}>
              <div style={S.lbl}>Durata cal. (h)</div>
              <input style={{...S.inp,padding:"5px 8px"}} type="number" step="0.5" min="0.5" max="24" defaultValue={s.durataManuale||(s.tipo==="disposizione"?s.oreDisp||2:1.5)} onBlur={e=>upd(s.id,{durataManuale:parseFloat(e.target.value)||null})}/>
            </div>
          </div>
          <div style={{display:"flex",gap:6,marginTop:8}}>
            <button onClick={()=>setInline(null)} style={{...S.bG,padding:"5px 14px"}}>✓ Fatto</button>
            <button onClick={()=>{setForm({...s});setModal("edit");setInline(null);}} style={{...S.bGr,padding:"5px 14px"}}>Modifica completa</button>
          </div>
        </div>}
      </div>;
    })}
    {filtered.length===0&&<div style={{color:"#4b5563",textAlign:"center",padding:40}}>Nessun servizio</div>}

    {delId&&<DelModal title="Eliminare questo servizio?" onClose={()=>setDelId(null)} onConfirm={()=>{deleteRecord("servizi",delId);setServizi(p=>p.filter(x=>x.id!==delId));setDelId(null);}}/>}
    {pagId&&<PagModal onClose={()=>setPagId(null)} onConfirm={m=>{upd(pagId,{dataPagamento:today(),metodoPagamento:m});setPagId(null);}}/>}

    {waPreview&&<Modal title="Messaggio WhatsApp" onClose={()=>setWaPreview(null)}>
      <div style={{background:"#0f1320",border:"1px solid #2d3550",borderRadius:8,padding:14,whiteSpace:"pre-wrap",fontSize:14,color:"#c8d3e0",marginBottom:14}}>{waPreview.msg}</div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <button style={S.bGr} onClick={()=>setWaPreview(null)}>Chiudi</button>
        <button style={S.bG} onClick={()=>{apriWA(waPreview.tel,waPreview.msg);setWaPreview(null);}}>Apri WhatsApp</button>
      </div>
    </Modal>}

    {modal==="edit"&&<Modal title={servizi.find(s=>s.id===form.id)?`Modifica ${form.id}`:`Nuovo — ${form.id}`} onClose={()=>setModal(null)}>
      <div style={{display:"flex",gap:10}}>
        <F label="Data" w="50%"><input style={S.inp} type="date" value={form.data||""} onChange={set("data")}/></F>
        <F label="Ora" w="50%"><input style={S.inp} type="time" value={form.ora||""} onChange={set("ora")}/></F>
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="Committente" w="50%"><select style={S.inp} value={form.committenteId||""} onChange={set("committenteId")}><option value="">—</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></F>
        <F label="Driver" w="50%"><select style={S.inp} value={form.driverId||""} onChange={set("driverId")}><option value="">—</option>{driver.map(d=><option key={d.id} value={d.id}>{d.nome}{d.targa?" ("+d.targa+")":""}</option>)}</select></F>
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="Tipo" w="50%"><select style={S.inp} value={form.tipo||"trasferimento"} onChange={set("tipo")}><option value="trasferimento">Trasferimento</option><option value="disposizione">Disposizione Oraria</option></select></F>
        {form.tipo==="disposizione"&&<F label="Ore" w="50%"><select style={S.inp} value={form.oreDisp||2} onChange={e=>setForm(p=>({...p,oreDisp:parseInt(e.target.value)}))}>{[1,2,3,4,5,6,7,8,9,10,11,12].map(h=><option key={h} value={h}>{h}h</option>)}</select></F>}
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="Nome Passeggero" w="50%"><input style={S.inp} value={form.nomeUtente||""} onChange={set("nomeUtente")}/></F>
        <F label="N. Volo / Treno" w="50%"><input style={S.inp} value={form.numeroVolo||""} onChange={set("numeroVolo")} placeholder="AZ1234"/></F>
      </div>
      <F label="Tel. WhatsApp Passeggero (+39...)"><input style={S.inp} value={form.telefonoUtente||""} onChange={set("telefonoUtente")} placeholder="+393331234567"/></F>
      <div style={{display:"flex",gap:10}}>
        <F label="N° Passeggeri" w="50%"><input style={S.inp} type="number" min="1" value={form.passeggeri||1} onChange={e=>setForm(p=>({...p,passeggeri:parseInt(e.target.value)||1}))}/></F>
        <F label="N° Bagagli" w="50%"><input style={S.inp} type="number" min="0" value={form.bagagli===undefined||form.bagagli===null?"":form.bagagli} onChange={e=>{const v=e.target.value;setForm(p=>({...p,bagagli:v===""?"":parseInt(v)}))}}/></F>
      </div>
      <F label="Pick-up"><input style={S.inp} value={form.pickup||""} onChange={set("pickup")}/></F>
      <F label="Drop-off"><input style={S.inp} value={form.dropoff||""} onChange={set("dropoff")}/></F>
      <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
        <F label="Prezzo EUR" w="35%"><input style={S.inp} type="number" step="0.01" value={form.prezzo||""} onChange={set("prezzo")}/></F>
        <div style={{marginBottom:11}}>
          <label style={S.lbl}>Tipo prezzo</label>
          <div style={{display:"flex",borderRadius:6,overflow:"hidden",border:"1px solid #2d3550"}}>
            <button type="button" onClick={()=>setForm(p=>({...p,ivaSeparata:false}))} style={{flex:1,padding:"7px 8px",fontSize:12,cursor:"pointer",fontWeight:600,background:!form.ivaSeparata?"#e8d5a3":"#0f1320",color:!form.ivaSeparata?"#0f1320":"#8892a4",border:"none"}}>IVA inclusa</button>
            <button type="button" onClick={()=>setForm(p=>({...p,ivaSeparata:true}))} style={{flex:1,padding:"7px 8px",fontSize:12,cursor:"pointer",fontWeight:600,background:form.ivaSeparata?"#e8d5a3":"#0f1320",color:form.ivaSeparata?"#0f1320":"#8892a4",border:"none"}}>+ IVA</button>
          </div>
          {form.prezzo&&<div style={{fontSize:10,color:"#60a5fa",marginTop:3}}>
            {form.ivaSeparata?"Tot: "+fmt((parseFloat(form.prezzo)||0)*1.1)+" (IVA: "+fmt((parseFloat(form.prezzo)||0)*0.1)+")":"Imp: "+fmt((parseFloat(form.prezzo)||0)/1.1)+" (IVA: "+fmt((parseFloat(form.prezzo)||0)-(parseFloat(form.prezzo)||0)/1.1)+")"}
          </div>}
        </div>
        <F label="Metodo pag." w="30%"><select style={S.inp} value={form.metodoPagamento||""} onChange={set("metodoPagamento")}><option value="">—</option>{MT.map(m=><option key={m} value={m}>{m}</option>)}</select></F>
      </div>
      <F label="Compenso driver — solo su WhatsApp">
        <input style={{...S.inp,borderColor:"#d97706"}} type="number" step="0.01" value={form.prezzoDriver||""} onChange={set("prezzoDriver")} placeholder="Non visibile in anagrafica"/>
      </F>
      <div style={{display:"flex",gap:10}}>
        <F label="Data fattura" w="50%"><input style={S.inp} type="date" value={form.dataFattura||""} onChange={set("dataFattura")}/></F>
        <F label="Data pagamento" w="50%"><input style={S.inp} type="date" value={form.dataPagamento||""} onChange={set("dataPagamento")}/></F>
      </div>
      <F label="Note"><textarea style={{...S.inp,minHeight:48,resize:"vertical"}} value={form.note||""} onChange={set("note")}/></F>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
        <button style={S.bGr} onClick={()=>setModal(null)}>Annulla</button>
        <button style={S.bG} onClick={submit}>Salva</button>
      </div>
    </Modal>}
  </div>;
}

// ── CALENDARIO ────────────────────────────────────────────────────────────────
function Calendario({servizi,setServizi,driver}){
  const [date,setDate]=useState(new Date());
  const [view,setView]=useState("week");
  const [editEv,setEditEv]=useState(null);
  const PH=60;
  const wkStart=useMemo(()=>{const d=new Date(date);const day=d.getDay();d.setDate(d.getDate()+(day===0?-6:1-day));d.setHours(0,0,0,0);return d;},[date]);
  const days=useMemo(()=>view==="day"?[date]:Array.from({length:7},(_,i)=>{const d=new Date(wkStart);d.setDate(d.getDate()+i);return d;}),[view,date,wkStart]);
  const ds=d=>d.toISOString().slice(0,10);
  const parseT=t=>{if(!t)return 0;const[h,m]=t.split(":").map(Number);return h+(m||0)/60;};
  const dur=s=>parseFloat(s.durataManuale)||(s.tipo==="disposizione"?parseInt(s.oreDisp)||2:1.5);
  const todayStr=today();
  const nav=dir=>{const d=new Date(date);d.setDate(d.getDate()+(view==="week"?dir*7:dir));setDate(d);};
  const navLabel=()=>{
    if(view==="day")return date.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const e=new Date(wkStart);e.setDate(e.getDate()+6);
    return wkStart.toLocaleDateString("it-IT",{day:"numeric",month:"short"})+" – "+e.toLocaleDateString("it-IT",{day:"numeric",month:"short",year:"numeric"});
  };
  const hasOvlp=dayObj=>{
    const ss=servizi.filter(s=>s.data===ds(dayObj)&&s.ora);
    for(let i=0;i<ss.length;i++)for(let j=i+1;j<ss.length;j++){
      if(ss[i].driverId&&ss[i].driverId===ss[j].driverId){
        const s1=parseT(ss[i].ora),e1=s1+dur(ss[i]),s2=parseT(ss[j].ora),e2=s2+dur(ss[j]);
        if(s1<e2&&s2<e1)return true;
      }
    }
    return false;
  };
  const upd=(id,patch)=>setServizi(p=>p.map(s=>s.id===id?{...s,...patch}:s));
  const HOURS=Array.from({length:24},(_,i)=>i);

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      <h2 style={{...S.gld,margin:0,flex:1}}>Calendario</h2>
      <button style={S.bGr} onClick={()=>setView(v=>v==="week"?"day":"week")}>{view==="week"?"Giorno":"Settimana"}</button>
      <button style={S.bGr} onClick={()=>setDate(new Date())}>Oggi</button>
      <button style={S.bGr} onClick={()=>nav(-1)}>◀</button>
      <span style={{color:"#c8d3e0",fontSize:12,minWidth:140,textAlign:"center"}}>{navLabel()}</span>
      <button style={S.bGr} onClick={()=>nav(1)}>▶</button>
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      {driver.map((d,i)=><div key={d.id} style={{display:"flex",alignItems:"center",gap:4,background:"#1a1f2e",borderRadius:20,padding:"2px 10px",border:"1px solid "+DCOL[i%DCOL.length]+"44"}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:DCOL[i%DCOL.length]}}/>
        <span style={{color:"#c8d3e0",fontSize:11}}>{d.nome}{d.targa&&<span style={{color:"#6b7280"}}> · {d.targa}</span>}</span>
      </div>)}
    </div>
    <div style={{background:"#1a1f2e",border:"1px solid #2d3550",borderRadius:10,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:`44px repeat(${days.length},1fr)`}}>
        <div style={{background:"#121827",borderBottom:"1px solid #2d3550"}}/>
        {days.map((d,i)=>{
          const isT=ds(d)===todayStr,ovlp=hasOvlp(d);
          return <div key={i} style={{textAlign:"center",padding:"5px 2px",borderBottom:"1px solid #2d3550",background:isT?"#1e3050":"#121827",position:"relative"}}>
            <div style={{fontSize:10,color:"#8892a4",textTransform:"uppercase"}}>{d.toLocaleDateString("it-IT",{weekday:"short"})}</div>
            <div style={{fontSize:15,fontWeight:isT?700:400,color:isT?"#e8d5a3":"#c8d3e0",fontFamily:"Georgia,serif"}}>{d.getDate()}</div>
            {ovlp&&<div title="Sovrapposizione!" style={{position:"absolute",top:3,right:3,background:"#dc2626",borderRadius:"50%",width:7,height:7}}/>}
          </div>;
        })}
      </div>
      <div style={{overflowY:"auto",maxHeight:"58vh"}}>
        <div style={{display:"grid",gridTemplateColumns:`44px repeat(${days.length},1fr)`}}>
          <div>{HOURS.map(h=><div key={h} style={{height:PH,borderBottom:"1px solid #1e2435",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",paddingRight:4,paddingTop:2}}><span style={{fontSize:9,color:"#4b5563"}}>{String(h).padStart(2,"0")}:00</span></div>)}</div>
          {days.map((dayObj,di)=>{
            const dayS=servizi.filter(s=>s.data===ds(dayObj)&&s.ora);
            return <div key={di} style={{position:"relative",borderLeft:"1px solid #1e2435"}}>
              {HOURS.map(h=><div key={h} style={{height:PH,borderBottom:"1px solid #1e2435"}}/>)}
              {ds(dayObj)===todayStr&&<div style={{position:"absolute",left:0,right:0,top:(new Date().getHours()+new Date().getMinutes()/60)*PH,height:2,background:"#ef4444",zIndex:3}}/>}
              {dayS.map(s=>{
                const col=dcol(s.driverId,driver);
                const drv=driver.find(d=>d.id===s.driverId);
                const top=parseT(s.ora)*PH,h=Math.max(dur(s)*PH-3,20);
                return <div key={s.id} onClick={()=>setEditEv({...s})} style={{position:"absolute",left:2,right:2,top,height:h,background:col+"33",border:"1px solid "+col,borderLeft:"3px solid "+col,borderRadius:4,padding:"2px 4px",cursor:"pointer",overflow:"hidden",zIndex:2,boxSizing:"border-box"}}>
                  <div style={{fontSize:9,fontWeight:700,color:col,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.ora} {s.nomeUtente||s.id}</div>
                  {h>28&&<div style={{fontSize:9,color:"#8892a4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{drv?.nome||"—"}</div>}
                </div>;
              })}
            </div>;
          })}
        </div>
      </div>
    </div>
    {editEv&&<Modal title={"Modifica — "+editEv.id} onClose={()=>setEditEv(null)}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[["Data","data","date"],["Ora","ora","time"],["Utente","nomeUtente","text"],["Pick-up","pickup","text"],["Drop-off","dropoff","text"],["Prezzo","prezzo","number"]].map(([l,f,t])=>(
          <div key={f} style={{flex:"1 1 160px"}}>
            <div style={S.lbl}>{l}</div>
            <input style={S.inp} type={t} defaultValue={editEv[f]||""} onBlur={e=>{const v=e.target.value;upd(editEv.id,{[f]:v});setEditEv(p=>({...p,[f]:v}));}}/>
          </div>
        ))}
        <div style={{flex:"1 1 140px"}}>
          <div style={S.lbl}>Driver</div>
          <select style={S.inp} defaultValue={editEv.driverId||""} onBlur={e=>{const v=e.target.value;upd(editEv.id,{driverId:v});setEditEv(p=>({...p,driverId:v}));}}>
            <option value="">—</option>{driver.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
        {editEv.tipo==="disposizione"&&<div style={{flex:"1 1 100px"}}>
          <div style={S.lbl}>Ore disp.</div>
          <select style={S.inp} defaultValue={editEv.oreDisp||2} onBlur={e=>{const v=parseInt(e.target.value);upd(editEv.id,{oreDisp:v});setEditEv(p=>({...p,oreDisp:v}));}}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(h=><option key={h} value={h}>{h}h</option>)}
          </select>
        </div>}
        <div style={{flex:"1 1 150px"}}>
          <div style={S.lbl}>Durata visiva (ore)</div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input style={{...S.inp,borderColor:"#d97806",width:80}} type="number" step="0.5" min="0.5" max="24" defaultValue={editEv.durataManuale||(editEv.tipo==="disposizione"?editEv.oreDisp||2:1.5)} onBlur={e=>{const v=Math.max(0.5,parseFloat(e.target.value)||1.5);upd(editEv.id,{durataManuale:v});setEditEv(p=>({...p,durataManuale:v}));}}/>
            <button onClick={()=>{upd(editEv.id,{durataManuale:null});setEditEv(p=>({...p,durataManuale:null}));}} style={{...S.bGr,padding:"4px 8px",fontSize:11}}>Auto</button>
          </div>
        </div>
      </div>
      <div style={{fontSize:11,color:"#6b7280",marginTop:8}}>Modifiche salvate automaticamente.</div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
        <button style={S.bG} onClick={()=>setEditEv(null)}>Chiudi</button>
      </div>
    </Modal>}
  </div>;
}

// ── FATTURAZIONE ──────────────────────────────────────────────────────────────
function Fatturazione({servizi,setServizi,clienti,driver}){
  const [filtroC,setFiltroC]=useState("");
  const [pagModal,setPagModal]=useState(null);
  const upd=(ids,met)=>{
    setServizi(p=>p.map(s=>ids.includes(s.id)?{...s,dataPagamento:today(),metodoPagamento:met,dataFattura:s.dataFattura||today()}:s));
    setPagModal(null);
  };
  const toggle=id=>setServizi(p=>p.map(s=>s.id===id?{...s,inFattura:!s.inFattura}:s));
  const daFatt=servizi.filter(s=>s.inFattura&&!s.dataPagamento);
  const perCli=clienti.map(cl=>{
    const ss=daFatt.filter(s=>s.committenteId===cl.id);
    if(!ss.length)return null;
    return{cli:cl,ss,tot:ss.reduce((a,s)=>a+prezzoLordo(s),0)};
  }).filter(Boolean);
  const disponibili=servizi.filter(s=>!s.inFattura&&!s.dataPagamento&&(!filtroC||s.committenteId===filtroC)).sort((a,b)=>b.data>a.data?1:-1);

  return <div>
    <h2 style={{...S.gld,marginTop:0}}>Fatturazione</h2>
    {perCli.length>0?<div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:"#8892a4",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Da fatturare e incassare</div>
      {perCli.map(({cli,ss,tot})=>{
        const ids=ss.map(s=>s.id);
        return <div key={cli.id} style={{...S.card,border:"1px solid #e8d5a344",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:10}}>
            <div>
              <div style={{color:"#e8d5a3",fontWeight:700,fontSize:14}}>{cli.nome}</div>
              <div style={{color:"#8892a4",fontSize:12}}>{ss.length} servizi</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              <div style={{color:"#4ade80",fontFamily:"Georgia,serif",fontSize:20,fontWeight:700}}>{fmt(tot)}</div>
              <button onClick={()=>setPagModal({ids,nome:cli.nome,tot})} style={{background:"#16a34a",border:"none",color:"white",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>Emetti fattura e segna pagato</button>
            </div>
          </div>
          <div style={{borderTop:"1px solid #2d3550",paddingTop:8}}>
            {ss.map(s=>{
              const drv=driver.find(d=>d.id===s.driverId);
              return <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid #1e2435"}}>
                <div>
                  <div style={{color:"#c8d3e0",fontSize:12}}>{s.data} {s.ora} — {s.nomeUtente||"—"}</div>
                  <div style={{color:"#8892a4",fontSize:11}}>{drv?.nome||"—"} · {s.pickup||"—"} → {s.dropoff||"—"}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:"#4ade80",fontWeight:700,fontFamily:"Georgia,serif",fontSize:13}}>{fmt(prezzoLordo(s))}</span>
                  <button onClick={()=>toggle(s.id)} style={{background:"#3d1515",border:"none",color:"#f87171",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:11}}>Rimuovi</button>
                </div>
              </div>;
            })}
          </div>
        </div>;
      })}
    </div>:<div style={{...S.card,textAlign:"center",color:"#4b5563",marginBottom:16}}>Nessun servizio in fatturazione. Aggiungili qui sotto.</div>}

    <div>
      <div style={{fontSize:11,color:"#8892a4",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Aggiungi servizi alla fattura</div>
      <select style={{...S.inp,marginBottom:10}} value={filtroC} onChange={e=>setFiltroC(e.target.value)}>
        <option value="">Tutti i committenti</option>
        {clienti.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      {disponibili.map(s=>{
        const cli=clienti.find(c=>c.id===s.committenteId);
        const drv=driver.find(d=>d.id===s.driverId);
        const col=dcol(s.driverId,driver);
        return <div key={s.id} style={{...S.card,borderLeft:`4px solid ${col}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{flex:1}}>
            <div style={{color:"#c8d3e0",fontSize:13,fontWeight:600}}>{s.data} {s.ora} — {s.nomeUtente||"—"}</div>
            <div style={{color:"#8892a4",fontSize:12}}>{cli?.nome||"—"} · <span style={{color:col}}>{drv?.nome||"—"}</span></div>
            <div style={{color:"#8892a4",fontSize:12}}>{[s.pickup,s.dropoff].filter(Boolean).join(" → ")}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{color:"#4ade80",fontWeight:700,fontFamily:"Georgia,serif"}}>{fmt(prezzoLordo(s))}</span>
            <button onClick={()=>toggle(s.id)} style={{background:"#1e3050",border:"1px solid #3b82f6",color:"#60a5fa",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>+ Aggiungi</button>
          </div>
        </div>;
      })}
      {disponibili.length===0&&<div style={{color:"#4b5563",textAlign:"center",padding:20}}>Nessun servizio disponibile</div>}
    </div>
    {pagModal&&<PagModal onClose={()=>setPagModal(null)} onConfirm={m=>upd(pagModal.ids,m)}/>}
  </div>;
}

// ── DA PAGARE ─────────────────────────────────────────────────────────────────
function DaPagare({servizi,clienti,driver,setServizi}){
  const [filtroC,setFiltroC]=useState("");
  const [pagId,setPagId]=useState(null);
  const upd=(id,patch)=>setServizi(p=>p.map(s=>s.id===id?{...s,...patch}:s));
  const lista=servizi.filter(s=>!s.dataPagamento&&(!filtroC||s.committenteId===filtroC)).sort((a,b)=>a.data>b.data?1:-1);
  const tot=lista.reduce((a,s)=>a+prezzoLordo(s),0);
  return <div>
    <h2 style={{...S.gld,marginTop:0}}>Servizi da pagare</h2>
    <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
      <select style={{...S.inp,flex:1,minWidth:180}} value={filtroC} onChange={e=>setFiltroC(e.target.value)}>
        <option value="">Tutti i committenti</option>
        {clienti.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <div style={{background:"#dc262633",border:"1px solid #dc2626",borderRadius:8,padding:"5px 12px",color:"#f87171",fontWeight:700,whiteSpace:"nowrap"}}>{fmt(tot)}</div>
    </div>
    {lista.map(s=>{
      const drv=driver.find(d=>d.id===s.driverId);
      const cli=clienti.find(c=>c.id===s.committenteId);
      return <div key={s.id} style={{...S.card,border:"1px solid #dc262444",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:5,marginBottom:3,flexWrap:"wrap"}}>
            <span style={{color:"#e8d5a3",fontSize:11,fontFamily:"monospace"}}>{s.id}</span>
            <Badge color={s.tipo==="trasferimento"?"blue":"amber"}>{s.tipo==="trasferimento"?"Trasf.":"Disp. "+(s.oreDisp||"?")+"h"}</Badge>
            {!s.dataFattura&&<Badge color="amber">Fattura mancante</Badge>}
          </div>
          <div style={{color:"#c8d3e0",fontSize:13}}>{s.data} {s.ora} — {s.nomeUtente||"—"}</div>
          <div style={{color:"#8892a4",fontSize:12}}>{cli?.nome} · {drv?.nome}</div>
          <div style={{color:"#8892a4",fontSize:12}}>{[s.pickup,s.dropoff].filter(Boolean).join(" → ")}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:"#4ade80",fontWeight:700,fontFamily:"Georgia,serif",fontSize:16}}>{fmt(prezzoLordo(s))}</span>
          <button onClick={()=>setPagId(s.id)} style={{background:"#16a34a",border:"none",color:"white",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>Paga</button>
        </div>
      </div>;
    })}
    {lista.length===0&&<div style={{color:"#4b5563",textAlign:"center",padding:40}}>Nessun servizio da pagare</div>}
    {pagId&&<PagModal onClose={()=>setPagId(null)} onConfirm={m=>{upd(pagId,{dataPagamento:today(),metodoPagamento:m});setPagId(null);}}/>}
  </div>;
}

// ── SPESE ─────────────────────────────────────────────────────────────────────
function Spese({spese,setSpese,driver,anno}){
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [delId,setDelId]=useState(null);
  const [aperto,setAperto]=useState(null);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const CATS=[
    {k:"acquisto_auto",l:"Acquisto Auto"},
    {k:"altro",l:"Altro"},
    {k:"assicurazione",l:"Assicurazione"},
    {k:"beni_durevoli",l:"Beni Durevoli"},
    {k:"bollo",l:"Bollo"},
    {k:"cancelleria",l:"Cancelleria"},
    {k:"carburante",l:"Carburante"},
    {k:"commissioni",l:"Commissioni"},
    {k:"commissioni_carte",l:"Commissioni Carte"},
    {k:"detrazioni_19",l:"Detrazioni 19%"},
    {k:"inps_anno_prec",l:"INPS anno precedente"},
    {k:"perdita_anno_prec",l:"Perdita anno precedente"},
    {k:"lavaggi",l:"Lavaggi"},
    {k:"manutenzione",l:"Manutenzione"},
    {k:"pagamento_driver",l:"Pagamento Driver"},
    {k:"pedaggi",l:"Pedaggi Autostradali"},
    {k:"pneumatici",l:"Pneumatici"},
    {k:"vestiario",l:"Vestiario"},
  ];
  const ALIQ=[{k:"0",l:"Esente 0%"},{k:"4",l:"4%"},{k:"5",l:"5%"},{k:"10",l:"10%"},{k:"22",l:"22%"}];
  const salva=()=>{
    if(!form.tipo)return alert("Seleziona categoria");
    if(!form.importo)return alert("Inserire importo");
    const imp=parseFloat(form.importo)||0;
    const A2=ALIQ_MAP;
    const formFinal=(form.tipo==="inps_anno_prec"||form.tipo==="detrazioni_19"||form.tipo==="perdita_anno_prec")?{...form,aliqIva:"0"}:form;
    let voci=[{...formFinal,id:formFinal.id||uid()}];
    if(form.tipo==="acquisto_auto"&&!form.isQuota&&!form.quotaManuale){
      const aliq=A2[form.aliqIva]||0;
      const ivaI=aliq>0?imp*aliq:0;
      const netto=imp;
      const pct=(parseFloat(form.pctAmmort)||25)/100;
      const qPiena=netto*pct,qMezza=qPiena/2;
      const anniI=Math.floor((netto-qMezza)/qPiena);
      const res=netto-qMezza-qPiena*anniI;
      const annoB=parseInt((form.data||today()).slice(0,4));
      const ql=[{q:qMezza,l:"1° anno ("+((pct/2)*100).toFixed(1)+"%)"}];
      for(let i=0;i<anniI;i++)ql.push({q:qPiena,l:"anno "+(i+2)+" ("+(pct*100).toFixed(0)+"%)"});
      if(res>0.01)ql.push({q:res,l:"anno "+(anniI+2)+" - coda"});
      voci=ql.map((x,i)=>({...form,id:uid(),isQuota:true,quotaNum:i+1,quotaTot:ql.length,importo:x.q.toFixed(2),aliqIva:i===0?form.aliqIva:"0",data:(annoB+i)+"-12-31",descrizione:"Ammort. auto "+(form.descrizione||"")+" "+x.l+(i===0&&ivaI>0?" [IVA:"+ivaI.toFixed(2)+"]":"")}));
    }
    if(form.tipo==="beni_durevoli"&&imp>500&&!form.isQuota&&!form.quotaManuale){
      const aliq=A2[form.aliqIva]||0;
      const ivaI=aliq>0?imp*aliq:0;
      const netto=imp;
      const anniMin=Math.ceil(netto/500);
      const anni=Math.max(parseInt(form.anniAmmort)||anniMin,anniMin);
      const quota=netto/anni;
      const annoB=parseInt((form.data||today()).slice(0,4));
      voci=Array.from({length:anni},(_,i)=>({...form,id:uid(),isQuota:true,quotaNum:i+1,quotaTot:anni,importo:quota.toFixed(2),aliqIva:i===0?form.aliqIva:"0",data:(annoB+i)+"-12-31",descrizione:"Ammort. bene "+(form.descrizione||"")+" quota "+(i+1)+"/"+anni+(i===0&&ivaI>0?" [IVA:"+ivaI.toFixed(2)+"]":"")}));
    }
    setSpese(p=>[...p.filter(x=>x.id!==form.id),...voci]);
    setModal(null);
  };
  const tot=spese.reduce((a,s)=>a+(parseFloat(s.importo)||0),0);
  const imp=parseFloat(form.importo)||0;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{...S.gld,margin:0}}>Spese {anno!=="tutti"&&<span style={{fontSize:14,color:"#60a5fa"}}>— {anno}</span>}</h2>
      <button style={S.bG} onClick={()=>{setForm({id:uid(),data:today(),tipo:"",anniAmmort:3,pctAmmort:25,aliqIva:"22"});setModal(1)}}><Ic n="pls" z={14}/>Nuova</button>
    </div>
    <div style={{background:"#1a1f2e",border:"1px solid #f87171",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
      <div style={{fontSize:11,color:"#8892a4",textTransform:"uppercase"}}>Totale Spese</div>
      <div style={{color:"#f87171",fontSize:26,fontFamily:"Georgia,serif",fontWeight:700}}>{fmt(tot)}</div>
    </div>
    {CATS.map(cat=>{
      const voci=spese.filter(s=>s.tipo===cat.k).sort((a,b)=>b.data>a.data?1:-1);
      const totC=voci.reduce((a,s)=>a+(parseFloat(s.importo)||0),0);
      if(totC===0)return null;
      const isOpen=aperto===cat.k;
      return <div key={cat.k} style={{background:"#1a1f2e",border:"1px solid #2d3550",borderRadius:8,marginBottom:8,overflow:"hidden"}}>
        <div onClick={()=>setAperto(isOpen?null:cat.k)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 13px",cursor:"pointer",userSelect:"none"}}>
          <span style={{color:"#c8d3e0",fontWeight:600,fontSize:13}}>{cat.l}</span>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{color:"#f87171",fontWeight:700,fontFamily:"Georgia,serif"}}>{fmt(totC)}</span>
            <span style={{color:"#6b7280",fontSize:12}}>{isOpen?"▲":"▼"}</span>
          </div>
        </div>
        {isOpen&&<div style={{borderTop:"1px solid #2d3550"}}>
          {voci.map(s=>{
            const drv=driver.find(d=>d.id===s.driverId);
            const aliq=ALIQ_MAP[s.aliqIva]||0;
            const ivaC=aliq>0?(parseFloat(s.importo)||0)*(aliq/(1+aliq)):0;
            return <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 13px",borderBottom:"1px solid #1e2435"}}>
              <div>
                <div style={{color:"#c8d3e0",fontSize:12}}>{s.descrizione||cat.l}{s.isQuota&&<span style={{color:"#8892a4",fontSize:11}}> (quota {s.quotaNum}/{s.quotaTot})</span>}</div>
                <div style={{color:"#8892a4",fontSize:11}}>{s.data}{drv&&" · "+drv.nome}{s.aliqIva&&s.aliqIva!=="0"&&" · IVA "+s.aliqIva+"%"}{s.note&&" · "+s.note}</div>
                {ivaC>0&&<div style={{color:"#4ade80",fontSize:10}}>IVA a credito: {fmt(ivaC)}</div>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:"#f87171",fontSize:12,fontWeight:700,fontFamily:"Georgia,serif"}}>{fmt(s.importo)}</span>
                <button style={{...S.bGr,padding:"2px 6px"}} onClick={e=>{e.stopPropagation();setForm({...s});setModal(1);}}><Ic n="edt" z={11}/></button>
                <button style={{...S.bR,padding:"2px 6px"}} onClick={e=>{e.stopPropagation();setDelId(s.id);}}><Ic n="trs" z={11}/></button>
              </div>
            </div>;
          })}
        </div>}
      </div>;
    })}
    {spese.length===0&&<div style={{color:"#4b5563",textAlign:"center",padding:40}}>Nessuna spesa</div>}
    {delId&&<DelModal title={spese.find(x=>x.id===delId)?.isQuota?"Eliminare tutto l'ammortamento (tutte le quote)?":"Eliminare questa spesa?"} onClose={()=>setDelId(null)} onConfirm={async()=>{const sp=spese.find(x=>x.id===delId);if(sp?.isQuota){const base=sp.descrizione?.slice(0,30);const ids=spese.filter(x=>x.isQuota&&x.tipo===sp.tipo&&x.descrizione?.slice(0,30)===base).map(x=>x.id);for(const i of ids)await deleteRecord("spese",i);setSpese(p=>p.filter(x=>!ids.includes(x.id)));}else{await deleteRecord("spese",delId);setSpese(p=>p.filter(x=>x.id!==delId));}setDelId(null);}}/>}
    {modal&&<Modal title="Spesa" onClose={()=>setModal(null)}>
      <F label="Categoria"><select style={S.inp} value={form.tipo||""} onChange={set("tipo")}><option value="">— Seleziona —</option>{CATS.map(c=><option key={c.k} value={c.k}>{c.l}</option>)}</select></F>
      {form.tipo==="inps_anno_prec"&&<div style={{background:"#1a2a3a",border:"1px solid #3b82f6",borderRadius:7,padding:"10px 12px",marginBottom:10}}><div style={{color:"#60a5fa",fontSize:12,fontWeight:700,marginBottom:3}}>INPS anno precedente</div><div style={{color:"#c8d3e0",fontSize:11}}>Dedotta dal reddito imponibile IRPEF come costo. Aliquota IVA: 0%.</div></div>}
      {form.tipo==="perdita_anno_prec"&&<div style={{background:"#1a2a3a",border:"1px solid #3b82f6",borderRadius:7,padding:"10px 12px",marginBottom:10}}><div style={{color:"#60a5fa",fontSize:12,fontWeight:700,marginBottom:3}}>Perdita anno precedente</div><div style={{color:"#c8d3e0",fontSize:11}}>Dedotta dal reddito imponibile IRPEF, inserimento manuale.</div></div>}
      {form.tipo==="detrazioni_19"&&<div style={{background:"#1a2a3a",border:"1px solid #a78bfa",borderRadius:7,padding:"10px 12px",marginBottom:10}}><div style={{color:"#a78bfa",fontSize:12,fontWeight:700,marginBottom:3}}>Detrazioni 19%</div><div style={{color:"#c8d3e0",fontSize:11}}>Il 19% dell&apos;importo verrà sottratto dall&apos;IRPEF lorda in Dashboard.</div></div>}
      {form.tipo==="acquisto_auto"&&<>
        <div style={{marginBottom:8}}><label style={{color:"#8892a4",fontSize:12,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><input type="checkbox" checked={!!form.quotaManuale} onChange={e=>setForm(p=>({...p,quotaManuale:e.target.checked}))}/>Quota manuale</label></div>
        {!form.quotaManuale&&<>
          <F label="% ammortamento annuo (max 25%)"><select style={S.inp} value={form.pctAmmort||25} onChange={e=>setForm(p=>({...p,pctAmmort:parseFloat(e.target.value)}))}>
            {[5,10,12.5,15,20,25].map(p=><option key={p} value={p}>{p}% annuo</option>)}
          </select></F>
          {imp>0&&<div style={{fontSize:11,color:"#60a5fa",marginBottom:8}}>Quota piena: {fmt(imp*(form.pctAmmort||25)/100)} · 1° e ultimo anno: {fmt(imp*(form.pctAmmort||25)/200)} · IVA a credito solo anno acquisto</div>}
        </>}
      </>}
      {form.tipo==="beni_durevoli"&&<>
        <div style={{marginBottom:8}}><label style={{color:"#8892a4",fontSize:12,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><input type="checkbox" checked={!!form.quotaManuale} onChange={e=>setForm(p=>({...p,quotaManuale:e.target.checked}))}/>Quota manuale</label></div>
        {!form.quotaManuale&&imp>500&&<>
          <F label={"Anni (min "+Math.ceil(imp/500)+" per max 500/anno)"}><select style={S.inp} value={form.anniAmmort||Math.ceil(imp/500)} onChange={e=>setForm(p=>({...p,anniAmmort:parseInt(e.target.value)}))}>
            {[2,3,4,5,6,7,8,10].filter(a=>a>=Math.ceil(imp/500)).map(a=><option key={a} value={a}>{a} anni</option>)}
          </select></F>
          {imp>0&&<div style={{fontSize:11,color:"#60a5fa",marginBottom:8}}>Quota annua: {fmt(imp/(form.anniAmmort||Math.ceil(imp/500)))} · IVA credito solo anno acquisto</div>}
        </>}
      </>}
      {form.tipo==="pagamento_driver"&&<F label="Driver"><select style={S.inp} value={form.driverId||""} onChange={set("driverId")}><option value="">—</option>{driver.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select></F>}
      <F label="Descrizione"><input style={S.inp} value={form.descrizione||""} onChange={set("descrizione")} placeholder={form.tipo==="altro"?"Obbligatorio":"Facoltativo"}/></F>
      <div style={{display:"flex",gap:10}}>
        <F label="Data" w="50%"><input style={S.inp} type="date" value={form.data||""} onChange={set("data")}/></F>
        <F label="Importo EUR" w="50%"><input style={S.inp} type="number" step="0.01" value={form.importo||""} onChange={e=>setForm(p=>({...p,importo:e.target.value}))}/></F>
      </div>
      {form.tipo!=="inps_anno_prec"&&form.tipo!=="detrazioni_19"&&form.tipo!=="perdita_anno_prec"&&<>
        <F label="Aliquota IVA (credito)"><select style={S.inp} value={form.aliqIva||"22"} onChange={set("aliqIva")}>{ALIQ.map(a=><option key={a.k} value={a.k}>{a.l}</option>)}</select></F>
        {form.aliqIva&&form.aliqIva!=="0"&&imp>0&&<div style={{fontSize:11,color:"#4ade80",marginBottom:8}}>IVA a credito: {fmt(imp*(ALIQ_MAP[form.aliqIva]||0)/(1+(ALIQ_MAP[form.aliqIva]||0)))}</div>}
      </>}
      <F label="Note"><textarea style={{...S.inp,minHeight:40,resize:"vertical"}} value={form.note||""} onChange={set("note")}/></F>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
        <button style={S.bGr} onClick={()=>setModal(null)}>Annulla</button>
        <button style={S.bG} onClick={salva}>Salva</button>
      </div>
    </Modal>}
  </div>;
}

// ── PREVENTIVI ────────────────────────────────────────────────────────────────
const AZIENDA={
  nome:"BLACK DIAMOND TRANSFERT DI MURRAY ESTHER",
  indirizzo:"Viale Don Giovanni Minzoni 38",
  citta:"20091 Bresso (MI)",
  piva:"14145490968",
  cf:"GRCRHS80L66Z505C",
  email:"blackdiamondtransfert@gmail.com",
  cell:"0039 3806543014",
  web:"www.blackdiamondtransfert.it",
  iban:"IT41S36772223000EM002528613",
  intestatarioIBAN:"BLACK DIAMOND TRANSFERT DI MURRAY ESTHER",
  firmatario:"Esther Murray",
};

const calcolaPrev=(f,tariff)=>{
  const righe=f.righe||[];
  const sub=righe.reduce((a,r)=>{
    const imp=(parseFloat(r.prezzoUnit)||0)*(parseFloat(r.qta)||1);
    const sc=(parseFloat(r.sconto)||0)/100;
    return a+imp*(1-sc);
  },0);
  const sg=(parseFloat(f.scontoGlobale)||0)/100;
  const dopoSc=sub*(1-sg);
  const aliq=(parseFloat(f.aliqIva)||tariff.iva)/100;
  const iva=dopoSc*aliq;
  return{sub,sgAbs:sub*sg,dopoSc,iva,tot:dopoSc+iva};
};

async function loadPrevTariff(){
  try{
    const[rp,rt]=await Promise.all([
      supa.from("preventivi").select("*").order("data",{ascending:false}),
      supa.from("tariffario").select("*").eq("id","default").single(),
    ]);
    const preventivi=(rp.data||[]).map(r=>({
      id:r.id,data:r.data||"",validita:r.validita||30,
      clienteNome:r.nome_cliente||"",clienteEmail:r.cliente_email||"",
      telefonoCli:r.telefono_cli||"",clienteRef:r.cliente_ref||"",
      veicolo:r.veicolo||"",giornoServizio:r.giorno_servizio||"",
      titoloServizio:r.titolo_servizio||"",aliqIva:r.aliq_iva||"",
      scontoGlobale:r.sconto_globale||"0",righe:r.righe_json||[],
      metodiPagamento:r.metodi_pagamento||"",note:r.note||"",
      committenteId:r.committente_id||"",stato:r.stato||"bozza",
    }));
    const tariff=rt.data?{
      prezzoTrasf:rt.data.prezzo_trasf||425,
      prezzoOra:rt.data.prezzo_ora||50,
      pedaggioStd:rt.data.pedaggio_std||13,
      iva:rt.data.iva||10,
    }:{prezzoTrasf:425,prezzoOra:50,pedaggioStd:13,iva:10};
    return{preventivi,tariff};
  }catch(e){
    console.error("loadPrevTariff error",e);
    return{preventivi:[],tariff:{prezzoTrasf:425,prezzoOra:50,pedaggioStd:13,iva:10}};
  }
}

async function savePrevList(list){
  if(!list.length)return;
  await supa.from("preventivi").upsert(list.map(p=>({
    id:p.id,data:p.data||null,validita:p.validita||30,
    nome_cliente:p.clienteNome||null,cliente_email:p.clienteEmail||null,
    telefono_cli:p.telefonoCli||null,cliente_ref:p.clienteRef||null,
    veicolo:p.veicolo||null,giorno_servizio:p.giornoServizio||null,
    titolo_servizio:p.titoloServizio||null,aliq_iva:p.aliqIva||null,
    sconto_globale:p.scontoGlobale||"0",righe_json:p.righe||[],
    metodi_pagamento:p.metodiPagamento||null,note:p.note||null,
    committente_id:p.committenteId||null,stato:p.stato||"bozza",
  })));
}

async function saveTariffario(t){
  await supa.from("tariffario").upsert({
    id:"default",prezzo_trasf:t.prezzoTrasf,prezzo_ora:t.prezzoOra,
    pedaggio_std:t.pedaggioStd,iva:t.iva,
  });
}

function Preventivi(){
  const [preventivi,setPrevR]=useState([]);
  const [tariff,setTariff]=useState({prezzoTrasf:425,prezzoOra:50,pedaggioStd:13,iva:10});
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [delId,setDelId]=useState(null);
  const [showTariff,setShowTariff]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [msg,setMsg]=useState("");
  const [anteprimaPrev,setAnteprimaPrev]=useState(null);

  useEffect(()=>{(async()=>{
    const{preventivi:p,tariff:t}=await loadPrevTariff();
    setPrevR(p);setTariff(t);setLoaded(true);
  })();},[]);

  const savePrev=async list=>{
    setPrevR(list);
    await savePrevList(list);
  };
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const nuovoPreventivo=()=>{
    setForm({
      id:uid(),data:today(),validita:"30",
      clienteNome:"",clienteEmail:"",telefonoCli:"",clienteRef:"",
      veicolo:"Mercedes-Benz Classe E",giornoServizio:"",titoloServizio:"",
      aliqIva:String(tariff.iva),scontoGlobale:"0",
      righe:[],
      metodiPagamento:"Bonifico bancario intestato a "+AZIENDA.intestatarioIBAN+"\nIBAN: "+AZIENDA.iban,
      note:"Le spese di vitto e alloggio (hotel, pranzo e/o cena) qualora necessarie, sono a carico del cliente e non sono incluse nel presente preventivo. "+String.fromCharCode(200)+" richiesta la conferma del preventivo in oggetto.\nCordiali saluti",
    });
    setModal("edit");
  };

  const addRiga=tipo=>{
    const r={id:uid(),tipo,descrizione:"",qta:1,prezzoUnit:0,sconto:"0",nascosta:false};
    if(tipo==="trasferimento"){r.descrizione="Trasferimento";r.prezzoUnit=tariff.prezzoTrasf;}
    if(tipo==="disposizione"){r.descrizione="Disposizione oraria";r.prezzoUnit=tariff.prezzoOra;}
    if(tipo==="pedaggio"){r.descrizione="Pedaggio Autostradale";r.prezzoUnit=tariff.pedaggioStd;}
    setForm(p=>({...p,righe:[...(p.righe||[]),r]}));
  };

  const updRiga=(rid,patch)=>setForm(p=>({...p,righe:p.righe.map(r=>r.id!==rid?r:{...r,...patch})}));
  const delRiga=rid=>setForm(p=>({...p,righe:p.righe.filter(r=>r.id!==rid)}));

  const salva=async()=>{
    if(!form.clienteNome)return alert("Inserire nome cliente");
    const lista=preventivi.find(p=>p.id===form.id)?preventivi.map(p=>p.id===form.id?form:p):[...preventivi,form];
    await savePrev(lista);setModal(null);
  };

  const eliminaPrev=async id=>{
    await supa.from("preventivi").delete().eq("id",id);
    setPrevR(p=>p.filter(x=>x.id!==id));
  };

  const stampaPDF=prev=>{
    setAnteprimaPrev(prev);
  };

  const inviaWA=prev=>{
    const tel=(prev.telefonoCli||"").replace(/[^0-9+]/g,"");
    if(!tel){alert("Inserire WhatsApp cliente nel preventivo");return;}
    const c=calcolaPrev(prev,tariff);
    const righeVis=(prev.righe||[]).filter(r=>!r.nascosta);
    const lines=[
      "*BLACK DIAMOND TRANSFERT*",
      "_Preventivo "+prev.id+"_","",
      "Gentile "+prev.clienteNome+",",
      "Le inviamo il preventivo per il servizio richiesto:","",
      ...righeVis.map(r=>"- "+r.descrizione+": "+eur+fmt((parseFloat(r.prezzoUnit)||0)*(parseFloat(r.qta)||1))),
      "",
      "Totale IVA inclusa: *"+eur+fmt(c.tot)+"*","",
      "Per accettare risponda OK a questo messaggio.","",
      "Black Diamond Transfert",
    ].join("\n");
    window.open("https://wa.me/"+tel+"?text="+encodeURIComponent(lines),"_blank");
  };

  const calc=form.righe?calcolaPrev(form,tariff):{sub:0,sgAbs:0,dopoSc:0,iva:0,tot:0};

  if(!loaded)return <div style={{color:"#8892a4",textAlign:"center",padding:40}}>Caricamento preventivi...</div>;

  if(anteprimaPrev){
    const prev=anteprimaPrev;
    const cc=calcolaPrev(prev,tariff);
    const righeVis=(prev.righe||[]).filter(r=>!r.nascosta);
    const dataBella=prev.data?new Date(prev.data).toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";
    return <div style={{background:"#fff",minHeight:"100vh",fontFamily:"Arial,sans-serif",fontSize:13,color:"#111",padding:28,margin:"-18px"}}>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginBottom:20,borderBottom:"1px solid #ddd",paddingBottom:12}} className="no-print">
        <button onClick={()=>setAnteprimaPrev(null)} style={{background:"#f0f0f0",border:"1px solid #ccc",borderRadius:6,padding:"7px 16px",cursor:"pointer",fontSize:13}}>← Torna</button>
        <button onClick={()=>window.print()} style={{background:"#111",color:"#fff",border:"none",borderRadius:6,padding:"7px 20px",cursor:"pointer",fontSize:13,fontWeight:700}}>🖨 Stampa / Salva PDF</button>
      </div>
      <style>{`@media print{.no-print{display:none!important}}`}</style>
      <div style={{textAlign:"center",borderBottom:"2px solid #111",paddingBottom:14,marginBottom:18}}>
        <div style={{fontSize:15,fontWeight:"bold",letterSpacing:.5,marginBottom:6}}>{AZIENDA.nome}</div>
        <div style={{fontSize:12,lineHeight:1.7}}>
          <div>{AZIENDA.indirizzo} - {AZIENDA.citta}</div>
          <div>p.iva: {AZIENDA.piva} - c.f.: {AZIENDA.cf}</div>
          <div>Mail: {AZIENDA.email} &nbsp; Cell: {AZIENDA.cell}</div>
          <div>{AZIENDA.web}</div>
        </div>
      </div>
      <div style={{marginBottom:14,fontSize:12,lineHeight:1.8}}>
        <div>{dataBella}</div>
        {prev.clienteNome&&<div><strong>Spett.le: {prev.clienteNome}</strong>{prev.clienteRef&&" - Rif. "+prev.clienteRef}</div>}
        {prev.clienteEmail&&<div>{prev.clienteEmail}</div>}
        {prev.validita&&<div>Preventivo valido {prev.validita} giorni dalla data di emissione.</div>}
      </div>
      <div style={{fontSize:14,fontWeight:"bold",margin:"14px 0 6px",textTransform:"uppercase"}}>
        PREVENTIVO SERVIZIO CON {prev.veicolo||"VEICOLO NCC"}
      </div>
      {prev.giornoServizio&&<div style={{fontWeight:"bold",marginBottom:8}}>
        GIORNO {new Date(prev.giornoServizio).toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric"})} — {prev.titoloServizio||""}
      </div>}
      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
        <thead>
          <tr style={{background:"#eee"}}>
            <th style={{padding:"6px 8px",border:"1px solid #bbb",fontSize:12,textAlign:"left"}}>Servizio</th>
            <th style={{padding:"6px 8px",border:"1px solid #bbb",fontSize:12,textAlign:"left"}}>Descrizione</th>
            <th style={{padding:"6px 8px",border:"1px solid #bbb",fontSize:12,textAlign:"right"}}>Q.tà</th>
            <th style={{padding:"6px 8px",border:"1px solid #bbb",fontSize:12,textAlign:"right"}}>Importo (€)</th>
          </tr>
        </thead>
        <tbody>
          {righeVis.map(r=>{
            const imp=(parseFloat(r.prezzoUnit)||0)*(parseFloat(r.qta)||1);
            const sc=parseFloat(r.sconto)||0;
            const netto=imp*(1-sc/100);
            return <React.Fragment key={r.id}>
              <tr>
                <td style={{padding:"6px 8px",border:"1px solid #ccc",fontSize:12,verticalAlign:"top"}}>{r.tipo==="trasferimento"?"Trasferimento":r.tipo==="disposizione"?"Disposizione oraria":r.tipo==="pedaggio"?"Pedaggio":""}</td>
                <td style={{padding:"6px 8px",border:"1px solid #ccc",fontSize:12,verticalAlign:"top"}}>{r.descrizione}</td>
                <td style={{padding:"6px 8px",border:"1px solid #ccc",fontSize:12,textAlign:"right"}}>{r.qta}</td>
                <td style={{padding:"6px 8px",border:"1px solid #ccc",fontSize:12,textAlign:"right"}}>{fmt(netto)}</td>
              </tr>
              {sc>0&&<tr>
                <td colSpan="3" style={{padding:"4px 8px",border:"1px solid #ccc",fontSize:11,color:"#666"}}>Sconto {sc}%</td>
                <td style={{padding:"4px 8px",border:"1px solid #ccc",fontSize:11,textAlign:"right",color:"#c00"}}>- {fmt(imp*sc/100)}</td>
              </tr>}
            </React.Fragment>;
          })}
        </tbody>
      </table>
      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
        <tbody>
          <tr style={{fontWeight:"bold",background:"#f5f5f5"}}>
            <td style={{padding:"6px 8px",border:"1px solid #bbb"}}>Totale servizi</td><td/><td style={{padding:"6px 8px",border:"1px solid #bbb",textAlign:"right"}}>{fmt(cc.sub)}</td>
          </tr>
          {(parseFloat(prev.scontoGlobale)||0)>0&&<tr style={{fontWeight:"bold",background:"#f5f5f5"}}>
            <td style={{padding:"6px 8px",border:"1px solid #bbb"}}>Sconto {prev.scontoGlobale}%</td><td/><td style={{padding:"6px 8px",border:"1px solid #bbb",textAlign:"right",color:"#c00"}}>- {fmt(cc.sgAbs)}</td>
          </tr>}
          <tr style={{fontWeight:"bold",background:"#f5f5f5"}}>
            <td style={{padding:"6px 8px",border:"1px solid #bbb"}}>Subtotale</td><td/><td style={{padding:"6px 8px",border:"1px solid #bbb",textAlign:"right"}}>{fmt(cc.dopoSc)}</td>
          </tr>
          <tr style={{fontWeight:"bold",background:"#f5f5f5"}}>
            <td style={{padding:"6px 8px",border:"1px solid #bbb"}}>IVA</td>
            <td style={{padding:"6px 8px",border:"1px solid #bbb",fontSize:11}}>{prev.aliqIva||tariff.iva}% Aliquota servizio NCC</td>
            <td style={{padding:"6px 8px",border:"1px solid #bbb",textAlign:"right"}}>{fmt(cc.iva)}</td>
          </tr>
          <tr style={{fontWeight:"bold",fontSize:14,background:"#111",color:"#fff"}}>
            <td colSpan="2" style={{padding:"8px",border:"1px solid #333"}}>TOTALE</td>
            <td style={{padding:"8px",border:"1px solid #333",textAlign:"right"}}>{eur} {fmt(cc.tot)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{marginTop:18,fontSize:12,borderTop:"1px solid #bbb",paddingTop:10,lineHeight:1.7}}>
        <div><strong>MODALITÀ DI PAGAMENTO ACCETTATE:</strong></div>
        <div style={{marginTop:6,whiteSpace:"pre-line"}}>{prev.metodiPagamento||""}</div>
        {prev.note&&<div style={{marginTop:12,fontStyle:"italic",whiteSpace:"pre-line"}}>{prev.note}</div>}
      </div>
      <div style={{marginTop:30,textAlign:"right",fontWeight:"bold",lineHeight:1.9}}>
        <div>{AZIENDA.nome}</div>
        <div>{AZIENDA.firmatario}</div>
        <div style={{marginTop:20,height:50,borderBottom:"1px solid #111",width:200,marginLeft:"auto"}}/>
      </div>
    </div>;
  }

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <h2 style={{...S.gld,margin:0}}>Preventivi</h2>
      <div style={{display:"flex",gap:8}}>
        <button style={{...S.bGr,fontSize:12,borderColor:showTariff?"#d97706":"#2d3550",color:showTariff?"#d97706":"#8892a4"}} onClick={()=>setShowTariff(t=>!t)}>Tariffario</button>
        <button style={S.bG} onClick={nuovoPreventivo}><Ic n="pls" z={14}/>Nuovo preventivo</button>
      </div>
    </div>
    {msg&&<div style={{background:"#3d1515",color:"#f87171",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:12}}>{msg}</div>}

    {showTariff&&<div style={{background:"#1a1f2e",border:"1px solid #d97706",borderRadius:8,padding:14,marginBottom:14}}>
      <div style={{color:"#d97706",fontWeight:700,fontSize:12,marginBottom:10,textTransform:"uppercase"}}>Tariffario base — non visibile al cliente</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[["Trasferimento (€)","prezzoTrasf"],["Ora disposizione (€)","prezzoOra"],["Pedaggio std (€)","pedaggioStd"],["IVA default (%)","iva"]].map(([l,k])=>(
          <div key={k} style={{flex:"1 1 150px"}}>
            <div style={S.lbl}>{l}</div>
            <input style={S.inp} type="number" step="0.01" value={tariff[k]} onChange={e=>setTariff(t=>({...t,[k]:parseFloat(e.target.value)||0}))}/>
          </div>
        ))}
      </div>
      <button style={{...S.bG,marginTop:10}} onClick={async()=>{await saveTariffario(tariff);setMsg("Tariffario salvato!");setTimeout(()=>setMsg(""),2000);}}>Salva tariffario</button>
    </div>}

    {preventivi.length===0&&<div style={{...S.card,textAlign:"center",color:"#4b5563",padding:40}}>Nessun preventivo. Creane uno!</div>}
    {[...preventivi].reverse().map(p=>{
      const c=calcolaPrev(p,tariff);
      return <div key={p.id} style={{...S.card,borderLeft:"4px solid #e8d5a3"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{color:"#e8d5a3",fontWeight:700,fontSize:13}}>{p.id}</div>
            <div style={{color:"#c8d3e0",fontWeight:600,fontSize:14}}>{p.clienteNome||"—"}</div>
            <div style={{color:"#8892a4",fontSize:12}}>{p.data} · {p.veicolo||"—"}</div>
            {p.giornoServizio&&<div style={{color:"#8892a4",fontSize:12}}>Giorno servizio: {p.giornoServizio}</div>}
            <div style={{color:"#8892a4",fontSize:12}}>{p.righe?.filter(r=>!r.nascosta).length||0} voci</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
            <div style={{color:"#4ade80",fontFamily:"Georgia,serif",fontSize:20,fontWeight:700}}>{eur} {fmt(c.tot)}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
              <button onClick={()=>{setForm({...p});setModal("edit");}} style={{...S.bGr,padding:"5px 12px",fontSize:12}}>Modifica</button>
              <button onClick={()=>stampaPDF(p)} style={{background:"#1a2a3a",border:"1px solid #3b82f6",borderRadius:6,color:"#60a5fa",padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>PDF / Stampa</button>
              <button onClick={()=>inviaWA(p)} style={{background:"#1a3d20",border:"1px solid #25d36688",borderRadius:6,color:"#25d366",padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>WhatsApp</button>
              <button onClick={()=>setDelId(p.id)} style={{...S.bR,padding:"5px 8px"}}>🗑</button>
            </div>
          </div>
        </div>
      </div>;
    })}

    {delId&&<DelModal title="Eliminare questo preventivo?" onClose={()=>setDelId(null)} onConfirm={async()=>{await eliminaPrev(delId);setDelId(null);}}/>}

    {modal==="edit"&&<Modal title={"Preventivo "+form.id} onClose={()=>setModal(null)}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <F label="Data preventivo" w="50%"><input style={S.inp} type="date" value={form.data||""} onChange={set("data")}/></F>
        <F label="Validità (giorni)" w="50%"><input style={S.inp} type="number" value={form.validita||30} onChange={set("validita")}/></F>
      </div>
      <F label="Nome Cliente / Spett.le"><input style={S.inp} value={form.clienteNome||""} onChange={set("clienteNome")} placeholder="Es. Rossi Mario o Azienda Srl"/></F>
      <div style={{display:"flex",gap:10}}>
        <F label="Email cliente" w="55%"><input style={S.inp} type="email" value={form.clienteEmail||""} onChange={set("clienteEmail")}/></F>
        <F label="WhatsApp cliente" w="45%"><input style={S.inp} value={form.telefonoCli||""} onChange={set("telefonoCli")} placeholder="+39..."/></F>
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="Rif. / Attenzione" w="50%"><input style={S.inp} value={form.clienteRef||""} onChange={set("clienteRef")}/></F>
        <F label="Veicolo" w="50%"><input style={S.inp} value={form.veicolo||""} onChange={set("veicolo")} placeholder="Mercedes-Benz Classe E"/></F>
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="Giorno del servizio" w="50%"><input style={S.inp} type="date" value={form.giornoServizio||""} onChange={set("giornoServizio")}/></F>
        <F label="Titolo servizio" w="50%"><input style={S.inp} value={form.titoloServizio||""} onChange={set("titoloServizio")} placeholder="Es. TRASFERIMENTO E DISPOSIZIONE"/></F>
      </div>

      <div style={{fontSize:11,color:"#e8d5a3",textTransform:"uppercase",letterSpacing:1,margin:"12px 0 8px",borderTop:"1px solid #2d3550",paddingTop:12}}>Voci del preventivo</div>
      {(form.righe||[]).map((r)=>(
        <div key={r.id} style={{background:"#0f1320",border:"1px solid #2d3550",borderRadius:6,padding:10,marginBottom:8}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:"2 1 180px"}}>
              <div style={S.lbl}>Descrizione</div>
              <input style={S.inp} value={r.descrizione} onChange={e=>updRiga(r.id,{descrizione:e.target.value})} placeholder="Descrizione servizio"/>
            </div>
            <div style={{flex:"1 1 60px"}}>
              <div style={S.lbl}>Q.tà</div>
              <input style={S.inp} type="number" step="0.5" min="0" defaultValue={r.qta} key={"qta-"+r.id} onBlur={e=>updRiga(r.id,{qta:parseFloat(e.target.value)||1})}/>
            </div>
            <div style={{flex:"1 1 80px"}}>
              <div style={S.lbl}>Prezzo unit.</div>
              <input style={S.inp} type="number" step="0.01" defaultValue={r.prezzoUnit} key={"pu-"+r.id} onBlur={e=>updRiga(r.id,{prezzoUnit:parseFloat(e.target.value)||0})}/>
            </div>
            <div style={{flex:"1 1 60px"}}>
              <div style={S.lbl}>Sconto %</div>
              <input style={S.inp} type="number" min="0" max="100" defaultValue={r.sconto||"0"} key={"sc-"+r.id} onBlur={e=>updRiga(r.id,{sconto:e.target.value})}/>
            </div>
            <div style={{flex:"1 1 70px",textAlign:"right"}}>
              <div style={S.lbl}>Importo</div>
              <div style={{color:"#4ade80",fontFamily:"Georgia,serif",fontWeight:700,padding:"7px 0",fontSize:14}}>
                {eur} {fmt((parseFloat(r.prezzoUnit)||0)*(parseFloat(r.qta)||1)*(1-(parseFloat(r.sconto)||0)/100))}
              </div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",paddingBottom:2}}>
              <label style={{display:"flex",alignItems:"center",gap:4,color:"#8892a4",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
                <input type="checkbox" checked={!!r.nascosta} onChange={e=>updRiga(r.id,{nascosta:e.target.checked})}/>
                nascosta
              </label>
              <button onClick={()=>delRiga(r.id)} style={{...S.bR,padding:"4px 6px",fontSize:12}}>✕</button>
            </div>
          </div>
        </div>
      ))}

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {[["trasferimento","+ Trasferimento"],["disposizione","+ Disposizione"],["pedaggio","+ Pedaggio"],["custom","+ Personalizzata"]].map(([tipo,label])=>(
          <button key={tipo} onClick={()=>addRiga(tipo)} style={{background:"#1e2a3a",border:"1px solid #3b82f644",borderRadius:5,color:"#60a5fa",padding:"6px 12px",cursor:"pointer",fontSize:12}}>{label}</button>
        ))}
      </div>

      <div style={{background:"#0f1320",border:"1px solid #2d3550",borderRadius:8,padding:12,marginBottom:12}}>
        <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 120px"}}>
            <div style={S.lbl}>Sconto globale %</div>
            <input style={S.inp} type="number" min="0" max="100" value={form.scontoGlobale||"0"} onChange={set("scontoGlobale")}/>
          </div>
          <div style={{flex:"1 1 100px"}}>
            <div style={S.lbl}>IVA %</div>
            <input style={S.inp} type="number" value={form.aliqIva||String(tariff.iva)} onChange={set("aliqIva")}/>
          </div>
        </div>
        <div style={{borderTop:"1px solid #2d3550",paddingTop:8}}>
          <div style={{display:"flex",justifyContent:"space-between",color:"#8892a4",fontSize:12,marginBottom:3}}><span>Subtotale</span><span>{eur} {fmt(calc.sub)}</span></div>
          {(parseFloat(form.scontoGlobale)||0)>0&&<div style={{display:"flex",justifyContent:"space-between",color:"#f87171",fontSize:12,marginBottom:3}}><span>Sconto {form.scontoGlobale}%</span><span>- {eur} {fmt(calc.sgAbs)}</span></div>}
          <div style={{display:"flex",justifyContent:"space-between",color:"#8892a4",fontSize:12,marginBottom:3}}><span>IVA {form.aliqIva||tariff.iva}%</span><span>{eur} {fmt(calc.iva)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",color:"#4ade80",fontSize:16,fontWeight:700,fontFamily:"Georgia,serif",borderTop:"1px solid #2d3550",paddingTop:6,marginTop:4}}><span>TOTALE</span><span>{eur} {fmt(calc.tot)}</span></div>
        </div>
      </div>

      <F label="Modalità di pagamento"><textarea style={{...S.inp,minHeight:55,resize:"vertical"}} value={form.metodiPagamento||""} onChange={set("metodiPagamento")}/></F>
      <F label="Note (visibili al cliente)"><textarea style={{...S.inp,minHeight:65,resize:"vertical"}} value={form.note||""} onChange={set("note")}/></F>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,gap:8,flexWrap:"wrap"}}>
        <button style={{...S.bGr,fontSize:12}} onClick={()=>stampaPDF(form)}>Anteprima PDF</button>
        <div style={{display:"flex",gap:8}}>
          <button style={S.bGr} onClick={()=>setModal(null)}>Annulla</button>
          <button style={S.bG} onClick={salva}>Salva</button>
        </div>
      </div>
    </Modal>}
  </div>;
}


// ── APP ───────────────────────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("home");
  const [clienti,setClientiR]=useState([]);
  const [driver,setDriverR]=useState([]);
  const [servizi,setServiziR]=useState([]);
  const [spese,setSpeseR]=useState([]);
  const [anno,setAnno]=useState(String(new Date().getFullYear()));
  const [loaded,setLoaded]=useState(false);
  const [saveStatus,setSaveStatus]=useState("");
  const saveTimer=useRef(null);
  const dataRef=useRef({clienti:[],driver:[],servizi:[],spese:[]});

  useEffect(()=>{(async()=>{
    setSaveStatus("Caricamento...");
    const data=await loadAll();
    setClientiR(data.clienti);setDriverR(data.driver);setServiziR(data.servizi);setSpeseR(data.spese);
    dataRef.current={clienti:data.clienti,driver:data.driver,servizi:data.servizi,spese:data.spese};
    setSaveStatus(data.found?"Dati caricati":"Primo avvio");
    setTimeout(()=>setSaveStatus(""),2500);
    setLoaded(true);
  })();},[]);

  useEffect(()=>{dataRef.current={clienti,driver,servizi,spese};},[clienti,driver,servizi,spese]);
  const refreshData=async()=>{
    setSaveStatus("Aggiornamento...");
    const data=await loadAll();
    setClientiR(data.clienti);setDriverR(data.driver);setServiziR(data.servizi);setSpeseR(data.spese);
    dataRef.current={clienti:data.clienti,driver:data.driver,servizi:data.servizi,spese:data.spese};
    setSaveStatus("Aggiornato");
    setTimeout(()=>setSaveStatus(""),2000);
  };
  useEffect(()=>{
    const interval=setInterval(refreshData,30000);
    return()=>clearInterval(interval);
  },[]);

  const triggerSave=()=>{
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      setSaveStatus("Salvataggio...");
      const{clienti:c,driver:d,servizi:s,spese:sp}=dataRef.current;
      await saveAll(c,d,s,sp);
      setSaveStatus("Salvato ("+s.length+" servizi)");
      setTimeout(()=>setSaveStatus(""),2500);
    },500);
  };

  const mk=(setter,rk)=>fn=>{setter(p=>{const n=typeof fn==="function"?fn(p):fn;dataRef.current={...dataRef.current,[rk]:n};triggerSave();return n;});};
  const setClienti=mk(setClientiR,"clienti");
  const setDriver=mk(setDriverR,"driver");
  const setServizi=mk(setServiziR,"servizi");
  const setSpese=mk(setSpeseR,"spese");

  const anni=useMemo(()=>{
    const s=new Set([...servizi.map(x=>x.data?.slice(0,4)),...spese.map(x=>x.data?.slice(0,4))].filter(Boolean));
    const l=[...s].sort().reverse();
    const cur=String(new Date().getFullYear());
    if(!l.includes(cur))l.unshift(cur);
    if(!l.includes("2025"))l.push("2025");
    l.sort().reverse();
    return l;
  },[servizi,spese]);

  const srvF=useMemo(()=>anno==="tutti"?servizi:servizi.filter(s=>s.data?.startsWith(anno)),[servizi,anno]);
  const spF=useMemo(()=>anno==="tutti"?spese:spese.filter(s=>s.data?.startsWith(anno)),[spese,anno]);

  const exportBk=()=>{
    const blob=new Blob([JSON.stringify({clienti,driver,servizi,spese,at:new Date().toISOString()},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ncc-backup-"+today()+".json";a.click();
  };
  const importBk=()=>{
    const inp=document.createElement("input");inp.type="file";inp.accept=".json";
    inp.onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();r.onload=ev=>{
        try{
          const d=JSON.parse(ev.target.result);
          if(!d.clienti||!d.servizi){alert("File non valido");return;}
          if(!confirm("Importare backup del "+(d.at?.slice(0,10)||"?")+"? I dati attuali verranno SOSTITUITI."))return;
          setClienti(d.clienti||[]);setDriver(d.driver||[]);setServizi(d.servizi||[]);setSpese(d.spese||[]);
          alert("Backup importato.");
        }catch{alert("Errore nel file.");}
      };r.readAsText(f);
    };inp.click();
  };

  const alerts=driver.filter(d=>isExp(d.scadBollo)||isExp(d.scadPatente)||isExp(d.scadAss)||isExp(d.scadRev)||isNear(d.scadBollo)||isNear(d.scadPatente)||isNear(d.scadAss)||isNear(d.scadRev));
  const daPagare=srvF.filter(s=>!s.dataPagamento).length;

  const NAV=[
    {id:"home",l:"Home",i:"home"},
    {id:"calendario",l:"Calendario",i:"cal"},
    {id:"servizi",l:"Servizi",i:"list"},
    {id:"fatturazione",l:"Fatturazione",i:"fatt"},
    {id:"dapagare",l:"Da Pagare",i:"clk",badge:daPagare},
    {id:"spese",l:"Spese",i:"eur"},
    {id:"preventivi",l:"Preventivi",i:"fatt"},
    {id:"clienti",l:"Committenti",i:"users"},
    {id:"driver",l:"Driver",i:"car"},
  ];

  if(!loaded)return <div style={{...S.pg,display:"flex",alignItems:"center",justifyContent:"center",color:"#8892a4",fontFamily:"Georgia,serif"}}>Caricamento...</div>;

  return <div style={S.pg}>
    <div style={S.hdr}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0"}}>
        <span style={{fontSize:20}}>&#128664;</span>
        <div>
          <div style={{...S.gld,fontSize:15,fontWeight:700,letterSpacing:0.5}}>NCC Gestionale</div>
          <div style={{color:"#4b6080",fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>Noleggio Con Conducente</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 0",flexWrap:"wrap"}}>
        {saveStatus&&<span style={{fontSize:11,color:saveStatus.includes("Errore")?"#f87171":"#4ade80",background:"#1a1f2e",border:"1px solid #2d3550",borderRadius:6,padding:"3px 10px"}}>{saveStatus}</span>}
        <button onClick={refreshData} style={{fontSize:11,color:"#60a5fa",background:"#1a1f2e",border:"1px solid #3b82f633",borderRadius:6,padding:"3px 10px",cursor:"pointer"}}>⟳ Aggiorna</button>
        {alerts.length>0&&<div style={{display:"flex",alignItems:"center",gap:5,background:"#7c2d1233",border:"1px solid #dc2626",borderRadius:6,padding:"4px 10px"}}><Ic n="wrn" z={13}/><span style={{color:"#f87171",fontSize:11}}>{alerts.length} scadenza critica</span></div>}
        <div style={{display:"flex",alignItems:"center",gap:5,background:"#1e2a3a",border:"1px solid #3b82f633",borderRadius:6,padding:"3px 10px"}}>
          <span style={{color:"#8892a4",fontSize:11}}>Anno:</span>
          <select value={anno} onChange={e=>setAnno(e.target.value)} style={{background:"transparent",border:"none",color:"#60a5fa",fontSize:13,fontWeight:700,cursor:"pointer",outline:"none",fontFamily:"Georgia,serif"}}>
            <option value="tutti">Tutti</option>
            {anni.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button onClick={exportBk} style={{background:"#1e3a2a",border:"1px solid #16a34a55",borderRadius:6,color:"#4ade80",padding:"5px 10px",cursor:"pointer",fontSize:12}}>Backup</button>
        <button onClick={importBk} style={{background:"#1e2a3a",border:"1px solid #3b82f655",borderRadius:6,color:"#60a5fa",padding:"5px 10px",cursor:"pointer",fontSize:12}}>Ripristina</button>
      </div>
    </div>
    {anno!=="tutti"&&<div style={{background:"#0d1a2e",borderBottom:"1px solid #1e3a5f",padding:"5px 14px",display:"flex",alignItems:"center",gap:8}}>
      <span style={{color:"#60a5fa",fontSize:12}}>Anno {anno}</span>
      <button onClick={()=>setAnno("tutti")} style={{marginLeft:"auto",background:"none",border:"1px solid #3b82f644",borderRadius:4,color:"#60a5fa",fontSize:11,padding:"1px 8px",cursor:"pointer"}}>Mostra tutti</button>
    </div>}
    <div style={S.nav}>
      {NAV.map(n=><button key={n.id} onClick={()=>setPage(n.id)} style={{background:"none",border:"none",borderBottom:"2px solid "+(page===n.id?"#e8d5a3":"transparent"),color:page===n.id?"#e8d5a3":"#8892a4",padding:"9px 11px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,whiteSpace:"nowrap"}}>
        <Ic n={n.i} z={13}/>{n.l}
        {n.badge>0&&<span style={{background:"#dc2626",color:"white",borderRadius:10,padding:"1px 5px",fontSize:10,fontWeight:700}}>{n.badge}</span>}
      </button>)}
    </div>
    <div style={S.cnt}>
      {page==="home"&&<Home servizi={srvF} spese={spF} anno={anno} tutteSpese={spese}/>}
      {page==="calendario"&&<Calendario servizi={servizi} setServizi={setServizi} driver={driver}/>}
      {page==="servizi"&&<Servizi servizi={srvF} setServizi={setServizi} clienti={clienti} driver={driver} anno={anno}/>}
      {page==="fatturazione"&&<Fatturazione servizi={srvF} setServizi={setServizi} clienti={clienti} driver={driver}/>}
      {page==="dapagare"&&<DaPagare servizi={srvF} clienti={clienti} driver={driver} setServizi={setServizi}/>}
      {page==="spese"&&<Spese spese={spF} setSpese={setSpese} driver={driver} anno={anno}/>}
      {page==="preventivi"&&<Preventivi/>}
      {page==="clienti"&&<Clienti clienti={clienti} setClienti={setClienti}/>}
      {page==="driver"&&<Driver driver={driver} setDriver={setDriver}/>}
    </div>
  </div>;
}
