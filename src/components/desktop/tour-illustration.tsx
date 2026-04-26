"use client";

import { useEffect, useState } from "react";

type TourSlide = "library" | "agents" | "byok";

interface Props {
  slide: TourSlide;
}

/**
 * Renders a real screenshot from /public/tour/{slide}.png when one exists,
 * and falls back to an inline SVG mock when the image is missing or fails
 * to load. The fallback covers Jay-not-yet-uploading and offline cases.
 */
export function TourIllustration({ slide }: Props) {
  const [imageOk, setImageOk] = useState(true);

  useEffect(() => {
    setImageOk(true);
    const img = new Image();
    img.src = `/tour/${slide}.png`;
    img.onload = () => setImageOk(true);
    img.onerror = () => setImageOk(false);
  }, [slide]);

  if (imageOk) {
    return (
      <img
        src={`/tour/${slide}.png`}
        alt={`${slide} demo`}
        className="w-full h-auto"
        onError={() => setImageOk(false)}
      />
    );
  }
  return <SvgFallback slide={slide} />;
}

function SvgFallback({ slide }: { slide: TourSlide }) {
  if (slide === "library") {
    return (
      <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="400" height="220" rx="8" fill="#1e1e1e" />
        <rect x="0" y="0" width="160" height="220" fill="#181818" />
        <rect x="12" y="20" width="80" height="10" rx="2" fill="#4a6cf7" opacity="0.7" />
        <rect x="12" y="40" width="120" height="6" rx="2" fill="#3a3a3a" />
        <rect x="12" y="55" width="100" height="6" rx="2" fill="#3a3a3a" />
        <rect x="12" y="70" width="120" height="6" rx="2" fill="#3a3a3a" />
        <rect x="12" y="85" width="90" height="6" rx="2" fill="#3a3a3a" />
        <rect x="12" y="105" width="70" height="6" rx="2" fill="#3a3a3a" />
        <rect x="12" y="120" width="120" height="6" rx="2" fill="#3a3a3a" />
        <rect x="12" y="135" width="100" height="6" rx="2" fill="#3a3a3a" />
        <rect x="180" y="20" width="200" height="14" rx="2" fill="#dcdcdc" opacity="0.9" />
        <rect x="180" y="50" width="180" height="6" rx="2" fill="#3a3a3a" />
        <rect x="180" y="64" width="200" height="6" rx="2" fill="#3a3a3a" />
        <rect x="180" y="78" width="160" height="6" rx="2" fill="#3a3a3a" />
        <rect x="180" y="100" width="180" height="6" rx="2" fill="#3a3a3a" />
        <rect x="180" y="114" width="200" height="6" rx="2" fill="#3a3a3a" />
        <rect x="180" y="128" width="120" height="6" rx="2" fill="#3a3a3a" />
        <rect x="180" y="150" width="100" height="20" rx="3" fill="#4a6cf7" opacity="0.4" />
      </svg>
    );
  }
  if (slide === "agents") {
    return (
      <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="400" height="220" rx="8" fill="#1e1e1e" />
        {[
          { x: 20, y: 30, name: "Jarvis", color: "#4a6cf7" },
          { x: 220, y: 30, name: "Marketing-Lead", color: "#a855f7" },
          { x: 20, y: 130, name: "Code-Reviewer", color: "#10b981" },
          { x: 220, y: 130, name: "Researcher", color: "#f59e0b" },
        ].map((a) => (
          <g key={a.name}>
            <rect x={a.x} y={a.y} width="160" height="80" rx="6" fill="#252525" stroke="#2f2f2f" />
            <circle cx={a.x + 24} cy={a.y + 28} r="14" fill={a.color} opacity="0.3" />
            <circle cx={a.x + 24} cy={a.y + 28} r="8" fill={a.color} />
            <rect x={a.x + 50} y={a.y + 18} width={80} height={8} rx={2} fill="#dcdcdc" opacity="0.9" />
            <rect x={a.x + 50} y={a.y + 32} width={60} height={5} rx={2} fill="#9a9a9a" />
            <rect x={a.x + 16} y={a.y + 56} width={120} height={5} rx={2} fill="#3a3a3a" />
            <rect x={a.x + 16} y={a.y + 67} width={90} height={5} rx={2} fill="#3a3a3a" />
          </g>
        ))}
      </svg>
    );
  }
  // byok
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <rect width="400" height="220" rx="8" fill="#1e1e1e" />
      {[
        { y: 24, label: "Anthropic Claude", icon: "A", color: "#d97706" },
        { y: 70, label: "Google Gemini", icon: "G", color: "#4285f4" },
        { y: 116, label: "OpenAI GPT", icon: "O", color: "#10a37f" },
        { y: 162, label: "xAI Grok", icon: "X", color: "#dcdcdc" },
      ].map((row) => (
        <g key={row.label}>
          <rect x="20" y={row.y} width="360" height="34" rx="5" fill="#252525" stroke="#2f2f2f" />
          <circle cx="40" cy={row.y + 17} r="11" fill={row.color} opacity="0.3" />
          <text
            x="40"
            y={row.y + 21}
            textAnchor="middle"
            fontSize="11"
            fontFamily="sans-serif"
            fontWeight="700"
            fill={row.color}
          >
            {row.icon}
          </text>
          <text
            x="60"
            y={row.y + 22}
            fontSize="11"
            fontFamily="sans-serif"
            fill="#dcdcdc"
          >
            {row.label}
          </text>
          <text
            x="370"
            y={row.y + 22}
            textAnchor="end"
            fontSize="10"
            fontFamily="monospace"
            fill="#10b981"
          >
            ✓ connected
          </text>
        </g>
      ))}
    </svg>
  );
}
