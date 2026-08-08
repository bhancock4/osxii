import type { ErrorSpec } from './types'

/**
 * StrategyLens® Time Entry — all module content. The register everywhere:
 * the system sincerely believes it is helping. Emails are cheerful threats,
 * guidance contradicts itself in good faith, and nothing is ever anyone's
 * fault, especially not StrategyLens.
 *
 * `[NAME]` in any string is replaced with the player's 3-letter resource ID.
 */

/** Replace the [NAME] placeholder with the player's resource identifier. */
export const fill = (s: string, name: string): string => s.replaceAll('[NAME]', name || 'YOU')

// ---------------------------------------------------------------------------
// Work items
// ---------------------------------------------------------------------------

export interface SLWorkItem {
  id: string
  code: string
  label: string
  /** Grid section header, Planview style: "Program Name • 0000091" */
  group: string
  kind: 'project' | 'bucket'
  /** Weekly hours remaining on the allocation; null = uncapped. */
  remaining: number | null
  /** Validation requires >0 hours on every required item. */
  required: boolean
  /** Booking ANY time here notifies your manager and the CIO. */
  tripwire?: boolean
  /** Shown in Select Work with a disabled checkbox and no explanation. */
  treeDisabled?: boolean
}

export const SL_ITEMS: SLWorkItem[] = [
  // --- Required projects (guidance email refers to these by nickname) ---
  {
    id: 'phx', code: 'CAP-0091', label: 'PHX Modernization — Wave 2 (Execution)',
    group: 'Phoenix Program • 0000091', kind: 'project', remaining: 16, required: true,
  },
  {
    id: 'atlas', code: 'OPX-3120', label: 'ATLAS Post-Go-Live Hypercare (Sustain)',
    group: 'ATLAS Program • 0003120', kind: 'project', remaining: 10, required: true,
  },
  {
    id: 'q3', code: 'GOV-0007', label: 'Q3 Strategic Alignment — Phase 0 (Pre-Discovery)',
    group: 'Office of Strategic Alignment • 0000007', kind: 'project', remaining: 9, required: true,
  },
  {
    id: 'sox', code: 'CMP-0440', label: 'SOX ITGC Evidence Collection FY26',
    group: 'Compliance Portfolio • 0000440', kind: 'project', remaining: 6, required: true,
  },
  {
    id: 'lake', code: 'CAP-1808', label: 'Enterprise Data Lakehouse — Ingestion Enablement',
    group: 'Data & Analytics CoE • 0001808', kind: 'project', remaining: 8, required: true,
  },
  {
    id: 'brad', code: 'OPX-0666', label: 'Cross-Functional Support — Unspecified (Brad)',
    group: 'Enterprise Velocity Office • 0004471', kind: 'project', remaining: 2, required: true,
  },

  // --- Tripwires: plausible decoys that notify management on contact ---
  {
    id: 'phx_trap', code: 'CAP-0091a', label: 'Phoenix Modernization — Wave 2 (DO NOT USE)',
    group: 'Phoenix Program • 0000091', kind: 'project', remaining: 40, required: false, tripwire: true,
  },
  {
    id: 'atlas_trap', code: 'CAP-3120', label: 'ATLAS Go-Live Stabilization (Capitalized)',
    group: 'ATLAS Program • 0003120', kind: 'project', remaining: 24, required: false, tripwire: true,
  },
  {
    id: 'lake_trap', code: 'CAP-1808b', label: 'Data Lake (Deprecated) — Do Not Book',
    group: 'Data & Analytics CoE • 0001808', kind: 'project', remaining: 12, required: false, tripwire: true,
  },

  // --- Inert decoys: selectable-looking, permanently disabled ---
  {
    id: 'phx_legacy', code: 'OPX-0091', label: 'Phoenix (Legacy) — Closed Pending Reopening',
    group: 'Phoenix Program • 0000091', kind: 'project', remaining: 0, required: false, treeDisabled: true,
  },
  {
    id: 'sox_next', code: 'CMP-0441', label: 'SOX ITGC Evidence Collection FY27 (Do Not Open)',
    group: 'Compliance Portfolio • 0000440', kind: 'project', remaining: 0, required: false, treeDisabled: true,
  },

  // --- Standard activity buckets (always on the card) ---
  {
    id: 'admin', code: 'GEN-0001', label: 'Administrative Time',
    group: 'Standard Activities • 0000001', kind: 'bucket', remaining: null, required: true,
  },
  {
    id: 'nwwt', code: 'GEN-0002', label: 'Non-Working Working Time',
    group: 'Standard Activities • 0000001', kind: 'bucket', remaining: null, required: false,
  },
  {
    id: 'pt', code: 'GEN-0007', label: 'Personal Transformation',
    group: 'Standard Activities • 0000001', kind: 'bucket', remaining: null, required: true,
  },
]

export const SL_ITEM_BY_ID: Record<string, SLWorkItem> = Object.fromEntries(SL_ITEMS.map(i => [i.id, i]))

/** The six projects the guidance email actually asks for. */
export const REQUIRED_PROJECT_IDS = ['phx', 'atlas', 'q3', 'sox', 'lake', 'brad']
/** Buckets pinned to every timecard from the start. */
export const BUCKET_IDS = ['admin', 'nwwt', 'pt']

// ---------------------------------------------------------------------------
// Select Work tree — ragged, vague, load-bearing nonsense
// ---------------------------------------------------------------------------

export interface SLTreeNode {
  label: string
  /** Leaf mapping to a work item; checkable unless the item is treeDisabled. */
  itemId?: string
  children?: SLTreeNode[]
  /** Non-item node that expands to reveal nothing. A promise, unkept. */
  empty?: boolean
}

export const SELECT_WORK_TREE: SLTreeNode[] = [
  {
    label: 'Org Unit 10 — NA-CORP',
    children: [
      {
        label: 'Cost Center 4471 — Enterprise Velocity Office',
        children: [
          {
            label: 'WBS A_117L — Velocity Realization',
            children: [
              { label: 'OPX-0666 · Cross-Functional Support — Unspecified (Brad)', itemId: 'brad' },
              { label: 'A_117L-004 · Synergy Capture (Phase 0)', empty: true },
              { label: 'A_117L-009 · Synergy Recapture', empty: true },
            ],
          },
          {
            label: 'Standard Activities',
            children: [
              { label: 'GEN-0001 · Administrative Time', itemId: 'admin' },
              { label: 'GEN-0002 · Non-Working Working Time', itemId: 'nwwt' },
              { label: 'GEN-0007 · Personal Transformation', itemId: 'pt' },
            ],
          },
        ],
      },
      {
        label: 'Cost Center 4090 — Phoenix Program Office',
        children: [
          { label: 'CAP-0091 · PHX Modernization — Wave 2 (Execution)', itemId: 'phx' },
          { label: 'CAP-0091a · Phoenix Modernization — Wave 2 (DO NOT USE)', itemId: 'phx_trap' },
          { label: 'OPX-0091 · Phoenix (Legacy) — Closed Pending Reopening', itemId: 'phx_legacy' },
        ],
      },
      {
        label: 'Org Unit 10.1 — NA-CORP-OPS (Restructuring)',
        children: [
          {
            label: 'Cost Center 3120 — ATLAS',
            children: [
              { label: 'OPX-3120 · ATLAS Post-Go-Live Hypercare (Sustain)', itemId: 'atlas' },
              { label: 'CAP-3120 · ATLAS Go-Live Stabilization (Capitalized)', itemId: 'atlas_trap' },
              { label: 'ATLAS Wave 3 (Pending Funding)', empty: true },
            ],
          },
          { label: 'Cost Center 0000 — Unmapped', empty: true },
        ],
      },
    ],
  },
  {
    label: 'Governance & Compliance',
    children: [
      { label: 'GOV-0007 · Q3 Strategic Alignment — Phase 0 (Pre-Discovery)', itemId: 'q3' },
      { label: 'CMP-0440 · SOX ITGC Evidence Collection FY26', itemId: 'sox' },
      { label: 'CMP-0441 · SOX ITGC Evidence Collection FY27 (Do Not Open)', itemId: 'sox_next' },
      { label: 'GOV-0000 · Governance of Governance', empty: true },
    ],
  },
  {
    label: 'Data & Analytics CoE',
    children: [
      { label: 'CAP-1808 · Enterprise Data Lakehouse — Ingestion Enablement', itemId: 'lake' },
      { label: 'CAP-1808b · Data Lake (Deprecated) — Do Not Book', itemId: 'lake_trap' },
      { label: 'D&A Offsite Planning (Offsite Cancelled)', empty: true },
    ],
  },
  { label: 'Org Unit 11 — (Divested)', empty: true },
]

/** The search box's entire vocabulary of helpfulness. */
export const SEARCH_RESPONSES = [
  (q: string) => `Your search for '${q}' returned 0 results. Did you mean: ${q.slice(0, 4).toUpperCase().replace(/[AEIOU]/g, '')}?`,
  (q: string) => `'${q}' was found in 1 work item you are not authorized to view.`,
  () => 'Search is temporarily unavailable while search is being improved.',
  (q: string) => `Showing 0 of 0 results for '${q}'. Tip: try browsing the hierarchy, which is intuitive.`,
]

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export interface SLEmail {
  id: string
  from: string
  fromAddr: string
  cc?: string
  subject: string
  body: string
  /** Demands a read receipt when delivered as an interrupt. */
  receipt?: boolean
  /** Present in the inbox at 6:00 AM rather than arriving as an interrupt. */
  atStart?: boolean
  /** Follow-up nag: only eligible after the player sent a read receipt for
   * the referenced email. Receipts have consequences. */
  nagOf?: string
}

export const SL_EMAILS: SLEmail[] = [
  {
    id: 'cutoff',
    from: 'Timesheet Compliance',
    fromAddr: 'noreply@strategylens.clarityone',
    subject: '🔔 ACTION REQUIRED: End-of-Month Time Entry Cutoff is TODAY at 5:00 PM',
    atStart: true,
    body: `Dear [NAME],

This is a friendly reminder that the end-of-month time entry cutoff is TODAY at 5:00 PM sharp.

Timesheets submitted at 5:00:00 PM will be processed.
Timesheets submitted at 5:00:01 PM do not exist.

Per Finance policy, unsubmitted time cannot be billed, recognized, capitalized, or forgiven. A list of non-compliant resources is circulated monthly to leadership as a learning opportunity for the resources on it.

We know you will not be on it. 🙂

Warmly,
Timesheet Compliance
"Time is the one thing we cannot make more of. Please enter yours."`,
  },
  {
    id: 'guidance',
    from: 'Deb Vance',
    fromAddr: 'deb.vance@clarityone',
    subject: 'RE: RE: your allocations this week (see below) (scroll down)',
    atStart: true,
    body: `Hi [NAME],

Per the below (don't worry about the below), here's where your time should land this week:

  • The Phoenix work — plan on ~8h. Book to the WAVE 2 EXECUTION line, NOT the other Phoenix line. You'll know it when you see it. Do not see the other one.
  • Atlas hypercare — ~6h. It's under OPS now. Or OPS is under it. It moved.
  • The Q3 alignment deck — 4h. This is under Governance for reasons no one has written down.
  • SOX evidence pulls — 4h. FY26, not FY27. FY27 doesn't exist yet legally.
  • The data lake thing — 6h. The REAL one. There is a fake one. It looks more real than the real one.
  • Whatever Brad needed — book what Brad was allocated, and not one minute more. Brad knows what he did.

The rest goes to standard activities per the Time Categorization Doctrine (attached).

[Attachment failed to attach]

Some of these are already on your card. The others you'll need to add via Select Work, which I want to apologize for in advance.

Deb

P.S. Do NOT go over on anything. Finance is watching the burn-down like hawks that have been to a seminar.`,
  },
  {
    id: 'admin1',
    from: 'Time Governance Office',
    fromAddr: 'tgo@clarityone',
    subject: 'REMINDER: Appropriate Use of Administrative Time (GEN-0001)',
    atStart: true,
    body: `All,

It has come to our attention that Administrative Time (GEN-0001) is being used for administrative work. This is incorrect.

GEN-0001 is exclusively for time spent entering time. Time spent doing administrative work is project overhead and belongs on the project the administration was about. Time spent reading this email belongs on the project this email interrupted.

Bookings over 0.50h to GEN-0001 are a compliance flag.

Thank you for your partnership,
The Time Governance Office`,
  },
  {
    id: 'admin2',
    from: 'Time Governance Office',
    fromAddr: 'tgo@clarityone',
    subject: 'CORRECTION: Appropriate Use of Administrative Time (GEN-0001)',
    atStart: true,
    body: `All,

Correction to our earlier communication. Time spent entering time is not work, and therefore cannot be booked to Administrative Time, which is a category of work. Time spent entering time should be booked to Non-Working Working Time (GEN-0002).

However, booking ZERO hours to GEN-0001 is also a compliance flag, as everyone administrates.

We hope this settles the matter permanently.

Thank you for your partnership,
The Time Governance Office

(This email supersedes our previous email. Our previous email remains in effect.)`,
  },
  {
    id: 'potluck1',
    from: 'Cheryl Bowden',
    fromAddr: 'cheryl.bowden@clarityone',
    cc: 'ALL-NA-CORP (4,181 recipients)',
    subject: 'FW: FW: RE: RE: Team Potluck Friday!! (bring a dish!!)',
    atStart: true,
    body: `Hi all!! 🎉

Just a reminder the potluck is TODAY in the 4th floor kitchenette (the good one)! Sign-up sheet is on the door. We still need:

  • Mains (0 signed up)
  • Sides (0 signed up)
  • Desserts (14 signed up)

Please DO NOT bring shrimp again. You know who you are.

Cheryl 🌻`,
  },

  // ------- Interrupt pool: giant popups mid-crunch -------
  {
    id: 'urgent1',
    from: 'Timesheet Compliance',
    fromAddr: 'noreply@strategylens.clarityone',
    subject: '⚠️ URGENT: You have not yet submitted (Read Receipt Requested)',
    receipt: true,
    body: `Dear [NAME],

Our records indicate you have not yet submitted your timesheet. This automated reminder will continue at increasing frequencies as the deadline approaches, consuming the time it reminds you about.

This is working as designed.

Timesheet Compliance`,
  },
  {
    id: 'permylast',
    from: 'Time Governance Office',
    fromAddr: 'tgo@clarityone',
    subject: 'Per our last two emails: Administrative Time (Read Receipt Requested)',
    receipt: true,
    body: `All,

To resolve confusion arising from our two previous emails, which were both correct:

Administrative Time (GEN-0001) should contain between 0.25 and 0.50 hours, representing the administration you did not do but would have.

We consider this matter closed and are prepared to reopen it at any time.

The Time Governance Office`,
  },
  {
    id: 'salmon',
    from: 'Chip Whitley, SVP of Momentum',
    fromAddr: 'chip.whitley@clarityone',
    subject: 'What Salmon Taught Me About Q3 (Read Receipt Requested)',
    receipt: true,
    body: `Team,

This weekend I watched salmon swim upstream, and I could not stop thinking about our Q3 velocity targets.

The salmon does not ask why the river flows against it. The salmon does not submit its timesheet late. The salmon aligns.

I've asked my EA to schedule 30 minutes with each of you to discuss what YOU are swimming toward. Attendance is mandatory and inspiring.

Onward and upstream,
Chip`,
  },
  {
    id: 'maint',
    from: 'IT Service Delivery',
    fromAddr: 'itsd@clarityone',
    subject: 'Notification of Scheduled Activity (Read Receipt Requested)',
    receipt: true,
    body: `Dear Valued Colleague,

A scheduled activity may occur on some systems during a window. Impact, if any, will be experienced by affected users, if any.

No action is required, unless action is required, in which case a dialog will inform you at the time.

We appreciate your flexibility during this exciting period.

IT Service Delivery`,
  },
  {
    id: 'training',
    from: 'ClarityOne Learning Cloud',
    fromAddr: 'learn@clarityone',
    subject: '📚 OVERDUE: "Entering Time Effectively" (2.0h course) — due TODAY',
    receipt: true,
    body: `Hello [NAME],

Your mandatory course "Entering Time Effectively" (duration: 2.0 hours) is due TODAY.

Note: time spent on training is not billable and must not appear on your timesheet, which must nonetheless total 40 hours, all of which must be accounted for. We are confident you will resolve this.

Your growth matters!
ClarityOne Learning Cloud`,
  },
  {
    id: 'potluck2',
    from: 'Cheryl Bowden',
    fromAddr: 'cheryl.bowden@clarityone',
    cc: 'ALL-NA-CORP (4,181 recipients)',
    subject: 'RE: FW: FW: RE: RE: Team Potluck Friday!! — WHO BROUGHT SHRIMP',
    body: `I am not going to name names but there is shrimp in the kitchenette (the good one) and now the whole floor smells like a wharf.

The potluck is SUSPENDED until the shrimp situation is understood.

Cheryl`,
  },
  {
    id: 'seat',
    from: 'StrategyLens Customer Success',
    fromAddr: 'success@strategylens.clarityone',
    subject: '✨ You qualify for a ClarityOne Premium Seat™ (ask your manager!)',
    body: `Congratulations [NAME]!

Based on your usage patterns (frequent, distressed), you qualify for a ClarityOne Premium Seat™, featuring:

  • The grid, but faster*
  • Up to 40% fewer dialogs**
  • Priority placement in the validation queue

*compared to not using the grid
**dialogs informing you about dialogs

Your manager has been notified of your interest.`,
  },
  {
    id: 'confroom',
    from: 'Workplace Experience',
    fromAddr: 'workplace@clarityone',
    subject: 'You have items in conference room 4B (this is the third notice)',
    body: `Hello,

A charging cable believed to be yours has been in conference room 4B since the third of last month. Per clean-desk policy, unclaimed items are donated to the executive floor.

You have until 5:00 PM. Everything today is until 5:00 PM.

Workplace Experience`,
  },
  {
    id: 'password',
    from: 'Identity & Access Management',
    fromAddr: 'iam@clarityone',
    subject: '🔐 Your password expires in 11 hours (Read Receipt Requested)',
    receipt: true,
    body: `Dear User,

Your password will expire in 11 hours. Passwords may not be changed within 12 hours of expiring, for security.

We recognize this creates a one-hour window that does not exist. A ticket has been opened about the window. The ticket requires your password.

Identity & Access Management`,
  },
  {
    id: 'wellness',
    from: 'People Success — Wellbeing',
    fromAddr: 'wellbeing@clarityone',
    subject: '🧘 Your Mindful Minute is ready (participation is monitored)',
    body: `Hi [NAME],

You seem stressed. Your keyboard telemetry suggests urgency, which is not a ClarityOne value.

Please take a Mindful Minute: close your eyes, breathe in for four counts, and reflect on how this minute will be categorized on your timesheet (see Time Governance Office guidance, corrected edition, superseded).

Namaste,
People Success`,
  },

  // ------- Receipt aftermath: senders who KNOW you read it -------
  {
    id: 'nag_urgent1',
    nagOf: 'urgent1',
    from: 'Timesheet Compliance',
    fromAddr: 'noreply@strategylens.clarityone',
    subject: 'RE: URGENT: You read our reminder (we checked) (Read Receipt Requested)',
    receipt: true,
    body: `Dear [NAME],

Thank you for your read receipt. Our records now show that you read our reminder and did not submit.

Reading without submitting has been added to your pattern file. The pattern file is going well.

Timesheet Compliance`,
  },
  {
    id: 'nag_permylast',
    nagOf: 'permylast',
    from: 'Time Governance Office',
    fromAddr: 'tgo@clarityone',
    subject: 'Receipt of your receipt (Read Receipt Requested)',
    receipt: true,
    body: `All,

We confirm receipt of your read receipt, which confirmed your receipt of our correction. We have not, however, observed corresponding administrative behavior.

To close the loop, this message also requests a read receipt. There is no bottom to this.

The Time Governance Office`,
  },
  {
    id: 'nag_salmon',
    nagOf: 'salmon',
    from: 'Chip Whitley, SVP of Momentum',
    fromAddr: 'chip.whitley@clarityone',
    subject: 'RE: What Salmon Taught Me About Q3 — did it land?',
    body: `Team,

My EA tells me some of you have READ the salmon email — receipts don't lie! — and yet I'm not seeing a single upstream moment logged in StrategyLens.

Reading is not swimming.

I've asked my EA to find out which one of you it was. She already knows. It's in the receipt.

Onward,
Chip`,
  },
  {
    id: 'nag_password',
    nagOf: 'password',
    from: 'Identity & Access Management',
    fromAddr: 'iam@clarityone',
    subject: 'RE: Your password expires — you saw this (Read Receipt Requested)',
    receipt: true,
    body: `Dear User,

Your read receipt confirms you were warned. The window that does not exist is now smaller.

For security reasons we cannot tell you what to do about this, only that you knew.

Identity & Access Management`,
  },
]

export const START_EMAIL_IDS = SL_EMAILS.filter(e => e.atStart).map(e => e.id)
export const INTERRUPT_EMAIL_IDS = SL_EMAILS.filter(e => !e.atStart && !e.nagOf).map(e => e.id)
export const NAG_EMAIL_IDS = SL_EMAILS.filter(e => e.nagOf).map(e => e.id)

// ---------------------------------------------------------------------------
// Read receipts
// ---------------------------------------------------------------------------

export const RECEIPT_PROMPT = 'The sender has requested a read receipt for this message. The sender will be notified that you have read this message.'
export const RECEIPT_REPROMPT = 'You said Not Now. It is now.'

// ---------------------------------------------------------------------------
// Chat (MessengerLens™)
// ---------------------------------------------------------------------------

export interface SLChatSender { id: string; name: string; title: string }

export const CHAT_SENDERS: SLChatSender[] = [
  { id: 'brad', name: 'Brad Terlecki', title: 'Finance Business Partner' },
  { id: 'kishore', name: 'Kishore Patel', title: 'PMO Analyst II' },
  { id: 'tanya', name: 'Tanya Okafor', title: 'People Success Partner' },
  { id: 'deshawn', name: 'DeShawn Mills', title: 'IT Service Delivery' },
  { id: 'unknown', name: 'Unknown User', title: '(title unavailable)' },
]

export const CHAT_SALUTATIONS = [
  'hey',
  'hi [NAME]',
  'hello',
  'quick question',
  'you around?',
  'ping',
  'yt?',
  'Good morning!!',
  'hey — got a sec',
]

export const CHAT_NVM = ['nvm got it', 'nvm', 'disregard', 'sorted it, thx anyway']

/**
 * Receipt-nag chat personas, keyed by the email whose read receipt summons
 * them. Existing cast members gain receipt-awareness (DeShawn covers IT and
 * IAM, Tanya covers Learning); Chip and the automated accounts join the
 * roster. Fired at the normal chat cadence — richer cast, same volume.
 */
export interface SLChatNag { senderId: string; name: string; title: string; lines: string[] }

export const CHAT_NAGS: Record<string, SLChatNag> = {
  urgent1: {
    senderId: 'compliance-bot',
    name: 'Timesheet Compliance',
    title: 'Automated Account — Do Not Reply',
    lines: [
      'I know you read that email.',
      'You read our reminder. And yet.',
      'This is an automated message. It is also disappointed.',
    ],
  },
  permylast: {
    senderId: 'tgo-bot',
    name: 'Time Governance Office',
    title: 'Doctrine Enforcement (Automated)',
    lines: [
      'Your read receipt has been entered into the record.',
      'You read the correction. Administrate accordingly.',
    ],
  },
  salmon: {
    senderId: 'chip',
    name: 'Chip Whitley',
    title: 'SVP of Momentum',
    lines: [
      'hey! saw you read the salmon email 🐟',
      'did it resonate? be honest',
      'no pressure on the salmon thing. (there is pressure)',
    ],
  },
  maint: {
    senderId: 'deshawn',
    name: 'DeShawn Mills',
    title: 'IT Service Delivery',
    lines: [
      'hey you read the maintenance notice right? receipt says you did',
      'so whatever happens later, you were informed. just documenting',
    ],
  },
  password: {
    senderId: 'deshawn',
    name: 'DeShawn Mills',
    title: 'IT Service Delivery',
    lines: [
      'you read the password email lol. tick tock',
      'receipt came through on the password thing. so. yeah',
    ],
  },
  training: {
    senderId: 'tanya',
    name: 'Tanya Okafor',
    title: 'People Success Partner',
    lines: [
      'saw you read the training reminder! the course misses you 🙂',
      'i know you read the overdue notice — no judgment! (it is logged though)',
    ],
  },
}

// ---------------------------------------------------------------------------
// Chrono™, your timesheet coach
// ---------------------------------------------------------------------------

export const CHRONO_TIPS = [
  'Tip: Time entered before it is worked is fraud. Time entered after it is worked is late.',
  'Remember: you are not booking time. You are telling a story about time. Make it believable.',
  'Tip: The grid cannot hurt you. The grid can only reflect what you have done.',
  'If a work item is missing, it may be under a different Org Unit, or a different name, or gone.',
  'Fun fact: "Remaining hours" refers to the project. Not to you.',
  'Tip: Hours entered on weekends require Form A_117L, which is also the name of a WBS. Unrelated.',
  'Feeling behind? The deadline is not moving, which is a kind of stability.',
  'Tip: If validation fails, read the error carefully. Then read it again. It will not improve.',
  'Personal Transformation (GEN-0007) is uncapped. Think about what that means for you.',
  'I am contractually a stopwatch, but I believe in you.',
]

// ---------------------------------------------------------------------------
// StrategyLens app chrome
// ---------------------------------------------------------------------------

export const LOADING_LINES = [
  'Harmonizing dimensions…',
  'Reticulating cost splines…',
  'Contacting SAP (this may take a lifetime)…',
  'Warming up the grid (do not perceive the grid)…',
  'Applying doctrine…',
  'Resolving your resource profile against itself…',
  'Loading remaining hours (theirs, not yours)…',
  'Negotiating with the validation layer…',
]

export const LAUNCH_FAILURES: ErrorSpec[] = [
  {
    title: 'StrategyLens',
    body: 'StrategyLens has encountered a licensing conflict (SL-1017). The conflict is between two licenses you hold. Please try again.',
    button: 'Try again',
  },
  {
    title: 'StrategyLens',
    body: 'You are user 4,096 of 4,095 licensed seats. A seat will become available when someone gives up.',
    button: 'Wait hopefully',
  },
  {
    title: 'ClarityOne Single Sign-On',
    body: 'Single Sign-On requires you to sign in again. This is the single sign-on.',
    button: 'Sign on (singly)',
  },
  {
    title: 'StrategyLens',
    body: 'The application failed to start because it was already failing to start. Please allow the current failure to finish.',
    button: 'Allow',
  },
]

export const SL_ERRORS: ErrorSpec[] = [
  {
    title: 'StrategyLens Data Validation',
    body: "Value '8' is not valid for field Hours. Expected: a number.",
    button: 'It is a number',
  },
  {
    title: 'StrategyLens',
    body: 'Your session has been refreshed to keep your session fresh. Some unsaved changes may have been curated.',
    button: 'OK',
  },
  {
    title: 'StrategyLens Data Validation',
    body: 'Time entries must be in increments of 0.25 hours. 2.00 is not an increment of 0.25. (It is. We apologize. The error stands.)',
    button: 'The error stands',
  },
  {
    title: 'StrategyLens Sync Engine',
    body: 'The grid and the server disagree about your week. The server has seniority.',
    button: 'Defer to server',
  },
  {
    title: 'StrategyLens',
    body: 'An unexpected dialog has appeared. This is that dialog.',
    button: 'Acknowledge',
  },
  {
    title: 'ClarityOne Platform',
    body: 'A required cookie has expired. It had a good run. Please continue as if nothing happened.',
    button: 'Nothing happened',
  },
  {
    title: 'StrategyLens Data Validation',
    body: 'Field "Hours" cannot be empty, zero, or emotionally ambiguous.',
    button: 'Understood',
  },
  {
    title: 'StrategyLens',
    body: 'Your timesheet was autosaved successfully at a previous point in time, which is no longer available.',
    button: 'OK',
  },
]

export const SL_TOASTS = [
  '☁️ StrategyLens synced your timesheet to the cloud (the cloud has questions).',
  '📊 Your utilization is being discussed.',
  '🧾 Reminder: unsubmitted time is legally a rumor.',
  '✨ The grid has been recalculated. No cells were harmed. Probably.',
  '📅 Finance has entered the chat. Finance has left the chat. Finance saw everything.',
  '🔄 Background sync complete: 0 items synced, 3 items judged.',
  '🏢 This workstation is managed by ClarityOne Endpoint Serenity™.',
  '📈 Your burn-down chart is burning up. Someone has been notified.',
  '🕐 The deadline remains 5:00 PM. The deadline has always been 5:00 PM.',
  '💼 A stakeholder has viewed your timecard and said "hm."',
]

// ---------------------------------------------------------------------------
// Compliance alerts (manager + CIO notification)
// ---------------------------------------------------------------------------

export const COMPLIANCE_TRIPWIRE = (code: string) =>
  `Time has been booked against ${code}, a work item flagged by Finance.\n\nYour manager and the Chief Information Officer have been notified.\n\nThis interaction has been logged. The log has been logged. Please continue your timesheet as if you are not being watched, which you are.`

export const COMPLIANCE_OVERBOOK = (code: string, remaining: number) =>
  `Your entry against ${code} exceeds the remaining authorized hours (${remaining.toFixed(2)}h).\n\nBudget overruns are reviewed monthly by a committee whose calendar invite you are now on, as a topic.\n\nYour manager and the Chief Information Officer have been notified.`

export const COMPLIANCE_TITLE = '🚨 COMPLIANCE ALERT — StrategyLens Financial Controls'
export const COMPLIANCE_BUTTON = 'I understand and am afraid'

// ---------------------------------------------------------------------------
// Update (the 4:15)
// ---------------------------------------------------------------------------

export const UPDATE_OFFER = {
  title: 'ClarityOne Endpoint Serenity™',
  body: 'A scheduled activity is scheduled. To ensure the best experience, it will proceed as scheduled, unless it should not, in which case indicate below. Most users do nothing.',
  ok: 'OK',
  later: 'Later',
  okToast: 'Preference recorded: OK. Whatever that meant, it has been noted.',
  laterToast: 'Preference recorded: Later. The activity has been deferred, probably.',
}

export const UPDATE_RUNNING_LINES = [
  'Serenity update 1 of 1 in progress…',
  'Do not power off. Do not hope.',
  'Optimizing endpoint… endpoint located… it is you…',
  'Installing calm (4% complete)…',
  'Your files are exactly where you left them, spiritually.',
]

// ---------------------------------------------------------------------------
// Sign & Submit
// ---------------------------------------------------------------------------

export const ATTESTATION_TEXT =
  'I attest, under penalty of perjury and §4 of the ClarityOne Master Services Agreement, that the hours recorded herein are true, accurate, and emotionally honest; that they were worked in the order implied; that no hour has been counted twice except where doctrine requires; and that I waive any claim to the minutes spent completing this attestation, which are not billable, but are 40 hours.'

/** Exactly one of these is your manager. */
export const MANAGER_OPTIONS = [
  'D. Vance (Inactive)',
  'Deb Vance',
  'Deborah Vance (Contractor)',
  'Deb Vence',
  'Deb Vance (Deb Vance)',
]
export const CORRECT_MANAGER = 'Deb Vance'
export const WRONG_MANAGER_MSG = 'The selected approver is not in your reporting line. Your reporting line has been notified of the attempt.'

// ---------------------------------------------------------------------------
// Validation messages (the validator's actual doctrine)
// ---------------------------------------------------------------------------

export const VAL_MSG = {
  total: (total: number) => {
    const diff = 40 - total
    return `Timesheet must total exactly 40.00 hours. Current total: ${total.toFixed(2)}. Difference: ${Math.abs(diff).toFixed(2)} (${diff > 0 ? 'missing' : 'excess'}). Please resolve the difference.`
  },
  overtime: 'Weekly totals above 40.00 hours constitute overtime, which requires pre-approved Form A_117L (processing time: 6–8 weeks).',
  increment: (code: string) => `Entries on ${code} must be in increments of 0.25 hours (a quarter hour). Fifteen minutes.`,
  weekend: 'Weekend time requires Form A_117L and a reason. Neither is on file.',
  missing: (code: string) => `Work item ${code} is aligned to your resource profile but has not received time. The work item has noticed.`,
  adminOver: 'GEN-0001 exceeds the Administrative Time doctrine (maximum 0.50h). See the Time Governance Office email. Either one.',
  adminZero: 'GEN-0001 requires a nonzero administrative acknowledgment (minimum 0.25h), as everyone administrates.',
  ptZero: 'You have not invested in yourself this week (GEN-0007 = 0.00h). Personal Transformation is not optional. It is personal.',
  overRemaining: (code: string) => `Line ${code} exceeds its remaining authorized hours. Finance has re-noticed.`,
  flagged: (code: string) => `This timesheet contains time against ${code}, a flagged work item. Remove it, and we will discuss how it got there another time.`,
  valid: 'Validation passed. This is not an error. We simply had the dialog ready.',
}

// ---------------------------------------------------------------------------
// Endings
// ---------------------------------------------------------------------------

export const SHAME_EMAIL = {
  from: 'Timesheet Compliance <noreply@strategylens.clarityone>',
  to: '[NAME]',
  cc: 'Deb Vance (Manager); Linda Osei-Bonsu (Chief Information Officer); God <god@heaven.clarityone> — delivery receipt: Read, Disappointed',
  subject: 'Non-Compliance Notification: End-of-Month Time Entry — [NAME]',
  intro: `Dear [NAME],

The end-of-month cutoff has passed. Our records indicate your timesheet was not submitted.

Per policy, this notification has been shared with your manager, the Chief Information Officer, and all-seeing leadership. Below is this month's list of non-compliant resources, published in the spirit of growth:`,
  outro: `Your absence of hours has been recorded as 40 hours of Unexplained Time (GEN-0000), a category that triggers an audit.

We look forward to your compliance next month.

Warmly,
Timesheet Compliance
"Time is the one thing we cannot make more of. You had until 5:00 PM."`,
}

/** Fallback shame names if the cloud is unavailable. All have suffered. */
export const CANNED_SHAME_NAMES = ['BRD', 'KIP', 'DAV', 'SUE', 'TOD', 'PAM', 'GRG', 'LOU', 'MEL', 'STU']

export const SL_WIN = {
  title: 'Submission Confirmed — StrategyLens®',
  headline: '✅ TIMESHEET SUBMITTED',
  blurb: 'Your 40.00 hours have been received, validated, and forwarded to Finance, where they will be questioned.',
}
