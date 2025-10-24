import React from "react";
import logo from "../assets/logo.png";

export default function Logo({ className = "", alt = "Fate", loading = "lazy" }) {
  return (
    <img
      src={logo}
      alt={alt}
      loading={loading}
      className={`block h-auto w-auto ${className}`.trim()}
    />
  );
}
