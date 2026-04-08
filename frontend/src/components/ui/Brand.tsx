import React from 'react';

/**
 * SimplyStocked Logo with Text
 * REPLACE the SVG content below with your SimplyStocked logo SVG.
 */
export const BrandLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 200 50" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Placeholder SVG - Replace this entire block */}
    <rect width="200" height="50" rx="12" fill="currentColor" fillOpacity="0.1" />
    <text 
      x="50%" 
      y="50%" 
      dominantBaseline="middle" 
      textAnchor="middle" 
      fill="currentColor" 
      fontSize="20" 
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      SimplyStocked
    </text>
  </svg>
);

/**
 * Default User Photo
 * REPLACE the SVG content below with your default user photo SVG.
 */
export const DefaultAvatar = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Placeholder SVG - Replace this entire block */}
    <circle cx="50" cy="50" r="50" fill="currentColor" fillOpacity="0.1" />
    <circle cx="50" cy="40" r="20" fill="currentColor" fillOpacity="0.3" />
    <path 
      d="M20 85C20 70 35 60 50 60C65 60 80 70 80 85" 
      stroke="currentColor" 
      strokeWidth="8" 
      strokeLinecap="round" 
    />
  </svg>
);
