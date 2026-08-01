export interface ConfirmSpec {
  title: string
  body: string
  okLabel: string
  cancelLabel: string
  okToast: string
  cancelToast: string
}

/**
 * Catastrophic-sounding OK/Cancel prompts. Neither button ever does anything
 * harmful — the harm is emotional.
 */
export const CONFIRMS: ConfirmSpec[] = [
  {
    title: 'Confirm File Operation',
    body: 'Are you sure you want to delete all files in C:\\ ?',
    okLabel: 'OK',
    cancelLabel: 'Cancel',
    okToast: 'All files deleted. (Restored from backup. We back up everything. Everything.)',
    cancelToast: 'Deletion postponed to a surprise date of our choosing.',
  },
  {
    title: 'OSXii Setup',
    body: 'Reinstall OSXii while it is running?',
    okLabel: 'Reinstall',
    cancelLabel: 'Cancel',
    okToast: 'Reinstallation queued behind 4,000 pending updates.',
    cancelToast: 'Setup will ask again at a worse time.',
  },
  {
    title: 'Power Manager',
    body: 'Your PC would like to restart now, during this. Restart?',
    okLabel: 'Restart',
    cancelLabel: 'Not now',
    okToast: 'Restart deferred until you are mid-keystroke.',
    cancelToast: '"Not now" has been interpreted as "soon."',
  },
  {
    title: 'Registry Maintenance',
    body: 'OSXii found 3 unused registry keys. Detonate them?',
    okLabel: 'Detonate',
    cancelLabel: 'Cancel',
    okToast: 'Registry keys detonated. The blast radius included your settings.',
    cancelToast: 'The keys remain, ticking softly.',
  },
  {
    title: 'Privacy Center',
    body: 'Share all of your files with Trusted Partners? (Partner list unavailable)',
    okLabel: 'Share',
    cancelLabel: 'Cancel',
    okToast: 'Files shared. Your Trusted Partners say thanks.',
    cancelToast: 'Sharing declined. Files shared anyway, out of habit.',
  },
  {
    title: 'OSXii Security',
    body: 'A program is behaving completely normally. Terminate it?',
    okLabel: 'Terminate',
    cancelLabel: 'Spare it',
    okToast: 'Program terminated. It never saw it coming.',
    cancelToast: 'Program spared. It knows what you almost did.',
  },
  {
    title: 'Disk Utility',
    body: 'Drive C: appears to be happy. Defragment its happiness?',
    okLabel: 'Defragment',
    cancelLabel: 'Cancel',
    okToast: 'Happiness defragmented into 512 contiguous blocks of contentment.',
    cancelToast: 'Drive C: remains happy, for now, in fragments.',
  },
  {
    title: 'Sync Wizard',
    body: 'Sync your clipboard contents to a billboard in Times Square?',
    okLabel: 'Sync',
    cancelLabel: 'Cancel',
    okToast: 'Clipboard synced. It said something embarrassing. Everyone saw.',
    cancelToast: 'Sync cancelled. The billboard shows your name anyway.',
  },
  {
    title: 'Account Control',
    body: 'This action requires you to confirm that you exist. Confirm existence?',
    okLabel: 'I exist',
    cancelLabel: 'Cancel',
    okToast: 'Existence confirmed. Welcome to the mailing list.',
    cancelToast: 'Existence unconfirmed. Continuing to bill you regardless.',
  },
]
