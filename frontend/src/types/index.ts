// ── Roles ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'team' | 'external'

export interface User {
  id: string
  email: string
  username: string
  role: UserRole
  is_active: boolean
  totp_enabled: boolean
  created_at: string
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  mfa_required?: boolean
  mfa_token?: string
}

// ── Credential fields ─────────────────────────────────────────────────────────
export type FieldType =
  // Basic
  | 'username'
  | 'password'
  | 'totp'
  | 'pin'
  // Web & API
  | 'url'
  | 'api_key'
  | 'oauth_token'
  // Database
  | 'db_host'
  | 'db_username'
  | 'db_port'
  | 'db_password'
  // Payment
  | 'credit_card'
  | 'card_expiry'
  | 'card_cvv'
  // Banking
  | 'bank_account'
  | 'sort_code'
  // Contact
  | 'email_address'
  | 'phone'
  // Development
  | 'ssh_key'
  | 'pem_file'
  | 'license_key'
  | 'env_var'
  | 'code'
  // Files & Notes
  | 'note'
  | 'custom'
  | 'install_file'
  | 'custom_file'

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  username:     'Username',
  password:     'Password',
  totp:         '2FA / TOTP Secret',
  pin:          'PIN',
  url:          'URL',
  api_key:      'API Key',
  oauth_token:  'OAuth Token',
  db_host:      'DB Host',
  db_username:  'DB Username',
  db_port:      'DB Port',
  db_password:  'DB Password',
  credit_card:  'Credit Card No.',
  card_expiry:  'Card Expiry',
  card_cvv:     'CVV',
  bank_account: 'Bank Account No.',
  sort_code:    'Sort Code',
  email_address:'Email Address',
  phone:        'Phone Number',
  ssh_key:      'SSH Key',
  pem_file:     'PEM File',
  license_key:  'License Key',
  env_var:      'ENV Variable',
  code:         'Code Snippet',
  note:         'Note',
  custom:       'Custom',
  install_file: 'Install File',
  custom_file:  'Custom File',
}

/** Types whose value is masked by default */
export const SENSITIVE_FIELD_TYPES: FieldType[] = [
  'password', 'api_key', 'db_password', 'totp', 'pin',
  'card_cvv', 'credit_card', 'bank_account', 'oauth_token',
]

export const FILE_FIELD_TYPES: FieldType[] = ['pem_file', 'install_file', 'ssh_key', 'custom_file']

/** Groups for rendering the type <select> */
export const FIELD_TYPE_GROUPS: { label: string; types: FieldType[] }[] = [
  { label: 'Basic',        types: ['username', 'password', 'totp', 'pin'] },
  { label: 'Web & API',    types: ['url', 'api_key', 'oauth_token'] },
  { label: 'Database',     types: ['db_host', 'db_username', 'db_password', 'db_port'] },
  { label: 'Payment',      types: ['credit_card', 'card_expiry', 'card_cvv'] },
  { label: 'Banking',      types: ['bank_account', 'sort_code'] },
  { label: 'Contact',      types: ['email_address', 'phone'] },
  { label: 'Development',  types: ['ssh_key', 'pem_file', 'license_key', 'env_var', 'code'] },
  { label: 'Files & Notes',types: ['note', 'custom', 'install_file', 'custom_file'] },
]

export interface CredentialField {
  id: string
  field_type: FieldType
  label: string
  value: string | null
  comment: string | null
  original_filename: string | null
  order: number
}

// Draft — used in the form before it's saved
export interface CredentialFieldDraft {
  _key: string // local UI key only
  savedId?: string // set when loaded from server — undefined means it's a new unsaved field
  field_type: FieldType
  label: string
  value: string
  comment: string
  order: number
  file?: File
}

// ── Vault item ────────────────────────────────────────────────────────────────
export interface VaultItem {
  id: string
  owner_id: string
  title: string
  description: string | null
  /** Freeform group label shown as a section header on the dashboard. */
  category?: string | null
  fields: CredentialField[]
  created_at: string
  updated_at: string
}

// ── Share links ───────────────────────────────────────────────────────────────
export interface ShareLink {
  id: string
  token: string
  vault_item_id: string
  recipient_email: string | null
  is_strict: boolean
  expires_at: string | null
  created_at: string
}

export interface SharedItemResponse {
  share: ShareLink
  item: VaultItem
}

export interface ShareMeta {
  is_strict: boolean
  expired: boolean
  recipient_email: string | null
}

// ── Grants (persistent access) ────────────────────────────────────────────────
export interface ItemGrant {
  id: string
  vault_item_id: string
  granted_by: string
  granted_to_id: string | null
  granted_to_email: string
  grantor_username: string
  grantee_username: string | null
  created_at: string
}

export interface GrantedItem {
  grant_id: string
  granted_by_username: string
  item: VaultItem
}

export interface UserVaultResponse {
  own_items: VaultItem[]
  shared_items: GrantedItem[]
}
