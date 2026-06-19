import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import AppointmentList from "@/pages/AppointmentList";
import AppointmentNew from "@/pages/AppointmentNew";
import AppointmentDetail from "@/pages/AppointmentDetail";
import MemberList from "@/pages/MemberList";
import MemberDetail from "@/pages/MemberDetail";
import PointsCenter from "@/pages/PointsCenter";
import ServiceList from "@/pages/ServiceList";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import { useAppStore } from "@/store";

export default function App() {
  const initData = useAppStore((s) => s.initData);

  useEffect(() => {
    initData();
  }, [initData]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appointments" element={<AppointmentList />} />
          <Route path="/appointments/new" element={<AppointmentNew />} />
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
          <Route path="/members" element={<MemberList />} />
          <Route path="/members/:id" element={<MemberDetail />} />
          <Route path="/points" element={<PointsCenter />} />
          <Route path="/services" element={<ServiceList />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
