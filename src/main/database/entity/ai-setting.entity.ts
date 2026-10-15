import { AI_PROVIDERS, EMBEDDING_PROVIDERS } from '@constant'
import { sql } from 'drizzle-orm'
import { boolean, check, pgEnum, pgTable, real, text } from 'drizzle-orm/pg-core'

export const aiProviderEnum = pgEnum('ai_provider', AI_PROVIDERS)
export const embeddingProviderEnum = pgEnum('embedding_provider', EMBEDDING_PROVIDERS)

/**
 * Which LLM narrates the campaigns, how freely, and the API key to reach it. It is global: the
 * player's choice follows them into every world. A single row (`id` is always true); without it the
 * app uses `DEFAULT_AI_SETTING`. The model is plain text on purpose: the catalog of models changes
 * with the providers and a migration per model would not be worth it, so the service validates it
 * against the catalog instead.
 *
 * The key belongs to `provider` and is stored encrypted (see `ISecretCipher`); `keyHint` is its last
 * characters, so the UI can show which key is saved without decrypting it.
 *
 * The embedding key is a second key, the one of `embeddingProvider` (the characters' memory is
 * searched with that provider's embeddings). It does not depend on the narrator's provider: it stays
 * when that changes, and only goes when the embedding provider does.
 */
export const aiSettingTable = pgTable(
  'ai_setting',
  {
    id: boolean('id').primaryKey().default(true),
    provider: aiProviderEnum('provider').notNull(),
    model: text('model').notNull(),
    temperature: real('temperature').notNull(),
    encryptedKey: text('encrypted_key'),
    keyHint: text('key_hint'),
    embeddingProvider: embeddingProviderEnum('embedding_provider').notNull().default('openai'),
    embeddingEncryptedKey: text('embedding_encrypted_key'),
    embeddingKeyHint: text('embedding_key_hint')
  },
  (table) => [
    check('ai_setting_single_row', sql`${table.id}`),
    // A key and its hint are saved and removed together.
    check('ai_setting_key_hint', sql`(${table.encryptedKey} is null) = (${table.keyHint} is null)`),
    check(
      'ai_setting_embedding_key_hint',
      sql`(${table.embeddingEncryptedKey} is null) = (${table.embeddingKeyHint} is null)`
    )
  ]
)
