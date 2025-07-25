import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Calendar, User, Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      if (!id) throw new Error('Post ID is required');
      
      const { data: postData, error } = await supabase
        .from('posts')
        .select(`
          *,
          categories (name, slug)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Fetch user profile separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', postData.user_id)
        .single();

      if (profileError) console.warn('Profile not found');
      
      return {
        ...postData,
        profiles: profileData
      };
    },
    enabled: !!id
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = [...new Set(commentsData?.map(comment => comment.user_id) || [])];
      if (userIds.length === 0) return [];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);
      
      if (profilesError) console.warn('Profiles not found');
      
      // Merge the data
      const commentsWithProfiles = commentsData?.map(comment => ({
        ...comment,
        profiles: profilesData?.find(profile => profile.user_id === comment.user_id) || null
      })) || [];
      
      return commentsWithProfiles;
    },
    enabled: !!id
  });

  const { data: isLiked = false } = useQuery({
    queryKey: ['like', id, user?.id],
    queryFn: async () => {
      if (!id || !user) return false;
      
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single();

      return !error && !!data;
    },
    enabled: !!id && !!user
  });

  const { data: likesCount = 0 } = useQuery({
    queryKey: ['likesCount', id],
    queryFn: async () => {
      if (!id) return 0;
      
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!id
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('User not authenticated');

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([{ post_id: id, user_id: user.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['like', id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['likesCount', id] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('comments')
        .insert([{ post_id: id, user_id: user.id, content }]);

      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      toast({
        title: 'Comment added!',
        description: 'Your comment has been posted successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    commentMutation.mutate(newComment.trim());
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to posts
        </Link>

        <article className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {post.categories && (
                <Badge variant="secondary">{post.categories.name}</Badge>
              )}
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(post.published_at || post.created_at), { addSuffix: true })}
              </div>
            </div>
            
            <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center text-muted-foreground">
                <User className="h-4 w-4 mr-2" />
                {post.profiles?.display_name || 'Anonymous'}
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => user ? likeMutation.mutate() : toast({ title: 'Please sign in to like posts', variant: 'destructive' })}
                  className={isLiked ? 'text-red-500' : ''}
                >
                  <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                  {likesCount}
                </Button>
                <div className="flex items-center text-muted-foreground">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {comments.length}
                </div>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          {post.featured_image_url && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {post.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </article>

        {/* Comments Section */}
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
          
          {/* Add Comment */}
          {user ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || commentMutation.isPending}
                  >
                    {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Please sign in to leave a comment
                </p>
                <Link to="/auth">
                  <Button>Sign In</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      <span className="font-medium">
                        {comment.profiles?.display_name || 'Anonymous'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{comment.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PostDetail;