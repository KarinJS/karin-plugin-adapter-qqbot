import { docsLlms } from '@/lib/source'
import { withBasePathInMarkdown } from '@/lib/shared'

export const dynamic = 'force-static'
export const revalidate = false

export async function GET() {
  return new Response(withBasePathInMarkdown(await docsLlms.full()))
}
