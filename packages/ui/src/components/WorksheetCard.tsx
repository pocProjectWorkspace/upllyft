import { Card } from './Card';
import { Badge } from './Badge';

export interface WorksheetCardProps {
  title: string;
  description: string;
  previewUrl?: string;
  type: string;
  tags?: string[];
  rating?: number;
  downloadCount?: number;
  onDownload?: () => void;
  href?: string;
  className?: string;
}

export function WorksheetCard({
  title,
  description,
  previewUrl,
  type,
  tags = [],
  rating,
  downloadCount,
  onDownload,
  href,
  className = '',
}: WorksheetCardProps) {
  const typeColorMap: Record<string, 'teal' | 'purple' | 'blue' | 'gray'> = {
    ACTIVITY: 'teal',
    VISUAL_SUPPORT: 'purple',
    STRUCTURED_PLAN: 'blue',
    PROGRESS_TRACKER: 'gray',
  };

  const typeLabel: Record<string, string> = {
    ACTIVITY: 'Activity',
    VISUAL_SUPPORT: 'Visual Support',
    STRUCTURED_PLAN: 'Structured Plan',
    PROGRESS_TRACKER: 'Progress Tracker',
  };

  const content = (
    <>
      {/* Preview Area */}
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
        {previewUrl ? (
          <img src={previewUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge color={typeColorMap[type] || 'gray'} className="text-[10px]">
            {typeLabel[type] || type}
          </Badge>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{title}</h3>
        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{description}</p>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {rating !== undefined && (
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs text-gray-600">{rating.toFixed(1)}</span>
            </div>
          )}
          {downloadCount !== undefined && (
            <span className="text-xs text-gray-400">{downloadCount} downloads</span>
          )}
        </div>
        {onDownload && (
          <button
            onClick={(e) => { e.preventDefault(); onDownload(); }}
            className="text-teal-600 hover:text-teal-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Card hover className={`p-4 ${className}`}>
        <a href={href} className="block">{content}</a>
      </Card>
    );
  }

  return (
    <Card hover className={`p-4 ${className}`}>
      {content}
    </Card>
  );
}
