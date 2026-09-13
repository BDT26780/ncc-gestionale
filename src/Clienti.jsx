import{useState}from"react";
import{S,Ic,uid,DelModal,Modal,F,deleteRecord}from"./shared.jsx";

// ── COMMITTENTI ───────────────────────────────────────────────────────────────
function Clienti({clienti,setClienti,servizi}){
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [delId,setDelId]=useState(null);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const mediaGiorni=cId=>{
    const ss=(servizi||[]).filter(s=>s.committenteId===cId&&s.dataFattura&&s.dataPagamento);
    if(!ss.length)return null;
    const giorni=ss.map(s=>(new Date(s.dataPagamento)-new Date(s.dataFattura))/86400000).sort((a,b)=>a-b);
    const n=giorni.length;
    const mediana=n%2===1?giorni[(n-1)/2]:(giorni[n/2-1]+giorni[n/2])/2;
    return{valore:Math.round(mediana),n};
  };
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
          <div style={{color:"#e2e8f0",fontWeight:600,fontSize:16}}>{c.nome}</div>
          <div style={{color:"#8892a4",fontSize:13}}>{[c.piva&&"P.IVA "+c.piva,c.cf&&"CF "+c.cf,c.email].filter(Boolean).join(" · ")}</div>
          <div style={{color:"#8892a4",fontSize:13}}>{c.telefono}{c.referente&&" · "+c.referente}</div>
          {mediaGiorni(c.id)!==null&&(()=>{const m=mediaGiorni(c.id);return<div style={{color:"#60a5fa",fontSize:13,fontWeight:600,marginTop:3}}>⏱ Media pagamento: {m.valore} giorni{m.n<3&&<span style={{color:"#8892a4",fontWeight:400}}> (dato provvisorio, {m.n} servizi)</span>}</div>;})()}
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
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
        <button style={S.bGr} onClick={()=>setModal(null)}>Annulla</button>
        <button style={S.bG} onClick={salva}>Salva</button>
      </div>
    </Modal>}
  </div>;
}


export default Clienti;
