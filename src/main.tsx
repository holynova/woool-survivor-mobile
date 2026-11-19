import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { App } from './App';
import './style.css';

const createRoot =
  (ReactDOMClient as any).createRoot ||
  (ReactDOMClient as any).default?.createRoot;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
