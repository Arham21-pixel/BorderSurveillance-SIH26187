import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts";
import Login from "./pages/Login";
import Alerts from "./pages/Alerts";
import AlertDetails from "./pages/AlertDetails";
import Analytics from "./pages/Analytics";
import Cameras from "./pages/Cameras";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Evidence from "./pages/Evidence";
import MapPage from "./pages/MapPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Command Center Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/cameras" element={<Cameras />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/alerts/:alertId" element={<AlertDetails />} />
                  <Route path="/evidence" element={<Evidence />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
