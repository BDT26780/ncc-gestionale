import React,{useState,useMemo} from "react";
import {S,DCOL,dcol,Modal,today} from "./shared.jsx";

// ── CALENDARIO ────────────────────────────────────────────────────────────────
function Calendario({servizi,setServizi,driver}){
  const [date,setDate]=useState(new Date());
  const [view,setView]=useState("week");
  const [editEv,setEditEv]=useState(null);
  const PH=60;
  const wkStart=useMemo(()=>{const d=new Date(date);const day=d.getDay();d.setDate(d.getDate()+(day===0?-6:1-day));d.setHours(0,0,0,0);return d;},[date]);
  const days=useMemo(()=>view==="day"?[date]:Array.from({length:7},(_,i)=>{const d=new Date(wkStart);d.setDate(d.getDate()+i);return d;}),[view,date,wkStart]);
  const ds=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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

export default Calendario;
