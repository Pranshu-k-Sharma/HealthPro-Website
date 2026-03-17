import React from "react";

export default function PeopleIcon({ className = "", size = 28 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="g1" x1="0" x2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>

      {/* larger person */}
      <circle cx="9" cy="8" r="3" fill="url(#g1)" />
      <path d="M5.5 14c.8-1.5 2.6-2.5 4.5-2.5s3.7 1 4.5 2.5V17a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1v-3z" fill="#efe6ff" />

      {/* smaller person behind */}
      <circle cx="17" cy="9" r="2.2" fill="#c7b3ff" />
      <path d="M14.8 15c.6-1 1.8-1.6 3-1.6s2.4.6 3 1.6V16.5a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 14.8 16.5V15z" fill="#f5f0ff" />
    </svg>
  );
}
