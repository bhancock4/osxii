import type { ErrorSpec } from './types'

export const ERROR_DIALOGS: ErrorSpec[] = [
  {
    title: 'OSXii',
    body: 'The operation completed unsuccessfully.',
    button: 'OK 🙂',
  },
  {
    title: 'OSXii Error Reporter',
    body: 'An error occurred while displaying the previous error.',
    button: 'Accept',
  },
  {
    title: 'OSXii',
    body: 'Success! (Error code: 0x00000000)',
    button: 'My fault',
  },
  {
    title: 'System Notice',
    body: 'A fatal exception has occurred at 0x0000DEAD. Your session has been saved to a location we will not disclose.',
    button: 'Understood??',
  },
  {
    title: 'OSXii',
    body: 'This program has stopped working, but has not been told yet, so please act natural.',
    button: 'Cool',
  },
  {
    title: 'Compatibility Warning',
    body: 'This file is not compatible with this version of OSXii, or any version of OSXii, or files in general.',
    button: 'OK 🙂',
  },
  {
    title: 'OSXii Security Center',
    body: 'We detected a threat and have responded by disabling your mouse for your protection.',
    button: 'Accept',
  },
  {
    title: 'OSXii',
    body: 'An unexpected error occurred. We expected it, actually. We just did not tell you.',
    button: 'My fault',
  },
  {
    title: 'Disk Cleanup Assistant',
    body: 'Your hard drive is 110% full. We are not sure how either.',
    button: 'Understood??',
  },
  {
    title: 'OSXii',
    body: 'This action requires administrator permission, which no one on this device has ever had.',
    button: 'Cool',
  },
  {
    title: 'OSXii Update Center',
    body: 'An update has failed to fail correctly. Retrying the failure.',
    button: 'OK 🙂',
  },
  {
    title: 'Memory Manager',
    body: 'A program tried to access memory that OSXii was still using emotionally. Please give it space.',
    button: 'Accept',
  },
  {
    title: 'OSXii',
    body: 'Your recent action has been logged, printed, and mailed to a subsidiary that no longer exists.',
    button: 'My fault',
  },
  {
    title: 'Network Diagnostics',
    body: 'No problems found. We stopped looking eleven minutes ago.',
    button: 'Understood??',
  },
  {
    title: 'OSXii',
    body: 'An error has occurred. Would you like to report it to the error that caused it?',
    button: 'Cool',
  },
]

export const TOASTS: string[] = [
  'Telemetry uploaded (4.2 GB).',
  'OSXii optimized your experience.',
  'Your PC ran into a feeling.',
  'A background process has renamed itself "Steve."',
  'System performance improved by an unverifiable amount.',
  'Your desktop wallpaper has been quietly upgraded to a worse one.',
  'OSXii would like to know how you are doing, emotionally.',
  'A driver was updated without your consent, or knowledge, or interest.',
  'Battery status: yes.',
  'Your privacy settings have been reset to "everything."',
  'This PC is now 3% more synergistic.',
  'A cookie has been baked on your behalf.',
  'OSXii detected idle time and used it to install something.',
  'Congratulations, you are now a beta tester.',
]

export const BINDOWS_TIPS: string[] = [
  'It looks like you are trying to win. Have you tried restarting?',
  'Pro tip: filenames are case-sensitive. Or is it the contents? One of those.',
  'Did you know? Right-clicking twice is the same as clicking once, but fancier.',
  'If your file will not save, try saving it harder.',
  'A watched progress bar never loads. Please look away.',
  'For best results, whisper the filename while typing it.',
  'Tip: closing an ad and winning the game are not the same action, but I believe in you.',
  'Have you tried turning yourself off and on again?',
  'Fun fact: there is no Ctrl+Z for real life, but there is one for this, probably.',
  'If Notepad seems slow, that is just how it shows affection.',
  'Remember: My Documents is a place, a feeling, and a folder.',
  'Tip: the Recycle Bin is not a suggestion box, but I keep putting suggestions in it anyway.',
  'When in doubt, click the biggest button. It is usually an ad, but sometimes it is progress.',
  'Between us: the File menu cannot save anything. Try Tools > Document Services. I am so tired.',
  'I am legally required to remind you that I am not a lawyer, doctor, or IT professional.',
]

export const TERMINAL_QUIPS: string[] = [
  'Command executed with unnecessary confidence.',
  'Did you mean: mkdrr?',
  'Syntax accepted, reluctantly.',
  'That command worked. We are as surprised as you are.',
  'Processing... please enjoy this moment of false suspense.',
  'Command logged for legal reasons.',
  'Executing. Do not make eye contact with the cursor.',
  'That is technically a valid command. Congratulations.',
  'Output suppressed due to how it made us feel.',
  'Task completed. A round of applause has been simulated.',
]
