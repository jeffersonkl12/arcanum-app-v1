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

/** The line a document takes in the prompt: what it is about, the kind of document, what it says. */
export function formatDocumentLine({
  subject,
  category,
  content
}: Pick<WorldDocument, 'subject' | 'category' | 'content'>): string {
  return `${subject} (${category}): ${content}`
}
