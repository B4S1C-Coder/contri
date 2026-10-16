import { createRoot } from 'react-dom/client';
import { Widget } from './Widget';
import './widget.css';
createRoot(document.getElementById('root')!).render(<><p style={{font:'12px system-ui',color:'#345'}}>Layout preview · install the extension for live GitHub data</p><div style={{width:360,height:460,maxWidth:'100%',margin:'20px auto'}}><Widget initialRepo={null} onMinimize={()=>{}} onClose={()=>{}} onPositionReset={()=>{}} onDrag={()=>{}} onMove={()=>{}}/></div></>);
