import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from 'convex/react';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '../../convex/_generated/api';

export default function CreateScreen() {
  const { user } = useUser();
  const router = useRouter();

  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Get current user
  const currentUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  );

  // Mutations
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);

  // Request permissions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload images.'
      );
      return false;
    }
    return true;
  };

  // Pick image from gallery
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permissions to take photos.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Upload image to Convex
  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      console.log('🔵 Starting image upload...');
      console.log('🔵 Image URI:', uri);
      
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      console.log('🔵 Got upload URL');

      // Fetch the image as blob
      const response = await fetch(uri);
      const blob = await response.blob();
      console.log('🔵 Blob size:', blob.size, 'Type:', blob.type);

      // Upload to Convex
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      });

      const uploadResult = await uploadResponse.json();
      console.log('🔵 Upload response:', uploadResult);
      
      const { storageId } = uploadResult;
      
      if (!storageId) {
        console.error('❌ No storageId returned!');
        return null;
      }
      
      console.log('✅ Image uploaded successfully!');
      console.log('✅ Storage ID:', storageId);
      
      // Return just the storageId - Convex will generate the URL
      return storageId;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      return null;
    }
  };

  // Handle post creation
  const handleCreatePost = async () => {
    if (!caption.trim() && !imageUri) {
      Alert.alert('Error', 'Please add a caption or image');
      return;
    }

    if (!currentUser?._id) {
      Alert.alert('Error', 'User not found. Please try again.');
      return;
    }

    setUploading(true);

    try {
      let storageId = null;

      // Upload image if selected
      if (imageUri) {
        console.log('📤 Uploading image...');
        storageId = await uploadImage(imageUri);
        if (!storageId) {
          throw new Error('Failed to upload image');
        }
        console.log('📤 Upload complete, storageId:', storageId);
      }

      // Create post with storageId only
      console.log('📝 Creating post with data:', {
        userId: currentUser._id,
        caption: caption.trim(),
        hasImage: !!storageId,
        storageId,
      });
      
      const newPost = await createPost({
        userId: currentUser._id,
        caption: caption.trim(),
        imageStorageId: storageId as any,
      });
      
      console.log('✅ Post created:', newPost);

      Alert.alert('Success! 🎉', 'Your post has been shared!', [
        {
          text: 'OK',
          onPress: () => {
            setCaption('');
            setImageUri(null);
            router.push('/(tabs)/feed');
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleImageOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Library',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#405DE6', '#5B51D8', '#833AB4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity
            onPress={handleCreatePost}
            disabled={uploading || (!caption.trim() && !imageUri)}
          >
            <Text
              style={[
                styles.shareButton,
                (uploading || (!caption.trim() && !imageUri)) &&
                  styles.shareButtonDisabled,
              ]}
            >
              Share
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Image Preview */}
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImageUri(null)}
              >
                <Ionicons name="close-circle" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handleImageOptions}
            >
              <LinearGradient
                colors={['#405DE6', '#833AB4', '#C13584']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addImageGradient}
              >
                <Ionicons name="camera-outline" size={48} color="#FFFFFF" />
                <Text style={styles.addImageText}>Add Photo</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Caption Input */}
          <View style={styles.captionContainer}>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor="#8E8E8E"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={2200}
              editable={!uploading}
            />
            <Text style={styles.characterCount}>
              {caption.length}/2200
            </Text>
          </View>

          {/* Upload Status */}
          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#405DE6" />
              <Text style={styles.uploadingText}>Creating your post...</Text>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleImageOptions}
            >
              <Ionicons name="image-outline" size={24} color="#405DE6" />
              <Text style={styles.quickActionText}>
                {imageUri ? 'Change Photo' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  shareButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },
  addImageButton: {
    margin: 16,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addImageGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  captionContainer: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBDBDB',
    padding: 16,
  },
  captionInput: {
    fontSize: 16,
    color: '#262626',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E8E',
    textAlign: 'right',
    marginTop: 8,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  uploadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#405DE6',
    fontWeight: '600',
  },
  quickActions: {
    margin: 16,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#262626',
    marginBottom: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  quickActionText: {
    fontSize: 16,
    color: '#262626',
    fontWeight: '600',
    marginLeft: 12,
  },
});