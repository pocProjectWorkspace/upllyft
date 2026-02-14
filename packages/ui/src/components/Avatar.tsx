const gradients = [
  'from-teal-400 to-teal-600',
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-amber-400 to-amber-600',
];

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
} as const;

export interface AvatarProps {
  src?: string;
  name?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getGradient(name: string): string {
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const safeName = name?.trim() || 'User';

  if (src) {
    return (
      <img
        src={src}
        alt={safeName}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br ${getGradient(safeName)} flex items-center justify-center text-white font-semibold ${className}`}
    >
      {getInitials(safeName)}
    </div>
  );
}
