import React from 'react';
import {createRoot} from 'react-dom/client';
import Inbox from './Inbox';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Inbox/></React.StrictMode>);
if('serviceWorker'in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register(new URL('sw.js',document.baseURI)).catch(()=>{})});
