import { useState } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { apiClient } from '@/utils/api';

export interface GoogleAuthResult {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
  code?: string;
}

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);

  const configureGoogleSignIn = async (webClientId: string, iosClientId?: string) => {
    try {
      console.log('🔧 Configuring Google Sign-In with:', {
        webClientId: webClientId?.substring(0, 20) + '...',
        iosClientId: iosClientId?.substring(0, 20) + '...',
      });
      
      await GoogleSignin.configure({
        webClientId: webClientId,
        iosClientId: iosClientId,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
      console.log('✅ Google Sign-In configured successfully');
    } catch (error) {
      console.error('❌ Error configuring Google Sign-In:', error);
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
    try {
      setIsLoading(true);
      console.log('🔐 Starting Google Sign-In process...');

      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();
      console.log('✅ Google Play Services available');

      // Sign in to Google
      const response = await GoogleSignin.signIn();
      console.log('✅ Google Sign-In successful:', {
        email: response.data?.user?.email,
        name: response.data?.user?.name,
        hasIdToken: !!response.data?.idToken
      });

      if (!response.data?.idToken || !response.data?.user) {
        throw new Error('No ID token or user data received from Google');
      }

      const { idToken, user } = response.data;

      // Send to backend for verification and user creation
      console.log('📤 Sending Google auth data to backend...');
      const backendResponse = await apiClient.googleAuth(idToken, {
        id: user.id,
        email: user.email,
        name: user.name || '',
        photo: user.photo,
        givenName: user.givenName,
        familyName: user.familyName,
      });

      if (backendResponse.error) {
        console.error('❌ Backend authentication failed:', backendResponse.error);
        return {
          success: false,
          error: backendResponse.error,
          code: backendResponse.code,
        };
      }

      console.log('🎉 Google authentication completed successfully');
      return {
        success: true,
        user: backendResponse.data?.user,
        session: backendResponse.data?.session,
      };
    } catch (error: any) {
      console.error('❌ Google Sign-In failed:', error);
      
      let errorMessage = 'Google Sign-In failed';
      let errorCode = 'GOOGLE_SIGNIN_FAILED';

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Google Sign-In was cancelled';
        errorCode = 'SIGN_IN_CANCELLED';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Google Sign-In is already in progress';
        errorCode = 'SIGN_IN_IN_PROGRESS';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available';
        errorCode = 'PLAY_SERVICES_NOT_AVAILABLE';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        code: errorCode,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signOutFromGoogle = async (): Promise<boolean> => {
    try {
      await GoogleSignin.signOut();
      console.log('✅ Google Sign-Out successful');
      return true;
    } catch (error) {
      console.error('❌ Google Sign-Out failed:', error);
      return false;
    }
  };

  const getCurrentGoogleUser = async () => {
    try {
      const userInfo = await GoogleSignin.signInSilently();
      return userInfo.data?.user || null;
    } catch (error) {
      console.log('No current Google user signed in');
      return null;
    }
  };

  return {
    isLoading,
    configureGoogleSignIn,
    signInWithGoogle,
    signOutFromGoogle,
    getCurrentGoogleUser,
  };
}