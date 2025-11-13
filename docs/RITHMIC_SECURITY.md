# Rithmic Sync Security Documentation

## Overview

This document outlines the security measures implemented for storing and managing Rithmic credentials in the Deltalytix application.

## Security Architecture

### 1. Credential Storage Strategy

The system uses a dual-storage approach:

- **Database (PostgreSQL)**: Stores non-sensitive metadata
  - Credential ID (unique identifier)
  - Service name ("rithmic")
  - Last sync timestamp
  - Token expiration (if applicable)
  - User ID reference

- **Browser localStorage**: Stores encrypted sensitive data
  - Username
  - **Encrypted** password
  - Server type and location
  - Selected accounts
  - Sync settings

### 2. Encryption Implementation

#### Algorithm: AES-256-GCM

We use the Web Crypto API with AES-256-GCM (Galois/Counter Mode) for encryption:

- **Key Length**: 256 bits
- **Mode**: GCM (provides both confidentiality and authenticity)
- **Initialization Vector (IV)**: 12 bytes, randomly generated for each encryption
- **Salt**: 16 bytes, randomly generated for each encryption

#### Key Derivation

Keys are derived using PBKDF2 (Password-Based Key Derivation Function 2):

```
PBKDF2(
  password: userKey,
  salt: random 16 bytes,
  iterations: 100,000,
  hash: SHA-256,
  keyLength: 256 bits
)
```

The `userKey` is composed of:
- User ID (from database)
- Browser fingerprint (user agent, language, timezone, screen properties)

This ensures that:
1. Keys are user-specific
2. Keys are device-specific
3. Stolen localStorage data cannot be decrypted on a different device

#### Encryption Process

1. Generate random salt (16 bytes)
2. Generate random IV (12 bytes)
3. Derive encryption key from user-specific password and salt
4. Encrypt password using AES-256-GCM
5. Store encrypted data as JSON: `{ ciphertext, iv, salt }`
6. Base64 encode for storage

#### Decryption Process

1. Parse stored JSON
2. Base64 decode ciphertext, IV, and salt
3. Derive same encryption key using stored salt
4. Decrypt using AES-256-GCM
5. Return plaintext password

### 3. Data Migration

The system automatically migrates from unencrypted storage (v1.0) to encrypted storage (v2.0):

- On first load after update, existing credentials are encrypted
- Version tracking ensures migration happens only once
- Failed migrations are logged but don't crash the application

### 4. Security Best Practices

#### What We Do

✅ **Encrypt sensitive data at rest** - All passwords are encrypted in localStorage
✅ **Use strong encryption** - AES-256-GCM with PBKDF2 key derivation
✅ **Device-specific keys** - Keys tied to user and device
✅ **Automatic key rotation** - Each encryption uses new salt and IV
✅ **Secure key storage** - Keys never stored, always derived on-demand
✅ **HTTPS-only** - Application requires secure transport
✅ **Token-based authentication** - Tokens used instead of credentials where possible

#### What We Don't Do (Limitations)

⚠️ **localStorage is not a vault** - While encrypted, localStorage is still accessible to JavaScript
⚠️ **XSS vulnerability** - If XSS occurs, attacker can access localStorage while user is logged in
⚠️ **No server-side encryption** - Credentials are not stored on server (by design)
⚠️ **Browser dependency** - Requires Web Crypto API support

### 5. Threat Model

#### Threats We Protect Against

1. **Local storage theft** - Encrypted data is useless without user context
2. **Credential exposure in logs** - Passwords never logged in plaintext
3. **Cross-device credential theft** - Device fingerprinting prevents decryption on different devices
4. **Man-in-the-middle** - HTTPS enforced for all API calls

#### Threats We Cannot Fully Protect Against

1. **XSS attacks** - If attacker can execute JavaScript, they can access decrypted data
2. **Physical device access** - If attacker has device access while user is logged in
3. **Browser compromises** - If browser itself is compromised
4. **User device malware** - Keyloggers or screen capture malware

### 6. Credential Lifecycle

```
┌─────────────────┐
│  User enters    │
│  credentials    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validate &     │
│  Authenticate   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Encrypt        │
│  password       │
└────────┬────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌──────────────────┐
│  Store in       │   │  Store metadata  │
│  localStorage   │   │  in database     │
│  (encrypted)    │   │  (credential ID) │
└────────┬────────┘   └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Auto-sync checks   │
         │  database for IDs   │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Retrieve & decrypt │
         │  from localStorage  │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Perform sync       │
         └─────────────────────┘
```

### 7. Re-authentication Flow

When localStorage credentials are missing or corrupted:

1. System detects missing credentials during sync attempt
2. Toast notification shown to user with "Re-enter Credentials" action
3. User clicks action to open credentials form
4. User re-enters credentials
5. System validates and re-encrypts credentials
6. Sync resumes automatically

### 8. Recommendations for Users

1. **Use strong, unique passwords** for Rithmic accounts
2. **Enable device security** (screen lock, disk encryption)
3. **Log out when done** to clear session data
4. **Keep browser updated** for latest security patches
5. **Use antivirus/anti-malware** software
6. **Be cautious of browser extensions** that can access page data

### 9. Recommendations for Developers

1. **Never log passwords** or decrypted credentials
2. **Clear credentials from memory** after use when possible
3. **Validate all user inputs** to prevent injection attacks
4. **Keep dependencies updated** for security patches
5. **Regular security audits** of credential handling code
6. **Test encryption/decryption** in different scenarios
7. **Monitor for XSS vulnerabilities** in all user-facing components

### 10. Compliance Notes

- **GDPR**: Users can delete their credentials at any time
- **Data Minimization**: Only necessary credential data is stored
- **Purpose Limitation**: Credentials used only for Rithmic sync
- **User Control**: Users have full control over their stored credentials

## Technical Implementation Details

### Files

- `/lib/secure-storage.ts` - Encryption/decryption utilities
- `/lib/rithmic-storage.ts` - Credential storage with encryption
- `/context/rithmic-sync-context.tsx` - Sync logic with credential handling
- `/app/[locale]/dashboard/components/import/rithmic/sync/` - UI components

### Testing Encryption

```typescript
import { encryptData, decryptData, isCryptoAvailable } from '@/lib/secure-storage'

// Check if crypto is available
if (isCryptoAvailable()) {
  // Encrypt
  const encrypted = await encryptData('password123', 'user-id-123')
  
  // Decrypt
  const decrypted = await decryptData(encrypted, 'user-id-123')
  
  console.assert(decrypted === 'password123')
}
```

## Future Enhancements

1. **Credential expiration** - Force re-authentication after period
2. **Multi-factor authentication** - Additional verification layer
3. **Hardware security keys** - Support for WebAuthn/FIDO2
4. **Encrypted database storage** - Server-side encrypted credential storage
5. **Audit logging** - Track all credential access

## Questions or Concerns?

For security-related questions or to report vulnerabilities, please contact the development team through the appropriate secure channels.
