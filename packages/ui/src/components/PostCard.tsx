import { Avatar } from './Avatar';

export interface PostCardAuthor {
  name: string;
  avatar?: string;
  role?: string;
  isVerified?: boolean;
}

export interface PostCardProps {
  author: PostCardAuthor;
  content: string;
  timestamp: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  images?: string[];
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  href?: string;
  className?: string;
}

export function PostCard({
  author,
  content,
  timestamp,
  likesCount,
  commentsCount,
  isLiked = false,
  isBookmarked = false,
  images,
  onLike,
  onComment,
  onBookmark,
  onShare,
  href,
  className = '',
}: PostCardProps) {
  const card = (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      {/* Author Header */}
      <div className="flex items-center gap-3">
        <Avatar src={author.avatar} name={author.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900 truncate">{author.name}</span>
            {author.isVerified && (
              <svg className="w-4 h-4 text-teal-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {author.role && (
              <span className="text-xs text-gray-400 capitalize">{author.role.toLowerCase()}</span>
            )}
          </div>
          <span className="text-xs text-gray-400">{timestamp}</span>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        {href ? (
          <a href={href} className="block">
            <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-4">{content}</p>
          </a>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-4">{content}</p>
        )}
      </div>

      {/* Images */}
      {images && images.length > 0 && (
        <div className="mt-3 rounded-xl overflow-hidden">
          {images.length === 1 ? (
            <img src={images[0]} alt="" className="w-full max-h-80 object-cover rounded-xl" />
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {images.slice(0, 4).map((img, i) => (
                <img key={i} src={img} alt="" className="w-full h-40 object-cover" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={onLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{likesCount}</span>
          </button>

          <button
            onClick={onComment}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{commentsCount}</span>
          </button>

          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          )}
        </div>

        {onBookmark && (
          <button
            onClick={onBookmark}
            className={`transition-colors ${
              isBookmarked ? 'text-teal-600' : 'text-gray-400 hover:text-teal-600'
            }`}
          >
            <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  return card;
}
