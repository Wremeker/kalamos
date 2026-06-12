interface VideoPlayerProps {
  src: string | null | undefined;
  className?: string;
  poster?: string;
}

/**
 * OSS replacement for the app's video player. Uses the native <video> element
 * with controls; media URLs are public so no signing is required.
 */
export function VideoPlayer({ src, className, poster }: VideoPlayerProps) {
  if (!src) return null;
  return (
    <video src={src} className={className} poster={poster} controls playsInline preload="metadata">
      Your browser does not support the video tag.
    </video>
  );
}
