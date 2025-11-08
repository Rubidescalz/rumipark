import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { utils, writeFile } from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [time, setTime] = useState(new Date().toLocaleString());
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem("id");

    if (!userId) {
      navigate("/");
      return;
    }

    const fetchUsuarios = async () => {
      try {
        const response = await axios.get(
          "https://rumipark-CamiMujica.pythonanywhere.com/listar_vehiculos",
          {
            headers: {
              "Content-Type": "application/json",
              id: userId,
            },
          }
        );
        const usuariosData = response.data.vehiculos || [];
        setUsuarios(usuariosData);
        setFilteredUsuarios(usuariosData); // Initialize filtered list
        setIsLoading(false);
      } catch (error) {
        console.error("Error de API:", error);
        setError("Error al obtener los usuarios. Intente nuevamente.");
        setIsLoading(false);
      }
    };

    fetchUsuarios();

    const intervalId = setInterval(() => {
      setTime(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [navigate]);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (query) {
      const filtered = usuarios.filter(
        (usuario) =>
          usuario.propietario.toLowerCase().includes(query) ||
          usuario.numero_placa.toLowerCase().includes(query)
      );
      setFilteredUsuarios(filtered);
    } else {
      setFilteredUsuarios(usuarios);
    }
  };

  const simulateProgress = (callback) => {
    let progressValue = 0;
    setIsExporting(true);
    const interval = setInterval(() => {
      progressValue += 5;
      setProgress(progressValue);
      if (progressValue >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          callback();
          setIsExporting(false);
          setProgress(0);
        }, 500);
      }
    }, 100);
  };

  const exportToExcel = () => {
    setExportType("Excel");
    if (filteredUsuarios.length === 0) {
      alert("No hay usuarios para exportar.");
      return;
    }
    simulateProgress(() => {
      const worksheet = utils.json_to_sheet(filteredUsuarios);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Usuarios");
      writeFile(workbook, `usuarios_${new Date().toLocaleDateString()}.xlsx`);
    });
  };

  const exportToPDF = () => {
    setExportType("PDF");
    if (filteredUsuarios.length === 0) {
      alert("No hay usuarios para exportar.");
      return;
    }
    simulateProgress(() => {
      const doc = new jsPDF();
      const tableColumn = [
        "ID",
        "Placa",
        "Tipo Vehículo",
        "Propietario",
        "DNI",
      ];
      const tableRows = filteredUsuarios.map((usuario) => [
        usuario.id,
        usuario.numero_placa,
        usuario.tipo_vehiculo,
        usuario.propietario || "N/A",
        usuario.dni,
      ]);

      doc.text("Listado de Usuarios Registrados", 14, 10);
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });

      doc.save(`usuarios_${new Date().toLocaleDateString()}.pdf`);
    });
  };

  const ProgressSphere = () => {
    const arcColor =
      exportType === "Excel"
        ? "rgba(0, 128, 0, 0.7)"
        : "rgba(220, 97, 93, 0.7)"; // Verde para Excel, rojo para PDF
    const lightColor =
      exportType === "Excel"
        ? "rgba(144, 238, 144, 0.5)"
        : "rgba(255, 204, 204, 0.5)"; // Luz superior según tipo

    return (
      <div className="relative flex items-center justify-center w-32 h-32 mx-auto">
        {/* Fondo de la esfera con efecto de vidrio */}
        <div
          className="absolute w-full h-full bg-white rounded-full"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            boxShadow:
              "inset 0 4px 6px rgba(255, 255, 255, 0.7), inset 0 -4px 6px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        ></div>

        {/* Representación de progreso como un arco */}
        <div
          className="absolute w-full h-full rounded-full overflow-hidden"
          style={{
            background: `conic-gradient(
              ${arcColor} ${progress * 3.6}deg, 
              rgba(255, 255, 255, 0.1) 0deg
            )`,
          }}
        ></div>

        {/* Punto de luz superior para un efecto 3D */}
        <div
          className="absolute top-2 left-2 w-12 h-12 bg-white rounded-full"
          style={{
            opacity: 0.3,
            background: lightColor,
            boxShadow: `0 0 10px 5px ${lightColor}`,
          }}
        ></div>

        {/* Texto del progreso */}
        <span className="absolute text-lg font-bold text-gray-700">
          {progress}%
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin border-4 border-solid border-[#167f9f] rounded-full w-12 h-12 mx-auto my-4"></div>
        <p className="text-lg text-gray-500">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-4 text-red-600 text-lg">{error}</div>;
  }

  return (
    <div className="w-full h-full min-h-screen p-5 bg-gray-100 overflow-auto">
      <div className="bg-white shadow-xl rounded-lg p-8 mx-auto max-w-7xl">
        <div className="flex flex-col items-center mb-8 border-b-2 pb-4 md:flex-row md:justify-between">
          <h2 className="text-4xl font-bold text-[#167f9f] flex items-center text-center">
            <i className="fas fa-users mr-3 text-[#167f9f]"></i>
            Listado de Usuarios
          </h2>
          <div className="text-lg font-semibold text-gray-600 mt-2 md:mt-0">
            <i className="fas fa-clock mr-2 text-green-600"></i>
            {time}
          </div>
        </div>

        <div className="relative flex items-center mb-6">
          <div className="w-10 h-10 bg-[#167f9f] text-white rounded-full flex items-center justify-center shadow-md">
            <i className="fas fa-search text-lg"></i>
          </div>
          <input
            type="text"
            placeholder="Buscar Propietario o Placa..."
            value={searchQuery}
            onChange={handleSearch}
            className="ml-3 w-full sm:w-64 pl-4 pr-4 py-2 text-sm md:text-base text-gray-700 placeholder-gray-400 bg-white border border-[#167f9f] rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-[#167f9f]"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-6 mb-6">
          <button
            onClick={exportToExcel}
            className="px-6 py-3 border-2 border-[#2a6f3d] bg-[#2a6f3d] bg-opacity-20 text-[#2a6f3d] rounded-xl shadow-md hover:bg-[#276a37] hover:bg-opacity-80 hover:text-white focus:outline-none transition duration-200"
          >
            <i className="fas fa-file-excel mr-2"></i> Exportar a Excel
          </button>

          <button
            onClick={exportToPDF}
            className="px-6 py-3 border-2 border-[#dc615d] bg-[#fce1e0] text-[#dc615d] rounded-xl shadow-md hover:bg-[#dc615d] hover:text-white focus:outline-none transition duration-200"
          >
            <i className="fas fa-file-pdf mr-2"></i> Exportar a PDF
          </button>
        </div>

        {isExporting && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-60">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <p className="text-xl font-semibold text-gray-700 mb-4">
                Exportando a {exportType}...
              </p>
              <ProgressSphere />
            </div>
          </div>
        )}

        <div className="space-y-8">
          {filteredUsuarios.length > 0 ? (
            filteredUsuarios.map((usuario, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-[#e9f7fd] to-[#e9f7fd] p-6 rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {/* Imagen del rostro */}
                    {usuario.imagen && usuario.imagen.startsWith("http") ? (
                      <img
                        src={usuario.imagen}
                        alt="Rostro"
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#167f9f] mr-3 bg-gray-200"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/default-face.png";
                        }}
                      />
                    ) : usuario.imagen ? (
                      <img
                        src={`data:image/jpeg;base64,${(
                          usuario.imagen || ""
                        ).replace(/\s/g, "")}`}
                        alt="Rostro"
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#167f9f] mr-3 bg-gray-200"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/default-face.png";
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-200 border-2 border-[#167f9f] flex items-center justify-center mr-3">
                        <i className="fas fa-user text-[#167f9f] text-2xl"></i>
                      </div>
                    )}
                    <span className="text-xl font-bold text-[#167f9f]">
                      {usuario.numero_placa}
                    </span>
                  </div>
                  <div className="text-lg font-medium text-gray-700">
                    Tipo: {usuario.tipo_vehiculo}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-md text-gray-700">
                  <div className="flex flex-col">
                    <span className="font-medium">Propietario:</span>
                    <span className="text-gray-500">{usuario.propietario}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="font-medium">DNI:</span>
                    <span className="text-gray-500">{usuario.dni}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-xl text-gray-500">
              No se encontraron vehículos registrados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Usuarios;
