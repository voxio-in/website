// The fixed video behind the hero. The glass panes refract it, so if it never
// decodes the whole top of the page reads as flat black.

import { useEffect, useRef } from 'react'

export default function HeroVideo({
  sources = [
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4',
    '/bg.mp4',
  ],
}: {
  sources?: string[]
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const photo = ref.current
    if (!photo) return
    const kick = () => {
      if (photo.readyState === 0) photo.load()
      void photo.play().catch(() => {})
    }
    kick()
    const retry = setTimeout(() => {
      if (photo.readyState === 0) kick()
    }, 1000)
    return () => clearTimeout(retry)
  }, [])

  return (
    <video
      ref={ref}
      className="hero-photo"
      aria-hidden="true"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    >
      {sources.map((src) => (
        <source key={src} src={src} type="video/mp4" />
      ))}
    </video>
  )
}
