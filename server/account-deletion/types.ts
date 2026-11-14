import 'server-only'

export type DeleteAccountResult = {
  status: 'complete' | 'partial'
  storageError?: string
  stripeError?: string
}
