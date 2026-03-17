import React from "react";

const GlassCard = ({ children }) => {
  return (
    <div className="bg-white backdrop-blur-lg shadow-card rounded-2xl p-6 border border-brand-border hover:scale-105 transition-all duration-300">
      {children}
    </div>
  );
};

export default GlassCard;
