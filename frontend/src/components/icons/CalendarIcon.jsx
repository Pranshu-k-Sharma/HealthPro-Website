import React from "react";

export default function CalendarIcon({ className = "", size = 28 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="18" rx="2" fill="#ffffff" stroke="currentColor" />
      <path d="M7 2v3M17 2v3" stroke="currentColor" />
      <rect x="3" y="6" width="18" height="3" rx="1" fill="#f3f4f6" />

      <g transform="translate(3 11)" fill="none" stroke="currentColor">
        <rect x="0" y="0" width="4" height="4" rx="1" fill="#eaf2ff" stroke="currentColor" />
        <rect x="6" y="0" width="4" height="4" rx="1" fill="#eaf2ff" stroke="currentColor" />
        <rect x="12" y="0" width="4" height="4" rx="1" fill="#ffffff" stroke="currentColor" />
        <rect x="0" y="6" width="4" height="4" rx="1" fill="#ffffff" stroke="currentColor" />
        <rect x="6" y="6" width="4" height="4" rx="1" fill="#ffffff" stroke="currentColor" />
        <rect x="12" y="6" width="4" height="4" rx="1" fill="#ffffff" stroke="currentColor" />
      </g>

      <g transform="translate(14 13)">
        <circle cx="3" cy="3" r="3" fill="#2563eb" />
        <text x="3" y="4.2" textAnchor="middle" fontSize="3" fill="#fff" fontWeight="700">8</text>
      </g>
    </svg>
  );
}
