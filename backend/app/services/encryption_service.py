"""AES-256-GCM encryption service.

Strategy:
  - A random 32-byte item key is generated for each VaultItem.
  - That item key is wrapped (encrypted) with the global master key and stored in the DB.
  - Each CredentialField value is encrypted with its parent item key.
  - File content is also encrypted with the item key before being written to disk.
"""
import base64
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Stable salt — only used to derive a fixed-length master key from the env string
_DERIVE_SALT = b"vault_master_kdf_salt_v1"
_NONCE_LEN = 12


def _derive_master_key(raw_key: str) -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=_DERIVE_SALT, iterations=260_000)
    return kdf.derive(raw_key.encode())


def _encrypt(data: bytes, key: bytes) -> bytes:
    nonce = os.urandom(_NONCE_LEN)
    return nonce + AESGCM(key).encrypt(nonce, data, None)


def _decrypt(blob: bytes, key: bytes) -> bytes:
    return AESGCM(key).decrypt(blob[:_NONCE_LEN], blob[_NONCE_LEN:], None)


class EncryptionService:
    def __init__(self, master_key_raw: str) -> None:
        self._mk = _derive_master_key(master_key_raw)

    # ── Item key lifecycle ────────────────────────────────────────────────────

    def generate_item_key(self) -> str:
        """Return a base64-encoded, master-key-wrapped item key for DB storage."""
        raw_item_key = os.urandom(32)
        wrapped = _encrypt(raw_item_key, self._mk)
        return base64.b64encode(wrapped).decode()

    def _unwrap_item_key(self, wrapped_b64: str) -> bytes:
        return _decrypt(base64.b64decode(wrapped_b64), self._mk)

    # ── Field value encryption ────────────────────────────────────────────────

    def encrypt_value(self, plaintext: str, wrapped_item_key: str) -> str:
        ik = self._unwrap_item_key(wrapped_item_key)
        return base64.b64encode(_encrypt(plaintext.encode(), ik)).decode()

    def decrypt_value(self, ciphertext_b64: str, wrapped_item_key: str) -> str:
        ik = self._unwrap_item_key(wrapped_item_key)
        return _decrypt(base64.b64decode(ciphertext_b64), ik).decode()

    # ── File encryption ───────────────────────────────────────────────────────

    def encrypt_file(self, file_bytes: bytes, wrapped_item_key: str) -> bytes:
        ik = self._unwrap_item_key(wrapped_item_key)
        return _encrypt(file_bytes, ik)

    def decrypt_file(self, encrypted_bytes: bytes, wrapped_item_key: str) -> bytes:
        ik = self._unwrap_item_key(wrapped_item_key)
        return _decrypt(encrypted_bytes, ik)
