import React, { useState, useEffect } from "react";
import axios from "axios";

function VehicleTable() {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = localStorage.getItem("id");

  // Cargar los registros iniciales y actualizar cada segundo
  useEffect(() => {
    const fetchRegistros = async () => {
      try {
        if (!userId) {
          throw new Error(
            "No se encontró el ID del usuario. Por favor, inicia sesión nuevamente."
          );
        }

        const response = await axios.get(
          "https://rumipark-CamiMujica.pythonanywhere.com/registros",
          {
            headers: {
              id: userId,
            },
          }
        );

        const registros = response.data.registros || [];
        const vehicleData = registros.map((registro) => ({
          plate: registro.numero_placa,
          status:
            registro.fecha_salida === null || registro.hora_salida === null
              ? "Entrada"
              : "Salida",
          date:
            registro.fecha_salida === null
              ? registro.fecha_entrada
              : registro.fecha_salida,
          time:
            registro.hora_salida === null
              ? registro.hora_entrada
              : registro.hora_salida,
        }));

        setVehicles(vehicleData);
        setIsLoading(false);
        setError(null);
      } catch (error) {
        console.error("Error al obtener los registros:", error);
        const errorMessage = error.response
          ? `Error al obtener los registros: ${
              error.response.data.message || error.response.statusText
            }`
          : error.message ===
            "No se encontró el ID del usuario. Por favor, inicia sesión nuevamente."
          ? error.message
          : "Error al obtener los registros. Verifica tu conexión o intenta nuevamente.";
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    fetchRegistros();
    const intervalId = setInterval(fetchRegistros, 1000);
    return () => clearInterval(intervalId);
  }, [userId]);

  if (isLoading) {
    return <div className="text-center p-4">Cargando datos...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mx-auto max-w-full overflow-x-auto">
      <table className="w-full text-sm text-gray-700 border-collapse">
        <thead>
          <tr className="bg-blue-50 text-blue-800">
            <th className="text-left py-2 px-4 border-b w-1/4">
              <i className="fas fa-car-side mr-2"></i>Placa
            </th>
            <th className="text-left py-2 px-4 border-b w-1/4">
              <i className="fas fa-info-circle mr-2"></i>Estado
            </th>
            <th className="text-left py-2 px-4 border-b w-1/4">
              <i className="fas fa-calendar-day mr-2"></i>Fecha
            </th>
            <th className="text-left py-2 px-4 border-b w-1/4">
              <i className="fas fa-clock mr-2"></i>Hora
            </th>
          </tr>
        </thead>
        <tbody>
          {vehicles.length > 0 ? (
            vehicles.map((vehicle, index) => (
              <tr
                key={index}
                className={`${
                  index % 2 === 0 ? "bg-white" : "bg-blue-50"
                } hover:bg-blue-200 transition-colors duration-300`}
              >
                <td className="py-2 px-4 border-b w-1/4">
                  <div className="flex items-center">
                    <i className="fas fa-car text-blue-500 mr-2"></i>
                    <span className="truncate">{vehicle.plate}</span>
                  </div>
                </td>
                <td className="py-2 px-4 border-b w-1/4">
                  <span
                    className={`inline-flex px-3 py-1 rounded-md text-xs font-medium items-center ${
                      vehicle.status === "Entrada"
                        ? "bg-green-200 text-green-800"
                        : "bg-orange-200 text-orange-800"
                    }`}
                  >
                    <i
                      className={`mr-1 ${
                        vehicle.status === "Entrada"
                          ? "fas fa-arrow-circle-down"
                          : "fas fa-arrow-circle-up"
                      }`}
                    ></i>
                    {vehicle.status}
                  </span>
                </td>
                <td className="py-2 px-4 border-b w-1/4">
                  <div className="flex items-center">
                    <i className="fas fa-calendar-alt text-blue-500 mr-2"></i>
                    <span className="truncate">{vehicle.date}</span>
                  </div>
                </td>
                <td className="py-2 px-4 border-b w-1/4">
                  <div className="flex items-center">
                    <i className="fas fa-clock text-green-500 mr-2"></i>
                    <span className="truncate">{vehicle.time}</span>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="text-center py-4 border-b">
                No hay registros disponibles.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default VehicleTable;
