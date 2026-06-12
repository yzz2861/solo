import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "@/router/PrivateRoute";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Forbidden from "@/pages/Forbidden";

import ClerkDashboard from "@/pages/clerk/ClerkDashboard";
import EquipmentNewPage from "@/pages/clerk/EquipmentNewPage";
import EquipmentListPage from "@/pages/clerk/EquipmentListPage";
import AppointmentManagePage from "@/pages/clerk/AppointmentManagePage";
import EquipmentDetailPage from "@/pages/common/EquipmentDetailPage";

import InspectorWorkbench from "@/pages/inspector/InspectorWorkbench";
import InspectorDetectPage from "@/pages/inspector/InspectorDetectPage";

import PriceAuditPage from "@/pages/manager/PriceAuditPage";
import AuditLogPage from "@/pages/manager/AuditLogPage";
import SettlementPage from "@/pages/manager/SettlementPage";

import ConsignorPortal from "@/pages/consignor/ConsignorPortal";
import ConsignorFeesPage from "@/pages/consignor/ConsignorFeesPage";

import BuyerShowroomPage from "@/pages/buyer/BuyerShowroomPage";
import BuyerAppointmentPage from "@/pages/buyer/BuyerAppointmentPage";

import { useAuthStore, type UserRole } from "@/store/authStore";

function RoleRedirect() {
  const { currentUser, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  const redirectMap: Record<UserRole, string> = {
    clerk: "/clerk/dashboard",
    inspector: "/inspector/workbench",
    manager: "/manager/price-audit",
    consignor: "/consignor/portal",
    buyer: "/showroom",
  };

  return <Navigate to={redirectMap[currentUser.role]} replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/403" element={<Forbidden />} />

        <Route path="/showroom" element={<BuyerShowroomPage />} />
        <Route path="/showroom/:id/appointment" element={<BuyerAppointmentPage />} />

        <Route element={<AppLayout />}>
          <Route
            element={
              <PrivateRoute
                allowedRoles={["clerk", "inspector", "manager"]}
              />
            }
          >
            <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={["clerk"]} />}>
            <Route path="/clerk/dashboard" element={<ClerkDashboard />} />
            <Route path="/clerk/equipment" element={<EquipmentListPage />} />
            <Route
              path="/clerk/equipment/new"
              element={<EquipmentNewPage />}
            />
            <Route
              path="/clerk/equipment/:id"
              element={<EquipmentDetailPage />}
            />
            <Route
              path="/clerk/appointments"
              element={<AppointmentManagePage />}
            />
          </Route>

          <Route element={<PrivateRoute allowedRoles={["inspector"]} />}>
            <Route
              path="/inspector/workbench"
              element={<InspectorWorkbench />}
            />
            <Route
              path="/inspector/equipment/:id/detect"
              element={<InspectorDetectPage />}
            />
            <Route
              path="/inspector/equipment/:id"
              element={<EquipmentDetailPage />}
            />
          </Route>

          <Route element={<PrivateRoute allowedRoles={["manager"]} />}>
            <Route
              path="/manager/price-audit"
              element={<PriceAuditPage />}
            />
            <Route path="/manager/audit-log" element={<AuditLogPage />} />
            <Route
              path="/manager/settlement"
              element={<SettlementPage />}
            />
            <Route
              path="/manager/equipment/:id"
              element={<EquipmentDetailPage />}
            />
          </Route>

          <Route element={<PrivateRoute allowedRoles={["consignor"]} />}>
            <Route
              path="/consignor/portal"
              element={<ConsignorPortal />}
            />
            <Route
              path="/consignor/fees"
              element={<ConsignorFeesPage />}
            />
          </Route>
        </Route>

        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </Router>
  );
}
