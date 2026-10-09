import { createRoot } from 'react-dom/client';
import { PopupPage } from './components/PopupPage.tsx';

const host = document.getElementById('root');
if (!host) {
  throw new Error('missing element #root');
}
createRoot(host).render(<PopupPage />);
