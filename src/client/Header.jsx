import React from "react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-[#1da4cf] py-4 px-6 flex justify-between items-center">
      <h1 className="text-white font-bold text-5xl">
        <span className="text-shadow">RUMI</span>
        <span className="text-[#167f9f]">PARK</span>
      </h1>
      <button
        onClick={() => navigate("/login")}
        className="text-white text-lg bg-white bg-opacity-20 hover:bg-opacity-30 px-6 py-3 rounded-full"
      >
        <i className="fas fa-sign-in-alt mr-2"></i> Iniciar Sesión
      </button>
    </header>
  );
};

export default Header;
