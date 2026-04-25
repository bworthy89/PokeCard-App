import React, { useId } from 'react';
import { StyleSheet, ViewProps, View } from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';

interface Props extends ViewProps {
  spacing?: number;
  opacity?: number;
}

export const DotGrid = ({ spacing = 14, opacity = 0.06, style, ...rest }: Props) => {
  const patternId = `dotgrid-${useId()}`;
  return (
    <View style={[StyleSheet.absoluteFill, style]} {...rest} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={patternId} x={0} y={0} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
            <Circle cx={1.5} cy={1.5} r={1} fill={`rgba(255,255,255,${opacity})`} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
};
