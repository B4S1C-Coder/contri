import { createRoot } from 'react-dom/client';
import { App } from './content/ui/App';
import './content/widget.css';
import './settings/settings.css';

/** `npm run dev` layout preview. Live data needs the installed extension. */
createRoot(document.getElementById('root')!).render(
  <>
    <p style={{ font: '12px system-ui', color: '#345', textAlign: 'center' }}>
      Layout preview · install the extension for live GitHub data
    </p>
    <div style={{ width: 380, height: 540, maxWidth: '100%', margin: '20px auto' }}>
      <App
        page={{ repo: null, issue: null }}
        onMinimize={() => {}}
        onClose={() => {}}
        onPositionReset={() => {}}
        onDrag={() => {}}
        onMove={() => {}}
      />
    </div>
  </>,
);
