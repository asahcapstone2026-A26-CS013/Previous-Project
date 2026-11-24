/** Ilustrasi laut dan ikan untuk panel visual halaman masuk. */
export function OceanArt() {
  return (
    <svg viewBox="0 0 600 700" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f3a4d" />
          <stop offset="0.55" stopColor="#14606b" />
          <stop offset="1" stopColor="#25b9a6" />
        </linearGradient>
        <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb08a" />
          <stop offset="1" stopColor="#f4502f" />
        </linearGradient>
        <linearGradient id="fishBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9fbf7" />
          <stop offset="1" stopColor="#7fd9cc" />
        </linearGradient>
      </defs>
      <rect width="600" height="700" fill="url(#sky)" />
      <circle cx="430" cy="250" r="92" fill="url(#sun)" opacity="0.92" />
      <g className="animate-drift" opacity="0.5">
        <path d="M0 330 Q75 305 150 330 T300 330 T450 330 T600 330 V380 H0Z" fill="#0f3a4d" />
      </g>
      <path d="M0 400 Q100 372 200 400 T400 400 T600 400 V700 H0Z" fill="#0d4a5a" />
      <path d="M0 470 Q120 440 240 470 T480 470 T720 470 V700 H0Z" fill="#0a3a49" />
      <path d="M0 560 Q150 530 300 560 T600 560 V700 H0Z" fill="#072a37" />
      <g transform="translate(120 420) rotate(-12)">
        <path d="M0 60 C60 -8 170 -8 240 60 C170 128 60 128 0 60Z" fill="url(#fishBody)" />
        <path d="M232 60 L300 14 C286 44 286 76 300 106Z" fill="#7fd9cc" />
        <path d="M70 18 C100 -6 130 -2 150 14 C120 18 96 24 70 18Z" fill="#55d3bf" />
        <path d="M70 102 C100 126 130 122 150 106 C120 102 96 96 70 102Z" fill="#55d3bf" />
        <path d="M54 60 C60 30 84 18 96 18 C84 36 84 84 96 102 C84 102 60 90 54 60Z" fill="#14a08f" opacity="0.5" />
        <circle cx="38" cy="50" r="7" fill="#081c26" />
        <circle cx="40" cy="48" r="2.2" fill="#fff" />
        <g stroke="#14a08f" strokeWidth="2" opacity="0.4" fill="none">
          <path d="M120 40 Q140 60 120 82" />
          <path d="M150 38 Q170 60 150 84" />
          <path d="M180 42 Q198 60 180 80" />
        </g>
      </g>
      <g fill="#fff" opacity="0.35">
        <circle cx="90" cy="360" r="5" />
        <circle cx="110" cy="330" r="3" />
        <circle cx="70" cy="300" r="2.5" />
        <circle cx="500" cy="520" r="4" />
        <circle cx="520" cy="490" r="2.5" />
      </g>
    </svg>
  )
}
