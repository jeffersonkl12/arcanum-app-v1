// Pure, without imports: the Mastra memory also loads this file, by relative path.

/** A run of the reply that is either prose or the source of one UI block. */
export interface NarrationPiece {
  kind: 'prose' | 'ui'
  text: string
}

/** New text for the piece at position `segment`. */
export interface NarrationDelta extends NarrationPiece {
  segment: number
}

const FENCE = '```'

/**
 * Rewrites, as the prose streams, the punctuation the narrator is told never to use (colon,
 * semicolon, dashes): each becomes a comma, or a period when the line ends right after it. A
 * hyphen inside a word, a colon between digits (a time) and a list marker at the start of a line
 * are left alone. Spaces are held back until the next character, so a space before a dash can
 * be dropped without taking back text that was already streamed.
 */
export class ProseSanitizer {
  private spaces = ''
  private last = ''
  private markPending = false
  private needsSpace = false

  push(char: string): string {
    const isSpace = char === ' ' || char === '\t'
    if (this.isBannedMark(char)) {
      this.spaces = ''
      if (/[,.!?]/.test(this.last)) this.needsSpace = true
      else this.markPending = true
      return ''
    }

    let out = ''
    if (this.markPending) {
      this.markPending = false
      this.needsSpace = true
      out = char === '\n' ? '.' : ','
      this.last = out
    }
    if (this.needsSpace && !isSpace && char !== '\n') out += ' '
    this.needsSpace = false

    if (isSpace) {
      this.spaces += char
      return out
    }
    out += this.spaces + (char === '…' ? '.' : char)
    this.spaces = ''
    this.last = char
    return out
  }

  /** What is still held back, for the end of the prose or before a block. */
  flush(): string {
    const out = (this.markPending ? '.' : '') + this.spaces
    this.markPending = false
    this.needsSpace = false
    this.spaces = ''
    if (out !== '') this.last = out[out.length - 1]
    return out
  }

  private isBannedMark(char: string): boolean {
    if (char === ';' || char === '—' || char === '–') return true
    if (char === ':') return !/\d/.test(this.last)
    // A hyphen after a space is a dash; inside a word or opening a line it is spelling or a marker.
    return char === '-' && this.spaces.length > 0 && this.last !== '' && this.last !== '\n'
  }
}

/**
 * Splits a reply written in OpenUI Lang's inline mode (prose with fenced `openui-lang` blocks) as
 * it streams, one chunk at a time. The fence rule is the one of the OpenUI parser: any triple
 * backtick opens or closes a block, except inside a double-quoted string of the block. The language
 * tag after the opening fence and the newline after the closing one are dropped.
 *
 * A chunk can end in the middle of a fence, so backticks are held back until the next character
 * says whether they are a fence. `push` returns only what is certain; call `end` once the stream
 * is over to release what is left.
 */
export class NarrationStreamSplitter {
  private mode: 'prose' | 'tag' | 'ui' | 'after-fence' = 'prose'
  private pendingTicks = 0
  private inString = false
  private escaped = false
  private open = false
  private readonly written: NarrationPiece[] = []
  private readonly sanitizer = new ProseSanitizer()

  push(chunk: string): NarrationDelta[] {
    const deltas: NarrationDelta[] = []
    for (const char of chunk) this.consume(char, deltas)
    return deltas
  }

  /** Releases held-back backticks (a reply that ends in the middle of a fence). */
  end(): NarrationDelta[] {
    const deltas: NarrationDelta[] = []
    if (this.mode === 'prose') this.emit('prose', this.sanitizer.flush(), deltas)
    if (this.mode === 'prose' || this.mode === 'ui') this.flushTicks(this.mode, deltas)
    return deltas
  }

  /** Everything written so far, in order, untrimmed. Empty pieces are possible. */
  pieces(): readonly NarrationPiece[] {
    return this.written
  }

  private consume(char: string, deltas: NarrationDelta[]): void {
    switch (this.mode) {
      case 'prose':
        if (char === '`') {
          if (this.pendingTicks === 0) this.emit('prose', this.sanitizer.flush(), deltas)
          return this.countTick('tag')
        }
        this.flushTicks('prose', deltas)
        this.emit('prose', this.sanitizer.push(char), deltas)
        return
      case 'tag':
        // The language tag (`openui-lang`) up to the end of the line; it is not content.
        if (char === '\n') this.startBlock()
        return
      case 'ui':
        if (this.inString) return this.consumeInString(char, deltas)
        if (char === '`') return this.countTick('after-fence')
        this.flushTicks('ui', deltas)
        if (char === '"') this.inString = true
        this.emit('ui', char, deltas)
        return
      case 'after-fence':
        this.mode = 'prose'
        if (char !== '\n') this.consume(char, deltas)
    }
  }

  private consumeInString(char: string, deltas: NarrationDelta[]): void {
    if (char === '"' && !this.escaped) this.inString = false
    this.escaped = char === '\\' && !this.escaped
    this.emit('ui', char, deltas)
  }

  /** Counts a backtick; the third one makes a fence, and the piece in progress is over. */
  private countTick(modeAfterFence: 'tag' | 'after-fence'): void {
    this.pendingTicks++
    if (this.pendingTicks < FENCE.length) return

    this.pendingTicks = 0
    this.open = false
    this.mode = modeAfterFence
  }

  private startBlock(): void {
    this.mode = 'ui'
    this.inString = false
    this.escaped = false
  }

  private flushTicks(kind: 'prose' | 'ui', deltas: NarrationDelta[]): void {
    if (this.pendingTicks === 0) return

    this.emit(kind, '`'.repeat(this.pendingTicks), deltas)
    this.pendingTicks = 0
  }

  private emit(kind: 'prose' | 'ui', text: string, deltas: NarrationDelta[]): void {
    if (text === '') return

    if (!this.open || this.written[this.written.length - 1].kind !== kind) {
      this.written.push({ kind, text: '' })
      this.open = true
    }

    const segment = this.written.length - 1
    this.written[segment].text += text

    const last = deltas[deltas.length - 1]
    if (last?.segment === segment) last.text += text
    else deltas.push({ segment, kind, text })
  }
}

/** The reply as its final pieces: trimmed, in order, with the empty ones dropped. */
export function splitNarration(reply: string): NarrationPiece[] {
  const splitter = new NarrationStreamSplitter()
  splitter.push(reply)
  splitter.end()

  return splitter
    .pieces()
    .map(({ kind, text }) => ({ kind, text: text.trim() }))
    .filter(({ text }) => text.length > 0)
}

/** The prose of a reply, without its UI blocks. */
export function stripNarrationUi(reply: string): string {
  return splitNarration(reply)
    .filter(({ kind }) => kind === 'prose')
    .map(({ text }) => text)
    .join('\n\n')
}
