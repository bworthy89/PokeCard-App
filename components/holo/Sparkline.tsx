import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface Props {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  width?: number;
}

export const Sparkline = ({
  data,
  color = '#FFD23D',
  height = 36,
  fill = true,
  width = 100,
}: Props) => {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const path = points
    .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;

  const last = points[points.length - 1];

  return (
    <Svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
    >
      {fill && <Path d={area} fill={color} opacity={0.18} />}
      <Path
        d={path}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </Svg>
  );
};
