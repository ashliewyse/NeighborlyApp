import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {InstallationWelcome,RegistrationWelcome} from './fixture';
import '../../src/styles/index.css';
function InstallEventChecks(){
 const [calls,setCalls]=useState(0);
 function offer(outcome:'accepted'|'dismissed'){
  const event=new Event('beforeinstallprompt',{cancelable:true});
  Object.assign(event,{prompt:async()=>{setCalls(x=>x+1);},userChoice:Promise.resolve({outcome})});
  window.dispatchEvent(event);
 }
 return <><aside><button onClick={()=>offer('accepted')}>Offer accepted install</button><button onClick={()=>offer('dismissed')}>Offer dismissed install</button><button onClick={()=>window.dispatchEvent(new Event('appinstalled'))}>Complete test installation</button><p role="status">Prompt calls: {calls}</p></aside><InstallationWelcome/></>;
}
createRoot(document.getElementById('root')!).render(location.search.includes('welcome')?<RegistrationWelcome/>:location.search.includes('events')?<InstallEventChecks/>:<InstallationWelcome/>);
