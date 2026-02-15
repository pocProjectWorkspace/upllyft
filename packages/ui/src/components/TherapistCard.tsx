import { Card } from './Card';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';

export interface TherapistCardProps {
  name: string;
  avatar?: string;
  specialty: string[];
  rating: number;
  reviewCount: number;
  price: number;
  currency?: string;
  isVerified?: boolean;
  onBook?: () => void;
  href?: string;
  className?: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`w-4 h-4 ${filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function TherapistCard({
  name,
  avatar,
  specialty,
  rating,
  reviewCount,
  price,
  currency = '$',
  isVerified,
  onBook,
  href,
  className = '',
}: TherapistCardProps) {
  const content = (
    <>
      <div className="flex items-start gap-4">
        <Avatar src={avatar} name={name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 truncate">{name}</h3>
            {isVerified && (
              <svg className="w-4 h-4 text-teal-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {specialty.slice(0, 3).map((s) => (
              <Badge key={s} color="teal" className="text-[10px]">{s}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} filled={star <= Math.round(rating)} />
            ))}
          </div>
          <span className="text-sm font-medium text-gray-900 ml-1">{rating.toFixed(1)}</span>
          <span className="text-xs text-gray-500">({reviewCount})</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-gray-900">{currency}{price}</span>
          <span className="text-xs text-gray-500">/session</span>
        </div>
      </div>

      {onBook && (
        <div className="mt-4">
          <Button variant="primary" size="sm" className="w-full" onClick={onBook}>
            Book Session
          </Button>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Card hover className={`p-5 ${className}`}>
        <a href={href} className="block">{content}</a>
      </Card>
    );
  }

  return (
    <Card hover className={`p-5 ${className}`}>
      {content}
    </Card>
  );
}
