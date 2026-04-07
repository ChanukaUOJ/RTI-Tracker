import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Templates } from './pages/Templates';
import { RTIRequests } from './pages/RTIRequests';
import { Receivers } from './pages/Receivers';
import { Senders } from './pages/Senders';
import { Status } from './pages/Status';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="templates" element={<Templates />} />
          <Route path="rti-requests" element={<RTIRequests />} />
          <Route path="receivers" element={<Receivers />} />
          <Route path="senders" element={<Senders />} />
          <Route path="status" element={<Status />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}