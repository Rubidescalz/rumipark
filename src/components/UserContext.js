import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const planId = localStorage.getItem("plan_id");
  
    if (userId && planId) {
      setUser({ id: userId, plan_id: planId }); // Asegúrate de que "id" esté siendo asignado correctamente
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
