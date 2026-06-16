'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loading } from '@/components/common'

export default function HistoryDetailRedirect() {
  const router = useRouter()
  const { recordId } = useParams<{ recordId: string }>()

  useEffect(() => {
    if (recordId) router.replace(`/analysis/${recordId}`)
  }, [recordId, router])

  return <Loading fullScreen text="跳转中…" />
}
