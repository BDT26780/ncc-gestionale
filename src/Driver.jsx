import{useState}from"react";
import{supa,S,Ic,Badge,isExp,isNear,uid,DCOL,DelModal,Modal,F,deleteRecord}from"./shared.jsx";

// ── DRIVER ────────────────────────────────────────────────────────────────────
function Driver({driver,setDriver}){
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [delId,setDelId]=useState(null);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const salva=async()=>{
    if(!form.nome)return alert("Inserire il nome");
    setDriver(p=>{const ex=p.find(d=>d.id===form.id);return ex?p.map(d=>d.id===form.id?form:d):[...p,form]});
    const p2=(form.nome||"").trim().split(" ");await supa.from("driver").upsert({id:form.id,nome:p2[0]||"",cognome:p2.slice(1).join("")||"",nome_completo:form.nome,genere:form.genere||"F",modello:form.modello||null,targa:form.targa||null,telefono:form.telefono||null,email:form.email||null,scad_bollo:form.scadBollo||null,scad_patente:form.scadPatente||null,scad_assicurazione:form.scadAss||null,scad_revisione:form.scadRev||null,note:form.note||null,ztl:form.ztl||[]});
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
        {(d.ztl||[]).filter(z=>z.comune).map((z,idx)=><ScT key={idx} label={"ZTL "+z.comune} data={z.scadenza||null}/>)}
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
        <F label="Targa" w="40%"><input style={S.inp} value={form.targa||""} onChange={e=>{const nuovaTarga=e.target.value;const vecchiaTarga=form.targa||"";setForm(p=>{const ztlAggiornate=(p.ztl||[]).map(z=>z.permanente&&nuovaTarga!==vecchiaTarga?{...z,scaduta:true}:z);return{...p,targa:nuovaTarga,ztl:ztlAggiornate};});}} placeholder="AA000BB"/></F>
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
      <div style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:11,color:"#e8d5a3",textTransform:"uppercase",letterSpacing:1}}>ZTL Autorizzazioni</div>
          <button onClick={()=>setForm(p=>({...p,ztl:[...(p.ztl||[]),{comune:"",scadenza:""}]}))} style={{...S.bG,padding:"3px 10px",fontSize:11}}>+ Aggiungi</button>
        </div>
        {(form.ztl||[]).map((z,idx)=>(
          <div key={idx} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
            <input style={{...S.inp,flex:2}} placeholder="Comune / ZTL" value={z.comune||""} onChange={e=>setForm(p=>({...p,ztl:p.ztl.map((x,j)=>j===idx?{...x,comune:e.target.value}:x)}))}/>
            <input style={{...S.inp,flex:1}} type="date" value={z.scadenza||""} onChange={e=>setForm(p=>({...p,ztl:p.ztl.map((x,j)=>j===idx?{...x,scadenza:e.target.value}:x)}))} title="Lascia vuoto se permanente"/>
            <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#8892a4",whiteSpace:"nowrap",cursor:"pointer"}}><input type="checkbox" checked={z.permanente||false} onChange={e=>setForm(p=>({...p,ztl:p.ztl.map((x,j)=>j===idx?{...x,permanente:e.target.checked,scadenza:e.target.checked?"":x.scadenza}:x)}))}/> Perm.</label>
            <button onClick={()=>setForm(p=>({...p,ztl:p.ztl.filter((_,j)=>j!==idx)}))} style={{...S.bR,padding:"3px 8px",fontSize:12}}>✕</button>
          </div>
        ))}
      </div>
      <F label="Note"><textarea style={{...S.inp,minHeight:48,resize:"vertical"}} value={form.note||""} onChange={set("note")}/></F>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
        <button style={S.bGr} onClick={()=>setModal(null)}>Annulla</button>
        <button style={S.bG} onClick={salva}>Salva</button>
      </div>
    </Modal>}
  </div>;
}


export default Driver;
