import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import Listado from "./components/Listadovehiculos/Listado";
import Usuarios from "./components/Usuarios/Usuarios";
import Login from "./components/Login";
import PricingPlans from "./client/PricingPlans";
import { UserProvider } from "./components/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [, setIsSidebarOpen] = useState(false);

  const handleToggleSidebar = (isOpen) => {
    setIsSidebarOpen(isOpen);
  };

  return (
    <UserProvider>
      <Router>
        <Routes>
          {/* Ruta para Login */}
          <Route path="/login" element={<Login />} />

          {/* Ruta para PricingPlans sin Sidebar */}
          <Route path="/pricing" element={<PricingPlans />} />

          {/* Ruta por defecto: mostrar PricingPlans directamente */}
          <Route path="/" element={<PricingPlans />} />

          {/* Rutas protegidas bajo /dashboard */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <div className="flex h-screen">
                  <Sidebar onToggleSidebar={handleToggleSidebar} />
                  <div className="w-full">
                    <Routes>
                      <Route path="/" element={<PricingPlans />} />
                      <Route path="main" element={<MainContent />} />
                      <Route path="listado" element={<Listado />} />
                      <Route path="usuarios" element={<Usuarios />} />
                      <Route path="pricing" element={<PricingPlans />} />
                    </Routes>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
