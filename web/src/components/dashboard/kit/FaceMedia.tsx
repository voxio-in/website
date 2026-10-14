// A face's preview: a looping muted clip, or a still photo. The type comes
// from the stored preview, else from the URL; anything unknown plays as video.

const IMAGE = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i

/**
 * Clips don't autoplay (several MB each): only the first frame loads, and the
 * clip plays while the pointer is over it. Pass `play` to loop it anyway.
 */
export function FaceMedia({ src, type, className, play }: { src: string; type?: 'image' | 'video'; className?: string; play?: boolean }) {
  const image = type ? type === 'image' : IMAGE.test(src) || src.startsWith('data:image')
  return image
    ? <img src={src} alt="" className={className} loading="lazy" />
    : <video src={`${src}${src.includes('#') ? '' : '#t=0.1'}`} className={className} autoPlay={play} muted loop playsInline preload="metadata"
        onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
        onMouseLeave={(e) => { if (!play) e.currentTarget.pause() }} />
}
