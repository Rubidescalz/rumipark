import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toastr from "toastr";
import fondo from "../assets/fondo-login.png";
import icono from "../assets/icono.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faLock,
  faEye,
  faEyeSlash,
  faEnvelope,
  faArrowDown,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";

// Función mejorada con reintentos automáticos
const fetchWithRetry = async (url, options, retries = 3, timeout = 30000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      // Si es el último intento, lanzar el error
      if (i === retries - 1) {
        throw error;
      }

      // Si es timeout o error de conexión, esperar antes de reintentar
      if (error.name === "AbortError" || error.message.includes("fetch")) {
        console.log(`Intento ${i + 1} falló. Reintentando en ${(i + 1) * 1000}ms...`);
        await new Promise((resolve) => setTimeout(resolve, (i + 1) * 1000));
      } else {
        // Para otros errores, no reintentar
        throw error;
      }
    }
  }
};

function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isWakingUp, setIsWakingUp] = useState(false);
  const navigate = useNavigate();

  const API_URL = "https://rumipark-camimujica.pythonanywhere.com/usuarios";

  // Despertar el servidor al cargar el componente (silencioso)
  useEffect(() => {
    const wakeUpServer = async () => {
      try {
        setIsWakingUp(true);
        
        // Hacer un ping simple a la ruta raíz
        await fetch("https://rumipark-camimujica.pythonanywhere.com/", {
          method: "GET",
        }).catch(() => {
          // Ignorar errores del ping inicial
        });
        
        // Esperar un poco para que el servidor se inicialice
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsWakingUp(false);
      } catch (error) {
        setIsWakingUp(false);
      }
    };

    wakeUpServer();
  }, []);

  // Manejar inicio de sesión
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validar campos antes de enviar
    if (!username || !password) {
      toastr.error("Por favor, completa el nombre de usuario y la contraseña.");
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage("Conectando con el servidor...");

      const response = await fetchWithRetry(
        `${API_URL}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        },
        3, // 3 reintentos
        30000 // 30 segundos de timeout
      );

      setLoadingMessage("Procesando credenciales...");
      const data = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        setLoadingMessage("");
        toastr.error(data.message || "Credenciales incorrectas");
        return;
      }

      // Almacenar datos del usuario
      localStorage.setItem("auth_token", data.token || "placeholder_token");
      localStorage.setItem("username", data.username);
      localStorage.setItem("id", data.id);
      localStorage.setItem("plan_id", "1");

      setLoadingMessage("Ingresando...");
      setIsLoading(false);
      setLoadingMessage("");
      toastr.success(`¡Bienvenido, ${data.username}!`);
      navigate("/dashboard/main");
    } catch (error) {
      setIsLoading(false);
      setLoadingMessage("");
      
      let errorMessage = "Error de conexión con el servidor.";
      
      if (error.name === "AbortError") {
        errorMessage = "La conexión tardó demasiado. Por favor, verifica tu internet e intenta de nuevo.";
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage = "No se pudo conectar al servidor. Verifica tu conexión a internet.";
      }
      
      console.error("Error de login:", {
        error: error.message,
        name: error.name,
        stack: error.stack,
      });
      
      toastr.error(errorMessage);
    }
  };

  // Manejar registro de usuario
  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validar campos antes de enviar
    if (!username || !email || !password) {
      toastr.error("Por favor, completa todos los campos.");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toastr.error("Por favor, ingresa un correo electrónico válido.");
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage("Conectando con el servidor...");

      console.log("Datos enviados al backend:", {
        username,
        email,
        password: "***", // No mostrar la contraseña en logs
        plan_id: 1,
      });

      const response = await fetchWithRetry(
        API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, email, password, plan_id: 1 }),
        },
        3, // 3 reintentos
        30000 // 30 segundos de timeout
      );

      setLoadingMessage("Procesando registro...");
      const data = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        setLoadingMessage("");
        toastr.error(data.error || "Error al registrar el usuario");
        return;
      }

      setIsLoading(false);
      setLoadingMessage("");
      toastr.success("Usuario registrado exitosamente. Ahora puedes iniciar sesión.");
      
      // Limpiar campos
      setEmail("");
      setPassword("");
      setIsRegistering(false);
    } catch (error) {
      setIsLoading(false);
      setLoadingMessage("");
      
      let errorMessage = "Error de conexión con el servidor.";
      
      if (error.name === "AbortError") {
        errorMessage = "La conexión tardó demasiado. Por favor, verifica tu internet e intenta de nuevo.";
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage = "No se pudo conectar al servidor. Verifica tu conexión a internet.";
      }
      
      console.error("Error de registro:", {
        error: error.message,
        name: error.name,
        stack: error.stack,
      });
      
      toastr.error(errorMessage);
    }
  };

  return (
    <div
      className="h-screen flex flex-col lg:flex-row bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      {/* Panel izquierdo */}
      <div className="lg:w-1/2 w-full flex justify-center items-center p-4 relative">
        <div className="absolute top-6 sm:top-12 md:top-16 lg:top-20 flex flex-col items-center space-y-4 animate-bounce">
          <span
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#f5f6f7] tracking-wide"
            style={{ textShadow: "0 4px 10px rgba(22, 127, 159, 0.8)" }}
          >
            Descubre nuestros planes
          </span>
          <FontAwesomeIcon
            icon={faArrowDown}
            className="text-[#f9fafa] text-5xl sm:text-6xl lg:text-7xl transition-transform transform hover:scale-125 hover:text-[#4cd6f8] duration-300 ease-in-out"
            style={{ textShadow: "0 4px 10px rgba(22, 127, 159, 0.8)" }}
          />
        </div>
        <Link to="/">
          <img
            src={icono}
            alt="Logo"
            className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain cursor-pointer mt-16 sm:mt-24"
          />
        </Link>
      </div>

      {/* Panel derecho */}
      <div className="lg:w-1/2 w-full flex flex-col justify-center items-center px-4 py-6 md:py-8">
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 md:mb-10 text-center"
          style={{ color: "#167f9f" }}
        >
          {isRegistering ? "Registrarse" : "Iniciar sesión"}
        </h2>



        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-48 space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#167f9f]"></div>
            {loadingMessage && (
              <p className="text-[#167f9f] text-lg font-semibold animate-pulse">
                {loadingMessage}
              </p>
            )}
          </div>
        ) : (
          <form
            onSubmit={isRegistering ? handleRegister : handleLogin}
            className="space-y-4 md:space-y-6 w-full max-w-xs sm:max-w-sm md:max-w-md bg-white p-6 sm:p-8 md:p-10 rounded-lg shadow-lg"
          >
            {isRegistering && (
              <div className="relative">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="absolute left-4 top-5"
                  style={{ color: "#167f9f" }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  className="w-full pl-14 pr-5 py-3 text-lg border-2 rounded-md shadow-sm bg-gray-50 text-gray-900 placeholder-gray-500 focus:ring-4 focus:outline-none"
                  style={{ borderColor: "#167f9f" }}
                  required
                />
              </div>
            )}
            <div className="relative">
              <FontAwesomeIcon
                icon={faUser}
                className="absolute left-4 top-5"
                style={{ color: "#167f9f" }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                className="w-full pl-14 pr-5 py-3 text-lg border-2 rounded-md shadow-sm bg-gray-50 text-gray-900 placeholder-gray-500 focus:ring-4 focus:outline-none"
                style={{ borderColor: "#167f9f" }}
                required
              />
            </div>
            <div className="relative">
              <FontAwesomeIcon
                icon={faLock}
                className="absolute left-4 top-5"
                style={{ color: "#167f9f" }}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full pl-14 pr-10 py-3 text-lg border-2 rounded-md shadow-sm bg-gray-50 text-gray-900 placeholder-gray-500 focus:ring-4 focus:outline-none"
                style={{ borderColor: "#167f9f" }}
                required
              />
              <FontAwesomeIcon
                icon={showPassword ? faEyeSlash : faEye}
                className="absolute right-4 top-5 cursor-pointer"
                style={{ color: "#167f9f" }}
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>
            <button
              type="submit"
              disabled={isWakingUp}
              className={`w-full py-3 text-white text-lg font-bold rounded-lg transition ${
                isWakingUp ? "opacity-50 cursor-not-allowed" : ""
              }`}
              style={{
                backgroundColor: "#167f9f",
                boxShadow: "0 4px 10px rgba(22, 127, 159, 0.8)",
              }}
            >
              {isRegistering ? "Registrarse" : "Ingresar"}
            </button>
          </form>
        )}

        <button
          className="mt-6 text-lg underline"
          style={{ color: "#167f9f" }}
          onClick={() => {
            setIsRegistering(!isRegistering);
            setEmail("");
            setPassword("");
            setUsername("");
          }}
          disabled={isLoading}
        >
          {isRegistering
            ? "¿Ya tienes cuenta? Inicia sesión aquí"
            : "¿No tienes cuenta? Regístrate aquí"}
        </button>
      </div>
    </div>
  );
}

export default Login;