import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../convex/_generated/api';

const { width } = Dimensions.get('window');
const imageSize = (width - 4) / 3; // 3 columns with 2px gap

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Get current user from Convex
  const currentUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  );

  // Get user's posts
  const userPosts = useQuery(
    api.posts.getPostsByUser,
    currentUser?._id ? { userId: currentUser._id } : 'skip'
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Feature coming soon!');
  };

  if (!currentUser || userPosts === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <LinearGradient
            colors={['#405DE6', '#5B51D8', '#833AB4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <Text style={styles.headerTitle}>Profile</Text>
          </LinearGradient>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#405DE6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const postsCount = userPosts?.length || 0;

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
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <FlatList
        data={userPosts}
        numColumns={3}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <View style={styles.profileHeader}>
            {/* Avatar and Stats */}
            <View style={styles.profileInfo}>
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {currentUser.avatarUrl ? (
                  <Image
                    source={{ uri: currentUser.avatarUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <LinearGradient
                    colors={['#405DE6', '#833AB4', '#C13584']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {currentUser.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{postsCount}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>
            </View>

            {/* Name and Bio */}
            <View style={styles.bioContainer}>
              <Text style={styles.name}>{currentUser.name}</Text>
              <Text style={styles.username}>@{currentUser.username}</Text>
              {currentUser.bio && (
                <Text style={styles.bio}>{currentUser.bio}</Text>
              )}
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProfile}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Posts Header */}
            <View style={styles.postsHeader}>
              <Ionicons name="grid-outline" size={24} color="#262626" />
              <Text style={styles.postsHeaderText}>Posts</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.postItem}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.postImage}
              />
            ) : (
              <View style={styles.postPlaceholder}>
                <Text style={styles.postCaption} numberOfLines={3}>
                  {item.caption}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="camera-outline" size={64} color="#DBDBDB" />
            <Text style={styles.emptyTitle}>No Posts Yet</Text>
            <Text style={styles.emptyText}>
              Share your first moment with Framez!
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#405DE6"
            colors={['#405DE6', '#833AB4']}
          />
        }
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.columnWrapper}
      />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E8E',
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  avatarContainer: {
    marginRight: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#262626',
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E8E',
    marginTop: 4,
  },
  bioContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#262626',
  },
  username: {
    fontSize: 14,
    color: '#8E8E8E',
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: '#262626',
    marginTop: 8,
    lineHeight: 20,
  },
  editButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBDBDB',
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  postsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DBDBDB',
  },
  postsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginLeft: 8,
  },
  columnWrapper: {
    gap: 2,
  },
  postItem: {
    width: imageSize,
    height: imageSize,
    marginBottom: 2,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
    padding: 8,
    justifyContent: 'center',
  },
  postCaption: {
    fontSize: 12,
    color: '#262626',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#262626',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E8E',
    textAlign: 'center',
    lineHeight: 20,
  },
});