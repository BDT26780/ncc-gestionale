import React,{useState} from "react";
import {S,Ic,Modal,DelModal,F,fmt,fmtD,uid,today,ALIQ_MAP,deleteRecord} from "./shared.jsx";

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
    {k:"riparazione_assicurativa",l:"Riparazione Assicurativa (scoperto)"},
    {k:"vestiario",l:"Vestiario"},
  ];
  const ALIQ=[{k:"0",l:"Esente 0%"},{k:"4",l:"4%"},{k:"5",l:"5%"},{k:"10",l:"10%"},{k:"22",l:"22%"}];
  const salva=()=>{
    if(!form.tipo)return alert("Seleziona categoria");
    if(!form.importo)return alert("Inserire importo");
    const imp=parseFloat(form.importo)||0;
    const A2=ALIQ_MAP;
    const descBase=(form.descrizione||"").replace(/\s*\[IVA:[\d.]+\]/,"").trim();
    const descrizioneFinal=(form.tipo==="riparazione_assicurativa"&&form.ivaManuale&&parseFloat(form.ivaManuale)>0)?(descBase?descBase+" ":"")+"[IVA:"+parseFloat(form.ivaManuale).toFixed(2)+"]":descBase;
    const formFinal=(form.tipo==="inps_anno_prec"||form.tipo==="detrazioni_19"||form.tipo==="perdita_anno_prec"||form.tipo==="riparazione_assicurativa")?{...form,aliqIva:"0",descrizione:descrizioneFinal}:{...form,descrizione:descrizioneFinal};
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
            const mTag=s.descrizione?.match(/\[IVA:([\d.]+)\]/);
            const aliq=ALIQ_MAP[s.aliqIva]||0;
            const ivaC=mTag?parseFloat(mTag[1]):(aliq>0?(parseFloat(s.importo)||0)*(aliq/(1+aliq)):0);
            return <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 13px",borderBottom:"1px solid #1e2435"}}>
              <div>
                <div style={{color:"#c8d3e0",fontSize:12}}>{(s.descrizione||cat.l).replace(/\s*\[IVA:[\d.]+\]/,"")}{s.isQuota&&<span style={{color:"#8892a4",fontSize:11}}> (quota {s.quotaNum}/{s.quotaTot})</span>}</div>
                <div style={{color:"#8892a4",fontSize:11}}>{fmtD(s.data)}{drv&&" · "+drv.nome}{s.aliqIva&&s.aliqIva!=="0"&&" · IVA "+s.aliqIva+"%"}{s.note&&" · "+s.note}</div>
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
      <F label="Categoria"><select style={{...S.inp,fontSize:16}} value={form.tipo||""} onChange={set("tipo")}><option value="">— Seleziona —</option>{CATS.map(c=><option key={c.k} value={c.k}>{c.l}</option>)}</select></F>
      {form.tipo==="inps_anno_prec"&&<div style={{background:"#1a2a3a",border:"1px solid #3b82f6",borderRadius:7,padding:"10px 12px",marginBottom:10}}><div style={{color:"#60a5fa",fontSize:12,fontWeight:700,marginBottom:3}}>INPS anno precedente</div><div style={{color:"#c8d3e0",fontSize:11}}>Dedotta dal reddito imponibile IRPEF come costo. Aliquota IVA: 0%.</div></div>}
      {form.tipo==="perdita_anno_prec"&&<div style={{background:"#1a2a3a",border:"1px solid #3b82f6",borderRadius:7,padding:"10px 12px",marginBottom:10}}><div style={{color:"#60a5fa",fontSize:12,fontWeight:700,marginBottom:3}}>Perdita anno precedente</div><div style={{color:"#c8d3e0",fontSize:11}}>Dedotta dal reddito imponibile IRPEF, inserimento manuale.</div></div>}
      {form.tipo==="detrazioni_19"&&<div style={{background:"#1a2a3a",border:"1px solid #a78bfa",borderRadius:7,padding:"10px 12px",marginBottom:10}}><div style={{color:"#a78bfa",fontSize:12,fontWeight:700,marginBottom:3}}>Detrazioni 19%</div><div style={{color:"#c8d3e0",fontSize:11}}>Il 19% dell&apos;importo verrà sottratto dall&apos;IRPEF lorda in Dashboard.</div></div>}
      {form.tipo==="riparazione_assicurativa"&&<div style={{background:"#1a2a3a",border:"1px solid #3b82f6",borderRadius:7,padding:"10px 12px",marginBottom:10}}><div style={{color:"#60a5fa",fontSize:12,fontWeight:700,marginBottom:3}}>Riparazione Assicurativa (scoperto)</div><div style={{color:"#c8d3e0",fontSize:11}}>L&apos;importo qui sotto è solo lo scoperto a tuo carico: non genera IVA automatica. Se vuoi registrare l&apos;IVA a credito della fattura del carrozziere, inseriscila più sotto a mano.</div></div>}
      {form.tipo==="acquisto_auto"&&<>
        <div style={{marginBottom:8}}><label style={{color:"#8892a4",fontSize:12,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><input type="checkbox" checked={!!form.quotaManuale} onChange={e=>setForm(p=>({...p,quotaManuale:e.target.checked}))}/>Quota manuale</label></div>
        {!form.quotaManuale&&<>
          <F label="% ammortamento annuo (max 25%)"><select style={{...S.inp,fontSize:16}} value={form.pctAmmort||25} onChange={e=>setForm(p=>({...p,pctAmmort:parseFloat(e.target.value)}))}>
            {[5,10,12.5,15,20,25].map(p=><option key={p} value={p}>{p}% annuo</option>)}
          </select></F>
          {imp>0&&<div style={{fontSize:11,color:"#60a5fa",marginBottom:8}}>Quota piena: {fmt(imp*(form.pctAmmort||25)/100)} · 1° e ultimo anno: {fmt(imp*(form.pctAmmort||25)/200)} · IVA a credito solo anno acquisto</div>}
        </>}
      </>}
      {form.tipo==="beni_durevoli"&&<>
        <div style={{marginBottom:8}}><label style={{color:"#8892a4",fontSize:12,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><input type="checkbox" checked={!!form.quotaManuale} onChange={e=>setForm(p=>({...p,quotaManuale:e.target.checked}))}/>Quota manuale</label></div>
        {!form.quotaManuale&&imp>500&&<>
          <F label={"Anni (min "+Math.ceil(imp/500)+" per max 500/anno)"}><select style={{...S.inp,fontSize:16}} value={form.anniAmmort||Math.ceil(imp/500)} onChange={e=>setForm(p=>({...p,anniAmmort:parseInt(e.target.value)}))}>
            {[2,3,4,5,6,7,8,10].filter(a=>a>=Math.ceil(imp/500)).map(a=><option key={a} value={a}>{a} anni</option>)}
          </select></F>
          {imp>0&&<div style={{fontSize:11,color:"#60a5fa",marginBottom:8}}>Quota annua: {fmt(imp/(form.anniAmmort||Math.ceil(imp/500)))} · IVA credito solo anno acquisto</div>}
        </>}
      </>}
      {form.tipo==="pagamento_driver"&&<F label="Driver"><select style={{...S.inp,fontSize:16}} value={form.driverId||""} onChange={set("driverId")}><option value="">—</option>{driver.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select></F>}
      <F label="Descrizione"><input style={S.inp} value={form.descrizione||""} onChange={set("descrizione")} placeholder={form.tipo==="altro"?"Obbligatorio":"Facoltativo"}/></F>
      <div style={{display:"flex",gap:10}}>
        <F label="Data" w="50%"><input style={S.inp} type="date" value={form.data||""} onChange={set("data")}/></F>
        <F label="Importo EUR" w="50%"><input style={S.inp} type="number" step="0.01" value={form.importo||""} onChange={e=>setForm(p=>({...p,importo:e.target.value}))}/></F>
      </div>
      {form.tipo==="riparazione_assicurativa"&&<F label="IVA a credito manuale (facoltativa)"><input style={S.inp} type="number" step="0.01" value={form.ivaManuale||""} onChange={set("ivaManuale")}/></F>}
      {form.tipo!=="inps_anno_prec"&&form.tipo!=="detrazioni_19"&&form.tipo!=="perdita_anno_prec"&&form.tipo!=="riparazione_assicurativa"&&<>
        <F label="Aliquota IVA (credito)"><select style={{...S.inp,fontSize:16}} value={form.aliqIva||"22"} onChange={set("aliqIva")}>{ALIQ.map(a=><option key={a.k} value={a.k}>{a.l}</option>)}</select></F>
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

export default Spese;
