import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface SafeImageProps {
  fileId: string;
  alt: string;
  className?: string;
}

export function SafeImage({ fileId, alt, className = '' }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!fileId || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F8FAF9] text-slate-400 border border-slate-200 ${className}`}
      >
        <ImageOff className="w-6 h-6 mb-1" />
        <span className="text-[11px] font-medium text-center px-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={`/api/assets/${encodeURIComponent(fileId)}`}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
