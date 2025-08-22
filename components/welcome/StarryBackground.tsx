import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StarProps {
  x: number;
  y: number;
  size: number;
  delay: number;
}

function Star({ x, y, size, delay }: StarProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0.3, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        true
      )
    );

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000 }),
          withTiming(0.7, { duration: 3000 })
        ),
        -1,
        true
      )
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: x,
          top: y,
          width: size,
          height: size,
        },
        animatedStyle,
      ]}
    />
  );
}

export function StarryBackground() {
  // Generate random stars
  const stars = React.useMemo(() => {
    const starArray: StarProps[] = [];
    
    for (let i = 0; i < 50; i++) {
      starArray.push({
        x: Math.random() * screenWidth,
        y: Math.random() * screenHeight,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 5000,
      });
    }
    
    return starArray;
  }, []);

  return (
    <View style={styles.container}>
      {stars.map((star, index) => (
        <Star
          key={index}
          x={star.x}
          y={star.y}
          size={star.size}
          delay={star.delay}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0F',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    shadowColor: '#FFFFFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
});