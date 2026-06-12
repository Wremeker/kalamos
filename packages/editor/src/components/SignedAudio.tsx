interface SignedAudioProps extends Omit<React.AudioHTMLAttributes<HTMLAudioElement>, 'src'> {
  src: string | null | undefined;
}

/**
 * OSS replacement for the auth-gated audio component. Renders a native <audio>
 * element directly from the public URL.
 */
export function SignedAudio({ src, controls = true, ...rest }: SignedAudioProps) {
  if (!src) return null;
  return <audio src={src} controls={controls} {...rest} />;
}
