'use client';

export function MiraAvatar({
  size = 'md',
  thinking = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  thinking?: boolean;
}) {
  const sizeMap = { sm: 'w-6 h-6 text-xs', md: 'w-10 h-10 text-base', lg: 'w-20 h-20 text-3xl' };

  return (
    <div className="relative flex-shrink-0">
      {/* Glow ring */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-r from-amber-300 to-teal-400 ${
          thinking ? 'animate-pulse' : 'opacity-0'
        } transition-opacity duration-300`}
        style={{ margin: '-3px' }}
      />
      {/* Avatar */}
      <div
        className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-amber-300 to-teal-400 flex items-center justify-center font-bold text-white relative`}
        style={{ animation: 'mira-float 3s ease-in-out infinite' }}
      >
        M
      </div>
    </div>
  );
}
