// The SVG filter behind `backdrop-filter: url(#liquid-glass-nav)`.

const MAP_X =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='60' preserveAspectRatio='none'%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0' stop-color='rgb(0,128,128)'/%3E%3Cstop offset='0.14' stop-color='rgb(104,128,128)'/%3E%3Cstop offset='0.5' stop-color='rgb(128,128,128)'/%3E%3Cstop offset='0.86' stop-color='rgb(152,128,128)'/%3E%3Cstop offset='1' stop-color='rgb(255,128,128)'/%3E%3C/linearGradient%3E%3Crect width='400' height='60' fill='url(%23g)'/%3E%3C/svg%3E";

const MAP_Y =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='60' preserveAspectRatio='none'%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='rgb(128,0,128)'/%3E%3Cstop offset='0.28' stop-color='rgb(128,108,128)'/%3E%3Cstop offset='0.5' stop-color='rgb(128,128,128)'/%3E%3Cstop offset='0.72' stop-color='rgb(128,148,128)'/%3E%3Cstop offset='1' stop-color='rgb(128,255,128)'/%3E%3C/linearGradient%3E%3Crect width='400' height='60' fill='url(%23g)'/%3E%3C/svg%3E";

export default function GlassDefs() {
  return (
    <svg
      className="glass-defs"
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        {/* The filter region is the element box EXACTLY. This is load-bearing:
            samples the neutral mid-grey centre — lens present, invisible. */}
        <filter
          id="liquid-glass-nav"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feImage result="mapX" preserveAspectRatio="none" href={MAP_X} />
          <feImage result="mapY" preserveAspectRatio="none" href={MAP_Y} />

          {/* B is the constant channel in each map, aimed at the axis the pass
              must not move. */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="mapX"
            scale="-32"
            xChannelSelector="R"
            yChannelSelector="B"
            result="lensX"
          />
          <feDisplacementMap
            in="lensX"
            in2="mapY"
            scale="-16"
            xChannelSelector="B"
            yChannelSelector="G"
            result="lensed"
          />

          {/* Chromatic dispersion: split the lensed backdrop into R/G/B, offset
              is glass rather than plastic. */}
          <feOffset in="lensed" dx="2.2" dy="1.5" result="rOff" />
          <feColorMatrix
            in="rOff"
            result="red"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />

          <feOffset in="lensed" dx="0" dy="0" result="gOff" />
          <feColorMatrix
            in="gOff"
            result="green"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />

          <feOffset in="lensed" dx="-2.2" dy="-1.5" result="bOff" />
          <feColorMatrix
            in="bOff"
            result="blue"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          />

          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" />
        </filter>

        {/* The same lens, tuned for SMALL panes.
            a proportionally softer lens, and changes nothing else. */}
        <filter
          id="liquid-glass-soft"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feImage result="mapX" preserveAspectRatio="none" href={MAP_X} />
          <feImage result="mapY" preserveAspectRatio="none" href={MAP_Y} />

          <feDisplacementMap
            in="SourceGraphic"
            in2="mapX"
            scale="-14"
            xChannelSelector="R"
            yChannelSelector="B"
            result="lensX"
          />
          <feDisplacementMap
            in="lensX"
            in2="mapY"
            scale="-8"
            xChannelSelector="B"
            yChannelSelector="G"
            result="lensed"
          />

          <feOffset in="lensed" dx="0.7" dy="0.45" result="rOff" />
          <feColorMatrix
            in="rOff"
            result="red"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />
          <feOffset in="lensed" dx="0" dy="0" result="gOff" />
          <feColorMatrix
            in="gOff"
            result="green"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />
          <feOffset in="lensed" dx="-0.7" dy="-0.45" result="bOff" />
          <feColorMatrix
            in="bOff"
            result="blue"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          />

          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
}
