import React, {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {Link} from 'react-router';
import {ArrowLeft,Download,Smartphone,CheckCircle2} from 'lucide-react';
import neighborlyLogo from '@/imports/Copilot_20260807_041314.png';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
type InstallState={available:boolean;installed:boolean;busy:boolean;notice:string;install:()=>Promise<void>};
const InstallContext=createContext<InstallState|null>(null);
export function InstallAppProvider({children}:{children:ReactNode}){
 const [promptEvent,setPromptEvent]=useState<InstallEvent|null>(null);
 const [installed,setInstalled]=useState(false);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  const display=window.matchMedia('(display-mode: standalone)');
  const update=()=>setInstalled(display.matches||(navigator as Navigator&{standalone?:boolean}).standalone===true);
  const before=(event:Event)=>{event.preventDefault();setPromptEvent(event as InstallEvent);};
  const complete=()=>{setInstalled(true);setPromptEvent(null);setNotice('');};
  update();display.addEventListener('change',update);
  window.addEventListener('beforeinstallprompt',before);window.addEventListener('appinstalled',complete);
  return()=>{display.removeEventListener('change',update);window.removeEventListener('beforeinstallprompt',before);window.removeEventListener('appinstalled',complete);};
 },[]);
 async function install(){
  if(!promptEvent||busy)return;
  setBusy(true);setNotice('');
  try{await promptEvent.prompt();const choice=await promptEvent.userChoice;setNotice(choice.outcome==='accepted'?'Follow your browser’s installation steps.':'You can install Neighborly later from your browser menu.');}
  catch{setNotice('Use the instructions below to install from your browser menu.');}
  finally{setPromptEvent(null);setBusy(false);}
 }
 return <InstallContext.Provider value={{available:!!promptEvent,installed,busy,notice,install}}>{children}</InstallContext.Provider>;
}
export function InstallAppPage(){
 const state=useContext(InstallContext);
 if(!state)throw new Error('InstallAppProvider is required');
 return <main className="min-h-screen bg-purple-950 px-4 py-8 text-white sm:py-12">
  <div className="mx-auto max-w-2xl">
   <Link to="/" className="inline-flex items-center gap-2 text-sm text-purple-100 hover:text-white"><ArrowLeft size={16}/> Back to Neighborly</Link>
   <section className="mt-6 rounded-3xl bg-white p-6 text-slate-900 shadow-xl sm:p-9">
    <img src={neighborlyLogo} alt="Neighborly" className="mx-auto h-auto w-52"/>
    <h1 className="mt-5 text-center font-serif text-3xl font-bold">Neighborly, on your home screen.</h1>
    <p className="mt-3 text-center text-sm leading-6 text-slate-600">Install Neighborly for quick access to your neighbors, local businesses, and community updates. The app is free to install and uses your existing account.</p>
    {state.installed?<p role="status" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800"><CheckCircle2 size={20}/> Neighborly is installed.</p>:state.available?<button type="button" disabled={state.busy} onClick={()=>void state.install()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 font-semibold text-white hover:bg-purple-800 disabled:opacity-50"><Download size={18}/>{state.busy?'Opening install…':'Install Neighborly'}</button>:<p className="mt-5 rounded-xl bg-purple-50 p-4 text-sm text-purple-900">Use your browser’s install menu, following the steps below.</p>}
    {state.notice&&<p role="status" className="mt-3 text-sm text-purple-800">{state.notice}</p>}
    {!state.installed&&<div className="mt-6 space-y-4">
     <section className="rounded-xl border border-slate-200 p-4"><h2 className="flex items-center gap-2 font-semibold"><Smartphone size={18} className="text-purple-700"/> iPhone or iPad</h2><p className="mt-2 text-sm leading-6 text-slate-600">Open this website in Safari. Tap Share, then Add to Home Screen, and confirm Add. If offered, keep Open as Web App enabled.</p></section>
     <section className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Android</h2><p className="mt-2 text-sm leading-6 text-slate-600">Open this website in Chrome. Tap the three-dot menu, then Install app or Add to Home screen, and confirm Install.</p></section>
     <section className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Computer</h2><p className="mt-2 text-sm leading-6 text-slate-600">In Chrome or Edge, use the install icon in the address bar or the browser menu’s install option.</p></section>
    </div>}
    <p className="mt-5 text-xs leading-5 text-slate-500">An internet connection is required for Neighborly. If you are viewing this inside another app, open it in Safari or Chrome to install.</p>
   </section>
  </div>
 </main>;
}
