/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCar,
  faIdCard,
  faPen,
  faMicrophone,
  faMicrophoneSlash,
} from "@fortawesome/free-solid-svg-icons";

const NewVehicleModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    numero_placa: "",
    tipo_vehiculo: "",
    propietario: "",
    dni: "",
  });

  const [isListening, setIsListening] = useState(false);
  const [transcriptMessage, setTranscriptMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);
  const formRef = useRef(null);
  const restartTimeoutRef = useRef(null);

  // Mapa de códigos a nombres completos de vehículos
  const vehicleTypes = {
    L1: "Bicimotos y motocicletas",
    L2: "Triciclos pequeños",
    L3: "Motocicletas mayores",
    L4: "Moto con sidecar",
    L5: "Motociclos para transporte de pasajeros",
    L6: "Cuatriciclos ligeros",
    L7: "Cuatriciclos motorizados pesados",
    M1: "Autos, taxis y SUV",
    N1: "Camionetas pick-up y chasis cabina",
  };

  // Detectar Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Limpiar formulario
  const resetForm = () => {
    setFormData({
      numero_placa: "",
      tipo_vehiculo: "",
      propietario: "",
      dni: "",
    });
    setTranscriptMessage("");
    setIsProcessing(false);
  };

  // Configurar reconocimiento de voz
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscriptMessage(
        "Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "es-ES";
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.toLowerCase().trim();
      
      console.log("Transcripción recibida:", transcript);
      
      if (lastResult.isFinal) {
        processTranscript(transcript);
      } else {
        setTranscriptMessage(`Escuchando: ${transcript}...`);
      }
    };

    recognition.onerror = (event) => {
      console.error("Error en reconocimiento:", event.error);
      if (event.error === "no-speech") {
        setTranscriptMessage("No se detectó voz. Intenta de nuevo.");
        if (isListening) restartRecognition();
      } else if (event.error === "aborted") {
        // Ignorar errores de aborto
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setTranscriptMessage("Permiso de micrófono denegado.");
        setIsListening(false);
      } else {
        setTranscriptMessage("Error temporal. Reintentando...");
        if (isListening) restartRecognition();
      }
    };

    recognition.onend = () => {
      if (isListening && !isSafari) {
        restartRecognition();
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearTimeout(restartTimeoutRef.current);
    };
  }, [isListening, isSafari]);

  // FUNCIÓN MEJORADA PARA EXTRAER NÚMEROS DEL TEXTO
  const extractNumbersFromText = (text) => {
    console.log("Extrayendo números de:", text);
    
    // Mapeo de palabras a números (para cuando se dicen los números con palabras)
    const numberWords = {
      "cero": "0", "uno": "1", "un": "1", "una": "1",
      "dos": "2", "tres": "3", "cuatro": "4", "cinco": "5",
      "seis": "6", "siete": "7", "ocho": "8", "nueve": "9",
      "diez": "10", "veinte": "20", "treinta": "30", "cuarenta": "40",
      "cincuenta": "50", "sesenta": "60", "setenta": "70", "ochenta": "80",
      "noventa": "90", "cien": "100", "mil": "1000"
    };

    // Primero intentar encontrar números directamente
    const directNumbers = text.match(/\d+/g);
    if (directNumbers && directNumbers.length > 0) {
      console.log("Números directos encontrados:", directNumbers);
      return directNumbers.join(" ");
    }

    // Intentar convertir palabras a números
    const words = text.split(/\s+/);
    let numberString = "";
    
    for (const word of words) {
      if (numberWords[word]) {
        numberString += numberWords[word];
      } else if (/^\d+$/.test(word)) {
        numberString += word;
      }
    }
    
    if (numberString.length > 0) {
      console.log("Números de palabras:", numberString);
      return numberString;
    }

    // Buscar combinaciones comunes (como "cuarenta y siete" -> 47)
    const combinedPatterns = [
      /(veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)/gi,
      /(dieci)(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)/gi,
      /(veinti)(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)/gi
    ];

    for (const pattern of combinedPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        console.log("Patrones combinados encontrados:", matches);
        // Simplificar por ahora, devolver el texto original para procesar después
        return text;
      }
    }

    return null;
  };

  // FUNCIÓN ESPECÍFICA PARA DNI
  const extractDNI = (transcript) => {
    console.log("Buscando DNI en:", transcript);
    
    // Limpiar el texto para mejor reconocimiento
    const cleanTranscript = transcript
      .toLowerCase()
      .replace(/[.,]/g, ' ')  // Reemplazar puntos y comas por espacios
      .replace(/\s+/g, ' ')   // Normalizar espacios
      .trim();

    console.log("Texto limpio:", cleanTranscript);

    // PATRONES MEJORADOS PARA DNI
    const dniPatterns = [
      // Formato simple: "DNI 12345678"
      /dni\s+(\d+)/i,
      
      // Formato: "documento 12345678"
      /documento\s+(\d+)/i,
      
      // Formato: "identidad 12345678"
      /identidad\s+(\d+)/i,
      
      // Formato con preposiciones: "con dni 12345678"
      /(?:con|de|el|la|mi|su)\s+(?:dni|documento)\s+(\d+)/i,
      
      // Formato: "dni del propietario 12345678"
      /dni\s+(?:del\s+)?propietario\s+(\d+)/i,
      
      // Formato: "número de dni 12345678"
      /n[uú]mero\s+(?:de\s+)?(?:dni|documento)\s+(\d+)/i,
      
      // Solo números (8 dígitos específicamente)
      /(\b\d{8}\b)/,
      
      // Números separados por espacios
      /(\b\d\s+\d\s+\d\s+\d\s+\d\s+\d\s+\d\s+\d\b)/,
      
      // Cuando se dicen los números como palabras
      /dni\s+([a-z\s]+)/i,
      
      // Intentar capturar cualquier cosa después de DNI
      /dni\s+(.+)/i,
    ];

    // Primero buscar con patrones directos
    for (const pattern of dniPatterns) {
      const match = cleanTranscript.match(pattern);
      if (match && match[1]) {
        console.log("Patrón encontrado:", pattern, "->", match[1]);
        
        // Procesar el resultado
        let dniCandidate = match[1];
        
        // Si son palabras, intentar convertirlas a números
        if (/[a-z]/.test(dniCandidate)) {
          const numbers = extractNumbersFromText(dniCandidate);
          if (numbers) {
            dniCandidate = numbers.replace(/\s/g, '');
          }
        }
        
        // Limpiar el candidato (quitar espacios, etc.)
        dniCandidate = dniCandidate.replace(/\s/g, '');
        
        // Validar que sea un número válido para DNI (7-8 dígitos)
        if (/^\d{7,8}$/.test(dniCandidate)) {
          console.log("DNI válido encontrado:", dniCandidate);
          return dniCandidate;
        }
      }
    }

    // ENFOQUE ALTERNATIVO: Buscar cualquier secuencia de 7-8 dígitos en todo el texto
    const allNumbers = cleanTranscript.match(/\d+/g);
    if (allNumbers) {
      console.log("Todos los números en el texto:", allNumbers);
      
      // Buscar números que parezcan DNI
      for (const num of allNumbers) {
        if (num.length === 8 || num.length === 7) {
          console.log("Posible DNI encontrado en números generales:", num);
          
          // Verificar contexto: ¿está cerca de la palabra "dni"?
          const index = cleanTranscript.indexOf(num);
          const beforeText = cleanTranscript.substring(Math.max(0, index - 20), index);
          
          if (beforeText.includes("dni") || 
              beforeText.includes("documento") || 
              beforeText.includes("identidad") ||
              allNumbers.length === 1) {
            console.log("DNI confirmado por contexto:", num);
            return num;
          }
        }
      }
    }

    // ÚLTIMO INTENTO: Si el texto contiene "dni" y números, tomar todos los números juntos
    if (cleanTranscript.includes("dni") || cleanTranscript.includes("documento")) {
      const allDigits = cleanTranscript.replace(/\D/g, '');
      console.log("Todos los dígitos juntos:", allDigits);
      
      if (allDigits.length === 8 || allDigits.length === 7) {
        console.log("DNI extraído de todos los dígitos:", allDigits);
        return allDigits;
      }
    }

    console.log("No se encontró DNI válido");
    return null;
  };

  // Procesar transcript final
  const processTranscript = (transcript) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    console.log("=== PROCESANDO TRANSCRIPCIÓN ===");
    console.log("Texto original:", transcript);
    
    setTranscriptMessage(`Escuchado: ${transcript}`);

    // Comandos de control
    const controlCommands = [
      { pattern: /(desactivar|apagar|detener|parar|silenciar).*(micrófono|microfono|voz)/i, action: () => stopListening() },
      { pattern: /(cancelar|salir|cerrar|terminar)/i, action: () => { stopListening(); resetForm(); onClose(); } },
      { pattern: /(registrar|guardar|enviar|finalizar|completar)/i, action: () => { stopListening(); submitForm(); } },
      { pattern: /(ayuda|instrucciones|cómo funciona|qué puedo decir)/i, action: () => showHelpGuide() },
      { pattern: /(limpiar|borrar|empezar de nuevo|reiniciar)/i, action: () => resetForm() },
    ];

    for (const command of controlCommands) {
      if (command.pattern.test(transcript)) {
        command.action();
        setIsProcessing(false);
        return;
      }
    }

    // Procesar campos del formulario
    let processed = false;
    let updates = [];

    // 1. PROCESAR DNI (con logging detallado)
    console.log("Intentando extraer DNI...");
    const dni = extractDNI(transcript);
    if (dni) {
      console.log("DNI extraído:", dni);
      setFormData(prev => {
        const newData = { ...prev, dni: dni };
        console.log("Nuevo estado DNI:", newData);
        return newData;
      });
      updates.push(`✓ DNI: ${dni}`);
      processed = true;
    } else {
      console.log("No se pudo extraer DNI");
    }

    // 2. Procesar placa
    const placaPatterns = [
      /(?:placa|matrícula|matricula|número de placa|patente)\s*(?:es|de|número)?\s*([a-z0-9\s-]+)/i,
      /(?:la placa|el número)\s*(?:es)?\s*([a-z0-9\s-]+)/i,
      /^([a-z0-9]{2,3}-?\s?[a-z0-9]{3,4})$/i,
    ];

    for (const pattern of placaPatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const placa = match[1].replace(/\s/g, "").replace(/[^\w]/g, "").toUpperCase();
        if (placa.length >= 3) {
          setFormData(prev => ({ ...prev, numero_placa: placa }));
          updates.push(`✓ Placa: ${placa}`);
          processed = true;
          break;
        }
      }
    }

    // 3. Procesar tipo de vehículo
    const tipoPatterns = [
      /(?:tipo de vehículo|tipo|clase|categoría|vehículo)\s*(?:es|de)?\s*(l[1-7]|m1|n1)/i,
      /(?:es un|es una|vehículo)\s+(l[1-7]|m1|n1)/i,
    ];

    for (const pattern of tipoPatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const tipo = match[1].toUpperCase();
        setFormData(prev => ({ ...prev, tipo_vehiculo: tipo }));
        updates.push(`✓ Tipo: ${tipo}`);
        processed = true;
        break;
      }
    }

    // 4. Procesar propietario
    const propietarioPatterns = [
      /(?:propietario|dueño|nombre|titular)\s*(?:es|de nombre)?\s*([a-záéíóúñ\s]{3,})/i,
      /(?:el propietario|el dueño)\s*(?:es)?\s*([a-záéíóúñ\s]+)/i,
    ];

    for (const pattern of propietarioPatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const nombre = match[1].trim();
        const nombreCapitalized = nombre
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");
        
        if (nombreCapitalized.length >= 3) {
          setFormData(prev => ({ ...prev, propietario: nombreCapitalized }));
          updates.push(`✓ Propietario: ${nombreCapitalized}`);
          processed = true;
          break;
        }
      }
    }

    // Mostrar resultados
    if (updates.length > 0) {
      setTranscriptMessage(updates.join('\n'));
    } else {
      // INTENTO DE EMERGENCIA: Si dijiste algo como "DNI 47251756" y no se capturó
      const words = transcript.toLowerCase().split(/\s+/);
      if (words.includes("dni") || words.includes("documento")) {
        // Buscar cualquier número en la frase
        const anyNumber = transcript.match(/\d+/);
        if (anyNumber) {
          setFormData(prev => ({ ...prev, dni: anyNumber[0] }));
          setTranscriptMessage(`✓ DNI detectado: ${anyNumber[0]}`);
          processed = true;
        } else {
          // Si no hay números, mostrar mensaje específico
          setTranscriptMessage("Escuché 'DNI' pero no pude capturar los números. Intenta decir: 'DNI 4-7-2-5-1-7-5-6' (números separados)");
        }
      } else {
        const suggestions = [
          "Para DNI di claramente: 'DNI' pausa '4-7-2-5-1-7-5-6'",
          "O intenta: 'Documento 47251756'",
          "También puedes decir los números separados: 'cuatro siete dos cinco uno siete cinco seis'",
          "Di 'Ayuda' para ver todos los comandos disponibles"
        ];
        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        setTranscriptMessage(`No entendí completamente. ${randomSuggestion}`);
      }
    }

    console.log("Procesamiento completado, processed:", processed);
    setIsProcessing(false);
  };

  // Mostrar guía de ayuda
  const showHelpGuide = () => {
    const guide = `
PARA DNI (IMPORTANTE):
1. Di claramente: "DNI" (pausa breve)
2. Luego di los números SEPARADOS: "4-7-2-5-1-7-5-6"
3. O di: "Documento 47251756"
4. O di los números como palabras: "cuatro siete dos cinco uno siete cinco seis"

OTROS COMANDOS:
• "Placa ABC123"
• "Tipo M1" (para autos)
• "Propietario Juan Pérez"
• "Registrar" - Guardar
• "Cancelar" - Salir
• "Ayuda" - Ver esta guía
    `;
    setTranscriptMessage(guide);
  };

  // Reiniciar reconocimiento
  const restartRecognition = () => {
    clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = setTimeout(() => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error("Error al reiniciar:", error);
        }
      }
    }, 200);
  };

  // Iniciar escucha
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setTranscriptMessage("🎤 Micrófono activado");
      } catch (error) {
        console.error("Error al iniciar:", error);
        setTranscriptMessage("Error al acceder al micrófono.");
      }
    }
  };

  // Detener escucha
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        clearTimeout(restartTimeoutRef.current);
        setTranscriptMessage("Micrófono desactivado.");
      } catch (error) {
        console.error("Error al detener:", error);
      }
    }
  };

  // Alternar escucha
  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Enviar formulario
  const submitForm = () => {
    if (formRef.current) {
      const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
      formRef.current.dispatchEvent(submitEvent);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.numero_placa || !formData.tipo_vehiculo || !formData.dni || !formData.propietario) {
      setTranscriptMessage("Por favor, complete todos los campos antes de registrar.");
      return;
    }

    const userId = localStorage.getItem("id");
    if (!userId) {
      setTranscriptMessage("Debes iniciar sesión primero.");
      return;
    }

    // Convertir el código del tipo de vehículo a su nombre completo antes de enviar
    const tipoVehiculoName = vehicleTypes[formData.tipo_vehiculo] || formData.tipo_vehiculo;

    try {
      const response = await axios.post(
        "https://rumipark-camimujica.pythonanywhere.com/vehiculos",
        {
          numero_placa: formData.numero_placa,
          tipo_vehiculo: tipoVehiculoName,
          propietario: formData.propietario,
          dni: formData.dni,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "id": userId,
          },
        }
      );

      if (response.status === 201) {
        setShowSuccessModal(true);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Error desconocido";
      setTranscriptMessage(`Error al registrar: ${errorMessage}`);
      console.error("Error:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleClose = () => {
    stopListening();
    resetForm();
    onClose();
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    resetForm();
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#6a97c1] text-white rounded-lg shadow-lg w-full max-w-md p-6 sm:p-8 border-4 border-[#3a6e9f] mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-center">
            Registrar Nuevo Vehículo
          </h2>
          <button
            onClick={handleToggleListening}
            className={`p-2 rounded-full ${
              isListening ? "bg-red-500" : "bg-blue-500"
            } text-white hover:bg-opacity-80 transition-colors`}
            title={isListening ? "Desactivar micrófono" : "Activar micrófono"}
          >
            <FontAwesomeIcon
              icon={isListening ? faMicrophoneSlash : faMicrophone}
            />
          </button>
        </div>
        
        {/* Mensaje con mejor formato */}
        <div className="mb-4 min-h-[80px] p-3 bg-blue-900/30 rounded-md">
          <p className="text-sm text-gray-200 whitespace-pre-line">
            {transcriptMessage || (isListening ? "Escuchando... Di algo como 'DNI 47251756'" : "Activa el micrófono para usar comandos de voz")}
          </p>
        </div>
        
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <FontAwesomeIcon
              icon={faPen}
              className="absolute left-4 top-3.5"
              style={{ color: "#1da4cf" }}
            />
            <input
              type="text"
              name="numero_placa"
              value={formData.numero_placa}
              onChange={handleChange}
              placeholder="Número de Placa"
              className="w-full pl-12 pr-4 py-2.5 text-base border-2 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:outline-none"
              required
              style={{ borderColor: "#1da4cf" }}
            />
          </div>

          <div className="relative">
            <FontAwesomeIcon
              icon={faCar}
              className="absolute left-4 top-3.5"
              style={{ color: "#1da4cf" }}
            />
            <select
              name="tipo_vehiculo"
              value={formData.tipo_vehiculo}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-2.5 text-base border-2 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:outline-none appearance-none"
              required
              style={{ borderColor: "#1da4cf" }}
            >
              <option value="">Seleccione Tipo de Vehículo</option>
              <option value="L1">Bicimotos y motocicletas</option>
              <option value="L2">Triciclos pequeños</option>
              <option value="L3">Motocicletas mayores</option>
              <option value="L4">Moto con sidecar</option>
              <option value="L5">
                Motociclos para transporte de pasajeros
              </option>
              <option value="L6">Cuatriciclos ligeros</option>
              <option value="L7">Cuatriciclos motorizados pesados</option>
              <option value="M1">Autos, taxis y SUV</option>
              <option value="N1">Camionetas pick-up y chasis cabina</option>
            </select>
          </div>

          <div className="relative">
            <FontAwesomeIcon
              icon={faIdCard}
              className="absolute left-4 top-3.5"
              style={{ color: "#1da4cf" }}
            />
            <input
              type="text"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
              placeholder="DNI del Propietario"
              className="w-full pl-12 pr-4 py-2.5 text-base border-2 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:outline-none"
              required
              style={{ borderColor: "#1da4cf" }}
            />
          </div>

          <div className="relative">
            <FontAwesomeIcon
              icon={faPen}
              className="absolute left-4 top-3.5"
              style={{ color: "#1da4cf" }}
            />
            <input
              type="text"
              name="propietario"
              value={formData.propietario}
              onChange={handleChange}
              placeholder="Propietario"
              className="w-full pl-12 pr-4 py-2.5 text-base border-2 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:outline-none"
              required
              style={{ borderColor: "#1da4cf" }}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#3a6e9f] text-white rounded-lg hover:bg-[#2e5a7d] transition-all text-sm sm:text-base"
            >
              Registrar
            </button>
          </div>
        </form>
      </div>

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#6a97c1] text-white rounded-lg shadow-lg w-full max-w-md p-6 sm:p-8 border-4 border-[#3a6e9f] mx-4 text-center">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              ✅ Vehículo registrado correctamente
            </h2>
            <p className="text-sm text-gray-200 mb-6">
              El vehículo con placa <strong>{formData.numero_placa}</strong> ha sido registrado exitosamente.
            </p>
            <button
              onClick={handleSuccessModalClose}
              className="px-6 py-2 bg-[#3a6e9f] text-white rounded-lg hover:bg-[#2e5a7d] transition-all text-sm sm:text-base font-semibold"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewVehicleModal;