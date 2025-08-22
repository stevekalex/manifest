import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export function GlowingLogo() {
  const glowIntensity = useSharedValue(0.6);
  const rotateValue = useSharedValue(0);

  useEffect(() => {
    // Pulsing glow effect
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Slow rotation
    rotateValue.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: glowIntensity.value,
      transform: [{ rotate: `${rotateValue.value}deg` }],
    };
  });

  const outerRingStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: glowIntensity.value * 0.8,
    };
  });

  const innerRingStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: glowIntensity.value * 1.2,
    };
  });

  return (
    <View style={styles.container}>
      {/* Outer glow ring */}
      <Animated.View style={[styles.outerRing, outerRingStyle]} />
      
      {/* Middle ring */}
      <Animated.View style={[styles.middleRing, animatedStyle]} />
      
      {/* Inner glowing symbol */}
      <Animated.View style={[styles.innerRing, innerRingStyle]}>
        <Text style={styles.logoSymbol}>✧</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 40,
  },
  outerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowRadius: 20,
    elevation: 10,
  },
  middleRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: '#FFF8DC',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowRadius: 15,
    elevation: 8,
  },
  innerRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowRadius: 10,
    elevation: 6,
  },
  logoSymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#FFD700',
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 8,
  },
});