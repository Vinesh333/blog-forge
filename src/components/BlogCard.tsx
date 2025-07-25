import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BlogCardProps {
  id: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  category?: { name: string; slug: string };
  tags?: string[];
  authorName: string;
  publishedAt: string;
  likesCount?: number;
  commentsCount?: number;
}

const BlogCard = ({
  id,
  title,
  excerpt,
  featuredImage,
  category,
  tags = [],
  authorName,
  publishedAt,
  likesCount = 0,
  commentsCount = 0
}: BlogCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {featuredImage && (
        <div className="aspect-video bg-muted">
          <img
            src={featuredImage}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          {category && (
            <Badge variant="secondary">{category.name}</Badge>
          )}
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDistanceToNow(new Date(publishedAt), { addSuffix: true })}
          </div>
        </div>
        
        <Link to={`/post/${id}`}>
          <h3 className="text-xl font-semibold hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>
      </CardHeader>
      
      <CardContent>
        <p className="text-muted-foreground mb-4 line-clamp-3">{excerpt}</p>
        
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <User className="h-3 w-3 mr-1" />
            {authorName}
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <Heart className="h-3 w-3 mr-1" />
              {likesCount}
            </div>
            <div className="flex items-center">
              <MessageCircle className="h-3 w-3 mr-1" />
              {commentsCount}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlogCard;