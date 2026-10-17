import type { WorldDocument } from '@schema/document.schema'

/**
 * The plain text that gets embedded for a document: the subject and the category come with the
 * content, so a short note like a price table is still found by who or what it is about.
 */
export function toDocumentEmbeddingText({
  subject,
  category,
  content
}: Pick<WorldDocument, 'subject' | 'category' | 'content'>): string {
  return `${subject} (${category}): ${content}`
}

/**
 * What a document takes in the prompt: a heading line with its subject and kind, then the content
 * indented under it. The prompt lists entries as bullets, and a document has paragraphs and lists
 * of its own: without the indent, a blank line would end the bullet and the next paragraph would
 * read as loose text, with no sign of where one document stops and the next starts.
 */
export function formatDocumentLine({
  subject,
  category,
  content
}: Pick<WorldDocument, 'subject' | 'category' | 'content'>): string {
  const body = content
    .trim()
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `  ${line}` : ''))
    .join('\n')

  return `**${subject}** (${category})\n${body}`
}
