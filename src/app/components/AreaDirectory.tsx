import React, {useEffect,useState} from 'react';
import {Search,RefreshCw} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {filterAreas} from './area-directory.mjs';
type Area={id:number;city:string;neighborhood:string|null;state_code:string|null;is_active:boolean};
export function AreaDirectory(){
 const [rows,setRows]=useState<Area[]>([]);
 const [query,setQuery]=useState('');
 const [limit,setLimit]=useState(50);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let active=true;
  async function load(){
   setLoading(true);setError('');
   try{
    const all:Area[]=[];
    for(let offset=0;;offset+=1000){
     const {data,error}=await supabase.from('community_areas').select('id,city,neighborhood,state_code,is_active').order('id',{ascending:true}).range(offset,offset+999);
     if(!active)return;
     if(error)throw error;
     all.push(...(data||[]));
     if((data||[]).length<1000)break;
    }
    all.sort((a,b)=>a.city.localeCompare(b.city)||(a.neighborhood||'').localeCompare(b.neighborhood||''));
    setRows(all);setLimit(50);
   }catch{if(active){setRows([]);setError('Could not load the area directory. Please refresh to try again.');}}
   finally{if(active)setLoading(false);}
  }
  void load();return()=>{active=false;};
 },[revision]);
 const filtered=filterAreas(rows,query) as Area[];
 return <section aria-label="Existing areas" className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="font-semibold">Existing cities & neighborhoods</h2><p className="mt-1 text-sm text-muted-foreground">Browse the areas already created in Neighborly.</p></div>
   <button type="button" disabled={loading} onClick={()=>setRevision(x=>x+1)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw size={13} className={loading?'animate-spin':''}/> Refresh areas</button>
  </div>
  <label className="mt-4 flex items-center gap-2 rounded-xl border border-border px-3 py-2.5"><Search size={16} className="shrink-0 text-purple-600"/><input aria-label="Search cities and neighborhoods" type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimit(50);}} placeholder="Search city, neighborhood, or state" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
  {loading?<p role="status" className="py-6 text-sm text-muted-foreground">Loading existing areas…</p>:error?<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>:<>
   <p role="status" className="my-3 text-xs text-muted-foreground">{filtered.length} {filtered.length===1?'area':'areas'}{query.trim()?` matching your search · ${rows.length} total`: ' in the directory'}</p>
   {filtered.length===0?<p className="rounded-xl bg-muted p-4 text-sm">{rows.length?'No areas match your search.':'No areas have been created yet.'}</p>:<ul className="divide-y divide-border">{filtered.slice(0,limit).map(row=><li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
    <div className="min-w-0"><p className="break-words text-sm font-semibold">{row.neighborhood||row.city}</p><p className="text-xs text-muted-foreground">{row.neighborhood?`Neighborhood · ${row.city}`:'City'}{row.state_code?` · ${row.state_code}`:''}</p></div>
    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${row.is_active?'bg-emerald-50 text-emerald-800':'bg-stone-100 text-stone-700'}`}>{row.is_active?'Active':'Inactive'}</span>
   </li>)}</ul>}
   {filtered.length>limit&&<button type="button" onClick={()=>setLimit(x=>x+50)} className="mt-3 rounded-lg border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700">Show more areas</button>}
  </>}
 </section>;
}
