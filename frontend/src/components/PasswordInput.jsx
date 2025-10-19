import React, { useState } from "react";

export default function PasswordInput({
  className = "",
  revealLabel = "Показать пароль",
  hideLabel = "Скрыть пароль",
  ...inputProps
}) {
  const [visible, setVisible] = useState(false);

  const toggle = () => {
    setVisible((prev) => !prev);
  };

  const mergedClassName = ["input pr-12", className].filter(Boolean).join(" ");
  const isVisible = visible;
  const ariaLabel = isVisible ? hideLabel : revealLabel;

  return (
    <div className="password-field">
      <input
        {...inputProps}
        type={isVisible ? "text" : "password"}
        className={mergedClassName}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={toggle}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="password-toggle__icon"
    >
      <path d="M1.5 12s3.5-6.5 10.5-6.5 10.5 6.5 10.5 6.5-3.5 6.5-10.5 6.5S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="password-toggle__icon"
    >
      <path d="m3 3 18 18" />
      <path d="M10.58 10.58A2 2 0 0 0 11 14a2 2 0 0 0 2.83 0" />
      <path d="M9.88 4.27A10.42 10.42 0 0 1 12 4c7 0 10.5 8 10.5 8a17.9 17.9 0 0 1-3.24 4.78" />
      <path d="M6.18 6.18C3.51 8.2 1.5 12 1.5 12a17.91 17.91 0 0 0 5.07 5.23" />
    </svg>
  );
}
