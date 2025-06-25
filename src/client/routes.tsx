import { createBrowserRouter } from 'react-router-dom';
import { ReturnReminder } from './pages/ReturnReminder';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ReturnReminder />,
  },
]);
