import React from "react";
import axios from "axios";

const CambiarPlan = () => {
  const handlePayment = async (planId) => {
    try {
      const userId = localStorage.getItem("id"); // Obtén el ID del usuario desde localStorage

      const response = await axios.post(
        "https://CamiMujica.pythonanywhere.com/cambiar_plan",
        {
          usuario_id: userId,
          plan_id: planId,
        }
      );

      // Redirigir al usuario a la URL de Mercado Pago
      if (response.data.init_point) {
        window.location.href = response.data.init_point;
      } else {
        alert("No se pudo iniciar el proceso de pago");
      }
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      alert("Hubo un error al conectar con el servidor.");
    }
  };

  return (
    <div>
      <h1>Cambiar Plan</h1>
      <button onClick={() => handlePayment(2)}>Cambiar a Básico</button>
      <button onClick={() => handlePayment(3)}>Cambiar a Premium</button>
    </div>
  );
};

export default CambiarPlan;
