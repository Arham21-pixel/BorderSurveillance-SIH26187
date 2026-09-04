import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./layouts";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";
import Cameras from "./pages/Cameras";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Evidence from "./pages/Evidence";
import MapPage from "./pages/MapPage";

export default function App() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cameras" element={<Cameras />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/evidence" element={<Evidence />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/events" element={<Events />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
