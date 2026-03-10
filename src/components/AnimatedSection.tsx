import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}

export const AnimatedSection: React.FC<Props> = ({ children, delay = 0, style }) => {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(420)} style={style}>
      {children}
    </Animated.View>
  );
};
