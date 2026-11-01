import React,{useState,useEffect,useMemo} from "react";
import {supa,fmt,fmtD,today,prezzoLordo,S,Modal} from "./shared.jsx";

const parseCSV=(t,sep)=>{const rows=[];let r=[],c="",q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++;}else q=false;}else c+=ch;}else if(ch==='"')q=true;else if(ch===sep){r.push(c);c="";}else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&t[i+1]==="\n")i++;r.push(c);c="";if(r.length>1||r[0]!=="")rows.push(r);r=[];}else c+=ch;}if(c!==""||r.length){r.push(c);rows.push(r);}return rows;};
const num=x=>{let v=String(x||"").trim();if(v.includes(",")&&v.includes("."))v=v.replace(/\./g,"").replace(",",".");else if(v.includes(","))v=v.replace(",",".");const n=parseFloat(v);return isNaN(n)?0:n;};
const isoD=d=>{const p=String(d||"").trim().split("/");return p.length===3?p[2]+"-"+p[1].padStart(2,"0")+"-"+p[0].padStart(2,"0"):"";};
const STOP=["srl","spa","sas","snc","sa","di","del","della","dei","societa","the","and"];
const norm=t=>String(t||"").toLowerCase().replace(/[^a-z0-9]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.includes(w));
const nomeOk=(a,b)=>{const x=norm(a),y=norm(b);return x.some(w=>y.includes(w));};

const parseMov=(testo)=>{
  const prima=testo.split(/\r?\n/)[0]||"";
  const sep=prima.includes(";")&&!prima.includes(",")?";":",";
  const rows=parseCSV(testo,sep);
  if(rows.length<2)return {errMsg:"File vuoto o non riconosciuto."};
  const h=rows[0].map(x=>String(x).trim().toLowerCase());
  const iOp=h.indexOf("data operazione"),iCo=h.indexOf("data contabile"),iTip=h.indexOf("tipologia"),iNome=h.indexOf("nome"),iDesc=h.indexOf("descrizione"),iImp=h.findIndex(x=>x.startsWith("importo"));
  if(iOp<0||iTip<0||iNome<0||iDesc<0||iImp<0)return {errMsg:"Colonne non riconosciute: serve il file Lista movimenti di Hype Business."};
  const bon=[];let ign=0;const cont={};
  rows.slice(1).forEach(r=>{
    const imp=num(r[iImp]);const tip=String(r[iTip]||"");const nome=String(r[iNome]||"").trim();const desc=String(r[iDesc]||"").trim();
    const ok=imp>0&&/^bonifico/i.test(tip)&&!/black diamond|uber|bolt/i.test(nome)&&!desc.startsWith("/BENEF/");
    if(ok){
      const data=isoD(r[iCo])||isoD(r[iOp])||today();
      const base=data+"|"+imp.toFixed(2)+"|"+nome+"|"+desc;
      cont[base]=(cont[base]||0)+1;
      bon.push({data,nome,descrizione:desc,importo:imp,chiave:base+"#"+cont[base]});
    }else ign++;
  });
  return {bon,ign};
};

export default function Banca({servizi,clienti,setServizi}){
  const [open,setOpen]=useState(false);
  const [dbRows,setDbRows]=useState([]);
  const [over,setOver]=useState({});
  const [giaCtrl,setGiaCtrl]=useState(false);
  const [showReg,setShowReg]=useState(false);
  const [err,setErr]=useState("");
  const [esito,setEsito]=useState("");
  const [busy,setBusy]=useState(false);

  const carica=async()=>{
    const res=await supa.from("movimenti_banca").select("*").eq("stato","nuovo").order("data",{ascending:false});
    if(res.error){setErr("Impossibile leggere i movimenti salvati.");return;}
    setDbRows((res.data||[]).map(r=>({...r,importo:Number(r.importo)})));
  };
  useEffect(()=>{carica();},[]);

  const calc=useMemo(()=>{
    const cliNome=id=>((clienti||[]).find(c=>c.id===id)||{}).nome||"—";
    const somma=g=>g.reduce((a,s)=>a+prezzoLordo(s),0);
    const d10=x=>String(x||"").slice(0,10);
    const aperti=servizi.filter(s=>!s.dataPagamento&&s.data&&s.data<=today());
    const cand=aperti.map(s=>({ids:[s.id],multi:false,tot:prezzoLordo(s),cli:cliNome(s.committenteId),label:fmtD(s.data)+" "+(s.nomeUtente||"—")+" · "+(s.pickup||"—")+" → "+(s.dropoff||"—")}));
    const gr={};
    aperti.filter(s=>s.inFattura).forEach(s=>{const k=s.gruppoFattura||("legacy-"+(s.committenteId||"none"));(gr[k]=gr[k]||[]).push(s);});
    Object.keys(gr).forEach(k=>{const g=gr[k];if(g.length>1)cand.push({ids:g.map(s=>s.id),multi:true,tot:somma(g),cli:cliNome(g[0].committenteId),label:"Fattura in corso: "+g.length+" servizi"});});
    const pagati=servizi.filter(s=>s.dataPagamento&&s.metodoPagamento==="bonifico");
    const candP=pagati.map(s=>({ids:[s.id],multi:false,tot:prezzoLordo(s),cli:cliNome(s.committenteId),dp:d10(s.dataPagamento)}));
    const gp={},gd={};
    pagati.forEach(s=>{
      if(s.gruppoFattura)(gp[s.gruppoFattura]=gp[s.gruppoFattura]||[]).push(s);
      const k=(s.committenteId||"none")+"|"+d10(s.dataPagamento);
      (gd[k]=gd[k]||[]).push(s);
    });
    [gp,gd].forEach(m=>Object.keys(m).forEach(k=>{const g=m[k];if(g.length>1)candP.push({ids:g.map(s=>s.id),multi:true,tot:somma(g),cli:cliNome(g[0].committenteId),dp:g.map(s=>d10(s.dataPagamento)).sort().pop()});}));
    const giorni=(a,b)=>Math.abs((new Date(a+"T00:00:00")-new Date(b+"T00:00:00"))/864e5);
    const usati=new Set(),usatiP=new Set();
    return dbRows.map(b=>{
      const cents=Math.round(b.importo*100);
      const opts=cand.filter(c=>Math.round(c.tot*100)===cents).map(c=>{const sim=nomeOk(b.nome,c.cli);return {...c,sim,sicuro:c.multi||sim};});
      const buoni=opts.filter(o=>o.sicuro&&o.ids.every(id=>!usati.has(id)));
      let auto=null;
      if(buoni.length===1){auto=opts.indexOf(buoni[0]);buoni[0].ids.forEach(id=>usati.add(id));}
      let reg=null;
      if(!opts.some(o=>o.sicuro)){
        const rp=candP.find(c=>Math.round(c.tot*100)===cents&&(c.multi||nomeOk(b.nome,c.cli))&&giorni(c.dp,b.data)<=45&&c.ids.every(id=>!usatiP.has(id)));
        if(rp){reg=rp;rp.ids.forEach(id=>usatiP.add(id));}
      }
      return {...b,opts,auto,reg};
    });
  },[dbRows,servizi,clienti]);

  const visibili=calc.filter(r=>!r.reg);
  const registrati=calc.filter(r=>r.reg);
  const sc=r=>Object.prototype.hasOwnProperty.call(over,r.id)?over[r.id]:r.auto;
  const setScelta=(id,v)=>setOver(p=>({...p,[id]:v===""?null:Number(v)}));
  const nSel=visibili.filter(r=>sc(r)!==null).length;
  const nSicure=visibili.filter(r=>r.auto!==null).length;

  const leggi=async e=>{
    const f=e.target.files&&e.target.files[0];
    e.target.value="";
    if(!f)return;
    setErr("");setEsito("");setBusy(true);
    try{
      const t=(await f.text()).replace(/^\uFEFF/,"");
      const p=parseMov(t);
      if(p.errMsg){setErr(p.errMsg);setBusy(false);return;}
      const ex=await supa.from("movimenti_banca").select("chiave");
      if(ex.error)throw new Error("lettura");
      const gia=new Set((ex.data||[]).map(x=>x.chiave));
      const nuovi=p.bon.filter(b=>!gia.has(b.chiave)).map(b=>({...b,stato:giaCtrl?"ignorato":"nuovo"}));
      if(nuovi.length){const ins=await supa.from("movimenti_banca").insert(nuovi);if(ins.error)throw new Error("scrittura");}
      setEsito("Letti "+p.bon.length+" bonifici: "+nuovi.length+" nuovi salvati"+(giaCtrl?" come gia' gestiti":"")+", "+(p.bon.length-nuovi.length)+" gia' presenti. Ignorati "+p.ign+" movimenti (POS, Uber, Bolt, cashback, uscite).");
      setOver({});
      await carica();
    }catch(x){setErr("Operazione non riuscita ("+(x.message||"errore")+"). Nei servizi non e' stato modificato nulla.");}
    setBusy(false);
  };

  const ignora=async id=>{
    const m=await supa.from("movimenti_banca").update({stato:"ignorato"}).eq("id",id);
    if(m.error){setErr("Impossibile ignorare il bonifico.");return;}
    setDbRows(p=>p.filter(r=>r.id!==id));
  };

  const applica=async()=>{
    const sel=visibili.filter(r=>sc(r)!==null);
    const visti=new Set();
    for(const r of sel){for(const id of r.opts[sc(r)].ids){if(visti.has(id)){setErr("Lo stesso servizio e' scelto per due bonifici: correggi la scelta.");return;}visti.add(id);}}
    setBusy(true);setErr("");
    let ok=0,ko=0;
    for(const r of sel){
      const ids=r.opts[sc(r)].ids;
      const res=await Promise.all(ids.map(id=>supa.from("servizi").update({data_pagamento:r.data,metodo_pagamento:"bonifico"}).eq("id",id)));
      if(res.some(x=>x&&x.error)){ko++;continue;}
      setServizi(p=>p.map(s=>ids.includes(s.id)?{...s,dataPagamento:r.data,metodoPagamento:"bonifico"}:s));
      const m=await supa.from("movimenti_banca").update({stato:"abbinato",servizi_ids:ids}).eq("id",r.id);
      if(m.error)ko++;else ok++;
    }
    setBusy(false);setOver({});
    setEsito("Bonifici registrati: "+ok+(ko?(". Da controllare: "+ko+"."):"."));
    await carica();
  };

  const chiudi=()=>{setOpen(false);setErr("");setEsito("");};

  return <div style={{marginBottom:10}}>
    <button onClick={()=>{setOpen(true);setErr("");setEsito("");carica();}} style={{background:"#1e3a6e",border:"1px solid #3b82f6",color:"#60a5fa",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>🏦 Movimenti banca{visibili.length>0?" ("+visibili.length+")":""}</button>
    {open&&<Modal title="Movimenti banca" onClose={chiudi}>
      <div style={{color:"#8892a4",fontSize:13,marginBottom:8}}>Carica il CSV di Hype Business: i bonifici restano salvati e vengono confrontati con i servizi. Nulla viene segnato come pagato finche' non confermi.</div>
      <label style={{display:"flex",alignItems:"center",gap:8,color:"#c8d3e0",fontSize:13,marginBottom:8}}><input type="checkbox" checked={giaCtrl} onChange={e=>setGiaCtrl(e.target.checked)}/> Gia' controllati a mano (salvali come gia' gestiti)</label>
      <input type="file" accept=".csv,text/csv" disabled={busy} onChange={leggi}/>
      {err&&<div style={{color:"#f87171",fontSize:13,marginTop:10}}>{err}</div>}
      {esito&&<div style={{color:"#4ade80",fontSize:13,marginTop:10}}>{esito}</div>}
      <div style={{color:"#e8d5a3",fontSize:13,fontWeight:700,margin:"14px 0 8px"}}>Da abbinare: {visibili.length} · abbinamenti sicuri: {nSicure}</div>
      {registrati.length>0&&<div style={{marginBottom:10}}>
        <button onClick={()=>setShowReg(v=>!v)} style={{background:"none",border:"1px solid #2d3550",color:"#8892a4",borderRadius:4,padding:"3px 10px",cursor:"pointer",fontSize:12}}>{showReg?"Nascondi":"Mostra"} gia' registrati ({registrati.length})</button>
        {showReg&&registrati.map(r=><div key={r.id} style={{fontSize:12,color:"#8892a4",padding:"5px 0",borderBottom:"1px solid #2d3550"}}>{fmtD(r.data)} — {r.nome} · {fmt(r.importo)} → {r.reg.ids.length} {r.reg.ids.length===1?"servizio":"servizi"} gia' pagati ({r.reg.cli}, pagati il {fmtD(r.reg.dp)})</div>)}
      </div>}
      {visibili.length===0&&<div style={{color:"#8892a4",fontSize:12}}>Nessun bonifico da abbinare.</div>}
      {visibili.length>0&&<div style={{color:"#8892a4",fontSize:12,marginBottom:8}}>✓ = nome simile al committente, = fattura con lo stesso totale, ? = solo importo uguale. Le righe verdi sono gia' abbinate: controllale prima di confermare.</div>}
      {visibili.map(r=>{
        const s=sc(r);const sel=s!==null;
        return <div key={r.id} style={{border:"1px solid "+(sel?"#4ade8066":"#2d3550"),background:sel?"#0d2a1a":"#0f1320",borderRadius:8,padding:"8px 10px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
            <div style={{minWidth:0}}>
              <div style={{color:"#c8d3e0",fontSize:13}}>{fmtD(r.data)} — {r.nome}</div>
              <div style={{color:"#8892a4",fontSize:11}}>{r.descrizione}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <div style={{color:"#4ade80",fontWeight:700,whiteSpace:"nowrap"}}>{fmt(r.importo)}</div>
              <button disabled={busy} onClick={()=>ignora(r.id)} style={{background:"none",border:"1px solid #2d3550",color:"#8892a4",borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:11}}>Ignora</button>
            </div>
          </div>
          {r.opts.length===0
            ?<div style={{color:"#fbbf24",fontSize:12,marginTop:6}}>Nessun servizio non pagato con questo importo, e non risulta gia' registrato: da controllare.</div>
            :<select style={{...S.inp,marginTop:6}} value={s===null?"":String(s)} onChange={e=>setScelta(r.id,e.target.value)}>
              <option value="">— non abbinare —</option>
              {r.opts.map((o,k)=><option key={k} value={String(k)}>{(o.sim?"✓ ":o.multi?"= ":"? ")+o.cli+" · "+o.label}</option>)}
            </select>}
        </div>;
      })}
      {visibili.length>0&&<button disabled={nSel===0||busy} onClick={applica} style={{background:nSel===0||busy?"#2d3550":"#16a34a",border:"none",color:"white",borderRadius:6,padding:"8px 14px",cursor:nSel===0||busy?"default":"pointer",fontSize:13,fontWeight:700,marginTop:4}}>{busy?"Salvataggio...":"Segna come pagati ("+nSel+")"}</button>}
    </Modal>}
  </div>;
}
