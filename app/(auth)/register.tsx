import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function RegisterScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const createUser = useMutation(api.users.getOrCreateUser);
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }

    if (name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return false;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      Alert.alert(
        'Weak Password',
        'Password must contain uppercase, lowercase, and numbers. Special characters recommended.'
      );
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!isLoaded) return;

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Step 1: Create Clerk account
      const completeSignUp = await signUp.create({
        emailAddress: email,
        password,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || undefined,
      });

      console.log('Sign up result:', {
        status: completeSignUp.status,
        createdSessionId: completeSignUp.createdSessionId,
        createdUserId: completeSignUp.createdUserId,
      });

      // Step 2: Check if we need email verification
      if (completeSignUp.status === 'missing_requirements') {
        // Email verification required - for now, we'll skip this in development
        console.log('Email verification would be needed');
      }

      // Step 3: Check if user and session were created
      if (!completeSignUp.createdUserId) {
        throw new Error('Failed to create user account');
      }

      // Step 4: Attempt to set active session
      let sessionSet = false;
      
      if (completeSignUp.createdSessionId) {
        try {
          await setActive({ session: completeSignUp.createdSessionId });
          sessionSet = true;
        } catch (sessionError) {
          console.error('Session activation error:', sessionError);
        }
      }

      // Step 5: Wait for session to be established
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 6: Create user in Convex
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      try {
        await createUser({
          clerkId: completeSignUp.createdUserId,
          email: email,
          name: name,
          username: username,
        });

        // Success!
        Alert.alert(
          'Welcome to Framez! 🎉',
          'Your account has been created successfully!',
          [
            {
              text: 'Get Started',
              onPress: () => {
                if (sessionSet) {
                  router.replace('/(tabs)/feed');
                } else {
                  // If session wasn't set, go to login
                  router.replace('/(auth)/login');
                }
              },
            },
          ]
        );
      } catch (convexError: any) {
        console.error('Convex user creation error:', convexError);
        
        // User is created in Clerk, just not in Convex yet
        Alert.alert(
          'Account Created!',
          'Please log in to continue.',
          [
            {
              text: 'Go to Login',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      let errorMessage = 'Failed to create account. Please try again.';
      
      // Handle specific Clerk errors
      if (err.errors && err.errors[0]) {
        const error = err.errors[0];
        const errorCode = error.code;
        const errorMsg = error.message;

        if (errorCode === 'form_password_pwned') {
          errorMessage = 'This password has been found in a data breach. Please use a stronger, unique password with uppercase, lowercase, numbers, and special characters.';
        } else if (errorCode === 'form_identifier_exists') {
          errorMessage = 'An account with this email already exists. Please login instead.';
        } else if (errorCode === 'form_password_length_too_short') {
          errorMessage = 'Password must be at least 8 characters long.';
        } else if (errorCode === 'form_param_format_invalid') {
          errorMessage = 'Please check your email format.';
        } else {
          errorMessage = errorMsg || errorMessage;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#405DE6', '#5B51D8', '#833AB4', '#C13584', '#E1306C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Ionicons name="camera" size={48} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.appName}>Join Framez</Text>
          <Text style={styles.tagline}>Create an account to get started</Text>
        </View>

        {/* Registration Form */}
        <View style={styles.formContainer}>
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#8E8E8E"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#8E8E8E"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              editable={!loading}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#8E8E8E"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8E8E8E"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#8E8E8E"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password (8+ chars, mixed case, numbers)"
              placeholderTextColor="#8E8E8E"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#8E8E8E"
              />
            </TouchableOpacity>
          </View>

          {/* Password Strength Indicator */}
          <View style={styles.passwordHint}>
            <Text style={styles.passwordHintText}>
              💡 Use a unique password with uppercase, lowercase, numbers & special characters
            </Text>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#8E8E8E"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#8E8E8E"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#8E8E8E"
              />
            </TouchableOpacity>
          </View>

          {/* Terms of Service */}
          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <LinearGradient
                colors={['#405DE6', '#833AB4', '#C13584']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signupButtonGradient}
              >
                <Text style={styles.signupButtonText}>Sign Up</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          {/* Social Sign Up (Optional) */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => Alert.alert('Social Sign Up', 'Feature coming soon!')}
          >
            <Ionicons name="logo-google" size={20} color="#DB4437" />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#262626',
    marginBottom: 8,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBDBDB',
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#262626',
  },
  eyeIcon: {
    padding: 4,
  },
  passwordHint: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  passwordHintText: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#8E8E8E',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  termsLink: {
    color: '#405DE6',
    fontWeight: '600',
  },
  signupButton: {
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#DBDBDB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#8E8E8E',
    fontWeight: '600',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBDBDB',
    height: 52,
    marginBottom: 16,
  },
  socialButtonText: {
    fontSize: 16,
    color: '#262626',
    fontWeight: '600',
    marginLeft: 12,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  loginLink: {
    fontSize: 14,
    color: '#405DE6',
    fontWeight: 'bold',
  },
});