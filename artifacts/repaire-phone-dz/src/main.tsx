import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';

import './index.css';

// Wire the JWT token from localStorage into every API request.
// customFetch only attaches Authorization when a getter is registered;
// without this the token is stored but never sent → 401 on every auth call.
setAuthTokenGetter(() => localStorage.getItem('token'));

createRoot(document.getElementById('root')!).render(<App />);
