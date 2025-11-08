import React, { useRef, useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import toastr from "toastr";
import "toastr/build/toastr.min.css";

const normalizePlate = (plate) => {
  return plate
    .replace(/[-_\s]/g, "") // Elimina guiones, espacios y guiones bajos
    .toUpperCase()
    .trim(); // Elimina espacios al inicio o final
};

// Nueva función para manejar tanto placa como rostro
const detectarYVerificarEntrada = async (blob, userId, retries = 2) => {
  const formData = new FormData();
  formData.append("file", blob, "photo.jpg");
  formData.append("id", userId);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
  "https://rumipark-camimujica.pythonanywhere.com/detectar_y_verificar_y_entrada",  // Corrige aquí
  {
    method: "POST",
    body: formData,
  }
);
      const data = await response.json();
      if (response.ok) {
        // Si reconoce por rostro
        if (data.estado === "Entrada registrada por rostro" && data.vehiculo) {
          return { tipo: "rostro", ...data };
        }
        // Si reconoce por placa
        if (data.estado === "Placa registrada" && data.vehiculo) {
          return { tipo: "placa", ...data };
        }
        // Si no reconoce
        if (attempt === retries) {
          return { error: data.mensaje || "No se detectaron coincidencias." };
        }
      } else {
        if (attempt === retries) {
          return {
            error: data.mensaje || "Error en la respuesta del servidor.",
          };
        }
      }
    } catch (error) {
      if (attempt === retries) {
        return { error: "Error al procesar la imagen." };
      }
    }
  }
};

const CameraDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [resultado, setResultado] = useState(null);
  const [recentPlates, setRecentPlates] = useState({});

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current.play();
        }
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        toastr.error("No se pudo acceder a la cámara. Verifica los permisos.");
      }
    };

    startCamera();

    const intervalId = setInterval(async () => {
      try {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (canvas && video) {
          const context = canvas.getContext("2d");
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          const dataURL = canvas.toDataURL("image/jpeg");
          const blob = await fetch(dataURL).then((res) => res.blob());

          const userId = localStorage.getItem("id");
          if (!userId) {
            toastr.error("Usuario no autenticado.");
            return;
          }

          const now = Date.now();
          // Limpiar placas recientes
          setRecentPlates((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((plate) => {
              if (now >= updated[plate]) {
                delete updated[plate];
              }
            });
            return updated;
          });

          const data = await detectarYVerificarEntrada(blob, userId);
          if (data.error) {
            setResultado({
              mensaje: data.error,
              estado: "Error",
              placa_imagen: null,
              placa_detectada: null,
            });
            toastr.error(data.error);
            return;
          }

          // Si reconoce por rostro
          if (data.tipo === "rostro") {
            setResultado({
              tipo: "rostro",
              mensaje: data.mensaje || "Entrada registrada por rostro.",
              estado: "Entrada registrada por rostro",
              placa_imagen: data.placa_imagen || null,
              placa_detectada: data.placa_detectada || null,
              rostro_imagen: data.rostro_imagen || null,
              detalles: data.vehiculo || null,
            });
            toastr.success("Entrada registrada por rostro.");
            // Bloquear por placa si existe
            if (data.placa_detectada) {
              const normalizedPlate = normalizePlate(data.placa_detectada);
              setRecentPlates((prev) => ({
                ...prev,
                [normalizedPlate]: now + 3 * 60 * 1000,
              }));
            }
            return;
          }

          // Si reconoce por placa
          if (data.tipo === "placa") {
            const normalizedPlate = normalizePlate(data.placa_detectada);
            if (recentPlates[normalizedPlate]) {
              toastr.info(
                `Placa ${normalizedPlate} detectada recientemente. Espera 3 minutos.`
              );
              return;
            }
            setResultado({
              tipo: "placa",
              mensaje: data.mensaje || "Placa registrada.",
              estado: "Placa registrada",
              placa_imagen: data.placa_imagen || null,
              placa_detectada: normalizedPlate,
              detalles: data.vehiculo,
            });
            toastr.success("Placa registrada.");
            setRecentPlates((prev) => ({
              ...prev,
              [normalizedPlate]: now + 3 * 60 * 1000,
            }));
            return;
          }

          // Si no reconoce
          setResultado({
            mensaje:
              data.mensaje ||
              "No se detectó ningún rostro o placa registrada. Por favor, registre el vehículo.",
            estado: "No registrado",
            placa_imagen: data.placa_imagen || null,
            placa_detectada: data.placa_detectada || null,
            detalles: null,
          });
          toastr.warning(
            data.mensaje ||
              "No se detectó ningún rostro o placa registrada. Por favor, registre el vehículo."
          );
        }
      } catch (err) {
        console.error("Error al procesar el cuadro:", err);
        setResultado({
          mensaje: "Error al procesar la imagen.",
          estado: "Error",
          placa_imagen: null,
          placa_detectada: null,
        });
        toastr.error("Error al procesar la imagen.");
      }
    }, 2000); // Capturar cada 2 segundos

    // Store the current video node in a variable for cleanup
    const currentVideo = videoRef.current;

    return () => {
      clearInterval(intervalId);
      if (currentVideo && currentVideo.srcObject) {
        const stream = currentVideo.srcObject;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [recentPlates]);

  return (
    <div className="min-h-screen bg-light p-6">
      <header className="bg-primary text-white py-4 px-6 text-center text-lg font-bold">
        Detección de Placas
      </header>

      <div className="text-center">
        <video ref={videoRef} className="border rounded mb-4" />
        <canvas ref={canvasRef} className="d-none" width={640} height={480} />
      </div>

      {resultado && (
        <div className="mt-5 p-4 border rounded shadow bg-white">
          <h5>{resultado.mensaje}</h5>
          {/* Mostrar imagen y mensaje según el tipo de reconocimiento */}
          {resultado.tipo === "placa" && resultado.placa_imagen && (
            <>
              <img
                src={`data:image/jpeg;base64,${resultado.placa_imagen}`}
                alt="Placa detectada"
                className="img-fluid mt-3 border rounded"
              />
              <div className="badge bg-success mt-2">
                Reconocimiento por placa
              </div>
            </>
          )}
          {resultado.tipo === "rostro" && (
            <>
              {/* Mostrar el recorte del rostro detectado en tiempo real si existe */}
              {resultado.rostro_imagen ? (
                <>
                  {/* Debug visual para ver si el base64 llega */}
                  <div className="alert alert-info p-2 small mt-2">
                    <strong>Debug rostro_imagen:</strong>{" "}
                    {resultado.rostro_imagen.slice(0, 40)}... (longitud:{" "}
                    {resultado.rostro_imagen.length})
                  </div>
                  <img
                    src={`data:image/jpeg;base64,${resultado.rostro_imagen}`}
                    alt="Rostro detectado"
                    className="img-fluid mt-3 border rounded"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://via.placeholder.com/120x120?text=Sin+Foto";
                    }}
                  />
                  <div className="badge bg-info mt-2">
                    Reconocimiento por rostro
                  </div>
                </>
              ) : (
                <div className="alert alert-warning p-2 small mt-2">
                  <strong>Advertencia:</strong> No se recibió rostro_imagen
                  base64 del backend.
                  <br />
                  {resultado.detalles && resultado.detalles.imagen ? (
                    (() => {
                      let imgUrl = "";
                      if (resultado.detalles.imagen) {
                        // Si la imagen ya es una URL completa, usarla tal cual
                        if (/^https?:\/\//i.test(resultado.detalles.imagen)) {
                          imgUrl = resultado.detalles.imagen;
                        } else {
                          let imgName = resultado.detalles.imagen;
                          // Si la imagen contiene la ruta completa, extraer solo el nombre
                          if (imgName.includes("/")) {
                            imgName = imgName.split("/").pop();
                          }
                          imgUrl = `${
                            process.env.REACT_APP_API_URL ||
                            "https://rumipark-camimujica.pythonanywhere.com"
                          }/static/faces/${imgName}`;
                        }
                        // Mostrar la URL final para depuración visual
                        console.log("URL de imagen de rostro:", imgUrl);
                      }
                      return resultado.detalles.imagen &&
                        resultado.detalles.imagen.match(
                          /\.(jpg|jpeg|png|webp)$/i
                        ) ? (
                        <>
                          <img
                            src={imgUrl}
                            alt="Rostro registrado"
                            className="img-fluid mt-3 border rounded"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src =
                                "https://via.placeholder.com/120x120?text=Sin+Foto";
                            }}
                          />
                          <div className="mt-1 small text-muted">
                            URL usada:{" "}
                            <span style={{ wordBreak: "break-all" }}>
                              {imgUrl}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="mt-3 text-muted">
                          Sin imagen de rostro registrada
                        </div>
                      );
                    })()
                  ) : (
                    <div className="mt-3 text-muted">
                      Sin imagen de rostro registrada
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {resultado.placa_detectada && (
            <p className="mt-3">
              <strong>Placa detectada:</strong> {resultado.placa_detectada}
            </p>
          )}
          {resultado.detalles && (
            <div className="mt-4">
              <h6>Detalles del Vehículo</h6>
              <p>
                <strong>Tipo:</strong> {resultado.detalles.tipo_vehiculo}
              </p>
              <p>
                <strong>Propietario:</strong> {resultado.detalles.propietario}
              </p>
              <p>
                <strong>DNI:</strong> {resultado.detalles.dni}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CameraDetection;
