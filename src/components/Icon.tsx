import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, filled = false, className = '', style }) => (
  <span
    className={`material-symbols-rounded${className ? ` ${className}` : ''}`}
    style={{
      fontSize: size,
      fontVariationSettings: `'opsz' 20, 'wght' 300, 'FILL' ${filled ? 1 : 0}, 'GRAD' -25`,
      ...style,
    }}
  >
    {name}
  </span>
);
