'use client';

export function MiraAvatar({
  size = 'md',
  thinking = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  thinking?: boolean;
}) {
  const sizeMap = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-20 h-20' };

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
      <img
        src="/Mira.png"
        alt="Mira"
        className={`${sizeMap[size]} rounded-full object-cover relative`}
        style={{ animation: 'mira-float 3s ease-in-out infinite' }}
      />
    </div>
  );
}
