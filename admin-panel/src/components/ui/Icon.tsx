import React from 'react'

const ICONS: Record<string, string> = {
  search:    'M11 4a7 7 0 1 1-4.95 11.95L3 19m8-3a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  bell:      'M6 14V9a6 6 0 1 1 12 0v5l1.5 2.5h-15L6 14Zm3.5 3a2.5 2.5 0 0 0 5 0',
  plus:      'M12 5v14M5 12h14',
  chevDown:  'm6 9 6 6 6-6',
  chevRight: 'm9 6 6 6-6 6',
  chevLeft:  'm15 6-6 6 6 6',
  user:      'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 0c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6Z',
  settings:  'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm8 3a8.2 8.2 0 0 0-.1-1.3l2.1-1.6-2-3.4-2.4 1a8 8 0 0 0-2.3-1.3L15 2h-4l-.4 2.5a8 8 0 0 0-2.3 1.3l-2.4-1-2 3.4 2.1 1.6A8 8 0 0 0 4 12c0 .4 0 .9.1 1.3L2 14.9l2 3.4 2.4-1a8 8 0 0 0 2.3 1.3L9 22h4l.4-2.5a8 8 0 0 0 2.3-1.3l2.4 1 2-3.4-2.1-1.6c0-.4.1-.9.1-1.3Z',
  logout:    'M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7',
  shield:    'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z',
  key:       'M14.5 9.5a4 4 0 1 1-3 6L10 17l-2 2H4v-3l5.5-5.5a4 4 0 0 1 5-1Z',
  check:     'm5 13 4 4L19 7',
  close:     'M6 6l12 12M18 6 6 18',
  envelope:  'M3 7l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  phone:     'M5 4h3l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  globe:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2 4-5.5 4-9s-1.5-7-4-9m0 18c-2.5-2-4-5.5-4-9s1.5-7 4-9M3 12h18',
  map:       'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  car:       'M5 13l1.5-5h11L19 13M5 13v5h2v-2h10v2h2v-5M5 13h14M8 16h.01M16 16h.01',
  plane:     'M2 12l8-2 5-7 2 1-3 8 7 2 2-1-2 4-7-2-2 1-1 4-2-1 1-4-3-1-2 2-2-1 2-2-3-1',
  building:  'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h4a2 2 0 0 1 2 2v10M8 7h1M8 11h1M8 15h1M12 7h1M12 11h1M12 15h1M3 21h18',
  users:     'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 0c-4 0-7 2-7 6v2h14M16 11a4 4 0 1 0 0-8M16 11c4 0 6 2 6 6v2h-6',
  receipt:   'M6 2v20l2-1.5L10 22l2-1.5L14 22l2-1.5L18 22V2l-2 1.5L14 2l-2 1.5L10 2 8 3.5 6 2Zm3 5h6M9 11h6M9 15h4',
  wallet:    'M3 8a2 2 0 0 1 2-2h12v4h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm14 4h2M17 12v4',
  bolt:      'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  pie:       'M12 12V3a9 9 0 1 0 9 9h-9Z',
  flag:      'M5 21V4m0 0h12l-2 4 2 4H5',
  layers:    'M12 2 2 7l10 5 10-5-10-5Zm-10 10 10 5 10-5M2 17l10 5 10-5',
  tag:       'M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Zm5-5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  alert:     'M12 3 2 21h20L12 3Zm0 6v6m0 3v.01',
  inbox:     'M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6m-18 0 3-9h12l3 9m-18 0h6l1 3h4l1-3h6',
  archive:   'M3 7h18v3H3V7Zm2 3v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10M9 13h6',
  filter:    'M3 5h18l-7 8v7l-4-2v-5L3 5Z',
  download:  'M12 3v12m0 0-4-4m4 4 4-4M5 21h14',
  upload:    'M12 21V9m0 0-4 4m4-4 4 4M5 5h14',
  external:  'M14 4h6v6M10 14 20 4M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6',
  more:      'M6 12h.01M12 12h.01M18 12h.01',
  moreVert:  'M12 6h.01M12 12h.01M12 18h.01',
  dot:       'M12 12h.01',
  clock:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  device:    'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7m0 0v3m-3 0h6M2 7v8a2 2 0 0 0 2 2h7',
  copy:      'M9 9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V9Zm-4-4h2v2M5 5a2 2 0 0 1 2-2M5 5v8a2 2 0 0 0 2 2h2',
  eye:       'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff:    'M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.36 5.41A9 9 0 0 1 12 5c5 0 9.27 5.11 9.91 6.79a1 1 0 0 1 0 .42C21.12 14.38 18.43 19 12 19a9 9 0 0 1-4.59-1.27M6.7 6.7C4.47 8.24 2.87 10.55 2.09 11.79a1 1 0 0 0 0 .42C2.88 13.62 6.27 19 12 19',
  sun:       'M12 5V3m0 18v-2m7-7h2M3 12h2m11.95-6.95-1.4 1.4M6.45 17.55l-1.4 1.4m13.5 0-1.4-1.4M6.45 6.45 5.05 5.05M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  moon:      'M21 13a8 8 0 1 1-10-10 7 7 0 0 0 10 10Z',
  refresh:   'M3 12a9 9 0 0 1 15-6.7L21 8m0-5v5h-5M21 12a9 9 0 0 1-15 6.7L3 16m0 5v-5h5',
  arrowRight:'M5 12h14m0 0-6-6m6 6-6 6',
  arrowUp:   'M12 19V5m0 0-6 6m6-6 6 6',
  arrowDown: 'M12 5v14m0 0 6-6m-6 6-6-6',
  helipad:   'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9 8v8m6-8v8M9 12h6',
  printer:   'M6 9V3h12v6M6 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2M6 14h12v7H6v-7Z',
  briefcase: 'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Zm6 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4',
  menu:      'M4 6h16M4 12h16M4 18h16',
  x:         'M6 6l12 12M18 6 6 18',
}

interface IconProps {
  name: string
  size?: number
  stroke?: number
  className?: string
  style?: React.CSSProperties
}

export default function Icon({ name, size = 16, stroke = 1.5, className, style }: IconProps) {
  const d = ICONS[name]
  if (!d) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true"
    >
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} />
      ))}
    </svg>
  )
}
