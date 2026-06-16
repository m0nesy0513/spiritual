import { NextRequest } from 'next/server'
import { createAnalysis } from '@/server/services/analysis.service'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ValidationError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const body = await req.json()
    const {
      screenshotFileId, userFeelingText, manualText,
      anxietyScoreBefore, sourcePlatform, referenceHistoryEnabled,
      saveOriginalScreenshot, saveFullRecognizedText,
    } = body

    if (!screenshotFileId) return error(new ValidationError('缺少截图文件'))

    console.log('[Analysis] Starting for user:', userId, 'file:', screenshotFileId)

    const result = await createAnalysis({
      userId: Number(userId),
      screenshotFileId,
      userFeelingText,
      manualText,
      anxietyScoreBefore,
      sourcePlatform,
      referenceHistoryEnabled: referenceHistoryEnabled ?? false,
      saveOriginalScreenshot: saveOriginalScreenshot ?? false,
      saveFullRecognizedText: saveFullRecognizedText ?? false,
    })

    return success(result)
  } catch (err: any) {
    console.error('[Analysis] Error:', err.message, err.stack)
    return error(err)
  }
}
