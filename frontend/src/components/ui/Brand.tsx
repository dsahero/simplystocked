import React from 'react';
import BannerRaw from '../../../icons/SimplyStockedBanner.svg?raw';
import IconRaw from '../../../icons/SimplyStockedIcon.svg?raw';

/**
 * SimplyStocked Logo with Text
*/
export const BrandLogo = ({ className }: { className?: string }) => {
  const vbMatch = BannerRaw.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>/i);
  const viewBox = vbMatch ? vbMatch[1] : '0 0 434 92';
  const inner = BannerRaw.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>[\s\S]*$/i, '');
  const svgString = `<svg viewBox="${viewBox}" preserveAspectRatio="xMinYMid meet" class="${className ?? ''}">${inner}</svg>`;
  return <span dangerouslySetInnerHTML={{ __html: svgString }} />;
};

/**
 * Default User Photo
 * REPLACE the SVG content below with your default user photo SVG.
 */
export const DefaultAvatar = ({ className }: { className?: string }) => {
  const vbMatch = IconRaw.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>/i);
  const viewBox = vbMatch ? vbMatch[1] : '0 0 434 346';
  const inner = IconRaw.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>[\s\S]*$/i, '');
  const svgString = `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" class="${className ?? ''}">${inner}</svg>`;
  return <span dangerouslySetInnerHTML={{ __html: svgString }} />;
};
