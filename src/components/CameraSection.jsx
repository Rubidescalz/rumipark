/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-use-before-define */
import React, { useState, useEffect, useRef, useCallback } from "react";
import NewVehicleModal from "./NewVehicleModal";
import "@fortawesome/fontawesome-free/css/all.css";
import toastr from "toastr";
import "toastr/build/toastr.min.css";

const CameraSection = () => {
  // Referencias y estados para cámara de placas (solo placas ahora)
  const plateVideoRef = useRef(null);
  const plateCanvasRef = useRef(null);
  const plateContainerRef = useRef(null);
  const [isPlateCameraActive, setIsPlateCameraActive] = useState(false);
  const [isPlateDetecting, setIsPlateDetecting] = useState(false);
  const [plateBbox, setPlateBbox] = useState(null);
  const [uploadedPlateImage, setUploadedPlateImage] = useState(null);

  // Estados y refs compartidos
  const fileInputRef = useRef(null);
  const [detectedPlate, setDetectedPlate] = useState("");
  const [plateImage, setPlateImage] = useState(null);
  const [detectionType] = useState("placa"); // Fijo en "placa"
  const [error, setError] = useState("");
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [isPlateRegistered, setIsPlateRegistered] = useState(null);
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [isEditingPlate, setIsEditingPlate] = useState(false);
  const [editablePlate, setEditablePlate] = useState("");
  const [, setBlockedPlates] = useState({}); // Solo usamos el setter
  const [recentEntries, setRecentEntries] = useState({});
  const [lastNotificationMessage, setLastNotificationMessage] = useState("");
  const readNotificationsRef = useRef(new Set());
  const [imageUsage, setImageUsage] = useState({ processed: 0, limit: 0 });
  const [isLoadingImageUsage, setIsLoadingImageUsage] = useState(false);
  // Estado para los vehículos (todos del usuario)
  const [vehiculos, setVehiculos] = useState([]);
  const [isLoadingVehiculos, setIsLoadingVehiculos] = useState(false);

  useEffect(() => {
    const fetchImageUsage = async () => {
      try {
        setIsLoadingImageUsage(true);
        const userId = localStorage.getItem("id");
        if (!userId) {
          console.error("No se encontró el ID del usuario en localStorage");
          return;
        }

        const response = await fetch(
          `https://rumipark-camimujica.pythonanywhere.com/imagenes_procesadas_total?id=${userId}`
        );
        const data = await response.json();

        if (response.ok) {
          setImageUsage({
            processed: data.imagenes_procesadas_total || 0,
            limit: data.limite_imagenes || 0,
          });
          if (
            data.mensaje &&
            data.mensaje.includes("Has alcanzado el límite")
          ) {
            showNotification(data.mensaje, "warning");
          }
        } else {
          console.error("Error al obtener el conteo de imágenes:", data.error);
          setImageUsage({ processed: 0, limit: 0 });
          showNotification(
            "Error al obtener el conteo de imágenes procesadas.",
            "error"
          );
        }
      } catch (err) {
        console.error("Error al obtener el conteo de imágenes:", err);
        setImageUsage({ processed: 0, limit: 0 });
        showNotification(
          "Error al obtener el conteo de imágenes procesadas.",
          "error"
        );
      } finally {
        setIsLoadingImageUsage(false);
      }
    };

    fetchImageUsage();
  }, []);

  // Nueva función para fetch vehículos (todos del usuario)
  const fetchVehiculos = useCallback(async () => {
    try {
      setIsLoadingVehiculos(true);
      const userId = localStorage.getItem("id");
      if (!userId) {
        console.error("No se encontró el ID del usuario en localStorage");
        return;
      }

      const response = await fetch(
        "https://rumipark-camimujica.pythonanywhere.com/listar_vehiculos",
        {
          method: "GET",
          headers: {
            "id": userId, // Enviar user_id en headers como espera el backend
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setVehiculos(data.vehiculos || []);
      } else {
        console.error("Error al obtener vehículos:", data.error);
        showNotification("Error al obtener los vehículos.", "error");
        setVehiculos([]);
      }
    } catch (err) {
      console.error("Error al obtener vehículos:", err);
      showNotification("Error al obtener los vehículos.", "error");
      setVehiculos([]);
    } finally {
      setIsLoadingVehiculos(false);
    }
  }, []);

  // Fetch vehículos al montar el componente
  useEffect(() => {
    fetchVehiculos();
  }, [fetchVehiculos]);

  const updateImageUsage = useCallback(async () => {
    try {
      setIsLoadingImageUsage(true);
      const userId = localStorage.getItem("id");
      if (!userId) {
        console.error("No se encontró el ID del usuario en localStorage");
        return;
      }

      const response = await fetch(
        `https://rumipark-camimujica.pythonanywhere.com/imagenes_procesadas_total?id=${userId}`
      );
      const data = await response.json();

      if (response.ok) {
        setImageUsage({
          processed: data.imagenes_procesadas_total || 0,
          limit: data.limite_imagenes || 0,
        });
        if (
          data.mensaje &&
          data.mensaje.includes("Has alcanzado el límite")
        ) {
          showNotification(data.mensaje, "warning");
        }
      } else {
        console.error(
          "Error al actualizar el conteo de imágenes:",
          data.error
        );
        setImageUsage({ processed: 0, limit: 0 });
        showNotification(
          "Error al actualizar el conteo de imágenes procesadas.",
          "error"
        );
      }
    } catch (err) {
      console.error("Error al actualizar el conteo de imágenes:", err);
      setImageUsage({ processed: 0, limit: 0 });
      showNotification(
        "Error al actualizar el conteo de imágenes procesadas.",
        "error"
      );
    } finally {
      setIsLoadingImageUsage(false);
    }
  }, []);

  useEffect(() => {
    let plateDetectionInterval;
    if (isPlateCameraActive && !isPlateDetecting && detectionType === "placa") {
      plateDetectionInterval = setInterval(() => {
        detectFromCamera();
      }, 2000);
    }
    return () => clearInterval(plateDetectionInterval);
  }, [isPlateCameraActive, isPlateDetecting, detectionType]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBlockedPlates((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((plate) => {
          if (now >= updated[plate]) {
            delete updated[plate];
          }
        });
        return updated;
      });
      setRecentEntries((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((plate) => {
          if (now >= updated[plate]) {
            delete updated[plate];
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const drawBbox = (canvas, video, bbox) => {
      const context = canvas.getContext("2d");
      if (canvas && video && bbox) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = "green";
        context.lineWidth = 4;
        context.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height); // Corregido: width y height
        requestAnimationFrame(() => drawBbox(canvas, video, bbox)); // Pasa bbox para mantener
      }
    };

    if (
      plateCanvasRef.current &&
      plateVideoRef.current &&
      isPlateCameraActive &&
      plateBbox
    ) {
      drawBbox(plateCanvasRef.current, plateVideoRef.current, plateBbox);
    }
  }, [isPlateCameraActive, plateBbox]);

  const dataURLToFile = (dataURL, filename) => {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Removido handleDetectionTypeClick, ya que solo es "placa"
  const startCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      let backCamera = videoDevices.find((device) =>
        device.label.toLowerCase().includes("back")
      );
      const camera =
        backCamera ||
        videoDevices.find((device) => device.kind === "videoinput");
      if (!camera) {
        throw new Error("No hay cámaras disponibles.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: camera.deviceId },
      });
      if (plateVideoRef.current) {
        plateVideoRef.current.srcObject = stream;
        plateVideoRef.current.onloadedmetadata = () => {
          plateVideoRef.current.play();
        };
        setIsPlateCameraActive(true);
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const stopCamera = () => {
    if (plateVideoRef.current && plateVideoRef.current.srcObject) {
      const stream = plateVideoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      plateVideoRef.current.srcObject = null;
      setIsPlateCameraActive(false);
      setPlateBbox(null);
      setIsPlateDetecting(false); // Añadido para cleanup
    }
  };

  const notificationTimeoutRef = useRef(null);
  const showNotification = (message, type) => {
    if (message === lastNotificationMessage) return;
    toastr.clear();
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    toastr[type](message, "", { timeOut: 4000 });
    setLastNotificationMessage(message);
    notificationTimeoutRef.current = setTimeout(() => {
      setLastNotificationMessage("");
    }, 2500);
    if (!readNotificationsRef.current.has(message)) {
      const utterance = new SpeechSynthesisUtterance(message);
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice =
        voices.find((voice) => voice.lang === "es-ES") || voices[0];
      utterance.voice = spanishVoice;
      utterance.lang = "es-ES";
      utterance.rate = 1;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
      readNotificationsRef.current.add(message);
    }
  };

  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const normalizePlate = (plate) => {
    return plate.replace(/-/g, "").toUpperCase();
  };

  const detectPlate = async (file) => {
  const userId = localStorage.getItem("id");
  if (!userId) {
    showNotification("Usuario no autenticado", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("id", userId);

  setIsPlateDetecting(true);

  try {
    const endpoint =
      "https://rumipark-camimujica.pythonanywhere.com/detectar_y_verificar_y_entrada";
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    let data = null;
    try {
      data = await response.json();
    } catch (jsonErr) {
      setDetectedPlate("");
      setPlateImage(null);
      setIsPlateRegistered(null);
      setVehicleDetails(null);
      setPlateBbox(null);
      showNotification(
        "Error: el servidor no respondió con datos válidos.",
        "error"
      );
      setIsPlateDetecting(false);
      return;
    }

    setPlateImage(null);

    // Solo lógica para placas
    if (data.placa_detectada && data.placa_imagen) {
      const normalizedPlate = normalizePlate(data.placa_detectada);
      setPlateImage(`data:image/jpeg;base64,${data.placa_imagen}`);
      setDetectedPlate(normalizedPlate);
      const placaRegistrada =
        data.estado === "Placa registrada" ||
        data.estado === "Salida reciente" ||
        data.estado === "Entrada pendiente detectada.";
      setIsPlateRegistered(placaRegistrada);
      setVehicleDetails(data.vehiculo || null);
      setPlateBbox(data.bbox || null);

      // Actualizar el contador de imágenes procesadas inmediatamente después de procesar una imagen
      await updateImageUsage();

      if (data.estado === "Placa registrada") {
        // **CORRECCIÓN PRINCIPAL: Verificar si hay entrada pendiente**
        try {
          // Verificar si existe una entrada sin salida para esta placa
          const checkResponse = await fetch(
            "https://rumipark-camimujica.pythonanywhere.com/todos_registros",
            {
              method: "GET",
              headers: {
                "id": userId
              }
            }
          );
          
          const registrosData = await checkResponse.json();
          
          // Buscar si hay una entrada activa (sin salida) para esta placa
          const entradaActiva = registrosData.registros?.find(
            (registro) => 
              normalizePlate(registro.numero_placa) === normalizedPlate && 
              registro.estado === "Entrada"
          );

          if (entradaActiva) {
            // HAY UNA ENTRADA ACTIVA - Calcular tiempo transcurrido
            const fechaEntrada = new Date(`${entradaActiva.fecha_entrada}T${entradaActiva.hora_entrada}`);
            const ahora = new Date();
            const tiempoTranscurrido = (ahora - fechaEntrada) / 1000 / 60; // minutos

            if (tiempoTranscurrido >= 3) {
              // HAN PASADO 3 MINUTOS O MÁS - Registrar SALIDA automáticamente
              showNotification(
                `Han pasado ${Math.floor(tiempoTranscurrido)} minutos. Registrando salida automática...`,
                "info"
              );
              await registerExit(normalizedPlate, userId);
            } else {
              // NO HAN PASADO 3 MINUTOS - Bloquear
              const minutosRestantes = Math.ceil(3 - tiempoTranscurrido);
              showNotification(
                `Esta placa ya tiene una entrada registrada. Debe esperar ${minutosRestantes} minuto(s) más para registrar la salida.`,
                "warning"
              );
            }
          } else {
            // NO HAY ENTRADA ACTIVA - Esta es una nueva entrada (ya registrada por el backend)
            showNotification(
              "Placa detectada y entrada registrada.",
              "success"
            );
            await updateImageUsage();
            await fetchVehiculos();
            
            // Registrar el tiempo de entrada para esta placa en el estado local
            const now = Date.now();
            setRecentEntries((prev) => ({
              ...prev,
              [normalizedPlate]: now
            }));
          }
        } catch (checkErr) {
          console.error("Error al verificar entradas activas:", checkErr);
          showNotification(
            "Error al verificar el estado de la entrada.",
            "error"
          );
        }

      } else if (data.estado === "Salida reciente") {
        showNotification(
          "Salida reciente para la placa. Debe esperar 2 minutos antes de registrar una nueva entrada.",
          "info"
        );
        await fetchVehiculos();
      } else if (data.estado === "Placa no registrada") {
        showNotification(
          "Placa detectada, pero no registrada",
          "warning"
        );
      }
    } else {
      setDetectedPlate("");
      setPlateImage(null);
      setIsPlateRegistered(null);
      setVehicleDetails(null);
      setPlateBbox(null);
      showNotification(
        data.error || data.mensaje || "No se detectaron placas en la imagen.",
        "error"
      );
    }
  } catch (err) {
    setDetectedPlate("");
    setPlateImage(null);
    setIsPlateRegistered(null);
    setVehicleDetails(null);
    setPlateBbox(null);
    showNotification("Error al procesar la imagen: " + err.message, "error");
    console.error("Error al enviar la imagen:", err);
  } finally {
    setIsPlateDetecting(false);
  }
};

  const registerExit = async (plate, userId) => {
    try {
      // Verificar si existe una entrada reciente (menos de 3 minutos)
      const now = Date.now();
      const entryTime = recentEntries[plate];
      
      if (entryTime) {
        const timeSinceEntry = now - entryTime;
        const threeMinutesInMs = 3 * 60 * 1000; // 3 minutos en milisegundos
        
        if (timeSinceEntry < threeMinutesInMs) {
          const remainingTime = Math.ceil((threeMinutesInMs - timeSinceEntry) / 1000 / 60);
          showNotification(
            `Debe esperar ${remainingTime} minutos más antes de registrar la salida de la placa ${plate}.`,
            "warning"
          );
          return;
        }
      }

      const response = await fetch(
        "https://rumipark-camimujica.pythonanywhere.com/salida",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            numero_placa: plate,
            usuario_id: userId,
          }),
        }
      );

      const data = await response.json();
      console.log("Respuesta de /salida:", data);

      if (response.ok && data.message === "Salida registrada exitosamente.") {
        setVehicleDetails(data.vehiculo);
        showNotification(
          `Salida registrada para la placa ${plate}.`,
          "success"
        );
        
        // Limpiar las entradas y bloqueos para esta placa
        setBlockedPlates((prev) => {
          const updated = { ...prev };
          delete updated[plate];
          return updated;
        });
        
        setRecentEntries((prev) => {
          const updated = { ...prev };
          delete updated[plate];
          return updated;
        });
        
        await updateImageUsage();
        await fetchVehiculos();
      } else {
        const errorMessage = data.message?.includes("3 minutos")
          ? `Debe esperar 3 minutos antes de registrar la salida de la placa ${plate}.`
          : `Error al registrar la salida: ${data.error || data.message || "Error desconocido en el servidor"}`;
        
        showNotification(errorMessage, "error");
      }
    } catch (err) {
      showNotification(
        `Error al intentar registrar la salida: ${err.message}`,
        "error"
      );
      console.error("Error en el frontend:", err);
      await updateImageUsage();
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setUploadedPlateImage(imageUrl);
      detectPlate(file);
    }
  };

  const detectFromCamera = async () => {
    if (!detectionType) {
      showNotification(
        "Selecciona un tipo de detección (solo placas disponibles).",
        "error"
      );
      return;
    }
    const videoRef = plateVideoRef;
    const isActive = isPlateCameraActive;
    const isDetecting = isPlateDetecting;
    if (!isActive || !videoRef.current) {
      showNotification("Debes activar la cámara para poder detectar.", "error");
      return;
    }
    if (isDetecting) {
      console.log("Detección en curso, omitiendo captura...");
      return;
    }
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg");
    const file = dataURLToFile(imageData, "captura.jpg");
    detectPlate(file);
  };

  // Función para filtrar vehículos por placa detectada
  const vehiculosFiltrados = detectedPlate
    ? vehiculos.filter((v) => normalizePlate(v.numero_placa) === detectedPlate)
    : [];

  return (
    <div className="container mx-auto p-6 bg-gray-200 rounded-xl shadow-lg">
      {/* Layout de dos columnas: izquierda cámara (mitad), derecha info (mitad) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Izquierda: Bloque de cámara para placas (mitad en lg+) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center relative">
          <div
            ref={plateContainerRef}
            className="relative w-full h-[75vh] bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden mb-4"
          >
            {!isPlateCameraActive && uploadedPlateImage ? (
              <img
                src={uploadedPlateImage}
                alt="Imagen subida placa"
                className="absolute w-auto h-full object-cover rounded-lg"
              />
            ) : !isPlateCameraActive ? (
              <p className="text-white text-center">
                Esperando cámara de placas...
              </p>
            ) : null}
            <video
              ref={plateVideoRef}
              className="absolute w-auto h-full object-cover rounded-lg"
            ></video>
            <canvas
              ref={plateCanvasRef}
              className="absolute w-auto h-full object-cover rounded-lg pointer-events-none"
              style={{ opacity: plateBbox ? 1 : 0 }}
            ></canvas>
          </div>
        </div>
        {/* Derecha: Info (placas procesadas + botones + resultados + datos del vehículo) */}
        <div className="w-full lg:w-1/2">
          <div className="p-4 bg-white rounded-lg shadow-lg h-[75vh] flex flex-col justify-between overflow-y-auto">
            {/* Sección superior: Placas procesadas + Botones (Subir y Activar Cámara) */}
            <div className="text-center mb-4 space-y-4">
              {isLoadingImageUsage ? (
                <p className="text-lg font-semibold text-gray-500">Cargando...</p>
              ) : (
                <>
                  <p className="text-lg font-semibold text-gray-700">
                    Placas procesadas: {imageUsage.processed}/{imageUsage.limit}
                  </p>
                  {imageUsage.processed >= imageUsage.limit &&
                  imageUsage.limit !== 0 ? (
                    <p className="text-sm text-red-500">
                      Has alcanzado el límite de imágenes de tu plan.
                    </p>
                  ) : null}
                </>
              )}
              {/* Botones movidos aquí, debajo de placas procesadas */}
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <label className="px-4 py-2 bg-[#167f9f] text-white rounded-lg hover:bg-[#146c83] cursor-pointer text-sm">
                  <i className="fas fa-upload mr-1"></i>Subir Imagen
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <button
                  className={`px-4 py-2 rounded-lg font-semibold border transition-all text-sm ${
                    isPlateCameraActive
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-white text-blue-700 border-blue-600 hover:bg-blue-50"
                  }`}
                  onClick={() => {
                    if (isPlateCameraActive) {
                      stopCamera();
                    } else {
                      startCamera();
                    }
                  }}
                >
                  {isPlateCameraActive
                    ? "Desactivar cámara"
                    : "Activar cámara"}
                </button>
              </div>
            </div>
            {/* Sección media: Resultados (imagen placa + estado) */}
            <div className="mt-6 text-center flex-grow">
              {plateImage && detectedPlate ? (
                <div className="space-y-4">
                  <p
                    className={`text-${
                      isPlateRegistered ? "green" : "red"
                    }-500 font-semibold`}
                  >
                    {isPlateRegistered
                      ? "Placa registrada"
                      : "Placa no registrada. Por favor, registre el vehículo."}
                  </p>
                  <img
                    src={plateImage}
                    alt="Placa detectada"
                    className="w-32 h-auto border-4 border-gray-300 rounded-xl shadow-md mx-auto"
                  />
                  <div className="flex items-center justify-center gap-4">
                    {isEditingPlate ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editablePlate}
                          onChange={(e) => setEditablePlate(e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring focus:ring-blue-500"
                        />
                        <button
                          onClick={async () => {
                            const normalizedEditablePlate =
                              normalizePlate(editablePlate);
                            setDetectedPlate(normalizedEditablePlate);
                            setIsEditingPlate(false);
                            const userId = localStorage.getItem("id");
                            try {
                              const response = await fetch(
                                `https://rumipark-camimujica.pythonanywhere.com/vehiculo/${normalizedEditablePlate}?id=${userId}`
                              );
                              if (!response.ok) {
                                if (response.status === 404) {
                                  showNotification(
                                    "La placa corregida no está registrada. Por favor, regístrala primero.",
                                    "error"
                                  );
                                  setIsPlateRegistered(false);
                                  return;
                                } else {
                                  showNotification(
                                    "Error al verificar el estado de la placa.",
                                    "error"
                                  );
                                  return;
                                }
                              }
                              const data = await response.json();
                              setVehicleDetails(data);
                              setIsPlateRegistered(true);
                              showNotification(
                                "Placa corregida y verificada. Ahora puedes registrar la entrada manualmente.",
                                "success"
                              );
                              await fetchVehiculos(); // Fetch vehículos después de edición
                            } catch (err) {
                              console.error(
                                "Error al procesar la placa editada:",
                                err
                              );
                              showNotification(
                                "Hubo un problema al procesar la placa editada. Por favor, inténtalo más tarde.",
                                "error"
                              );
                            }
                          }}
                          className="px-2 py-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{detectedPlate}</span>
                        <button
                          onClick={() => {
                            setEditablePlate(detectedPlate);
                            setIsEditingPlate(true);
                          }}
                          className="px-2 py-1 bg-gray-300 text-gray-600 rounded-full hover:bg-gray-400 transition-all"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Card de Detalles del Vehículo */}
                  {isLoadingVehiculos ? (
                    <p className="text-sm text-gray-500">Cargando vehículos...</p>
                  ) : vehiculosFiltrados.length > 0 ? (
                    <div className="mt-4 bg-white p-4 rounded-lg shadow">
                      <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center flex items-center justify-center gap-2">
                        <i className="fas fa-car text-blue-600"></i> 
                        Detalles del Vehículo
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <i className="fas fa-car-side text-lg"></i>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-600">Tipo de Vehículo</p>
                            <p className="text-lg font-semibold text-blue-800">
                              {vehiculosFiltrados[0]?.tipo_vehiculo || "No disponible"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-lg"></i>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-600">Propietario</p>
                            <p className="text-lg font-semibold text-green-800">
                              {vehiculosFiltrados[0]?.propietario || "No disponible"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
                            <i className="fas fa-id-card text-lg"></i>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-600">DNI</p>
                            <p className="text-lg font-semibold text-yellow-800">
                              {vehiculosFiltrados[0]?.dni || "No disponible"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay vehículos para esta placa.</p>
                  )}
                </div>
              ) : error ? (
                <p className="text-red-500 mt-2">{error}</p>
              ) : null}
            </div>
            {/* Botón nuevo registro al final, siempre visible */}
            <div className="flex justify-center mt-4">
              <button
                className="px-6 py-3 bg-[#167f9f] text-white rounded-lg hover:bg-[#146c83] flex items-center justify-center text-sm"
                onClick={() => setIsNewVehicleModalOpen(true)}
              >
                <i className="fas fa-car-side mr-2"></i>
                <span>Nuevo Registro</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <NewVehicleModal
        isOpen={isNewVehicleModalOpen}
        onClose={() => setIsNewVehicleModalOpen(false)}
        onSuccess={() => console.log("Nuevo vehículo registrado con éxito")}
      />
    </div>
  );
};

export default CameraSection;