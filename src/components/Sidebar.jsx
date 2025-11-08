import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/icono.png";
import "font-awesome/css/font-awesome.min.css";

function Sidebar({ onToggleSidebar }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saludo, setSaludo] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Obtener el username desde localStorage
    const usuarioUsername = localStorage.getItem("username") || "Usuario";
    setUsername(usuarioUsername);

    // Obtener la hora actual en la zona horaria de Perú para el saludo
    const ahora = new Date();
    const optionsSaludo = {
      timeZone: "America/Lima",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    // Extraer la hora en formato 24 horas desde la zona horaria de Perú
    const horaPeru = new Intl.DateTimeFormat("es-PE", optionsSaludo).format(
      ahora
    );
    const hora = parseInt(horaPeru.split(":")[0], 10);

    // Determinar el saludo según la hora
    if (hora >= 0 && hora < 12) {
      setSaludo("Buenos días");
    } else if (hora >= 12 && hora < 18) {
      setSaludo("Buenas tardes");
    } else {
      setSaludo("Buenas noches");
    }
  }, []);

  const toggleMenu = () => {
    const newIsMenuOpen = !isMenuOpen;
    setIsMenuOpen(newIsMenuOpen);
    onToggleSidebar(newIsMenuOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    navigate("/login", { replace: true });
    window.location.reload();
  };

  return (
    <div>
      {/* Barra lateral */}
      <div
        className={`fixed top-0 left-0 h-full w-[200px] sm:w-[230px] lg:w-[260px] bg-[#1da4cf] text-white flex flex-col justify-between p-4 z-50 transform ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-10 transition-transform duration-300`}
      >
        {/* Contenido superior */}
        <div className="flex flex-col flex-grow">
          {/* Contenedor del logo */}
          <div className="flex flex-col items-center justify-center py-6">
            <img src={logo} alt="Logo" className="w-25 h-25 object-contain" />
          </div>

          {/* Saludo como encabezado */}
          <div className="px-4 pb-4 border-b border-white/20">
            <h2 className="text-lg font-semibold text-white">
              {saludo}, {username}!
            </h2>
          </div>

          {/* Navegación del menú */}
          <nav className="flex flex-col text-xs sm:text-sm space-y-4 px-2 mt-4 overflow-auto">
            <Link
              to="/dashboard/main"
              className="hover:bg-[#167f9f] p-2 rounded text-left text-xs sm:text-sm flex items-center"
            >
              <i className="fa fa-home mr-3 text-lg"></i> Home
            </Link>

            <Link
              to="/dashboard/listado"
              className="hover:bg-[#167f9f] p-2 rounded text-left text-xs sm:text-sm flex items-center"
            >
              <i className="fa fa-list mr-3 text-lg"></i> Listado Entrada -
              Salida
            </Link>

            <Link
              to="/dashboard/usuarios"
              className="hover:bg-[#167f9f] p-2 rounded text-left text-xs sm:text-sm flex items-center"
            >
              <i className="fa fa-users mr-3 text-lg"></i> Usuarios
            </Link>
          </nav>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="hover:bg-[#167f9f] p-2 rounded text-left text-xs sm:text-sm flex items-center w-full"
          >
            <i className="fa fa-sign-out mr-3 text-lg"></i> Salir
          </button>
        </div>
      </div>

      {/* Menú hamburguesa */}
      <button
        onClick={toggleMenu}
        className="lg:hidden text-2xl p-2 mt-4 absolute top-4 left-4 z-60 text-[#167f9f]"
        style={{ top: "10px", left: "15px" }}
      >
        <i className="fa fa-bars"></i>
      </button>

      {/* Fondo semitransparente */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleMenu}
        ></div>
      )}

      {/* Modal de confirmación */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 sm:p-8 shadow-lg max-w-sm w-full">
            <h2
              className="text-lg sm:text-xl font-semibold mb-4 text-center"
              style={{ color: "#167f9f" }}
            >
              ¿Estás seguro de que deseas salir?
            </h2>
            <div className="flex justify-between">
              <button
                onClick={() => setIsModalOpen(false)}
                className="py-2 px-4 rounded-lg bg-gray-200 text-sm sm:text-base font-medium text-gray-700 hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="py-2 px-4 rounded-lg text-sm sm:text-base font-medium text-white transition"
                style={{ backgroundColor: "#167f9f" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
