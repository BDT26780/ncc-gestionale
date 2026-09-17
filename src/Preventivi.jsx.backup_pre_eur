import{useState,useEffect}from"react";
import{S,Ic,Modal,DelModal,F,fmt,uid,today,supa}from"./shared.jsx";

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
  const {error}=await supa.from("preventivi").upsert(list.map(p=>({
    id:p.id,numero:p.id,data:p.data||null,validita:parseInt(p.validita)||30,
    nome_cliente:p.clienteNome||null,email_cliente:p.clienteEmail||null,
    telefono_cli:p.telefonoCli||null,cliente_ref:p.clienteRef||null,
    veicolo:p.veicolo||null,giorno_servizio:p.giornoServizio||null,
    titolo_servizio:p.titoloServizio||null,aliq_iva:p.aliqIva||null,
    sconto_globale:p.scontoGlobale||"0",righe_json:p.righe||[],
    metodi_pagamento:p.metodiPagamento||null,note:p.note||null,
    committente_id:p.committenteId||null,stato:p.stato||"bozza",
  })));
  if(error)console.error("savePrevList error:",error);
}

async function saveTariffario(t){
  await supa.from("tariffario").upsert({
    id:"default",prezzo_trasf:t.prezzoTrasf,prezzo_ora:t.prezzoOra,
    pedaggio_std:t.pedaggioStd,iva:t.iva,
  });
}

const ORS_KEY="eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM4NDhkMTkzNzE4YTQ0ZjhiMjc2MmFkZDkxMDNjMWNhIiwiaCI6Im11cm11cjY0In0=";
async function calcolaKm(da,a){
  try{
    const geo=async q=>{
      const r=await fetch("https://api.openrouteservice.org/geocode/search?api_key="+ORS_KEY+"&text="+encodeURIComponent(q+", Italia")+"&size=1");
      const d=await r.json();
      return d.features?.[0]?.geometry?.coordinates;
    };
    const [cA,cB]=await Promise.all([geo(da),geo(a)]);
    if(!cA||!cB)return null;
    const r=await fetch("https://api.openrouteservice.org/v2/directions/driving-car",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":ORS_KEY},
      body:JSON.stringify({coordinates:[cA,cB]})
    });
    const d=await r.json();
    const m=d.routes?.[0]?.summary?.distance;
    return m?Math.round(m/1000):null;
  }catch(e){console.error("calcolaKm",e);return null;}
}
function Preventivi({refreshTick=0}){
  const [preventivi,setPrevR]=useState([]);
  const [kmStatus,setKmStatus]=useState("");
  const [sugDa,setSugDa]=useState([]);
  const [sugA,setSugA]=useState([]);
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

  useEffect(()=>{if(refreshTick>0){loadPrevTariff().then(({preventivi:p,tariff:t})=>{setPrevR(p);setTariff(t);});}},[refreshTick]);
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
    return <div data-preventivo="true" style={{background:"#fff",minHeight:"100vh",fontFamily:"Arial,sans-serif",fontSize:13,color:"#111",padding:28,margin:"-18px"}}>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginBottom:20,borderBottom:"1px solid #ddd",paddingBottom:12}} className="no-print">
        <button onClick={()=>setAnteprimaPrev(null)} style={{background:"#f0f0f0",border:"1px solid #ccc",borderRadius:6,padding:"7px 16px",cursor:"pointer",fontSize:13}}>← Torna</button>
        <button onClick={()=>{
          const w=window.open("","_blank");
          w.document.write("<html><head><title>Preventivo</title><style>body{font-family:Arial,sans-serif;font-size:13px;color:#000;padding:28px;margin:0}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px 10px}@media print{.no-print{display:none}}</style></head><body>");
          w.document.write(document.querySelector("[data-preventivo]").innerHTML);
          w.document.write("</body></html>");
          w.document.close();
          w.focus();
          setTimeout(()=>w.print(),500);
        }} style={{background:"#111",color:"#fff",border:"none",borderRadius:6,padding:"7px 20px",cursor:"pointer",fontSize:13,fontWeight:700}}>🖨 Stampa / Salva PDF</button>
        {prev.telefonoCli&&<button onClick={()=>{const tel=(prev.telefonoCli||"").replace(/[^0-9+]/g,"");const msg="Gentile "+prev.clienteNome+",\ncome concordato Le invio in allegato il preventivo n. "+prev.id+" di Black Diamond Transfert.\nResto a disposizione per qualsiasi informazione.\nCordiali saluti,\nBlack Diamond Transfert";window.open("https://wa.me/"+tel+"?text="+encodeURIComponent(msg),"_blank");}} style={{background:"#25d366",color:"#fff",border:"none",borderRadius:6,padding:"7px 20px",cursor:"pointer",fontSize:13,fontWeight:700}}>📤 Invia via WhatsApp</button>}
      </div>
      <style>{`
        @media print {
          .no-print{display:none!important}
          * { color: #000 !important; background: #fff !important; border-color: #999 !important; -webkit-print-color-adjust: exact; }
          body { margin: 0 !important; padding: 0 !important; }
          table { border-collapse: collapse !important; }
          td, th { border: 1px solid #999 !important; padding: 4px 8px !important; }
        }
      `}</style>
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

      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1,position:"relative"}}>
          <F label="Partenza (per calcolo km)"><input style={S.inp} value={form.luogoDa||""} onChange={e=>setForm(p=>({...p,luogoDa:e.target.value}))} placeholder="Es. Milano Centrale"/></F>
        </div>
        <div style={{flex:1,position:"relative"}}>
          <F label="Destinazione (per calcolo km)"><input style={S.inp} value={form.luogoA||""} onChange={e=>setForm(p=>({...p,luogoA:e.target.value}))} placeholder="Es. Malpensa T1"/></F>
        </div>
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



export default Preventivi;
