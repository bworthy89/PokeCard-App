import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

interface Props {
  size?: number;
  rays?: number;
  spread?: number;
  opacity?: number;
  speed?: number;
  reverse?: boolean;
  style?: ViewStyle;
}

export const BurstSpinner = ({
  size = 200,
  rays = 18,
  spread = 4,
  opacity = 0.08,
  speed = 12000,
  reverse = false,
  style,
}: Props) => {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: speed,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rotate, speed]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['0deg', '-360deg'] : ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ rotate: spin }] }, style]}>
      <Svg width={size} height={size} viewBox="-50 -50 100 100">
        {Array.from({ length: rays }).map((_, i) => {
          const angle = (i * (360 / rays) * Math.PI) / 180;
          const x = Math.cos(angle) * 70;
          const y = Math.sin(angle) * 70;
          return (
            <Line
              key={i}
              x1={0}
              y1={0}
              x2={x}
              y2={y}
              stroke={`rgba(255,255,255,${opacity})`}
              strokeWidth={spread}
              strokeLinecap="butt"
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
};

export const burstStyles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
});
