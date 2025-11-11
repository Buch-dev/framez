import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new post
export const createPost = mutation({
  args: {
    userId: v.id("users"),
    caption: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    console.log('🔵 Creating post with args:', {
      userId: args.userId,
      caption: args.caption,
      hasStorageId: !!args.imageStorageId,
      imageStorageId: args.imageStorageId,
    });
    
    // Get user info
    const user = await ctx.db.get(args.userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Get proper image URL from storage if we have storageId
    let imageUrl: string | undefined = undefined;
    if (args.imageStorageId) {
      console.log('🔵 Getting URL for storageId:', args.imageStorageId);
      const url = await ctx.storage.getUrl(args.imageStorageId);
      console.log('✅ Got storage URL:', url);
      imageUrl = url ?? undefined;
    }

    // Create post
    const postId = await ctx.db.insert("posts", {
      userId: args.userId,
      authorName: user.name,
      authorAvatar: user.avatarUrl,
      caption: args.caption,
      imageUrl: imageUrl,
      imageStorageId: args.imageStorageId,
      likes: 0,
      createdAt: Date.now(),
    });

    const post = await ctx.db.get(postId);
    console.log('✅ Post created successfully:', {
      postId,
      hasImageUrl: !!post?.imageUrl,
      imageUrl: post?.imageUrl?.substring(0, 80),
    });
    
    return post;
  },
});

// Get all posts (feed) - newest first with proper image URLs
export const getAllPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
    
    console.log('🔵 Fetching all posts, count:', posts.length);
    
    // Get proper image URLs from storage
    const postsWithImages = await Promise.all(
      posts.map(async (post) => {
        let imageUrl = post.imageUrl;
        
        // Always refresh the URL from storageId to get a fresh signed URL
        if (post.imageStorageId) {
          const freshUrl = await ctx.storage.getUrl(post.imageStorageId);
          console.log('🔵 Post', post._id.substring(0, 8), 'fresh URL:', freshUrl ? 'generated' : 'null');
          if (freshUrl) {
            imageUrl = freshUrl;
          }
        }
        
        return {
          ...post,
          imageUrl: imageUrl || undefined,
        };
      })
    );
    
    console.log('✅ Posts ready:', postsWithImages.map(p => ({
      id: p._id.substring(0, 8),
      hasImage: !!p.imageUrl,
    })));
    
    return postsWithImages;
  },
});

// Get posts by user with proper image URLs
export const getPostsByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    
    // Get proper image URLs from storage
    const postsWithImages = await Promise.all(
      posts.map(async (post) => {
        let imageUrl = post.imageUrl;
        
        // Always refresh the URL from storageId
        if (post.imageStorageId) {
          const freshUrl = await ctx.storage.getUrl(post.imageStorageId);
          if (freshUrl) {
            imageUrl = freshUrl;
          }
        }
        
        return {
          ...post,
          imageUrl: imageUrl || undefined,
        };
      })
    );
    
    return postsWithImages;
  },
});

// Get single post by ID
export const getPostById = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    return post;
  },
});

// Delete post
export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, { postId, userId }) => {
    const post = await ctx.db.get(postId);
    
    if (!post) {
      throw new Error("Post not found");
    }
    
    // Check if user owns the post
    if (post.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Delete image from storage if exists
    if (post.imageStorageId) {
      await ctx.storage.delete(post.imageStorageId);
    }
    
    await ctx.db.delete(postId);
    return { success: true };
  },
});

// Generate upload URL for images
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Like a post (bonus feature)
export const likePost = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, { postId, userId }) => {
    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_and_post", (q) => 
        q.eq("userId", userId).eq("postId", postId)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      
      // Decrement likes count
      const post = await ctx.db.get(postId);
      if (post) {
        await ctx.db.patch(postId, {
          likes: Math.max(0, post.likes - 1),
        });
      }
      
      return { liked: false };
    } else {
      // Like
      await ctx.db.insert("likes", {
        userId,
        postId,
        createdAt: Date.now(),
      });
      
      // Increment likes count
      const post = await ctx.db.get(postId);
      if (post) {
        await ctx.db.patch(postId, {
          likes: post.likes + 1,
        });
      }
      
      return { liked: true };
    }
  },
});

// Check if user liked a post
export const hasUserLikedPost = query({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, { postId, userId }) => {
    const like = await ctx.db
      .query("likes")
      .withIndex("by_user_and_post", (q) => 
        q.eq("userId", userId).eq("postId", postId)
      )
      .first();
    
    return !!like;
  },
});