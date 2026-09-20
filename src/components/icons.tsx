import React from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

type IconProps = { size?: number; color?: string };

export function ChevronLeftIcon({ size = 20, color = '#A79C89' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 6 9 12 15 18" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 16, color = '#A79C89' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="9 6 15 12 9 18" />
    </Svg>
  );
}

export function PlusIcon({ size = 18, color = '#15120D' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  );
}

export function AlarmClockIcon({ size = 18, color = '#C9A34E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

export function CameraIcon({ size = 20, color = '#C9A34E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <Circle cx={12} cy={13} r={4} />
    </Svg>
  );
}

export function CheckIcon({ size = 18, color = '#C9A34E', strokeWidth = 2.6 }: IconProps & { strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

export function CircleIcon({ size = 20, color = '#C9A34E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}

export function GridIcon({ size = 20, color = '#C9A34E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={3} width={18} height={18} rx={4} />
      <Circle cx={8} cy={8} r={1} fill={color} stroke="none" />
      <Circle cx={16} cy={8} r={1} fill={color} stroke="none" />
      <Circle cx={12} cy={12} r={1} fill={color} stroke="none" />
      <Circle cx={8} cy={16} r={1} fill={color} stroke="none" />
      <Circle cx={16} cy={16} r={1} fill={color} stroke="none" />
    </Svg>
  );
}

export function TargetIcon({ size = 20, color = '#C9A34E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={12} cy={12} r={5} />
      <Circle cx={12} cy={12} r={1} fill={color} stroke="none" />
    </Svg>
  );
}

export function BoltIcon({ size = 14, color = '#6B6255' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </Svg>
  );
}

export function SoundWaveIcon({ size = 14, color = '#C9A34E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <Polygon points="6 4 20 12 6 20 6 4" />
    </Svg>
  );
}
