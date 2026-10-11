import DOMPurify from 'dompurify'
import { Marked } from 'marked'

/** What the narrator's Markdown may become. Everything else is dropped, keeping its text. */
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'del', 'code', 'blockquote', 'ul', 'ol', 'li', 'hr']

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * The narrator's prose is Markdown. Raw HTML is shown as text, and links and images are reduced
 * to their label: the story has no use for them and a model should not be able to open anything.
 */
const markdown = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html: ({ text }) => escapeHtml(text),
    link(token) {
      return this.parser.parseInline(token.tokens)
    },
    image: ({ text }) => escapeHtml(text)
  }
})

/**
 * Turns the Markdown the narrator wrote into HTML that is safe for `v-html`: parsed by `marked`,
 * then sanitized against an allow-list of tags with no attributes. Safe to call on a half-written
 * reply while it streams.
 */
export function renderMarkdown(source: string): string {
  const html = markdown.parse(source, { async: false })
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] })
}
