import React from 'react';

/**
 * FIRMSync Official Vector Logo Mark (Emblem)
 * Features the signature multi-tier calibrated flame, dual orbital ring,
 * and orbital satellite telemetry indicators.
 */
export function LogoMark({ className = "w-10 h-10", size }) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div 
      className={`relative rounded-xl overflow-hidden bg-[#0F1013] flex items-center justify-center shadow-md ring-1 ring-orange-500/30 shrink-0 select-none ${className}`}
      style={style}
      title="FIRMSync — NASA Space Apps Challenge 2026"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="285 160 400 400" 
        className="w-full h-full p-0.5"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="header-flame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFB03B"/>
            <stop offset="0.42" stopColor="#FF7A1F"/>
            <stop offset="0.75" stopColor="#F2501A"/>
            <stop offset="1" stopColor="#DC2A1E"/>
          </linearGradient>
          <linearGradient id="header-drop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD27D"/>
            <stop offset="1" stopColor="#FFC96B"/>
          </linearGradient>
          <linearGradient id="header-ringFront" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FF8A3D"/>
            <stop offset="1" stopColor="#FF8F45"/>
          </linearGradient>
        </defs>

        <g id="emblem">
          {/* orbit: back half (behind flame) */}
          <g transform="translate(485 388) rotate(-21)" fill="none" strokeLinecap="round">
            <path d="M-187 0 A187 65 0 0 1 187 0" stroke="#7A4526" strokeWidth="14"/>
          </g>

          {/* flame */}
          <path 
            fill="url(#header-flame)" 
            d="M485 203 C500 250 530 270 550 300 C575 335 580 380 575 415 C568 465 530 500 485 500 C440 500 395 465 392 405 C390 370 405 340 432 303 C438 320 445 335 466 350 C462 300 470 240 485 203 Z"
          />
          {/* inner drop */}
          <path 
            fill="url(#header-drop)" 
            d="M485 335 C500 365 533 400 533 445 C533 470 512 487 485 487 C458 487 437 470 437 440 C437 400 470 365 485 335 Z"
          />

          {/* orbit: front half (over flame) */}
          <g transform="translate(485 388) rotate(-21)" fill="none" strokeLinecap="round">
            <path d="M-187 0 A187 65 0 0 0 187 0" stroke="url(#header-ringFront)" strokeWidth="14"/>
            {/* satellites */}
            <circle cx="-95" cy="-56" r="14" fill="#FFB03B"/>
            <rect x="85" y="43" width="26" height="26" rx="6" transform="rotate(21 97 56)" fill="#F7EFE4" stroke="none"/>
          </g>
        </g>
      </svg>
    </div>
  );
}

/**
 * FIRMSync Full Logo Lockup (Emblem + Wordmark)
 */
export function FullLogo({ className = "h-9 w-auto" }) {
  return (
    <img 
      src="/logo.svg" 
      alt="FIRMSync Logo" 
      className={`rounded-lg object-contain shadow-sm ${className}`} 
    />
  );
}
