import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

type StarProps = {
  size: number;
  initialX: number;
  initialY: number;
  color: string;
  duration: number;
};

const Star: React.FC<StarProps> = ({ size, initialX, initialY, color, duration }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    // Gentle floating motion
    translateX.value = withRepeat(
      withSequence(
        withTiming(15, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(-15, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    translateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: duration * 1.2, easing: Easing.inOut(Easing.sin) }),
        withTiming(20, { duration: duration * 1.2, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Gentle pulsing
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: duration * 0.8, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: duration * 0.8, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Opacity variation
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: duration * 0.6, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: duration * 0.6, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [duration, translateX, translateY, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: initialX,
          top: initialY,
          width: size,
          height: size,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export const StarField: React.FC = () => {
  const stars = React.useMemo(() => {
    const starArray = [];
    const colors = ['#BDC3C7', '#E8DFF5']; // Silver Grey and Pale Lilac
    
    for (let i = 0; i < 18; i++) {
      starArray.push({
        id: i,
        size: Math.random() * 3 + 1, // 1-4px
        initialX: Math.random() * width,
        initialY: Math.random() * height,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: Math.random() * 3000 + 4000, // 4-7 seconds
      });
    }
    
    return starArray;
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {stars.map((star) => (
        <Star
          key={star.id}
          size={star.size}
          initialX={star.initialX}
          initialY={star.initialY}
          color={star.color}
          duration={star.duration}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    borderRadius: 2,
  },
});