import React,{useState} from "react";
import {supa,fmt,fmtD,today,prezzoLordo,S,Modal} from "./shared.jsx";

const parseCSV=(t,sep)=>{const rows=[];let r=[],c="",q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++;}else q=false;}else c+=ch;}else if(ch==='"')q=true;else if(ch===sep){r.push(c);c="";}else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&t[i+1]==="\n")i++;r.push(c);c="";if(r.length>1||r[0]!=="")rows.push(r);r=[];}else c+=ch;}if(c!==""||r.length){r.push(c);rows.push(r);}return rows;};
const num=x=>{let v=String(x||"").trim();if(v.includes(",")&&v.includes("."))v=v.replace(/\./g,"").replace(",",".");else if(v.includes(","))v=v.replace(",",".");const n=parseFloat(v);return isNaN(n)?0:n;};
const isoD=d=>{const p=String(d||"").trim().split("/");return p.length===3?p[2]+"-"+p[1].padStart(2,"0")+"-"+p[0].padStart(2,"0"):"";};
const STOP=["srl","spa","sas","snc","sa","di","del","della","dei","societa","the","and"];
const norm=t=>String(t||"").toLowerCase().replace(/[^a-z0-9]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.includes(w));
const nomeOk=(a,b)=>{const x=norm(a),y=norm(b);return x.some(w=>y.includes(w));};

export default function Banca({servizi,clienti,setServizi}){
  const [open,setOpen]=useState(false);
  const [righe,setRighe]=useState(null);
  const [ignorati,setIgnorati]=useState(0);
  const [err,setErr]=useState("");
  const [esito,setEsito]=useState("");
  const [busy,setBusy]=useState(false);

  const analizza=(testo)=>{
    const prima=testo.split(/\r?\n/)[0]||"";
    const sep=prima.includes(";")&&!prima.includes(",")?";":",";
    const rows=parseCSV(testo,sep);
    if(rows.length<2){setErr("File vuoto o non riconosciuto.");return;}
    const h=rows[0].map(x=>String(x).trim().toLowerCase());
    const iOp=h.indexOf("data operazione"),iCo=h.indexOf("data contabile"),iTip=h.indexOf("tipologia"),iNome=h.indexOf("nome"),iDesc=h.indexOf("descrizione"),iImp=h.findIndex(x=>x.startsWith("importo"));
    if(iOp<0||iTip<0||iNome<0||iDesc<0||iImp<0){setErr("Colonne non riconosciute: serve il file Lista movimenti di Hype Business.");return;}
    const bon=[];let ign=0;
    rows.slice(1).forEach(r=>{
      const imp=num(r[iImp]);const tip=String(r[iTip]||"");const nome=String(r[iNome]||"");const desc=String(r[iDesc]||"");
      const ok=imp>0&&/^bonifico/i.test(tip)&&!/black diamond|uber|bolt/i.test(nome)&&!desc.startsWith("/BENEF/");
      if(ok)bon.push({data:isoD(r[iCo])||isoD(r[iOp])||today(),nome,descr:desc.trim(),importo:imp});else ign++;
    });
    const aperti=servizi.filter(s=>!s.dataPagamento&&s.data&&s.data<=today());
    const cliNome=id=>((clienti||[]).find(c=>c.id===id)||{}).nome||"—";
    const cand=aperti.map(s=>({ids:[s.id],tot:prezzoLordo(s),cli:cliNome(s.committenteId),label:fmtD(s.data)+" "+(s.nomeUtente||"—")+" · "+(s.pickup||"—")+" → "+(s.dropoff||"—")}));
    const gr={};
    aperti.filter(s=>s.inFattura).forEach(s=>{const k=s.gruppoFattura||("legacy-"+(s.committenteId||"none"));(gr[k]=gr[k]||[]).push(s);});
    Object.keys(gr).forEach(k=>{const g=gr[k];if(g.length>1)cand.push({ids:g.map(s=>s.id),tot:g.reduce((a,s)=>a+prezzoLordo(s),0),cli:cliNome(g[0].committenteId),label:"Fattura in corso: "+g.length+" servizi"});});
    const usati=new Set();
    const out=bon.map(b=>{
      const opts=cand.filter(c=>Math.round(c.tot*100)===Math.round(b.importo*100)).map(c=>({...c,nomeOk:nomeOk(b.nome,c.cli)}));
      const buoni=opts.filter(o=>o.nomeOk&&o.ids.every(id=>!usati.has(id)));
      let scelta=null;
      if(buoni.length===1){scelta=opts.indexOf(buoni[0]);buoni[0].ids.forEach(id=>usati.add(id));}
      return {...b,opts,scelta};
    });
    setRighe(out);setIgnorati(ign);
  };

  const carica=async e=>{
    const f=e.target.files&&e.target.files[0];
    if(!f)return;
    setErr("");setEsito("");
    try{const t=(await f.text()).replace(/^\uFEFF/,"");analizza(t);}catch(x){setErr("Impossibile leggere il file.");}
  };

  const setScelta=(i,v)=>setRighe(p=>p.map((r,k)=>k===i?{...r,scelta:v===""?null:Number(v)}:r));

  const applica=async()=>{
    const sel=righe.filter(r=>r.scelta!==null);
    const visti=new Set();
    for(const r of sel){for(const id of r.opts[r.scelta].ids){if(visti.has(id)){setErr("Lo stesso servizio e' scelto per due bonifici: correggi la scelta.");return;}visti.add(id);}}
    setBusy(true);setErr("");
    let ok=0,ko=0;
    for(const r of sel){
      const ids=r.opts[r.scelta].ids;
      const res=await Promise.all(ids.map(id=>supa.from("servizi").update({data_pagamento:r.data,metodo_pagamento:"bonifico"}).eq("id",id)));
      if(res.some(x=>x&&x.error)){ko++;}
      else{ok++;setServizi(p=>p.map(s=>ids.includes(s.id)?{...s,dataPagamento:r.data,metodoPagamento:"bonifico"}:s));}
    }
    setBusy(false);setRighe(null);
    setEsito("Bonifici registrati: "+ok+(ko?(". Non riusciti: "+ko+" (nessuna modifica per quelli)."):"."));
  };

  const nSel=righe?righe.filter(r=>r.scelta!==null).length:0;
  const chiudi=()=>{setOpen(false);setRighe(null);setErr("");setEsito("");};

  return <div style={{marginBottom:10}}>
    <button onClick={()=>{setOpen(true);setRighe(null);setErr("");setEsito("");}} style={{background:"#1e3a6e",border:"1px solid #3b82f6",color:"#60a5fa",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>🏦 Importa movimenti banca</button>
    {open&&<Modal title="Importa movimenti banca" onClose={chiudi}>
      {!righe&&<div>
        <div style={{color:"#8892a4",fontSize:13,marginBottom:10}}>Scegli il file CSV scaricato da Hype Business. Il file viene letto solo qui, non viene salvato. Nulla viene segnato come pagato finche' non confermi.</div>
        <input type="file" accept=".csv,text/csv" onChange={carica}/>
      </div>}
      {err&&<div style={{color:"#f87171",fontSize:13,marginTop:10}}>{err}</div>}
      {esito&&<div style={{color:"#4ade80",fontSize:13,marginTop:10}}>{esito}</div>}
      {righe&&<div>
        <div style={{color:"#8892a4",fontSize:12,marginBottom:8}}>Bonifici in entrata trovati: {righe.length}. Ignorati: {ignorati} (POS, Uber, Bolt, cashback, uscite). ✓ = nome simile al committente, ? = solo importo uguale. Le righe verdi sono gia' abbinate, controllale prima di confermare.</div>
        {righe.map((r,i)=>{
          const sel=r.scelta!==null;
          return <div key={i} style={{border:"1px solid "+(sel?"#4ade8066":"#2d3550"),background:sel?"#0d2a1a":"#0f1320",borderRadius:8,padding:"8px 10px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
              <div style={{minWidth:0}}>
                <div style={{color:"#c8d3e0",fontSize:13}}>{fmtD(r.data)} — {r.nome}</div>
                <div style={{color:"#8892a4",fontSize:11}}>{r.descr}</div>
              </div>
              <div style={{color:"#4ade80",fontWeight:700,whiteSpace:"nowrap"}}>{fmt(r.importo)}</div>
            </div>
            {r.opts.length===0
              ?<div style={{color:"#fbbf24",fontSize:12,marginTop:6}}>Nessun servizio non pagato con questo importo: da verificare a mano.</div>
              :<select style={{...S.inp,marginTop:6}} value={r.scelta===null?"":String(r.scelta)} onChange={e=>setScelta(i,e.target.value)}>
                <option value="">— non abbinare —</option>
                {r.opts.map((o,k)=><option key={k} value={String(k)}>{(o.nomeOk?"✓ ":"? ")+o.cli+" · "+o.label}</option>)}
              </select>}
          </div>;
        })}
        <button disabled={nSel===0||busy} onClick={applica} style={{background:nSel===0||busy?"#2d3550":"#16a34a",border:"none",color:"white",borderRadius:6,padding:"8px 14px",cursor:nSel===0||busy?"default":"pointer",fontSize:13,fontWeight:700,marginTop:4}}>{busy?"Salvataggio...":"Segna come pagati ("+nSel+")"}</button>
      </div>}
    </Modal>}
  </div>;
}
