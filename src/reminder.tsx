import { createRoot } from 'react-dom/client';
import { ReminderPage } from './components/ReminderPage.tsx';

const host = document.getElementById('root');
if (!host) {
  throw new Error('missing element #root');
}
createRoot(host).render(<ReminderPage />);
