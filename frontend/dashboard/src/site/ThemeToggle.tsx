import { useState } from 'react';
import { createElement, Moon, Sun } from 'lucide';
import { applyTheme, type Theme } from './theme';

function ThemeIcon({ dark }: { dark: boolean }) {
  const icon=dark ? Sun : Moon;
  const element=createElement([icon[0],{...icon[1],width:'20',height:'20','stroke-width':'1.6','aria-hidden':'true'},icon[2]]);
  return <span aria-hidden="true" dangerouslySetInnerHTML={{__html:element.outerHTML}} />;
}
export default function ThemeToggle() {
  const [theme,setTheme]=useState<Theme>(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  return <button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={()=>{
    const next=theme === 'dark' ? 'light' : 'dark';applyTheme(next);setTheme(next);
  }}><ThemeIcon dark={theme === 'dark'}/><span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button>;
}
