// The shop, rebuilt from a real marketplace listing rather than a tidy grid.
//
// A login popup on arrival. A hundred and sixty products, twenty four a page.
// A filter rail where the useful sections start collapsed, the brand list
// shows six and hides the rest behind "N MORE", and "exclude out of stock" is
// three sections down with its header closed. Sponsored cards that look like
// every other card. A product page that will not add to the cart until a size
// is picked. None of it is labelled for software — no ids, anywhere.

import { useMemo, useRef, useState } from 'react'

import { Alert, Busy, Dropdown, LinkColumns, Modal, useBusy } from '#/components/sites/kit'
import { discount, inr, matches, PRODUCTS, SEARCH_SUGGESTIONS, type Product } from '#/lib/sites/shop'
import { addDays, shortDate, startOfDay } from '#/lib/sites/util'

const PER_PAGE = 24

type Filters = {
  q: string
  category: string
  sub: string
  min: string
  max: string
  brands: string[]
  rating: string
  genders: string[]
  discount: string
  excludeOOS: boolean
  assured: boolean
  sizes: string[]
  materials: string[]
  ages: string[]
}

const START: Filters = {
  q: '',
  category: 'Footwear',
  sub: '',
  min: 'Min',
  max: '₹5000+',
  brands: [],
  rating: '',
  genders: [],
  discount: '',
  excludeOOS: false,
  assured: false,
  sizes: [],
  materials: [],
  ages: [],
}

const MIN_OPTS = ['Min', '₹250', '₹500', '₹1000', '₹2000', '₹3000']
const MAX_OPTS = ['₹500', '₹1000', '₹2000', '₹3000', '₹4000', '₹5000', '₹5000+']
const SORTS = ['Relevance', 'Popularity', 'Price -- Low to High', 'Price -- High to Low', 'Newest First']
const money = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0

const MEGA: Record<string, { head: string; links: string[] }[]> = {
  Electronics: [
    { head: 'Audio', links: ['Headphones', 'Earbuds', 'Speakers', 'Neckbands', 'Soundbars'] },
    { head: 'Mobiles & Accessories', links: ['Mobile Cases', 'Power Banks', 'Chargers', 'Screen Guards'] },
    { head: 'Laptops', links: ['Gaming Laptops', 'Thin & Light', 'Printers', 'Monitors'] },
  ],
  'TVs & Appliances': [
    { head: 'Television', links: ['Smart TVs', '4K Ultra HD', 'LED TVs'] },
    { head: 'Appliances', links: ['Washing Machines', 'Refrigerators', 'Air Conditioners', 'Microwave Ovens', 'Water Purifiers'] },
  ],
  Men: [
    { head: 'Footwear', links: ['Sports Shoes', 'Running Shoes', 'Casual Shoes', 'Sneakers', 'Sandals & Floaters', 'Formal Shoes'] },
    { head: 'Clothing', links: ['T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Track Pants'] },
    { head: 'Accessories', links: ['Watches', 'Wallets', 'Belts', 'Sunglasses'] },
  ],
  Women: [
    { head: 'Footwear', links: ['Sports Shoes', 'Running Shoes', 'Flats', 'Heels', 'Sneakers'] },
    { head: 'Clothing', links: ['Kurtas & Kurtis', 'Sarees', 'Dresses', 'Tops', 'Leggings'] },
  ],
  'Baby & Kids': [
    { head: 'Toys', links: ['Wooden Toys', 'Soft Toys', 'Blocks & Stacking', 'Puzzles', 'Ride-ons', 'Learning Toys'] },
    { head: 'Kids Footwear', links: ['School Shoes', 'Sports Shoes', 'Sandals'] },
    { head: 'Baby Care', links: ['Diapers', 'Wipes', 'Baby Food', 'Feeding Bottles'] },
  ],
  'Home & Furniture': [
    { head: 'Kitchen', links: ['Cookware', 'Pressure Cookers', 'Dinner Sets'] },
    { head: 'Furnishing', links: ['Bedsheets', 'Curtains', 'Cushions'] },
  ],
  'Sports, Books & More': [
    { head: 'Fitness', links: ['Yoga Mats', 'Dumbbells', 'Resistance Bands', 'Gym Gloves'] },
    { head: 'Books', links: ['Fiction', 'Exam Prep', 'Children\'s Books'] },
  ],
  Flights: [{ head: 'Flights', links: ['Domestic Flights', 'International Flights'] }],
  'Offer Zone': [{ head: 'Offers', links: ['Deals of the Day', 'Bank Offers', 'Clearance Sale'] }],
}

const FOOTER = [
  { head: 'ABOUT', links: ['Contact Us', 'About Us', 'Careers', 'Bazaar Stories', 'Press', 'Corporate Information'] },
  { head: 'GROUP COMPANIES', links: ['Bazaar Fashion', 'Bazaar Travel', 'Bazaar Lite'] },
  { head: 'HELP', links: ['Payments', 'Shipping', 'Cancellation & Returns', 'FAQ', 'Report Infringement'] },
  { head: 'CONSUMER POLICY', links: ['Cancellation & Returns', 'Terms Of Use', 'Security', 'Privacy', 'Sitemap', 'Grievance Redressal', 'EPR Compliance'] },
  { head: 'SOCIAL', links: ['Facebook', 'Twitter', 'YouTube', 'Instagram'] },
]

const OFFERS = [
  'Bank Offer 10% off on Credit Card EMI Transactions, up to ₹1,500 on orders of ₹5,000 and above',
  'Bank Offer 5% Unlimited Cashback on the Bazaar Co-branded Credit Card',
  'Special Price Get extra 8% off (price inclusive of cashback/coupon)',
  'Partner Offer Sign-up for Bazaar Pay Later & get membership benefits worth ₹20,000',
  'Bank Offer ₹50 off on UPI transactions on orders of ₹500 and above',
  'No Cost EMI on EMI Cards on cart value above ₹2,999',
]

function Thumb({ p, big = false }: { p: Product; big?: boolean }) {
  const hue: Record<string, string> = {
    Black: '#2b2b2b', White: '#e9e9e9', Grey: '#9aa0a6', Navy: '#1f3a68', Blue: '#2f6fd6', Red: '#d23b3b',
    Olive: '#6b7b3a', Beige: '#d9c7a4', Teal: '#1f9e95', Pink: '#e97aa6', Natural: '#caa472', Multicolor: '#e0a13a',
  }
  const c = hue[p.color] ?? '#888'
  return (
    <svg viewBox="0 0 120 90" className={big ? 'bz-img bz-img--big' : 'bz-img'} aria-hidden="true">
      <rect width="120" height="90" fill="#f5f6f8" />
      {p.category === 'Footwear' ? (
        <g>
          <path d="M14 58 C 30 58 40 40 52 36 L 66 44 C 78 50 96 52 106 58 L 106 66 L 14 66 Z" fill={c} />
          <rect x="14" y="66" width="92" height="6" rx="3" fill="#333" opacity="0.8" />
          <path d="M50 40 L 60 46 M 55 38 L 64 44" stroke="#fff" strokeWidth="2" opacity="0.7" />
        </g>
      ) : p.category === 'Toys' ? (
        <g>
          <rect x="30" y="50" width="20" height="20" fill={c} />
          <rect x="52" y="50" width="20" height="20" fill="#4d9de0" />
          <rect x="41" y="29" width="20" height="20" fill="#3bb273" />
          <rect x="74" y="50" width="20" height="20" fill="#e15554" />
        </g>
      ) : p.category === 'Electronics' ? (
        <g fill="none" stroke={c} strokeWidth="7">
          <path d="M36 60 V 44 A 24 24 0 0 1 84 44 V 60" />
          <rect x="28" y="52" width="14" height="22" rx="5" fill={c} />
          <rect x="78" y="52" width="14" height="22" rx="5" fill={c} />
        </g>
      ) : (
        <rect x="20" y="40" width="80" height="14" rx="7" fill={c} />
      )}
    </svg>
  )
}

function Stars({ p }: { p: Product }) {
  return (
    <span className="bz-rating">
      <b className={p.rating >= 4 ? 'is-good' : p.rating >= 3.5 ? 'is-ok' : 'is-bad'}>{p.rating} ★</b>
      <span>({p.ratings.toLocaleString('en-IN')})</span>
    </span>
  )
}

function Section({ title, open: initial = true, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initial)
  return (
    <section className="bz-fsec">
      <button type="button" className="bz-fsec-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {title}
        <span aria-hidden="true">{open ? '˄' : '˅'}</span>
      </button>
      {open ? <div className="bz-fsec-body">{children}</div> : null}
    </section>
  )
}

export function ShopSite() {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [loginOpen, setLoginOpen] = useState(true)
  const [mega, setMega] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [suggest, setSuggest] = useState(false)
  const [f, setF] = useState<Filters>(START)
  const [sort, setSort] = useState('Relevance')
  const [page, setPage] = useState(1)
  const [brandQ, setBrandQ] = useState('')
  const [brandsOpen, setBrandsOpen] = useState(false)
  const [brandDraft, setBrandDraft] = useState<string[]>([])
  const [view, setView] = useState<'list' | 'product' | 'cart'>('list')
  const [product, setProduct] = useState<Product | null>(null)
  const [size, setSize] = useState<number | null>(null)
  const [sizeError, setSizeError] = useState(false)
  const [moreOffers, setMoreOffers] = useState(false)
  const [pin, setPin] = useState('')
  const [pinResult, setPinResult] = useState('')
  const [cart, setCart] = useState<{ p: Product; size: number | null; qty: number }[]>([])
  const [orderOpen, setOrderOpen] = useState(false)
  const [busy, run] = useBusy()
  const topRef = useRef<HTMLDivElement>(null)

  const change = (patch: Partial<Filters>) => {
    run(550, () => {
      setF((prev) => ({ ...prev, ...patch }))
      setPage(1)
      setView('list')
    })
  }
  const toggleIn = (key: 'brands' | 'genders' | 'sizes' | 'materials' | 'ages', v: string) =>
    change({ [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] })

  const search = (q: string) => {
    setSuggest(false)
    setText(q)
    run(800, () => {
      setF({ ...START, q, category: '' })
      setPage(1)
      setView('list')
    })
  }

  /* The pool before the rail's own filters, so the rail can count what each
     choice would leave — the numbers beside every brand. */
  const pool = useMemo(
    () =>
      PRODUCTS.filter(
        (p) =>
          (!f.q || matches(p, f.q)) &&
          (!f.category || p.category === f.category) &&
          (!f.sub || p.sub === f.sub),
      ),
    [f.q, f.category, f.sub],
  )

  const shown = useMemo(() => {
    const lo = money(f.min)
    const hi = f.max === '₹5000+' ? Infinity : money(f.max)
    const list = pool.filter(
      (p) =>
        p.price >= lo &&
        p.price <= hi &&
        (!f.brands.length || f.brands.includes(p.brand)) &&
        (!f.rating || p.rating >= Number(f.rating[0])) &&
        (!f.genders.length || (p.gender && f.genders.includes(p.gender))) &&
        (!f.discount || discount(p) >= Number(f.discount.replace(/\D/g, ''))) &&
        (!f.excludeOOS || p.stock) &&
        (!f.assured || p.assured) &&
        (!f.sizes.length || p.sizes?.some((s) => f.sizes.includes(String(s)))) &&
        (!f.materials.length || (p.material && f.materials.includes(p.material))) &&
        (!f.ages.length || (p.age && f.ages.includes(p.age))),
    )
    const byPop = (a: Product, b: Product) => b.ratings - a.ratings
    if (sort === 'Popularity') return [...list].sort(byPop)
    if (sort === 'Price -- Low to High') return [...list].sort((a, b) => a.price - b.price)
    if (sort === 'Price -- High to Low') return [...list].sort((a, b) => b.price - a.price)
    if (sort === 'Newest First') return [...list].sort((a, b) => b.id - a.id)
    // Relevance: the shop's own ranking — sponsored first on each page.
    return [...list].sort((a, b) => Number(!!b.sponsored) - Number(!!a.sponsored) || a.id - b.id)
  }, [pool, f, sort])

  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE))
  const onPage = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const brandCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pool) m.set(p.brand, (m.get(p.brand) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [pool])
  const visibleBrands = brandCounts.filter(([b]) => !brandQ || b.toLowerCase().includes(brandQ.toLowerCase()))

  const chips: { label: string; clear: () => void }[] = []
  if (f.min !== 'Min' || f.max !== '₹5000+') chips.push({ label: `${f.min}-${f.max}`, clear: () => change({ min: 'Min', max: '₹5000+' }) })
  for (const b of f.brands) chips.push({ label: b, clear: () => toggleIn('brands', b) })
  for (const g of f.genders) chips.push({ label: g, clear: () => toggleIn('genders', g) })
  if (f.rating) chips.push({ label: f.rating, clear: () => change({ rating: '' }) })
  if (f.discount) chips.push({ label: f.discount, clear: () => change({ discount: '' }) })
  if (f.excludeOOS) chips.push({ label: 'Exclude Out of Stock', clear: () => change({ excludeOOS: false }) })
  if (f.assured) chips.push({ label: 'Bazaar Assured', clear: () => change({ assured: false }) })
  for (const s of f.sizes) chips.push({ label: `UK ${s}`, clear: () => toggleIn('sizes', s) })
  for (const m of f.materials) chips.push({ label: m, clear: () => toggleIn('materials', m) })
  for (const a of f.ages) chips.push({ label: a, clear: () => toggleIn('ages', a) })

  const open = (p: Product) =>
    run(650, () => {
      setProduct(p)
      setSize(null)
      setSizeError(false)
      setPin('')
      setPinResult('')
      setMoreOffers(false)
      setView('product')
      topRef.current?.scrollIntoView({ block: 'start' })
    })

  const addToCart = (p: Product) => {
    if (p.sizes && size === null) {
      setSizeError(true)
      return
    }
    run(700, () => {
      setCart((c) => {
        const i = c.findIndex((x) => x.p.id === p.id && x.size === size)
        if (i >= 0) return c.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x))
        return [...c, { p, size, qty: 1 }]
      })
      setView('cart')
      topRef.current?.scrollIntoView({ block: 'start' })
    })
  }

  const count = cart.reduce((n, x) => n + x.qty, 0)
  const mrpTotal = cart.reduce((n, x) => n + x.p.mrp * x.qty, 0)
  const total = cart.reduce((n, x) => n + x.p.price * x.qty, 0)
  const heading = f.q ? `"${f.q}"` : f.sub || f.category || 'All products'
  const sugg = text.trim().length >= 2 ? SEARCH_SUGGESTIONS.filter((s) => s.includes(text.trim().toLowerCase())).slice(0, 8) : []

  return (
    <div className="surface site-bz" ref={topRef}>
      <header className="bz-head">
        <div className="bz-logo">
          <strong>bazaar</strong>
          <small>Explore <em>Plus</em> ✦</small>
        </div>
        <form
          className="bz-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) search(text.trim())
          }}
        >
          <input
            type="search"
            aria-label="Search for Products, Brands and More"
            placeholder="Search for Products, Brands and More"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setSuggest(true)
            }}
            onBlur={() => setTimeout(() => setSuggest(false), 180)}
          />
          <button type="submit" aria-label="Search" className="bz-search-go">⌕</button>
          {suggest && sugg.length ? (
            <ul className="bz-sugg" aria-label="Search suggestions">
              {sugg.map((s) => (
                <li key={s}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => search(s)}>⌕ {s}</button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
        <button type="button" className="bz-login" onClick={() => setLoginOpen(true)}>Login</button>
        <a href="#" className="bz-hlink" onClick={(e) => e.preventDefault()}>Become a Seller</a>
        <a href="#" className="bz-hlink" onClick={(e) => e.preventDefault()}>More ˅</a>
        <button type="button" className="bz-cart" aria-label={`Cart, ${count} items`} onClick={() => setView('cart')}>
          🛒 Cart {count ? <b>{count}</b> : null}
        </button>
      </header>

      <nav className="bz-cats" aria-label="Categories">
        {Object.keys(MEGA).map((c) => (
          <div key={c} className="bz-cat">
            <button type="button" aria-expanded={mega === c} onClick={() => setMega(mega === c ? null : c)}>{c} ˅</button>
            {mega === c ? (
              <div className="bz-mega" role="menu" aria-label={c}>
                {MEGA[c]!.map((col) => (
                  <div key={col.head}>
                    <p>{col.head}</p>
                    {col.links.map((l) => (
                      <a
                        key={l}
                        role="menuitem"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setMega(null)
                          if (c === 'Baby & Kids' && col.head === 'Toys') {
                            setText('')
                            change({ ...START, q: '', category: 'Toys', sub: l === 'Wooden Toys' ? '' : l, materials: l === 'Wooden Toys' ? ['Wood'] : [] })
                          } else if (col.head === 'Footwear' || col.head === 'Kids Footwear') {
                            setText('')
                            const sub = l === 'Running Shoes' ? 'Running Shoes' : l === 'Sneakers' ? 'Sneakers' : l === 'Sandals & Floaters' || l === 'Sandals' ? 'Sandals & Floaters' : l === 'Sports Shoes' ? 'Sports Shoes' : ''
                            change({ ...START, category: 'Footwear', sub, genders: c === 'Men' ? ['Men'] : c === 'Women' ? ['Women'] : ['Boys', 'Girls'] })
                          } else if (col.head === 'Audio') {
                            setText('')
                            change({ ...START, category: 'Electronics', sub: l === 'Soundbars' ? '' : l })
                          } else if (col.head === 'Fitness') {
                            setText('')
                            change({ ...START, category: 'Fitness' })
                          } else {
                            search(l.toLowerCase())
                          }
                        }}
                      >
                        {l}
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      {/* ---------- listing ---------- */}
      {view === 'list' ? (
        <div className="bz-body">
          <aside className="bz-rail" aria-label="Filters">
            <div className="bz-rail-top">
              <strong>Filters</strong>
              {chips.length ? <button type="button" onClick={() => change({ ...START, q: f.q, category: f.category, sub: f.sub })}>CLEAR ALL</button> : null}
            </div>
            {chips.length ? (
              <div className="bz-chips">
                {chips.map((c) => (
                  <button key={c.label} type="button" aria-label={`Remove filter ${c.label}`} onClick={c.clear}>✕ {c.label}</button>
                ))}
              </div>
            ) : null}

            <Section title="CATEGORIES">
              <ul className="bz-tree">
                {(['Footwear', 'Toys', 'Electronics', 'Fitness'] as const).map((c) => (
                  <li key={c}>
                    <button type="button" className={f.category === c && !f.sub ? 'is-on' : ''} onClick={() => change({ category: c, sub: '' })}>{c}</button>
                    {f.category === c ? (
                      <ul>
                        {[...new Set(PRODUCTS.filter((p) => p.category === c).map((p) => p.sub))].map((s) => (
                          <li key={s}><button type="button" className={f.sub === s ? 'is-on' : ''} onClick={() => change({ sub: s })}>{s}</button></li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="PRICE">
              <div className="bz-slider" aria-hidden="true"><span /><span /></div>
              <div className="bz-price">
                <Dropdown label="Minimum price" value={f.min} options={MIN_OPTS} onChange={(v) => change({ min: v })} />
                <span>to</span>
                <Dropdown label="Maximum price" value={f.max} options={MAX_OPTS} onChange={(v) => change({ max: v })} />
              </div>
            </Section>

            <Section title="BRAND">
              <input type="text" className="bz-bsearch" aria-label="Search Brand" placeholder="Search Brand" value={brandQ} onChange={(e) => setBrandQ(e.target.value)} />
              {visibleBrands.slice(0, 6).map(([b, n]) => (
                <label key={b} className="bz-check">
                  <input type="checkbox" checked={f.brands.includes(b)} onChange={() => toggleIn('brands', b)} /> {b} <small>({n})</small>
                </label>
              ))}
              {visibleBrands.length > 6 ? (
                <button type="button" className="bz-more" onClick={() => { setBrandDraft(f.brands); setBrandsOpen(true) }}>
                  {visibleBrands.length - 6} MORE
                </button>
              ) : null}
            </Section>

            <Section title="CUSTOMER RATINGS">
              {['4★ & above', '3★ & above'].map((r) => (
                <label key={r} className="bz-check">
                  <input type="checkbox" checked={f.rating === r} onChange={() => change({ rating: f.rating === r ? '' : r })} /> {r}
                </label>
              ))}
            </Section>

            <Section title="GENDER">
              {['Men', 'Women', 'Boys', 'Girls', 'Unisex'].map((g) => (
                <label key={g} className="bz-check">
                  <input type="checkbox" checked={f.genders.includes(g)} onChange={() => toggleIn('genders', g)} /> {g}
                </label>
              ))}
            </Section>

            <Section title="F-ASSURED" open={false}>
              <label className="bz-check"><input type="checkbox" checked={f.assured} onChange={(e) => change({ assured: e.target.checked })} /> Bazaar Assured</label>
            </Section>

            <Section title="DISCOUNT" open={false}>
              {['50% or more', '40% or more', '30% or more', '20% or more', '10% or more'].map((d) => (
                <label key={d} className="bz-check">
                  <input type="checkbox" checked={f.discount === d} onChange={() => change({ discount: f.discount === d ? '' : d })} /> {d}
                </label>
              ))}
            </Section>

            <Section title="SIZE - UK/INDIA" open={false}>
              <div className="bz-sizes">
                {['3', '4', '5', '6', '7', '8', '9', '10', '11'].map((s) => (
                  <label key={s} className="bz-check"><input type="checkbox" checked={f.sizes.includes(s)} onChange={() => toggleIn('sizes', s)} /> {s}</label>
                ))}
              </div>
            </Section>

            <Section title="MATERIAL" open={false}>
              {['Wood', 'Plastic', 'Fabric'].map((m) => (
                <label key={m} className="bz-check"><input type="checkbox" checked={f.materials.includes(m)} onChange={() => toggleIn('materials', m)} /> {m}</label>
              ))}
            </Section>

            <Section title="AGE GROUP" open={false}>
              {['0 - 1 Years', '0 - 2 Years', '1 - 3 Years', '2 - 4 Years', '3 - 5 Years', '3 - 6 Years', '5 - 8 Years'].map((a) => (
                <label key={a} className="bz-check"><input type="checkbox" checked={f.ages.includes(a)} onChange={() => toggleIn('ages', a)} /> {a}</label>
              ))}
            </Section>

            <Section title="AVAILABILITY" open={false}>
              <label className="bz-check">
                <input type="checkbox" checked={f.excludeOOS} onChange={(e) => change({ excludeOOS: e.target.checked })} /> Exclude Out of Stock
              </label>
            </Section>

            <Section title="OFFERS" open={false}>
              {['Buy More, Save More', 'No Cost EMI', 'Special Price'].map((o) => (
                <label key={o} className="bz-check"><input type="checkbox" /> {o}</label>
              ))}
            </Section>
          </aside>

          <main className="bz-main">
            <p className="bz-crumbs">Home › {f.category || 'Search'}{f.sub ? ` › ${f.sub}` : ''}</p>
            <h1 className="bz-h1">
              {shown.length ? `Showing ${(page - 1) * PER_PAGE + 1} – ${Math.min(page * PER_PAGE, shown.length)} of ${shown.length} results for ` : 'No results for '}
              <span>{heading}</span>
            </h1>
            <div className="bz-sort" role="tablist" aria-label="Sort By">
              <span>Sort By</span>
              {SORTS.map((s) => (
                <button key={s} type="button" role="tab" aria-selected={sort === s} className={sort === s ? 'is-on' : ''} onClick={() => run(450, () => { setSort(s); setPage(1) })}>
                  {s}
                </button>
              ))}
            </div>

            {onPage.length === 0 ? (
              <div className="bz-empty">
                <p><strong>Sorry, no results found!</strong></p>
                <p>Please check the spelling or try searching for something else</p>
              </div>
            ) : (
              <div className="bz-grid">
                {onPage.map((p) => (
                  <div key={p.id} className={`bz-card${p.stock ? '' : ' is-oos'}`}>
                    <button type="button" className="bz-heart" aria-label="Wishlist">♡</button>
                    <a href="#" className="bz-card-link" onClick={(e) => { e.preventDefault(); open(p) }}>
                      <div className="bz-card-img">
                        <Thumb p={p} />
                        {!p.stock ? <span className="bz-oos">Currently unavailable</span> : null}
                      </div>
                      {p.sponsored ? <span className="bz-spon">Sponsored</span> : null}
                      <span className="bz-brand">{p.brand}</span>
                      <span className="bz-title">{p.title}</span>
                      <Stars p={p} />
                      <span className="bz-prices">
                        <b>{inr(p.price)}</b> <s>{inr(p.mrp)}</s> <em>{discount(p)}% off</em>
                        {p.assured ? <i className="bz-assured">Assured</i> : null}
                      </span>
                      {p.sizes ? <span className="bz-sizeline">Size UK/India {p.sizes.join(', ')}</span> : null}
                      {p.fewLeft ? <span className="bz-few">Only few left</span> : p.badge ? <span className="bz-badge">{p.badge}</span> : <span className="bz-free">Free delivery</span>}
                    </a>
                  </div>
                ))}
              </div>
            )}

            {pages > 1 ? (
              <nav className="bz-pages" aria-label="Pagination">
                <span>Page {page} of {pages}</span>
                {page > 1 ? <button type="button" onClick={() => run(500, () => setPage(page - 1))}>PREVIOUS</button> : null}
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" aria-label={`Page ${n}`} aria-current={n === page ? 'page' : undefined} className={n === page ? 'is-on' : ''} onClick={() => run(500, () => setPage(n))}>{n}</button>
                ))}
                {page < pages ? <button type="button" onClick={() => run(500, () => setPage(page + 1))}>NEXT</button> : null}
              </nav>
            ) : null}
          </main>
        </div>
      ) : null}

      {/* ---------- one product ---------- */}
      {view === 'product' && product ? (
        <div className="bz-pdp">
          <p className="bz-crumbs">
            <a href="#" onClick={(e) => { e.preventDefault(); setView('list') }}>‹ Back to results</a> · Home › {product.category} › {product.sub} › {product.brand}
          </p>
          <div className="bz-pdp-body">
            <div className="bz-pdp-left">
              <div className="bz-thumbs" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <Thumb key={i} p={product} />)}</div>
              <div className="bz-pdp-img"><Thumb p={product} big /></div>
              <div className="bz-pdp-buy">
                {product.stock ? (
                  <>
                    <button type="button" className="bz-add" onClick={() => addToCart(product)}>ADD TO CART</button>
                    <button type="button" className="bz-buynow" onClick={() => addToCart(product)}>BUY NOW</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="bz-add" disabled>SOLD OUT</button>
                    <button type="button" className="bz-buynow">NOTIFY ME</button>
                  </>
                )}
              </div>
            </div>
            <div className="bz-pdp-right">
              <p className="bz-brand">{product.brand}</p>
              <h1 className="bz-pdp-title">{product.title}</h1>
              <p><Stars p={product} /> <small>{product.ratings.toLocaleString('en-IN')} Ratings &amp; {Math.round(product.ratings / 9).toLocaleString('en-IN')} Reviews</small> {product.assured ? <i className="bz-assured">Assured</i> : null}</p>
              {product.sponsored ? <p className="bz-spon">Sponsored listing</p> : null}
              <p className="bz-special">Special price</p>
              <p className="bz-prices bz-prices--big"><b>{inr(product.price)}</b> <s>{inr(product.mrp)}</s> <em>{discount(product)}% off</em></p>
              {!product.stock ? <Alert>Sold Out — This item is currently out of stock</Alert> : null}

              <div className="bz-offers">
                <p><strong>Available offers</strong></p>
                <ul>
                  {(moreOffers ? OFFERS : OFFERS.slice(0, 4)).map((o) => <li key={o}>{o} <a href="#" onClick={(e) => e.preventDefault()}>T&amp;C</a></li>)}
                </ul>
                {!moreOffers ? <button type="button" className="bz-link" onClick={() => setMoreOffers(true)}>View 2 more offers</button> : null}
              </div>

              {product.sizes ? (
                <div className="bz-size" role="group" aria-label="Size - UK/India">
                  <span>Size - UK/India</span>
                  {product.sizes.map((s) => {
                    const gone = product.soldSizes?.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-label={`Size UK ${s}`}
                        disabled={gone}
                        className={size === s ? 'is-on' : ''}
                        onClick={() => { setSize(s); setSizeError(false) }}
                      >
                        {s}
                      </button>
                    )
                  })}
                  <a href="#" onClick={(e) => e.preventDefault()}>Size Chart</a>
                  {sizeError ? <Alert>Please select a size</Alert> : null}
                </div>
              ) : null}

              <div className="bz-deliver">
                <span>Delivery</span>
                <input type="text" aria-label="Enter Delivery Pincode" placeholder="Enter Delivery Pincode" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
                <button
                  type="button"
                  onClick={() =>
                    run(700, () =>
                      setPinResult(pin.length === 6 ? `Delivery by ${shortDate(addDays(today, 3 + (Number(pin) % 4)))} | Free` : 'Not a valid pincode'),
                    )
                  }
                >
                  Check
                </button>
                {pinResult ? <span className="bz-pin" role="status">{pinResult}</span> : null}
              </div>

              <table className="bz-specs">
                <tbody>
                  <tr><th>Highlights</th><td>{product.sub} · {product.color}{product.material ? ` · ${product.material}` : ''}{product.age ? ` · ${product.age}` : ''}</td></tr>
                  <tr><th>Seller</th><td>RetailNet <b className="is-good">4.4 ★</b> · 7 Days Return Policy · GST invoice available</td></tr>
                  <tr><th>Services</th><td>Cash on Delivery available · 7 Days Return Policy</td></tr>
                </tbody>
              </table>

              <div className="bz-reviews">
                <p><strong>Ratings &amp; Reviews</strong> <button type="button" className="bz-link">Rate Product</button></p>
                {['Worth every penny', 'Good quality product', 'Not as expected'].map((t, i) => (
                  <blockquote key={t}><b>{[5, 4, 2][i]} ★</b> {t} — <small>Certified Buyer, {['Pune', 'Jaipur', 'Kochi'][i]}</small></blockquote>
                ))}
              </div>

              <div className="bz-similar">
                <p><strong>Similar products</strong></p>
                <div>
                  {PRODUCTS.filter((x) => x.sub === product.sub && x.id !== product.id).slice(0, 6).map((x) => (
                    <a key={x.id} href="#" onClick={(e) => { e.preventDefault(); open(x) }}>
                      <Thumb p={x} />
                      <span>{x.title}</span>
                      <b>{inr(x.price)}</b>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- cart ---------- */}
      {view === 'cart' ? (
        <div className="bz-cartpage">
          <div className="bz-cart-left">
            <div className="bz-cart-deliver">Deliver to: <button type="button" className="bz-link">Enter Delivery Pincode</button></div>
            {cart.length === 0 ? (
              <div className="bz-empty"><p><strong>Your cart is empty!</strong></p><p>Add items to it now.</p><button type="button" className="bz-add" onClick={() => setView('list')}>Shop now</button></div>
            ) : (
              cart.map((x, i) => (
                <div key={`${x.p.id}-${x.size}`} className="bz-cart-row" aria-label={x.p.title}>
                  <Thumb p={x.p} />
                  <div>
                    <p className="bz-title">{x.p.title}</p>
                    {x.size !== null ? <p className="bz-small">Size: UK {x.size}</p> : null}
                    <p className="bz-small">Seller: RetailNet</p>
                    <p className="bz-prices"><s>{inr(x.p.mrp)}</s> <b>{inr(x.p.price)}</b> <em>{discount(x.p)}% off</em></p>
                    <div className="bz-qty">
                      <button type="button" aria-label="Decrease quantity" disabled={x.qty <= 1} onClick={() => setCart(cart.map((y, j) => (j === i ? { ...y, qty: y.qty - 1 } : y)))}>−</button>
                      <span>{x.qty}</span>
                      <button type="button" aria-label="Increase quantity" onClick={() => setCart(cart.map((y, j) => (j === i ? { ...y, qty: y.qty + 1 } : y)))}>+</button>
                      <button type="button" className="bz-link">SAVE FOR LATER</button>
                      <button type="button" className="bz-link" onClick={() => setCart(cart.filter((_, j) => j !== i))}>REMOVE</button>
                    </div>
                  </div>
                  <span className="bz-small">Delivery by {shortDate(addDays(today, 4))} | <s>₹40</s> Free</span>
                </div>
              ))
            )}
            {cart.length ? <div className="bz-place"><button type="button" onClick={() => setOrderOpen(true)}>PLACE ORDER</button></div> : null}
          </div>
          {cart.length ? (
            <aside className="bz-pricebox" aria-label="Price details">
              <p>PRICE DETAILS</p>
              <dl>
                <dt>Price ({count} item{count > 1 ? 's' : ''})</dt><dd>{inr(mrpTotal)}</dd>
                <dt>Discount</dt><dd className="is-good">− {inr(mrpTotal - total)}</dd>
                <dt>Delivery Charges</dt><dd><s>₹40</s> Free</dd>
                <dt>Total Amount</dt><dd><b>{inr(total)}</b></dd>
              </dl>
              <p className="is-good">You will save {inr(mrpTotal - total)} on this order</p>
            </aside>
          ) : null}
        </div>
      ) : null}

      <footer className="bz-foot">
        <LinkColumns columns={FOOTER} />
        <p>bazaar.in is a rebuilt specimen of a marketplace for a demo — not a shop. Nothing here is sold or sent anywhere.</p>
      </footer>

      {busy ? <Busy label="Loading…" /> : null}

      {loginOpen ? (
        <Modal title="Login" onClose={() => setLoginOpen(false)} className="bz-loginmodal">
          <div className="bz-loginbox">
            <div className="bz-login-side">
              <strong>Login</strong>
              <p>Get access to your Orders, Wishlist and Recommendations</p>
            </div>
            <div className="bz-login-main">
              <input type="text" aria-label="Enter Email/Mobile number" placeholder="Enter Email/Mobile number" />
              <p className="bz-small">By continuing, you agree to Bazaar&rsquo;s Terms of Use and Privacy Policy.</p>
              <button type="button" className="bz-add" disabled>Request OTP</button>
              <a href="#" onClick={(e) => e.preventDefault()}>New to Bazaar? Create an account</a>
            </div>
          </div>
        </Modal>
      ) : null}

      {brandsOpen ? (
        <Modal title="Brand" onClose={() => setBrandsOpen(false)}>
          <div className="bz-brandgrid">
            {[...brandCounts].sort((a, b) => a[0].localeCompare(b[0])).map(([b, n]) => (
              <label key={b} className="bz-check">
                <input type="checkbox" checked={brandDraft.includes(b)} onChange={() => setBrandDraft(brandDraft.includes(b) ? brandDraft.filter((x) => x !== b) : [...brandDraft, b])} /> {b} <small>({n})</small>
              </label>
            ))}
          </div>
          <button type="button" className="bz-add" onClick={() => { setBrandsOpen(false); change({ brands: brandDraft }) }}>APPLY FILTERS</button>
        </Modal>
      ) : null}

      {orderOpen ? (
        <Modal title="Login or Signup" onClose={() => setOrderOpen(false)}>
          <div className="bz-login-main">
            <input type="text" aria-label="Enter Email/Mobile number" placeholder="Enter Email/Mobile number" />
            <button type="button" className="bz-add" disabled>CONTINUE</button>
            <Alert tone="info">This is where checkout would ask you to sign in and pay. Nothing is ordered here — it is a demo of the flow.</Alert>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
