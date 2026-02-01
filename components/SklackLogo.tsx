import React from 'react';

interface SklackLogoProps {
  className?: string;
  size?: number;
}

const SklackLogo: React.FC<SklackLogoProps> = ({ className = "", size = 40 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* The Carabiner Frame */}
      <path 
        d="M30 20C20 20 15 30 15 50C15 70 20 80 30 80H70C80 80 85 70 85 50C85 30 80 20 70 20" 
        stroke="currentColor" 
        strokeWidth="6" 
        strokeLinecap="round" 
      />
      {/* The Carabiner Gate (Stylized) */}
      <path 
        d="M85 40V60" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round" 
        opacity="0.5"
      />
      
      {/* Car with Open Hood inside */}
      {/* Car Body */}
      <path 
        d="M25 65H75V55C75 52 73 50 70 50H55L50 42H30C27 42 25 44 25 47V65Z" 
        fill="currentColor" 
      />
      {/* Open Hood */}
      <path 
        d="M55 50L68 35" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round" 
      />
      {/* Wheels */}
      <circle cx="35" cy="65" r="5" fill="black" stroke="currentColor" strokeWidth="2" />
      <circle cx="65" cy="65" r="5" fill="black" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
};

export default SklackLogo;
