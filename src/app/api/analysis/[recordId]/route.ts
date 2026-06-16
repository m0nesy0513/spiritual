import { NextRequest } from 'next/server'
import { getAnalysis } from '@/server/services/analysis.service'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { recordId } = await params
    const result = await getAnalysis(Number(userId), recordId)
    return success(result)
  } catch (err) {
    return error(err)
  }
}
