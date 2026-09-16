import React,{useState,useEffect,useMemo,useRef}from"react";
import {SUPA_URL,SUPA_KEY,supa,loadAll,saveAll,deleteRecord,uid,fmt,fmtD,today,isExp,isNear,DCOL,dcol,ALIQ_MAP,ivaS,ivaImpon,prezzoLordo,S,Ic,Badge,Modal,DelModal,SwipeToDelete,PagModal,F} from "./shared.jsx";
import Driver from "./Driver.jsx";
import Clienti from "./Clienti.jsx";
import Preventivi from "./Preventivi.jsx";
import Spese from "./Spese.jsx";
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
  const [ivaRiportata,setIvaRiportata]=useState(0);
  useEffect(()=>{if(anno&&anno!=="tutti"){supa.from("tariffario").select("iva_credito_riportato").eq("id","default").single().then(({data})=>{const r=data?.iva_credito_riportato||{};const annoPrev=String(parseInt(anno)-1);setIvaRiportata(parseFloat(r[annoPrev])||0);});}},[anno]);
  const salvaRiportoAnno=async()=>{const {data}=await supa.from("tariffario").select("iva_credito_riportato").eq("id","default").single();const r=data?.iva_credito_riportato||{};const giaSalvato=parseFloat(r[anno]);const residuo=!isNaN(giaSalvato)?giaSalvato:(st.trim[3]?.nuovoCred||0);r[anno]=residuo;await supa.from("tariffario").update({iva_credito_riportato:r}).eq("id","default");alert("Riporto IVA "+anno+" → "+String(parseInt(anno)+1)+": euro"+residuo.toFixed(2));};
  const [redditoTaxi,setRedditoTaxi]=useState(0);
  useEffect(()=>{supa.from("tariffario").select("reddito_taxi_2025").eq("id","default").single().then(({data})=>{if(data?.reddito_taxi_2025)setRedditoTaxi(parseFloat(data.reddito_taxi_2025)||0);});},[]);
  const st=useMemo(()=>{
    const pag=servizi.filter(s=>s.dataPagamento);
    const tot=pag.reduce((a,s)=>a+prezzoLordo(s),0);
    const totCommissioni=servizi.reduce((a,s)=>a+(parseFloat(s.commissione)||0),0);
    const xm={contanti:0,bonifico:0,carta:0,mypos:0,paypal:0};
    pag.forEach(s=>{if(s.metodoPagamento)xm[s.metodoPagamento]=(xm[s.metodoPagamento]||0)+prezzoLordo(s)});
    const taxiExtra=anno==="2025"?redditoTaxi:0;
    const dichNCC=(xm.bonifico||0)+(xm.carta||0);
    const dich=dichNCC+taxiExtra;
    const iva=pag.filter(s=>["bonifico","carta"].includes(s.metodoPagamento)).reduce((a,s)=>a+ivaS(s),0);
    const dichNetto=dichNCC-iva+taxiExtra;
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
    const allSp=spese||[];
    const ivaCred=allSp.reduce((a,s)=>{const m=s.descrizione?.match(/\[IVA:([\d.]+)\]/);if(m)return a+parseFloat(m[1]);if(s.isQuota)return a;const imp=parseFloat(s.importo)||0;const al=ALIQ_MAP[s.aliqIva]||0;return a+imp*(al/(1+al))},0);
    const ivaNet=iva-ivaCred;
    // IVA cumulativa: il credito non usato si riporta al trimestre successivo
    const trim=(()=>{
      let riporto=ivaRiportata;
      return TRIM.map(t=>{
        const mOk=d=>t.months.includes(parseInt(d?.slice(5,7)));
        const deb=pag.filter(s=>["bonifico","carta"].includes(s.metodoPagamento)&&mOk(s.dataPagamento)).reduce((a,s)=>a+ivaS(s),0);
        const cred=allSp.filter(s=>mOk(s.data)).reduce((a,s)=>{const m=s.descrizione?.match(/\[IVA:([\d.]+)\]/);if(m)return a+parseFloat(m[1]);if(s.isQuota)return a;const imp=parseFloat(s.importo)||0;const al=ALIQ_MAP[s.aliqIva]||0;return a+imp*(al/(1+al))},0);
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
    return{tot,xm,dich,dichNetto,iva,ivaCred,ivaNet,totSp,commB,inpsPre,perditaPre,det19,impDet,baseOrd,irpef,irpefN,inps,tassaOrd:irpefN+inps,baseForf,tassaForf:baseForf*0.15,detIRPEF,trim,ammort,annoC,totCommissioni};
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
        <Big val={st.totCommissioni>0?st.tot-st.totCommissioni:st.tot}/>
        {Object.entries(st.xm).map(([k,v])=><Row key={k} l={k} v={fmt(v)} s/>)}
        {st.totCommissioni>0&&<><Row l="Totale lordo" v={fmt(st.tot)} s/><Row l="— Commissioni" v={"- "+fmt(st.totCommissioni)} s/></>}
      </Card>
      {anno==="2025"&&<Card title="Reddito Taxi 2025 (esente IVA)" col="#f59e0b">
        <div style={{fontSize:11,color:"#c8d3e0",marginBottom:8}}>Reddito da attività taxi precedente all'NCC — esente IVA, sommato al reddito NCC per IRPEF</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><input type="number" id="taxi-input" style={{background:"#1a1f2e",border:"1px solid #f59e0b66",borderRadius:6,padding:"6px 10px",color:"#e8d5a3",fontSize:15,fontFamily:"Georgia,serif",flex:1}} defaultValue={redditoTaxi||""} placeholder="0"/><button onClick={()=>{const v=parseFloat(document.getElementById("taxi-input").value)||0;setRedditoTaxi(v);supa.from("tariffario").update({reddito_taxi_2025:v}).eq("id","default").then(({error})=>{if(error)console.error("Errore salvataggio reddito taxi:",error);});}} style={{background:"#f59e0b",color:"#000",border:"none",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontWeight:700,fontSize:12}}>Salva</button></div>
        <div style={{fontSize:11,color:"#f59e0b"}}>Totale incluso nel reddito: € {fmt(redditoTaxi)}</div>
      </Card>}
      <Card title="Reddito totale 2025" col="#60a5fa">
        <Big val={st.dich} col="#60a5fa"/>
        <Row l="NCC (bonifico+carta)" v={fmt(st.dichNCC||((xm=>((xm.bonifico||0)+(xm.carta||0)))(st.xm)))}/>
        {redditoTaxi>0&&anno==="2025"&&<Row l="Taxi (esente IVA)" v={fmt(redditoTaxi)}/>}
        <Row l="Imponibile netto NCC" v={fmt((st.dichNCC||(st.dich-redditoTaxi))-st.iva)}/>
        <Row l="IVA 10% a debito (solo NCC)" v={fmt(st.iva)}/>
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
              <span style={{color:"#c8d3e0"}}>{s.descrizione||s.tipo}<br/><span style={{color:"#6b7280"}}>{fmtD(s.data)} · {s.tipo}</span></span>
              <span style={{color:"#f87171",fontWeight:700}}>{fmt(s.importo)}</span>
            </div>
          ))}
          {spese.filter(s=>s.tipo!=="inps_anno_prec"&&s.tipo!=="detrazioni_19"&&s.tipo!=="perdita_anno_prec").length===0&&<div style={{color:"#6b7280",fontSize:11,padding:"6px 0"}}>Nessuna spesa in questo periodo</div>}
        </div>}
      </Card>
      {st.totCommissioni>0&&<Card title="Commissioni" col="#f87171">
        <Big val={st.totCommissioni} col="#f87171"/>
      </Card>}
    </div>

    {/* IVA COMPENSAZIONE */}
    <div style={{marginTop:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <h3 style={{...S.gld,margin:0,fontSize:15}}>IVA — Compensazione {anno!=="tutti"?anno:""}</h3>
        {anno!=="tutti"&&<div style={{display:"flex",gap:6}}>
          <button onClick={salvaRiportoAnno} style={{background:"#1e2a3a",border:"1px solid #3b82f644",borderRadius:5,color:"#60a5fa",padding:"5px 12px",cursor:"pointer",fontSize:11}}>📋 Riporta IVA anno succ.</button>
          <button onClick={async()=>{const credito=st.trim[3]?.nuovoCred||0;if(credito<=0){alert("Nessun credito IVA residuo da compensare");return;}const usato=parseFloat(prompt("Quanto IVA hai usato in compensazione F24? (Credito disponibile: "+credito.toFixed(2)+"€)",""));if(isNaN(usato)||usato<=0)return;const residuo=Math.max(0,credito-usato);const {data}=await supa.from("tariffario").select("iva_credito_riportato").eq("id","default").single();const r=data?.iva_credito_riportato||{};r[anno]=residuo;await supa.from("tariffario").update({iva_credito_riportato:r}).eq("id","default");alert("Usati "+usato.toFixed(2)+"€ in F24. Residuo riportato: "+residuo.toFixed(2)+"€");}} style={{background:"#1e2a3a",border:"1px solid #f87171",borderRadius:5,color:"#f87171",padding:"5px 12px",cursor:"pointer",fontSize:11}}>✓ Usata in compensazione F24</button>
        </div>}
      </div>
      {ivaRiportata>0&&<div style={{background:"#1a2a1a",border:"1px solid #4ade8044",borderRadius:6,padding:"6px 12px",marginBottom:8,fontSize:11,color:"#4ade80"}}>↩ Credito IVA riportato dall'anno precedente: {fmt(ivaRiportata)}</div>}
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

// ── FATTURAZIONE ──────────────────────────────────────────────────────────────
// ── DA PAGARE ─────────────────────────────────────────────────────────────────
function DaPagare({servizi,clienti,driver,setServizi}){
  const [filtroC,setFiltroC]=useState("");
  const [pagId,setPagId]=useState(null);
  const upd=(id,patch)=>{setServizi(p=>p.map(s=>s.id===id?{...s,...patch}:s));supa.from("servizi").update(Object.fromEntries(Object.entries(patch).map(([k,v])=>[{dataPagamento:"data_pagamento",metodoPagamento:"metodo_pagamento",dataFattura:"data_fattura",statoFattura:"stato_fattura",inFattura:"in_fattura",commissione:"commissione",metodoCommissione:"metodo_commissione",gruppoFattura:"gruppo_fattura",noShow:"no_show"}[k]||k,v]))).eq("id",id).then(({error})=>{if(error)console.error("Errore salvataggio servizio:",error);});};
  const toggleFattura=async(s)=>{
    if(s.inFattura){setServizi(p=>p.map(x=>x.id===s.id?{...x,inFattura:false,gruppoFattura:null}:x));await supa.from("servizi").update({in_fattura:false,gruppo_fattura:null}).eq("id",s.id);return;}
    const aperti=servizi.filter(x=>x.inFattura&&x.committenteId===s.committenteId&&x.statoFattura!=="emessa"&&x.gruppoFattura);
    const gid=aperti.length?aperti[0].gruppoFattura:"G"+Date.now();
    setServizi(p=>p.map(x=>x.id===s.id?{...x,inFattura:true,gruppoFattura:gid}:x));
    await supa.from("servizi").update({in_fattura:true,gruppo_fattura:gid}).eq("id",s.id);
  };
  const updBulk=async(ids,dt)=>{setServizi(p=>p.map(s=>ids.includes(s.id)?{...s,statoFattura:"emessa",dataFattura:dt}:s));await Promise.all(ids.map(id=>supa.from("servizi").update({stato_fattura:"emessa",data_fattura:dt}).eq("id",id)));};
  const [pagBulkModal,setPagBulkModal]=useState(null);
  const [fattModal,setFattModal]=useState(null);
  const updPagaBulk=async(ids,met,dt)=>{const d=dt||today();setServizi(p=>p.map(s=>ids.includes(s.id)?{...s,dataPagamento:d,metodoPagamento:met}:s));await Promise.all(ids.map(id=>supa.from("servizi").update({data_pagamento:d,metodo_pagamento:met}).eq("id",id)));};
  const cycleFattura=async(s)=>{const sf=s.statoFattura||"mancante";if(sf==="mancante"){const patch={statoFattura:"preparata"};setServizi(p=>p.map(x=>x.id===s.id?{...x,...patch}:x));await supa.from("servizi").update({stato_fattura:patch.statoFattura}).eq("id",s.id);}else if(sf==="preparata"){const patch={statoFattura:"emessa",dataFattura:today()};setServizi(p=>p.map(x=>x.id===s.id?{...x,...patch}:x));await supa.from("servizi").update({stato_fattura:patch.statoFattura,data_fattura:patch.dataFattura}).eq("id",s.id);}else{setConfMancanteId(s.id);}};
  const [filtroTesto,setFiltroTesto]=useState("");
  const [delPagId,setDelPagId]=useState(null);
  const [confMancanteId,setConfMancanteId]=useState(null);
  const inFatturaList=servizi.filter(s=>s.inFattura&&!s.dataPagamento&&s.data&&s.data<=today());
  const oggiMese=new Date().toISOString().slice(0,7);
  const gruppiMap={};
  inFatturaList.forEach(s=>{const gid=s.gruppoFattura||("legacy-"+(s.committenteId||"none"));(gruppiMap[gid]=gruppiMap[gid]||[]).push(s);});
  const perCli=Object.keys(gruppiMap).map(gid=>{const all=gruppiMap[gid];const cl=clienti.find(c=>c.id===all[0].committenteId)||{id:gid,nome:"Senza committente"};const nonPag=all.filter(s=>!s.dataPagamento).sort((a,b)=>a.data+a.ora>b.data+b.ora?1:-1);const pag=all.filter(s=>s.dataPagamento).sort((a,b)=>a.data+a.ora>b.data+b.ora?1:-1);const ss=[...nonPag,...pag];const chiuso=all.every(s=>s.statoFattura==="emessa");return{gid,cli:cl,ss,chiuso,tot:nonPag.reduce((a,s)=>a+prezzoLordo(s),0)};}).sort((a,b)=>a.cli.nome>b.cli.nome?1:-1);
  const meseGruppo=g=>{const d=g.ss.map(s=>s.data).filter(Boolean).sort();return d.length?d[0].slice(0,7):oggiMese;};
  const matchTesto=s=>{if(!filtroTesto)return true;const q=filtroTesto.toLowerCase().trim();const oggiStr=today();if(q==="non pagati"||q==="non pagato"||q==="non pagate")return !s.dataPagamento&&s.data&&s.data<=oggiStr;if(q==="pagati"||q==="pagato"||q==="pagate")return !!s.dataPagamento;const cli=clienti.find(c=>c.id===s.committenteId);const drv=driver.find(d=>d.id===s.driverId);return(fmtD(s.data)||"").toLowerCase().includes(q)||(s.data||"").includes(q)||(s.nomeUtente||"").toLowerCase().includes(q)||(cli?.nome||"").toLowerCase().includes(q)||(drv?.nome||"").toLowerCase().includes(q)||(s.pickup||"").toLowerCase().includes(q)||(s.dropoff||"").toLowerCase().includes(q);};
  const lista=servizi.filter(s=>(!filtroC||s.committenteId===filtroC)&&(!s.inFattura||s.dataPagamento)&&s.data&&s.data<=today()&&matchTesto(s));
  const oggi=new Date().toISOString().slice(0,7);
  const mesi=[...new Set([...lista.map(s=>s.data?.slice(0,7)),...perCli.filter(g=>meseGruppo(g)<oggiMese).map(meseGruppo)])].filter(Boolean).sort((a,b)=>{if(a===oggi)return -1;if(b===oggi)return 1;const aPass=a<oggi;const bPass=b<oggi;if(aPass&&!bPass)return 1;if(!aPass&&bPass)return -1;return a>b?1:-1;});
  const tot=lista.filter(s=>!s.dataPagamento).reduce((a,s)=>a+prezzoLordo(s),0);
  return <div>
    <h2 style={{...S.gld,marginTop:0}}>Da Pagare</h2>
    <div style={{display:"flex",gap:10,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
      <select style={{...S.inp,flex:1,minWidth:180}} value={filtroC} onChange={e=>setFiltroC(e.target.value)}>
        <option value="">Tutti i committenti</option>
        {clienti.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <div style={{background:"#dc262633",border:"1px solid #dc2626",borderRadius:8,padding:"5px 12px",color:"#f87171",fontWeight:700,whiteSpace:"nowrap"}}>{fmt(tot)}</div>
    </div>
    <div style={{position:"relative",marginBottom:14}}>
      <input style={{...S.inp,paddingLeft:32}} placeholder="Cerca data, nome, committente, percorso..." value={filtroTesto} onChange={e=>setFiltroTesto(e.target.value)}/>
      <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#8892a4",pointerEvents:"none"}}>🔍</span>
    </div>
    {perCli.filter(g=>meseGruppo(g)>=oggiMese).length>0&&<div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:"#e8d5a3",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Da fatturare e incassare</div>
      {perCli.filter(g=>meseGruppo(g)>=oggiMese).map(({gid,cli,ss,chiuso,tot:totG})=>(
        <div key={gid} style={{...S.card,border:chiuso?"1px solid #4ade8044":"1px solid #e8d5a344",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
            <div style={{flex:1,minWidth:0}}><div style={{color:"#e8d5a3",fontWeight:700,fontSize:14}}>{cli.nome}{chiuso&&<span style={{color:"#4ade80",fontSize:11,fontWeight:600,marginLeft:8}}>✅ Fatturato</span>}</div><div style={{color:"#8892a4",fontSize:12}}>{ss.length} servizi</div></div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
              <div style={{color:"#4ade80",fontFamily:"Georgia,serif",fontSize:18,fontWeight:700}}>{fmt(totG)}</div>
              {!chiuso&&<button onClick={()=>setFattModal(ss.map(s=>s.id))} style={{background:"#1e3a6e",border:"1px solid #3b82f6",color:"#60a5fa",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>📄 Emetti fattura</button>}
              <button onClick={()=>{const ids=ss.filter(s=>!s.dataPagamento).map(s=>s.id);if(ids.length)setPagBulkModal(ids);}} style={{background:"#16a34a",border:"none",color:"white",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>💳 Segna tutti pagati</button>
            </div>
          </div>
          <div style={{borderTop:"1px solid #2d3550",paddingTop:6}}>
            {ss.map(s=>{
              const drv=driver.find(d=>d.id===s.driverId);
              const sf=s.statoFattura||"mancante";
              const fattColor=sf==="emessa"?"#4ade80":sf==="preparata"?"#fbbf24":"#f87171";
              const fattLabel=sf==="emessa"?"✅ Emessa":sf==="preparata"?"🟡 Preparata":"🔴 Mancante";
              const pagato=!!s.dataPagamento;
              const scaduto=!pagato&&s.data&&(new Date()-new Date(s.data+"T00:00:00"))/86400000>30;
              return <div key={s.id} style={{padding:"7px 8px",marginBottom:4,borderRadius:6,background:pagato?"#0d2a1a":"#2a0d0d",border:s.noShow?"3px solid #00d4ff":pagato?"1px solid #4ade8033":s.statoFattura==="emessa"?"2px solid #4ade80":scaduto?"3px solid #ff1a1a":"1px solid #dc262433"}}>
                <div style={{marginBottom:5}}>
                  <div style={{color:"#c8d3e0",fontSize:13}}>{fmtD(s.data)} {s.ora} — {s.nomeUtente||"—"}</div>
                  <div style={{color:"#8892a4",fontSize:12}}>{drv?.nome||"—"} · {s.pickup||"—"} → {s.dropoff||"—"}</div>
                  {pagato&&<div style={{color:"#4ade80",fontSize:12}}>✓ Pagato {fmtD(s.dataPagamento)} · {s.metodoPagamento}</div>}
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:"1px solid #2d3550",paddingTop:5}}>
                  <span style={{color:"#4ade80",fontWeight:700,fontFamily:"Georgia,serif",fontSize:13}}>{fmt(prezzoLordo(s))}</span>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>cycleFattura(s)} style={{background:"none",border:"1px solid "+fattColor+"44",color:fattColor,cursor:"pointer",fontSize:11,padding:"2px 8px",borderRadius:4}}>{fattLabel}</button>
                    {!pagato&&<button onClick={()=>setPagId(s.id)} style={{background:"#16a34a",border:"none",color:"white",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:600}}>Paga</button>}
                    <button onClick={()=>toggleFattura(s)} style={{background:"#3d1515",border:"none",color:"#f87171",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:11}}>Rimuovi</button>
                  </div>
                </div>
              </div>;
            })}
          </div>
        </div>
      ))}
    </div>}
    {mesi.map(mese=>{
      const nomeM=new Date(mese+"-15").toLocaleDateString("it-IT",{month:"long",year:"numeric"});
      const servMese=lista.filter(s=>s.data?.startsWith(mese));
      const nonPagati=servMese.filter(s=>!s.dataPagamento).sort((a,b)=>a.data+a.ora>b.data+b.ora?1:-1);
      const pagati=servMese.filter(s=>s.dataPagamento).sort((a,b)=>a.data+a.ora>b.data+b.ora?1:-1);
      const gruppiMese=perCli.filter(g=>meseGruppo(g)<oggiMese&&meseGruppo(g)===mese);
      return <div key={mese} style={{marginBottom:20}}>
        <div style={{fontSize:11,color:"#e8d5a3",textTransform:"uppercase",letterSpacing:2,marginBottom:8,borderBottom:"1px solid #2d3550",paddingBottom:6}}>{nomeM}</div>
        {gruppiMese.map(({gid,cli,ss,chiuso,tot:totG})=>(
          <div key={gid} style={{...S.card,border:chiuso?"1px solid #4ade8044":"1px solid #e8d5a344",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
              <div style={{flex:1,minWidth:0}}><div style={{color:"#e8d5a3",fontWeight:700,fontSize:14}}>{cli.nome}{chiuso&&<span style={{color:"#4ade80",fontSize:11,fontWeight:600,marginLeft:8}}>✅ Fatturato</span>}</div><div style={{color:"#8892a4",fontSize:12}}>{ss.length} servizi</div></div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                <div style={{color:"#4ade80",fontFamily:"Georgia,serif",fontSize:18,fontWeight:700}}>{fmt(totG)}</div>
                {!chiuso&&<button onClick={()=>setFattModal(ss.map(s=>s.id))} style={{background:"#1e3a6e",border:"1px solid #3b82f6",color:"#60a5fa",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>📄 Emetti fattura</button>}
                <button onClick={()=>{const ids=ss.filter(s=>!s.dataPagamento).map(s=>s.id);if(ids.length)setPagBulkModal(ids);}} style={{background:"#16a34a",border:"none",color:"white",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>💳 Segna tutti pagati</button>
              </div>
            </div>
            <div style={{borderTop:"1px solid #2d3550",paddingTop:6}}>
              {ss.map(s=>{
                const drv=driver.find(d=>d.id===s.driverId);
                const sf=s.statoFattura||"mancante";
                const fattColor=sf==="emessa"?"#4ade80":sf==="preparata"?"#fbbf24":"#f87171";
                const fattLabel=sf==="emessa"?"✅ Emessa":sf==="preparata"?"🟡 Preparata":"🔴 Mancante";
                const pagato=!!s.dataPagamento;
                const scaduto=!pagato&&s.data&&(new Date()-new Date(s.data+"T00:00:00"))/86400000>30;
                return <div key={s.id} style={{padding:"7px 8px",marginBottom:4,borderRadius:6,background:pagato?"#0d2a1a":"#2a0d0d",border:s.noShow?"3px solid #00d4ff":pagato?"1px solid #4ade8033":s.statoFattura==="emessa"?"2px solid #4ade80":scaduto?"3px solid #ff1a1a":"1px solid #dc262433"}}>
                  <div style={{marginBottom:5}}>
                    <div style={{color:"#c8d3e0",fontSize:13}}>{fmtD(s.data)} {s.ora} — {s.nomeUtente||"—"}</div>
                    <div style={{color:"#8892a4",fontSize:12}}>{drv?.nome||"—"} · {s.pickup||"—"} → {s.dropoff||"—"}</div>
                    {pagato&&<div style={{color:"#4ade80",fontSize:12}}>✓ Pagato {fmtD(s.dataPagamento)} · {s.metodoPagamento}</div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:"1px solid #2d3550",paddingTop:5}}>
                    <span style={{color:"#4ade80",fontWeight:700,fontFamily:"Georgia,serif",fontSize:13}}>{fmt(prezzoLordo(s))}</span>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>cycleFattura(s)} style={{background:"none",border:"1px solid "+fattColor+"44",color:fattColor,cursor:"pointer",fontSize:11,padding:"2px 8px",borderRadius:4}}>{fattLabel}</button>
                      {!pagato&&<button onClick={()=>setPagId(s.id)} style={{background:"#16a34a",border:"none",color:"white",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:600}}>Paga</button>}
                      <button onClick={()=>toggleFattura(s)} style={{background:"#3d1515",border:"none",color:"#f87171",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:11}}>Rimuovi</button>
                    </div>
                  </div>
                </div>;
              })}
            </div>
          </div>
        ))}
        {[...nonPagati,...pagati].map(s=>{
          const drv=driver.find(d=>d.id===s.driverId);
          const cli=clienti.find(c=>c.id===s.committenteId);
          const pagato=!!s.dataPagamento;
          const noFatt=["contanti","paypal","mypos"].includes(s.metodoPagamento);
          const sf=s.statoFattura||"mancante";
          const fattColor=sf==="emessa"?"#4ade80":sf==="preparata"?"#fbbf24":"#f87171";
          const fattLabel=sf==="emessa"?"✅ Fattura emessa":sf==="preparata"?"🟡 Preparata":"🔴 Mancante";
          const scaduto=!pagato&&s.data&&(new Date()-new Date(s.data+"T00:00:00"))/86400000>30;
          const giallo=!pagato&&!s.inFattura&&sf==="preparata";
          return <div key={s.id} style={{...S.card,border:s.noShow?"3px solid #00d4ff":pagato?"2px solid #4ade80":s.statoFattura==="emessa"?"2px solid #4ade80":scaduto?"3px solid #ff1a1a":giallo?"3px solid #fbbf24":"1px solid #dc262444",boxShadow:s.noShow?"0 0 10px #00d4ff66":pagato?"0 0 8px #4ade8066":s.statoFattura==="emessa"?"0 0 8px #4ade8066":scaduto?"0 0 10px #ff1a1a66":giallo?"0 0 8px #fbbf2466":"none",background:pagato?"#0d2a1a":"#2a0d0d",marginBottom:8,opacity:pagato?0.7:1}}>
            <div style={{marginBottom:6}}>
              <div style={{display:"flex",gap:5,marginBottom:4,flexWrap:"wrap",alignItems:"center"}}>
                <Badge color={s.tipo==="trasferimento"?"blue":s.tipo==="ar"?"teal":s.tipo==="combinato"?"green":"amber"}>{s.tipo==="trasferimento"?"Trasf.":s.tipo==="ar"?"A/R":s.tipo==="combinato"?"Comb. "+(s.oreDisp||"?")+"h":"Disp. "+(s.oreDisp||"?")+"h"}</Badge>
                {!noFatt&&<button onClick={()=>cycleFattura(s)} style={{background:"none",border:"1px solid "+fattColor+"44",color:fattColor,cursor:"pointer",fontSize:11,padding:"2px 8px",borderRadius:4}}>{fattLabel}</button>}
                {pagato&&<span style={{color:"#4ade80",fontSize:11}}>✓ {fmtD(s.dataPagamento)} · {s.metodoPagamento}</span>}
              </div>
              <div style={{color:"#c8d3e0",fontSize:15,fontWeight:600}}>{fmtD(s.data)} {s.ora} — {s.nomeUtente||"—"}</div>
              <div style={{color:"#8892a4",fontSize:13}}><span style={{fontWeight:700,color:"#e8d5a3",fontSize:15}}>{cli?.nome}</span> · {drv?.nome}</div>
              <div style={{color:"#8892a4",fontSize:13}}>{[s.pickup,s.dropoff].filter(Boolean).join(" → ")}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,borderTop:"1px solid #2d3550",paddingTop:6}}>
              <span style={{color:"#4ade80",fontWeight:700,fontFamily:"Georgia,serif",fontSize:16}}>{fmt(prezzoLordo(s))}</span>
              <div style={{display:"flex",gap:6}}>
                {!pagato&&!s.inFattura&&<button onClick={()=>toggleFattura(s)} style={{background:"#1e3050",border:"1px solid #3b82f6",color:"#60a5fa",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600}}>+ Aggiungi</button>}
                {!pagato&&<button onClick={()=>setPagId(s.id)} style={{background:"#16a34a",border:"none",color:"white",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>Paga</button>}
                {pagato&&<input type="date" value={s.dataPagamento||""} onChange={e=>upd(s.id,{dataPagamento:e.target.value})} style={{background:"#0f1320",border:"1px solid #16a34a",borderRadius:4,color:"#4ade80",padding:"3px 6px",fontSize:11,cursor:"pointer"}}/>}
                {pagato&&<button onClick={()=>setDelPagId(s.id)} style={{background:"#16a34a22",border:"1px solid #16a34a",borderRadius:4,padding:"3px 8px",cursor:"pointer",color:"#4ade80",fontSize:11}}>✓ Pagato</button>}
              </div>
            </div>
          </div>;
        })}
      </div>;
    })}
    {mesi.length===0&&<div style={{color:"#4b5563",textAlign:"center",padding:40}}>Nessun servizio</div>}
    {pagId&&<PagModal onClose={()=>setPagId(null)} onConfirm={(m,d)=>{upd(pagId,{dataPagamento:d||today(),metodoPagamento:m});setPagId(null);}}/>}
    {delPagId&&<DelModal title="Annullare il pagamento?" onClose={()=>setDelPagId(null)} onConfirm={()=>{upd(delPagId,{dataPagamento:null,metodoPagamento:null});setDelPagId(null);}}/> }
    {confMancanteId&&<DelModal title="Vuoi tornare a Mancante?" onClose={()=>setConfMancanteId(null)} onConfirm={()=>{upd(confMancanteId,{statoFattura:"mancante",dataFattura:null});setConfMancanteId(null);}}/>}
    {pagBulkModal&&pagBulkModal.length>0&&<PagModal onClose={()=>setPagBulkModal(null)} onConfirm={async(m,d)=>{await updPagaBulk(pagBulkModal,m,d);setPagBulkModal(null);}}/>}
    {fattModal&&<Modal title="Data fattura" onClose={()=>setFattModal(null)}>
      <div style={{marginBottom:14}}>
        <div style={{color:"#8892a4",fontSize:12,marginBottom:6}}>Data emissione fattura</div>
        <input type="date" id="fattDate" defaultValue={today()} style={{...S.inp,fontSize:16}}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <button style={S.bGr} onClick={()=>setFattModal(null)}>Annulla</button>
        <button style={S.bG} onClick={()=>{const d=document.getElementById("fattDate").value||today();updBulk(fattModal,d);setFattModal(null);}}>Conferma</button>
      </div>
    </Modal>}

  </div>;
}

// ── APP ───────────────────────────────────────────────────────────────────────
// ── REPORT ───────────────────────────────────────────────────────────────────
function Report({servizi,spese,clienti,driver,anno}){
  const [filtroC,setFiltroC]=useState("");
  const [filtroD,setFiltroD]=useState("");
  const MESI=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  const srv=servizi.filter(s=>(!filtroC||s.committenteId===filtroC)&&(!filtroD||s.driverId===filtroD));
  const sp=spese.filter(s=>(!filtroD||s.driverId===filtroD));
  const mesiDati=MESI.map((nome,mi)=>{
    const mm=String(mi+1).padStart(2,"0");
    const srvM=srv.filter(s=>s.data?.slice(5,7)===mm);
    const spM=sp.filter(s=>s.data?.slice(5,7)===mm);
    const entrate=srvM.filter(s=>s.dataPagamento).reduce((a,s)=>a+prezzoLordo(s),0);
    const commissioni=srvM.reduce((a,s)=>a+(parseFloat(s.commissione)||0),0);
    const spese_tot=spM.reduce((a,s)=>a+(parseFloat(s.importo)||0),0);
    const contanti=srvM.filter(s=>s.dataPagamento&&s.metodoPagamento==="contanti").reduce((a,s)=>a+prezzoLordo(s),0);
    const bonifico=srvM.filter(s=>s.dataPagamento&&s.metodoPagamento==="bonifico").reduce((a,s)=>a+prezzoLordo(s),0);
    const carta=srvM.filter(s=>s.dataPagamento&&s.metodoPagamento==="carta").reduce((a,s)=>a+prezzoLordo(s),0);
    const altro=srvM.filter(s=>s.dataPagamento&&!["contanti","bonifico","carta"].includes(s.metodoPagamento)).reduce((a,s)=>a+prezzoLordo(s),0);
    const nServ=srvM.filter(s=>s.dataPagamento).length;
    return{nome,mm,entrate,commissioni,spese_tot,contanti,bonifico,carta,altro,nServ};
  }).filter(m=>m.entrate>0||m.spese_tot>0);
  const totEntrate=mesiDati.reduce((a,m)=>a+m.entrate,0);
  const totCommissioni=mesiDati.reduce((a,m)=>a+m.commissioni,0);
  const totSpese=mesiDati.reduce((a,m)=>a+m.spese_tot,0);
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h2 style={{...S.gld,margin:0}}>Report {anno!=="tutti"?anno:""}</h2>
      <button onClick={()=>{
        const cli=clienti.find(c=>c.id===filtroC);
        const drv=driver.find(d=>d.id===filtroD);
        const w=window.open("","_blank");
        w.document.write("<html><head><title>Report "+anno+"</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#000;padding:20px;margin:0}h1{font-size:18px;border-bottom:2px solid #000;padding-bottom:8px}h2{font-size:14px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-bottom:12px}td,th{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#f0f0f0;font-weight:bold}.totale{font-weight:bold;font-size:14px}.verde{color:#16a34a}.rosso{color:#dc2626}</style></head><body>");
        w.document.write("<h1>BLACK DIAMOND TRANSFERT — Report "+anno+(cli?" — "+cli.nome:"")+(drv?" — "+drv.nome:"")+"</h1>");
        w.document.write("<p>Generato il: "+new Date().toLocaleDateString("it-IT")+"</p>");
        w.document.write("<h2>Riepilogo Annuale</h2>");
        w.document.write("<table><tr><th>Voce</th><th>Importo</th></tr>");
        w.document.write("<tr><td>Totale Entrate</td><td class=verde>€ "+fmt(totEntrate)+"</td></tr>");
        w.document.write("<tr><td>Totale Spese</td><td class=rosso>€ "+fmt(totSpese)+"</td></tr>");
        w.document.write("<tr><td class=totale>Utile Lordo</td><td class=totale>€ "+fmt(totEntrate-totSpese)+"</td></tr>");
        w.document.write("</table>");
        w.document.write("<h2>Dettaglio Mensile</h2>");
        w.document.write("<table><tr><th>Mese</th><th>Servizi</th><th>Entrate</th><th>Contanti</th><th>Bonifico</th><th>Carta</th><th>Altro</th><th>Spese</th></tr>");
        mesiDati.forEach(m=>{w.document.write("<tr><td>"+m.nome+"</td><td>"+m.nServ+"</td><td>€ "+fmt(m.entrate)+"</td><td>€ "+fmt(m.contanti)+"</td><td>€ "+fmt(m.bonifico)+"</td><td>€ "+fmt(m.carta)+"</td><td>€ "+fmt(m.altro)+"</td><td>€ "+fmt(m.spese_tot)+"</td></tr>");});
        w.document.write("</table>");
        w.document.write("<h2>Lista Servizi</h2>");
        w.document.write("<table><tr><th>Data</th><th>Ora</th><th>Passeggero</th><th>Committente</th><th>Driver</th><th>Tipo</th><th>Metodo</th><th>Importo</th></tr>");
        srv.filter(s=>s.dataPagamento).sort((a,b)=>a.data>b.data?1:-1).forEach(s=>{const c=clienti.find(x=>x.id===s.committenteId);const d=driver.find(x=>x.id===s.driverId);w.document.write("<tr><td>"+s.data+"</td><td>"+(s.ora||"")+"</td><td>"+(s.nomeUtente||"")+"</td><td>"+(c?.nome||"")+"</td><td>"+(d?.nome||"")+"</td><td>"+s.tipo+"</td><td>"+(s.metodoPagamento||"")+"</td><td>€ "+fmt(prezzoLordo(s))+"</td></tr>");});
        w.document.write("</table>");
        w.document.write("<h2>Spese per Categoria</h2>");
        w.document.write("<table><tr><th>Data</th><th>Categoria</th><th>Descrizione</th><th>Importo</th></tr>");
        sp.sort((a,b)=>a.data>b.data?1:-1).forEach(s=>{w.document.write("<tr><td>"+s.data+"</td><td>"+s.tipo+"</td><td>"+(s.descrizione||"")+"</td><td>€ "+fmt(s.importo)+"</td></tr>");});
        w.document.write("</table>");
        w.document.write("</body></html>");
        w.document.close();
        setTimeout(()=>w.print(),500);
      }} style={{background:"#e8d5a3",color:"#000",border:"none",borderRadius:6,padding:"7px 16px",cursor:"pointer",fontSize:13,fontWeight:700}}>📄 Esporta PDF</button>
    </div>
    <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
      <select style={{...S.inp,flex:1,minWidth:160}} value={filtroC} onChange={e=>setFiltroC(e.target.value)}>
        <option value="">Tutti i committenti</option>
        {clienti.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <select style={{...S.inp,flex:1,minWidth:160}} value={filtroD} onChange={e=>setFiltroD(e.target.value)}>
        <option value="">Tutti i driver</option>
        {driver.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
      </select>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12,marginBottom:16}}>
      <div style={{...S.card,border:"1px solid #4ade8044",textAlign:"center"}}>
        <div style={{color:"#4ade80",fontSize:11,textTransform:"uppercase",letterSpacing:1}}>Totale Entrate</div>
        <div style={{color:"#4ade80",fontFamily:"Georgia,serif",fontSize:26,fontWeight:700}}>{fmt(totEntrate)}</div>
        {totCommissioni>0&&<div style={{color:"#4ade80",fontSize:11,marginTop:4}}>Netto commissioni: {fmt(totEntrate-totCommissioni)}</div>}
      </div>
      {totCommissioni>0&&<div style={{...S.card,border:"1px solid #a78bfa44",textAlign:"center"}}>
        <div style={{color:"#a78bfa",fontSize:11,textTransform:"uppercase",letterSpacing:1}}>Commissioni</div>
        <div style={{color:"#a78bfa",fontFamily:"Georgia,serif",fontSize:26,fontWeight:700}}>-{fmt(totCommissioni)}</div>
      </div>}
      <div style={{...S.card,border:"1px solid #f8717144",textAlign:"center"}}>
        <div style={{color:"#f87171",fontSize:11,textTransform:"uppercase",letterSpacing:1}}>Totale Spese</div>
        <div style={{color:"#f87171",fontFamily:"Georgia,serif",fontSize:26,fontWeight:700}}>{fmt(totSpese)}</div>
      </div>
      <div style={{...S.card,border:"1px solid #e8d5a344",textAlign:"center"}}>
        <div style={{color:"#e8d5a3",fontSize:11,textTransform:"uppercase",letterSpacing:1}}>Utile Lordo</div>
        <div style={{color:"#e8d5a3",fontFamily:"Georgia,serif",fontSize:26,fontWeight:700}}>{fmt(totEntrate-totSpese)}</div>
      </div>
    </div>
    {mesiDati.map(m=><div key={m.mm} style={{...S.card,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{color:"#e8d5a3",fontWeight:700,fontSize:15}}>{m.nome}</div>
        <div style={{color:"#4ade80",fontFamily:"Georgia,serif",fontWeight:700,fontSize:16}}>{fmt(m.entrate)}</div>
      </div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:12,color:"#8892a4"}}>
        <span>📋 {m.nServ} servizi</span>
        {m.contanti>0&&<span>💵 Contanti: {fmt(m.contanti)}</span>}
        {m.bonifico>0&&<span>🏦 Bonifico: {fmt(m.bonifico)}</span>}
        {m.carta>0&&<span>💳 Carta: {fmt(m.carta)}</span>}
        {m.altro>0&&<span>📱 Altro: {fmt(m.altro)}</span>}
        {m.spese_tot>0&&<span style={{color:"#f87171"}}>🔴 Spese: {fmt(m.spese_tot)}</span>}
      </div>
    </div>)}
    {mesiDati.length===0&&<div style={{color:"#4b5563",textAlign:"center",padding:40}}>Nessun dato per questo periodo</div>}
  </div>;
}
function Login({onLogin}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [showPwd,setShowPwd]=useState(false);
  const accedi=async()=>{
    setLoading(true);setErr("");
    const{error}=await supa.auth.signInWithPassword({email,password});
    if(error){setErr("Email o password errati");setLoading(false);}
    else onLogin();
  };
  return <div style={{minHeight:"100vh",background:"#0a0d1a",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:"#1a1f2e",border:"1px solid #2d3550",borderRadius:16,padding:"40px 32px",width:"100%",maxWidth:380}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{color:"#e8d5a3",fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,letterSpacing:2,marginBottom:4}}>BLACK DIAMOND TRANSFERT</div>
        <div style={{color:"#8892a4",fontSize:13,letterSpacing:1}}>Gestionale NCC</div>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{color:"#8892a4",fontSize:12,marginBottom:6}}>Email</div>
        <input style={{width:"100%",background:"#0f1320",border:"1px solid #2d3550",borderRadius:6,color:"#e2e8f0",padding:"10px 12px",fontSize:15,fontFamily:"inherit",boxSizing:"border-box"}} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@esempio.com" onKeyDown={e=>e.key==="Enter"&&accedi()} autoComplete="username"/>
      </div>
      <div style={{marginBottom:24}}>
        <div style={{color:"#8892a4",fontSize:12,marginBottom:6}}>Password</div>
        <div style={{position:"relative"}}><input style={{width:"100%",background:"#0f1320",border:"1px solid #2d3550",borderRadius:6,color:"#e2e8f0",padding:"10px 40px 10px 12px",fontSize:15,fontFamily:"inherit",boxSizing:"border-box"}} type={showPwd?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&accedi()} autoComplete="current-password"/><button type="button" onClick={()=>setShowPwd(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#8892a4",fontSize:16}}>{showPwd?"🙈":"👁"}</button></div>
      </div>
      {err&&<div style={{color:"#f87171",fontSize:13,marginBottom:16,textAlign:"center"}}>{err}</div>}
      <div style={{textAlign:"center",marginBottom:16}}><button type="button" onClick={async()=>{if(!email){setErr("Inserisci prima la tua email");return;}const{error}=await supa.auth.resetPasswordForEmail(email,{redirectTo:"https://gestionale.blackdiamondtransfert.it"});if(error)setErr("Errore: "+error.message);else setErr("✓ Email di reset inviata — controlla la tua casella");}} style={{background:"none",border:"none",color:"#8892a4",fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Password dimenticata?</button></div>
      <button onClick={accedi} disabled={loading} style={{width:"100%",background:"#e8d5a3",border:"none",color:"#0a0d1a",borderRadius:8,padding:"12px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:1}}>{loading?"Accesso in corso...":"Accedi"}</button>
    </div>
  </div>;
}
export default function App(){
  const [sessione,setSessione]=useState(null);
  const [checkSess,setCheckSess]=useState(false);
  useEffect(()=>{
    supa.auth.getSession().then(({data:{session}})=>{setSessione(session);setCheckSess(true);});
    const{data:{subscription}}=supa.auth.onAuthStateChange((_,session)=>setSessione(session));
    return()=>subscription.unsubscribe();
  },[]);
  if(!checkSess)return <div style={{minHeight:"100vh",background:"#0a0d1a"}}/>;
  if(!sessione)return <Login onLogin={()=>supa.auth.getSession().then(({data:{session}})=>setSessione(session))}/>;
  return <AppContent/>;
}
function AppContent(){
  const [page,setPage]=useState("servizi");
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
  const [refreshTick,setRefreshTick]=useState(0);
  const refreshData=async()=>{
    if(saveTimer.current)return;
    setSaveStatus("Aggiornamento...");
    const data=await loadAll();
    if(saveTimer.current)return;
    setClientiR(data.clienti);setDriverR(data.driver);setServiziR(data.servizi);setSpeseR(data.spese);
    dataRef.current={clienti:data.clienti,driver:data.driver,servizi:data.servizi,spese:data.spese};
    setRefreshTick(t=>t+1);
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
      saveTimer.current=null;
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

  const alerts=driver.filter(d=>isExp(d.scadBollo)||isExp(d.scadPatente)||isExp(d.scadAss)||isExp(d.scadRev)||isNear(d.scadBollo)||isNear(d.scadPatente)||isNear(d.scadAss)||isNear(d.scadRev)||(d.ztl||[]).some(z=>z.scaduta||(z.scadenza&&(isExp(z.scadenza)||isNear(z.scadenza)))));
  const daPagare=srvF.filter(s=>!s.dataPagamento).length;

  const NAV=[
    {id:"servizi",l:"Servizi",i:"list"},
    {id:"calendario",l:"Calendario",i:"cal"},
    {id:"dapagare",l:"Da Pagare",i:"clk",badge:daPagare},
    {id:"spese",l:"Spese",i:"eur"},
    {id:"home",l:"Home",i:"home"},
    {id:"preventivi",l:"Preventivi",i:"fatt"},
    {id:"clienti",l:"Committenti",i:"users"},
    {id:"driver",l:"Driver",i:"car",badge:alerts.length},
    {id:"report",l:"Report",i:"fatt"},
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
    <div style={{...S.nav,justifyContent:"space-between"}}>
      <div style={{display:"flex",overflowX:"auto"}}>
      {NAV.map(n=><button key={n.id} onClick={()=>setPage(n.id)} style={{background:"none",border:"none",borderBottom:"2px solid "+(page===n.id?"#e8d5a3":"transparent"),color:page===n.id?"#ffffff":"#a0aec0",fontWeight:page===n.id?700:400,padding:"9px 11px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:15,whiteSpace:"nowrap"}}>
        <Ic n={n.i} z={13}/>{n.l}
        {n.badge>0&&<span style={{background:"#dc2626",color:"white",borderRadius:10,padding:"1px 5px",fontSize:10,fontWeight:700}}>{n.badge}</span>}
      </button>)}
      </div>
      <button onClick={()=>supa.auth.signOut()} style={{background:"none",border:"none",color:"#6b7280",fontSize:12,cursor:"pointer",padding:"9px 11px",whiteSpace:"nowrap",flexShrink:0}}>Esci</button>
    </div>
    <div style={S.cnt}>
      {page==="home"&&<Home servizi={srvF} spese={spF} anno={anno} tutteSpese={spese}/>}
      {page==="calendario"&&<Calendario servizi={servizi} setServizi={setServizi} driver={driver}/>}
      {page==="servizi"&&<Servizi servizi={srvF} setServizi={setServizi} clienti={clienti} driver={driver} anno={anno}/>}
      {page==="dapagare"&&<DaPagare servizi={srvF} clienti={clienti} driver={driver} setServizi={setServizi}/>}
      {page==="spese"&&<Spese spese={spF} setSpese={setSpese} driver={driver} anno={anno}/>}
      {page==="preventivi"&&<Preventivi refreshTick={refreshTick}/>}
      {page==="clienti"&&<Clienti clienti={clienti} setClienti={setClienti} servizi={servizi}/>}
      {page==="driver"&&<Driver driver={driver} setDriver={setDriver}/>}
      {page==="report"&&<Report servizi={srvF} spese={spF} clienti={clienti} driver={driver} anno={anno}/>}
    </div>
  </div>;
}
