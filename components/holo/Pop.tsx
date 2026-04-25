import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Scale-and-rotate pop-in for hero elements (e.g. revealed card after
 * an analyzing flash). Slight overshoot in the middle, settles to 1.
 */
export const Pop = ({ children, delay = 0, style }: Props) => {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      delay,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, delay]);

  const scale = v.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.6, 1.08, 1],
  });
  const rotate = v.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: ['-6deg', '2deg', '0deg'],
  });

  return (
    <Animated.View
      style={[{ opacity: v, transform: [{ scale }, { rotate }] }, style]}
    >
      {children}
    </Animated.View>
  );
};
