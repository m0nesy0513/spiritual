import { NextRequest } from 'next/server'
import { reanalyze } from '@/server/services/analysis.service'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { recordId } = await params
    const body = await req.json()
    const { mode, saveOriginalScreenshot, saveFullRecognizedText } = body

    const result = await reanalyze({
      userId: Number(userId),
      recordPublicId: recordId,
      mode: mode || 'create_new',
      saveOriginalScreenshot,
      saveFullRecognizedText,
    })

    return success(result)
  } catch (err) {
    return error(err)
  }
}
