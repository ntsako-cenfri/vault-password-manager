// ── Roles ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'team' | 'external'

export interface User {
  id: string
  email: string
  username: string
  role: UserRole
  is_active: boolean
  created_at: string
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// ── Credential fields ─────────────────────────────────────────────────────────
export type FieldType =
  | 'username'
  | 'password'
  | 'ssh_key'
  | 'pem_file'
  | 'install_file'
  | 'url'
  | 'api_key'
  | 'note'
  | 'custom'
  | 'db_host'
  | 'db_username'
  | 'db_port'
  | 'db_password'
  | 'custom_file'

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  username:     'Username',
  password:     'Password',
  ssh_key:      'SSH Key',
  pem_file:     'PEM File',
  install_file: 'Install File',
  url:          'URL',
  api_key:      'API Key',
  note:         'Note',
  custom:       'Custom',
  db_host:      'DB Host',
  db_username:  'DB Username',
  db_port:      'DB Port',
  db_password:  'DB Password',
  custom_file:  'Custom File',
}

export const FILE_FIELD_TYPES: FieldType[] = ['pem_file', 'install_file', 'ssh_key', 'custom_file']

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
