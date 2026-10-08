import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { A, useStore, useUI } from './store/store';
import { PAGES } from './pages';
import { REPORTS } from './features/reports';
import { DEFS } from './features/masters';
if ((import.meta as ImportMeta & {env:{DEV:boolean}}).env.DEV) { try { (window as any).__skt = { A, useStore, useUI, routes: Object.keys(PAGES), reports: REPORTS.map((r: any) => r.id), masters: Object.keys(DEFS) }; } catch { /* test hook */ } }
createRoot(document.getElementById('root')!).render(<App />);
