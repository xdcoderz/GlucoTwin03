import {useState} from 'react';
import type {DashboardData} from '../types';
import TwinExperience from './TwinExperience';

export default function WorkspaceScenarios({data,api,active}:{data:DashboardData;api:string;active:boolean}) {
  const [open,setOpen]=useState(false);
  return <details className="workspace-scenarios" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>Glucose scenarios · 3D twin &amp; falling-glucose countdown</summary>
    <p className="workspace-scenario-intro">Explore five fictional glucose stories. The scenario chart, soft body glow and countdown follow the selected sample. Organs keep their natural colors. Saved model results and patient readings stay separate.</p>
    {open && <TwinExperience data={data} api={api} fixedPhase="vision" active={active && open} instanceScope="workspace-demo"/>}
  </details>;
}
