import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import PolicyAnalysisPage from './pages/PolicyAnalysisPage';
import DatabaseMonitorPage from './pages/DatabaseMonitorPage';
import ViolationsPage from './pages/ViolationsPage';
import ScanHistoryPage from './pages/ScanHistoryPage';
import Sidebar from './components/Sidebar';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/policies" element={<PolicyAnalysisPage />} />
      <Route path="/databases" element={<DatabaseMonitorPage />} />
      <Route path="/violations" element={<ViolationsPage />} />
      <Route path="/history" element={<ScanHistoryPage />} />
    </Routes>
  );
};

export default App;
