import React,{useState,useRef} from "react";
import {S,Ic,Badge,Modal,DelModal,F,fmt,fmtD,dcol,ivaS,prezzoLordo,uid,today,deleteRecord,SwipeToDelete,PagModal,supa} from "./shared.jsx";

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
  const tratta=pickup&&dropoff?` da ${pickup} a ${dropoff}`:"";
  const tipoMsg=s.tipo==="disposizione"?`per la vostra prenotazione di disposizione di ${s.oreDisp||1} ore`:s.tipo==="combinato"?`per la vostra prenotazione combinata (disposizione ${s.oreDisp||1}h + trasferimento${tratta})`:s.tipo==="ar"?`per la vostra prenotazione andata e ritorno${tratta}`:`per la vostra prenotazione di trasferimento${tratta}`;
  return nome?`Salve, sono ${nome} ${autista} e sono già sul posto, ${pronto} ${tipoMsg}!`:"Salve, siamo già sul posto, pronti ad accogliervi!";
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
    "Passeggero: "+(s.nomeUtente||"—")+(s.telefonoUtente?" · Tel: "+s.telefonoUtente:""),
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
const _i=["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT","UID:"+s.id+"@bdt.it","DTSTART;TZID=Europe/Rome:"+dtS,"DTEND;TZID=Europe/Rome:"+dtE,"SUMMARY:"+titolo,"LOCATION:"+(s.pickup||""),"DESCRIPTION:"+det.split("\n").join("\\n"),"END:VEVENT","END:VCALENDAR"].join("\r\n");const _b=new Blob([_i],{type:"text/calendar"});const _u=URL.createObjectURL(_b);const _a=document.createElement("a");_a.href=_u;_a.download="servizio.ics";_a.click();URL.revokeObjectURL(_u);
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
  const [cartelloPass,setCartelloPass]=useState(null);
  const [intestazioneVisible,setIntestazioneVisible]=useState(true);
  const lastTap=useRef(0);
  const MT=["contanti","bonifico","carta","mypos","paypal"];
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const upd=(id,patch)=>{setServizi(p=>p.map(s=>s.id===id?{...s,...patch}:s));supa.from("servizi").update(Object.fromEntries(Object.entries(patch).map(([k,v])=>[{dataPagamento:"data_pagamento",metodoPagamento:"metodo_pagamento",passeggeri:"passeggeri",bagagli:"bagagli",dataFattura:"data_fattura",statoFattura:"stato_fattura",inFattura:"in_fattura",commissione:"commissione",metodoCommissione:"metodo_commissione",gruppoFattura:"gruppo_fattura",noShow:"no_show"}[k]||k,v]))).eq("id",id).then(({error})=>{if(error)console.error("Errore salvataggio servizio:",error);});};
  const submit=()=>{
    if(!form.data)return alert("Inserire la data");
    setServizi(p=>{const ex=p.find(s=>s.id===form.id);return ex?p.map(s=>s.id===form.id?form:s):[...p,form]});
    setModal(null);
  };
  const [fattServId,setFattServId]=useState(null);
  const [noShowId,setNoShowId]=useState(null);
  const [confMancanteId,setConfMancanteId]=useState(null);
  const [mostraTutti,setMostraTutti]=useState(false);
  const [dataFiltro,setDataFiltro]=useState(today());
  const filtered=servizi.filter(s=>{
    if(!filter&&s.data!==dataFiltro)return false;
    if(!filter)return true;
    if(!filter&&s.data!==dataFiltro)return false;
    if(s.dataPagamento&&!filter&&!mostraTutti)return false;
    if(!filter)return true;
    const q=filter.toLowerCase();
    return s.id?.toLowerCase().includes(q)||
      s.nomeUtente?.toLowerCase().includes(q)||
      s.numeroVolo?.toLowerCase().includes(q)||
      clienti.find(c=>c.id===s.committenteId)?.nome?.toLowerCase().includes(q);
  }).sort((a,b)=>(a.data+(a.ora||""))>(b.data+(b.ora||""))?1:-1);
  const nPagati=servizi.filter(s=>s.dataPagamento).length;

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{...S.gld,margin:0}}>Servizi {anno!=="tutti"&&<span style={{fontSize:14,color:"#60a5fa"}}>— {anno}</span>}</h2>
      <button style={S.bG} onClick={()=>{setForm({id:uid(),data:dataFiltro||today(),tipo:"trasferimento",oreDisp:2,aliqIva:"10",ivaSeparata:false,passeggeri:1});setModal("edit")}}><Ic n="pls" z={14}/>Nuovo</button>
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14,background:"#1a1f2e",position:"relative",borderRadius:8,padding:"10px"}}>
      <button onClick={()=>{const d=new Date(dataFiltro+"T12:00:00");d.setDate(d.getDate()-1);setDataFiltro(d.toISOString().slice(0,10));}} style={{background:"none",border:"none",color:"#e8d5a3",fontSize:22,cursor:"pointer",padding:"0 8px"}}>‹</button>
      <input type="date" id="dateFiltroInput" value={dataFiltro} onChange={e=>setDataFiltro(e.target.value)} style={{background:"none",border:"none",color:"#e8d5a3",fontSize:16,fontFamily:"Georgia,serif",fontWeight:700,cursor:"pointer",textAlign:"center"}}/>
      <button onClick={()=>{const d=new Date(dataFiltro+"T12:00:00");d.setDate(d.getDate()+1);setDataFiltro(d.toISOString().slice(0,10));}} style={{background:"none",border:"none",color:"#e8d5a3",fontSize:22,cursor:"pointer",padding:"0 8px"}}>›</button>
      <button onClick={()=>setDataFiltro(today())} style={{position:"absolute",right:12,background:"#2d3550",border:"1px solid #3d4a60",borderRadius:6,color:"#e8d5a3",fontSize:11,cursor:"pointer",padding:"3px 8px",fontWeight:600}}>Oggi</button>
    </div>
    <div style={{position:"relative",marginBottom:12}}>
      <input style={{...S.inp,paddingLeft:32}} placeholder="Cerca ID, utente, committente, volo..." value={filter} onChange={e=>setFilter(e.target.value)}/>
      <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#8892a4",pointerEvents:"none"}}><Ic n="src" z={14}/></span>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10,padding:"6px 10px",background:"#1a1f2e",borderRadius:6,border:"1px solid #2d3550"}}>
      <span style={{color:"#4ade80",fontFamily:"Georgia,serif",fontWeight:700,fontSize:16}}>Totale: {fmt(filtered.reduce((a,s)=>a+prezzoLordo(s),0))}</span>
    </div>

    {filtered.map(s=>{
      const drv=driver.find(d=>d.id===s.driverId);
      const cli=clienti.find(c=>c.id===s.committenteId);
      const col=dcol(s.driverId,driver);
      return <SwipeToDelete key={s.id} onDelete={()=>setDelId(s.id)}><div style={{...S.card,marginBottom:0,border:s.noShow?"2px solid #00d4ff":s.dataPagamento?"2px solid #4ade80":s.statoFattura==="emessa"?"2px solid #4ade80":s.statoFattura==="preparata"?"2px solid #fbbf24":`1px solid #2d3550`,boxShadow:s.noShow?"0 0 8px #00d4ff66":s.dataPagamento?"0 0 8px #4ade8066":s.statoFattura==="emessa"?"0 0 8px #4ade8066":s.statoFattura==="preparata"?"0 0 8px #fbbf2466":undefined,background:s.noShow?"#00d4ff1a":s.dataPagamento?"#0d2a1a":"#1a1f2e",opacity:s.dataPagamento?0.75:1}}>
        {inline!==s.id?<div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{flex:1,minWidth:170}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
                <span style={{color:"#e8d5a3",fontFamily:"monospace",fontSize:11}}>{s.id}</span>
                <Badge color={s.tipo==="trasferimento"?"blue":s.tipo==="ar"?"teal":s.tipo==="combinato"?"green":"amber"}>{s.tipo==="trasferimento"?"Trasf.":s.tipo==="ar"?"A/R":s.tipo==="combinato"?"Comb. "+(s.oreDisp||"?")+"h":"Disp. "+(s.oreDisp||"?")+"h"}</Badge>
                {s.ivaSeparata&&<Badge color="teal">+IVA</Badge>}
                {s.numeroVolo&&<Badge color="gray">{s.numeroVolo}</Badge>}
                {s.dataPagamento&&<Badge color="green">Pagato</Badge>}
                {s.inFattura&&!s.dataPagamento&&<Badge color="teal">In fattura</Badge>}
                {(s.statoFattura==="mancante"||!s.statoFattura)&&!["contanti","paypal","mypos"].includes(s.metodoPagamento)&&<Badge color="amber">Fattura mancante</Badge>}
                {s.statoFattura==="preparata"&&<Badge color="amber">Fattura preparata</Badge>}
                {s.statoFattura==="emessa"&&<Badge color="green">Fattura emessa</Badge>}
              </div>
              {s.numeroVolo&&<StatoVolo numero={s.numeroVolo}/>}
              <div style={{color:"#c8d3e0",fontSize:15,fontWeight:600,marginTop:3}}>{fmtD(s.data)} {s.ora} — {s.nomeUtente||"—"}</div>
              <div style={{color:"#8892a4",fontSize:13}}><span style={{fontWeight:700,color:"#e8d5a3",fontSize:15}}>{cli?.nome||"—"}</span> · <span style={{color:col}}>{drv?.nome||"—"} {drv?.targa&&"("+drv.targa+")"}</span></div>
              <div style={{color:"#8892a4",fontSize:13}}>{[s.pickup,s.dropoff].filter(Boolean).join(" → ")}</div>
              {(s.passeggeri>1||s.bagagli)&&<div style={{color:"#8892a4",fontSize:11}}>👥 {s.passeggeri||1} pax {s.bagagli?"· 🧳 "+s.bagagli+" bag":""}</div>}
              {s.telefonoUtente&&<div style={{color:"#8892a4",fontSize:11}}>Pass. WA: {s.telefonoUtente}</div>}
              {s.dataPagamento&&<div style={{color:"#4b5563",fontSize:11}}>Pagato {fmtD(s.dataPagamento)} · {s.metodoPagamento}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
              <div style={{textAlign:"right"}}>
                <span style={{color:"#4ade80",fontWeight:700,fontSize:16,fontFamily:"Georgia,serif"}}>{fmt(prezzoLordo(s))}</span>
                <div style={{fontSize:10,color:"#8892a4"}}>imp. {fmt(s.ivaSeparata?parseFloat(s.prezzo)||0:(parseFloat(s.prezzo)||0)/1.1)} + IVA {fmt(ivaS(s))}</div>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <button onClick={()=>{const sf=s.statoFattura||"mancante";if(sf==="mancante"){upd(s.id,{statoFattura:"preparata"});}else if(sf==="preparata"){setFattServId(s.id);}else{setConfMancanteId(s.id);}}} style={{background:s.statoFattura==="emessa"?"#16a34a22":s.statoFattura==="preparata"?"#d9770622":"#2d3550",border:"1px solid "+(s.statoFattura==="emessa"?"#16a34a":s.statoFattura==="preparata"?"#d97706":"#3d4a60"),borderRadius:4,padding:"6px 12px",color:s.statoFattura==="emessa"?"#4ade80":s.statoFattura==="preparata"?"#fbbf24":"#8892a4",cursor:"pointer",fontSize:13}}>
                  {s.statoFattura==="emessa"?"✅ "+fmtD(s.dataFattura):s.statoFattura==="preparata"?"🟡 Preparata":"🔴 Fattura"}
                </button>
                {!s.dataPagamento
                  ?<button onClick={()=>setPagId(s.id)} style={{background:"#2d3550",border:"1px solid #3d4a60",borderRadius:4,padding:"6px 12px",color:"#8892a4",cursor:"pointer",fontSize:13}}>💳 Paga</button>
                  :<button onClick={()=>upd(s.id,{dataPagamento:null,metodoPagamento:null})} style={{background:"#16a34a22",border:"1px solid #16a34a",borderRadius:4,padding:"6px 12px",color:"#4ade80",cursor:"pointer",fontSize:13}}>✓ {s.metodoPagamento} ✕</button>
                }
                {!s.noShow?<button onClick={()=>setNoShowId(s.id)} style={{background:"#0e3a4a",border:"1px solid #00d4ff88",borderRadius:4,padding:"6px 12px",color:"#00d4ff",cursor:"pointer",fontSize:13,fontWeight:700}}>🔵 NO SHOW</button>:<button onClick={()=>upd(s.id,{noShow:false})} style={{background:"#00d4ff22",border:"1px solid #00d4ff",borderRadius:4,padding:"6px 12px",color:"#00d4ff",cursor:"pointer",fontSize:13,fontWeight:700}}>🔵 NO SHOW ✕</button>}
                <button onClick={()=>setInline(s.id)} style={{...S.bGr,padding:"6px 12px"}}><Ic n="edt" z={14}/></button>
                <button onClick={()=>drv?.telefono?apriWA(drv.telefono,msgDriver(s,drv)):alert("Aggiungi WhatsApp al driver")} style={{background:"#1a3d20",border:"1px solid #25d36688",borderRadius:4,padding:"6px 12px",color:"#25d366",cursor:"pointer",fontSize:13,fontWeight:700,opacity:drv?.telefono?1:0.4}}>WA Driver</button>
                {s.telefonoUtente&&<button onClick={()=>{const msg=msgUtente(s,drv);setWaPreview({tel:s.telefonoUtente,msg});}} style={{background:"#1a3520",border:"1px solid #25d36644",borderRadius:4,padding:"6px 12px",color:"#86efac",cursor:"pointer",fontSize:13,fontWeight:700}}>WA Pass.</button>}
                <button onClick={()=>apriGCal(s,drv,cli)} style={{background:"#1a1a3a",border:"1px solid #4285f4",borderRadius:4,padding:"6px 12px",color:"#4285f4",cursor:"pointer",fontSize:13,fontWeight:700}}>GCal</button>
                {s.nomeUtente&&<button onClick={()=>setCartelloPass(s.nomeUtente)} style={{background:"#1a1a2a",border:"1px solid #a78bfa",borderRadius:4,padding:"6px 12px",color:"#a78bfa",cursor:"pointer",fontSize:13,fontWeight:700}}>🪧 Cartello</button>}
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
      </div></SwipeToDelete>;
    })}
    {filtered.length===0&&<div style={{color:"#4b5563",textAlign:"center",padding:40}}>Nessun servizio</div>}

    {delId&&<DelModal title="Eliminare questo servizio?" onClose={()=>setDelId(null)} onConfirm={()=>{deleteRecord("servizi",delId);setServizi(p=>p.filter(x=>x.id!==delId));setDelId(null);}}/>}
    {pagId&&<PagModal onClose={()=>setPagId(null)} onConfirm={(m,d)=>{upd(pagId,{dataPagamento:d||today(),metodoPagamento:m});setPagId(null);}}/>}
    {fattServId&&<Modal title="Data fattura" onClose={()=>setFattServId(null)}>
      <div style={{marginBottom:14}}>
        <div style={{color:"#8892a4",fontSize:12,marginBottom:6}}>Data emissione fattura</div>
        <input type="date" id="fattServDate" defaultValue={today()} style={{...S.inp,fontSize:16}}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <button style={S.bGr} onClick={()=>setFattServId(null)}>Annulla</button>
        <button style={S.bG} onClick={()=>{const d=document.getElementById("fattServDate").value||today();upd(fattServId,{dataFattura:d,statoFattura:"emessa"});setFattServId(null);}}>Conferma</button>
      </div>
    </Modal>}
    {confMancanteId&&<DelModal title="Vuoi tornare a Mancante?" onClose={()=>setConfMancanteId(null)} onConfirm={()=>{upd(confMancanteId,{statoFattura:"mancante",dataFattura:null});setConfMancanteId(null);}}/>}
    {noShowId&&<Modal title="Segna NO SHOW" onClose={()=>setNoShowId(null)}>
      <div style={{marginBottom:14}}>
        <div style={{color:"#8892a4",fontSize:12,marginBottom:6}}>Nuovo importo (es. penale di cancellazione)</div>
        <input type="number" step="0.01" id="noShowPrice" defaultValue={servizi.find(s=>s.id===noShowId)?.prezzo||""} style={{...S.inp,fontSize:16}}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <button style={S.bGr} onClick={()=>setNoShowId(null)}>Annulla</button>
        <button style={S.bG} onClick={()=>{const p=document.getElementById("noShowPrice").value;upd(noShowId,{noShow:true,prezzo:p});setNoShowId(null);}}>Conferma</button>
      </div>
    </Modal>}

    {cartelloPass&&<div
      style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#000",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-evenly",gap:0,padding:"20px 40px"}}
      onTouchEnd={e=>{const now=Date.now();if(now-lastTap.current<350){setCartelloPass(null);setIntestazioneVisible(true);}lastTap.current=now;}}
    >
      <div onClick={()=>setIntestazioneVisible(p=>!p)} style={{display:intestazioneVisible?"flex":"none",flexDirection:"column",alignItems:"center",gap:16,cursor:"pointer",marginTop:"3vw"}}>
        <div style={{color:"#c8a96e",fontFamily:"Georgia,serif",fontSize:"4.5vw",letterSpacing:3,textTransform:"uppercase",textAlign:"center",whiteSpace:"nowrap"}}>Black Diamond Transfert</div>
        <div style={{color:"#c8a96e",fontSize:"5vw",marginTop:"4.5vw",marginBottom:"3vw"}}>◆</div>
      </div>
      <div style={{width:80,height:1,background:"#c8a96e",opacity:0.6}}></div>
      <div style={{color:"#fff",fontFamily:"Georgia,serif",fontWeight:700,textAlign:"center",lineHeight:1.4,letterSpacing:3,textShadow:"3px 3px 0px #444,6px 6px 0px #222,8px 8px 12px rgba(0,0,0,0.8)",maxWidth:"90vw",padding:"0 30px",width:"100%"}}>
        {(()=>{
          const words=cartelloPass.toUpperCase().split(" ");
          const prefixes=["SIG.","SIG.RA","SIG.NA","DR.","DOTT.","PROF.","AVV."];
          const isPrefix=w=>prefixes.some(p=>w===p||w===p.replace(".",""));
          const prefix=words.length>1&&isPrefix(words[0])?words[0]:null;
          const nameWords=prefix?words.slice(1):words;
          const longest=nameWords.reduce((a,b)=>b.length>a.length?b:a,"").length;
          const fs=longest<=4?"min(30vw,30vh,420px)":longest<=6?"min(24vw,24vh,340px)":longest<=8?"min(19vw,19vh,270px)":longest<=10?"min(15vw,15vh,210px)":longest<=12?"min(12vw,12vh,170px)":"min(9vw,9vh,130px)";
          return <div>
            {prefix&&<div style={{fontSize:"min(8vw,8vh,100px)",marginBottom:"1vh",opacity:0.85}}>{prefix}</div>}
            <div style={{fontSize:fs}}>{nameWords.join("\n")}</div>
          </div>;
        })()}
      </div>
      <div style={{width:80,height:1,background:"#c8a96e",opacity:0.6}}></div>
    </div>}
    {waPreview&&<Modal title="Messaggio WhatsApp" onClose={()=>setWaPreview(null)}>
      <div style={{background:"#0f1320",border:"1px solid #2d3550",borderRadius:8,padding:14,whiteSpace:"pre-wrap",fontSize:14,color:"#c8d3e0",marginBottom:14}}>{waPreview.msg}</div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <button style={S.bGr} onClick={()=>setWaPreview(null)}>Chiudi</button>
        <button style={S.bG} onClick={()=>{apriWA(waPreview.tel,waPreview.msg);setWaPreview(null);}}>Apri WhatsApp</button>
      </div>
    </Modal>}

    {modal==="edit"&&<Modal title={servizi.find(s=>s.id===form.id)?`Modifica ${form.id}`:`Nuovo — ${form.id}`} onClose={()=>setModal(null)}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <F label="Data" w="50%"><input style={S.inp} type="date" value={form.data||""} onChange={set("data")}/></F>
        <F label="Ora" w="50%"><input style={S.inp} type="time" value={form.ora||""} onChange={set("ora")}/></F>
      </div>
      <F label="Durata (ore)"><input style={S.inp} type="number" step="0.5" min="0.5" max="24" defaultValue={form.durataManuale||1.5} key={"dur-"+form.id} onBlur={e=>setForm(p=>({...p,durataManuale:parseFloat(e.target.value)||1.5}))}/></F>
      <div style={{display:"flex",gap:10}}>
        <F label="Committente" w="50%"><select style={S.inp} value={form.committenteId||""} onChange={e=>{const cli=clienti.find(c=>c.id===e.target.value);setForm(p=>({...p,committenteId:e.target.value,telefonoUtente:cli?.telefono||p.telefonoUtente||""}));}}><option value="">—</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></F>
        <F label="Driver" w="50%"><select style={S.inp} value={form.driverId||""} onChange={set("driverId")}><option value="">—</option>{driver.map(d=><option key={d.id} value={d.id}>{d.nome}{d.targa?" ("+d.targa+")":""}</option>)}</select></F>
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="Tipo" w="50%"><select style={S.inp} value={form.tipo||"trasferimento"} onChange={set("tipo")}><option value="trasferimento">Trasferimento</option><option value="disposizione">Disposizione Oraria</option><option value="combinato">Combinato (Disp. + Trasf.)</option><option value="ar">Andata e Ritorno</option></select></F>
        {(form.tipo==="disposizione"||form.tipo==="combinato")&&<F label="Ore disp." w="50%"><select style={S.inp} value={form.oreDisp||2} onChange={e=>setForm(p=>({...p,oreDisp:parseInt(e.target.value)}))}>{[1,2,3,4,5,6,7,8,9,10,11,12].map(h=><option key={h} value={h}>{h}h</option>)}</select></F>}
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="Nome Passeggero" w="50%"><input style={S.inp} type="search" value={form.nomeUtente||""} onChange={set("nomeUtente")} autoComplete="off" autoCorrect="off" spellCheck="false" name="campo1"/></F>
        <F label="N. Volo / Treno" w="50%"><input style={S.inp} value={form.numeroVolo||""} onChange={set("numeroVolo")} placeholder="AZ1234"/></F>
      </div>
      <F label="Tel. WhatsApp Passeggero (+39...)"><input style={S.inp} value={form.telefonoUtente||""} onChange={set("telefonoUtente")} placeholder="+393331234567"/></F>
      <div style={{display:"flex",gap:10}}>
        <F label="N° Passeggeri" w="50%"><input style={S.inp} type="number" min="1" defaultValue={form.passeggeri||1} key={"pax-"+form.id} onBlur={e=>setForm(p=>({...p,passeggeri:parseInt(e.target.value)||1}))}/></F>
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
        <F label="Data fattura" w="50%"><div style={{display:"flex",gap:6}}><input style={S.inp} type="date" value={form.dataFattura||""} onChange={set("dataFattura")}/>{form.dataFattura&&<button onClick={()=>setForm(p=>({...p,dataFattura:""}))} style={{background:"#3d1515",border:"none",color:"#f87171",borderRadius:4,padding:"0 10px",cursor:"pointer",fontSize:14}}>✕</button>}</div></F>
        <F label="Data pagamento" w="50%"><div style={{display:"flex",gap:6}}><input style={S.inp} type="date" value={form.dataPagamento||""} onChange={set("dataPagamento")}/>{form.dataPagamento&&<button onClick={()=>setForm(p=>({...p,dataPagamento:""}))} style={{background:"#3d1515",border:"none",color:"#f87171",borderRadius:4,padding:"0 10px",cursor:"pointer",fontSize:14}}>✕</button>}</div></F>
      </div>
      <div style={{display:"flex",gap:10}}>
        <F label="Commissione (€)" w="50%"><input style={S.inp} type="number" step="0.01" value={form.commissione||""} onChange={e=>setForm(p=>({...p,commissione:e.target.value||null}))}/></F>
        <F label="Metodo commissione" w="50%"><select style={S.inp} value={form.metodoCommissione||""} onChange={set("metodoCommissione")}><option value="">—</option><option value="paypal">PayPal</option><option value="contanti">Contanti</option></select></F>
      </div>
      <F label="Note"><textarea style={{...S.inp,minHeight:48,resize:"vertical"}} value={form.note||""} onChange={set("note")}/></F>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
        <button style={S.bGr} onClick={()=>setModal(null)}>Annulla</button>
        <button style={S.bG} onClick={submit}>Salva</button>
      </div>
    </Modal>}
  </div>;
}

export default Servizi;
