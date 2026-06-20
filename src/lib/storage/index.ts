import fs from 'fs'
import path from 'path'

const PROJECT_ROOT = process.cwd()
const UPLOAD_BASE = path.join(PROJECT_ROOT, 'uploads')

export interface StoredFile {
  fileId: string
  originalName: string
  mimeType: string
  size: number
  storagePath: string
  ownerUserId: string
  data?: string // base64 fallback for Zeabur
}

// 确保目录
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }) } catch {}
  }
}

/** 保存文件 — 本地优先，fallback 到内存 base64 */
export async function saveFile(
  file: File | Blob,
  subDir: string,
  ownerUserId: string,
  filename: string,
): Promise<StoredFile> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')

  // 尝试写本地磁盘
  let storagePath = ''
  try {
    const dir = path.join(UPLOAD_BASE, subDir)
    ensureDir(dir)
    const fp = path.join(dir, filename)
    fs.writeFileSync(fp, buffer)
    storagePath = fp
  } catch {
    // 无本地磁盘 → fallback 到 base64
    storagePath = `base64:${base64}`
  }

  return {
    fileId: filename,
    originalName: file instanceof File ? file.name : 'upload',
    mimeType: file.type,
    size: file.size,
    storagePath,
    ownerUserId,
    data: !fs.existsSync(storagePath) ? base64 : undefined,
  }
}

export async function deleteFile(storagePath: string): Promise<void> {
  try {
    if (storagePath.startsWith('base64:')) return
    if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath)
  } catch {}
}

export function readFile(storagePath: string): Buffer {
  if (storagePath.startsWith('base64:')) {
    return Buffer.from(storagePath.replace('base64:', ''), 'base64')
  }
  return fs.readFileSync(storagePath)
}

export function fileExists(storagePath: string): boolean {
  if (storagePath.startsWith('base64:')) return true
  return fs.existsSync(storagePath)
}

export function moveFile(from: string, to: string): void {
  if (from.startsWith('base64:') || to.startsWith('base64:')) return
  ensureDir(path.dirname(to))
  fs.renameSync(from, to)
}

export function generateFilename(ext: string): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 10)
  return `${ts}_${rand}${ext}`
}

export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }
  return map[ext] || 'application/octet-stream'
}
