import { AI_MODEL_CATALOG } from '@constant'
import { ProbeError, type IAiProbe } from '@lib/ai-probe.lib'
import type { AiConnectionResult, TestAiConnection } from '@schema/ai-setting.schema'
import type { IAiSettingService } from '@service/ai-setting.service'

export interface IAiConnectionService {
  /** Checks that the key (typed or already in use), provider and model answer right now. */
  test(input: TestAiConnection): Promise<AiConnectionResult>
}

/**
 * Tests the narrator's and the embeddings' keys with a real call, so the player finds out in the
 * settings and not in the middle of a turn. A failure is a result, never a throw, and carries only a
 * category: the provider's message may quote the key and stays in the main process log.
 */
export class AiConnectionService implements IAiConnectionService {
  constructor(
    private readonly aiSettingService: IAiSettingService,
    private readonly probe: IAiProbe,
    private readonly environment: NodeJS.ProcessEnv = process.env
  ) {}

  async test(input: TestAiConnection): Promise<AiConnectionResult> {
    const apiKey = input.apiKey ?? (await this.savedKey(input))

    if (!apiKey && !this.environment[AI_MODEL_CATALOG[input.provider].apiKeyEnvVar]) {
      return { ok: false, reason: 'missing_key', latencyMs: 0 }
    }

    const startedAt = performance.now()
    try {
      if (input.target === 'chat') {
        await this.probe.pingChat(input.provider, input.model, apiKey)
      } else {
        await this.probe.pingEmbedding(input.provider, apiKey)
      }
    } catch (error) {
      const reason = error instanceof ProbeError ? error.failure : 'unknown'

      return { ok: false, reason, latencyMs: elapsedSince(startedAt) }
    }

    return { ok: true, latencyMs: elapsedSince(startedAt) }
  }

  /**
   * The saved key that would serve this provider in a turn. A key belongs to the provider it was
   * saved for, so a form pointing at another provider finds none (and falls back to the environment).
   */
  private async savedKey(input: TestAiConnection): Promise<string | undefined> {
    const saved = await this.aiSettingService.resolve()

    if (input.target === 'chat') {
      return saved.provider === input.provider ? saved.apiKey : undefined
    }

    if (saved.embeddingProvider === input.provider) return saved.embeddingApiKey

    // The embeddings key of another provider is no use; the chat key still is if it is this one's.
    return saved.provider === input.provider ? saved.apiKey : undefined
  }
}

function elapsedSince(startedAt: number): number {
  return Math.round(performance.now() - startedAt)
}
