// The pages stagger their entrance animations with `style={{ "--d": "0.42s" }}`,
// the same custom properties the static markup uses. React types style objects
// as known CSS properties only, so custom properties need declaring.
import 'react'

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}
