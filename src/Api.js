const API_URL = "https://CamiMujica.pythonanywhere.com";

export const detectarPlacas = async (blob) => {
  const formData = new FormData();
  formData.append("file", blob);

  try {
    const response = await fetch(`${API_URL}/detectar/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Error en la detección de placas.");
    }

    return await response.json();
  } catch (err) {
    console.error("Error:", err);
    throw err;
  }
};