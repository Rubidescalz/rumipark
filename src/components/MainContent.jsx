import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VehicleTable from "./VehicleTable";
import CameraSection from "./CameraSection";

function MainContent() {
  const [estadoVehiculos] = useState([]);
  const [currentTime, setCurrentTime] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar si existe un auth_token en localStorage
    if (!localStorage.getItem("auth_token")) {
      navigate("/"); // Redirige al login si no hay token
    }
  }, [navigate]);

  useEffect(() => {
    // Actualizar la hora y fecha cada segundo
    const interval = setInterval(() => {
      const now = new Date();
      const formattedTime = now.toLocaleString(); // Usa la hora local
      setCurrentTime(formattedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full min-h-screen p-5 bg-gray-100 overflow-auto">
      <div
        className="bg-gray-200 rounded-lg p-4 mb-6 shadow-md border-4 w-full"
        style={{ borderColor: "#167f9f" }}
      >
        <div className="flex flex-col items-center mb-4 md:flex-row md:justify-between">
          <h2 className="text-xl font-bold text-gray-700 text-center">
            Detección de Placas
          </h2>
          <div className="flex items-center text-lg text-gray-600 mt-2 md:mt-0">
            <i className="fas fa-calendar-alt mr-2 text-blue-600"></i>
            <span className="mr-4">{currentTime.split(",")[0]}</span>
            <i className="fas fa-clock mr-2 text-green-600"></i>
            <span>{currentTime.split(",")[1]}</span>
          </div>
        </div>
        <CameraSection />
      </div>

      <div className="bg-white rounded-lg p-4 shadow-md w-full">
        <h2 className="text-xl font-bold text-gray-700 text-center mb-4">
          Estado de Vehículos
        </h2>
        <VehicleTable estadoVehiculos={estadoVehiculos} />
      </div>
    </div>
  );
}

export default MainContent;
