import { ConflictError } from '@error'
import { safeStorage } from 'electron'

export interface ISecretCipher {
  /** Encrypts a secret into text that is safe to store in the database. */
  encrypt(secret: string): string
  /** Reverses `encrypt`. Throws `ConflictError` when the text cannot be decrypted. */
  decrypt(encrypted: string): string
}

/**
 * Facade over Electron's `safeStorage`: the key lives in the OS keychain (Keychain, DPAPI,
 * libsecret/KWallet), so a copy of the database alone does not reveal what it stores. On Linux
 * without a keyring Electron falls back to `basic_text`, which is obfuscation rather than
 * encryption, so that case is refused instead of storing secrets under a false sense of safety.
 */
export class SecretCipher implements ISecretCipher {
  encrypt(secret: string): string {
    this.assertAvailable()

    return safeStorage.encryptString(secret).toString('base64')
  }

  decrypt(encrypted: string): string {
    this.assertAvailable()

    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    } catch (error) {
      throw new ConflictError(
        'The saved API key can no longer be decrypted (the system keychain changed). Save it again.',
        { cause: error }
      )
    }
  }

  private assertAvailable(): void {
    const weak =
      process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text'

    if (!safeStorage.isEncryptionAvailable() || weak) {
      throw new ConflictError(
        'Secure storage is not available on this system (no keyring found), so the API key cannot be saved. ' +
          'Set it in the environment instead.'
      )
    }
  }
}
