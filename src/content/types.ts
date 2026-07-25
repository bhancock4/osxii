export interface AdSpec {
  id: string
  productName: string
  headline: string
  body: string
  /** Displayed price — can be absurd marketing nonsense */
  price: string
  /** The actual amount charged per billing cycle. Keep between 9.99 and 49.99 */
  monthlyCost: number
  /** Label on the giant tempting subscribe button */
  ctaLabel: string
  /** How the close button behaves */
  closeStyle: 'tiny' | 'corner' | 'decoy' | 'delayed'
  theme: 'neon' | 'corporate' | 'urgent' | 'friendly' | 'cursed'
}

export interface ErrorSpec {
  title: string
  body: string
  button: string
}
