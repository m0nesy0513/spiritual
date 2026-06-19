import fs from 'fs'
import path from 'path'

const PROJECT_ROOT = process.cwd()
const UPLOAD_BASE = path.join(PROJECT_ROOT, 'uploads')

/**
 * 文件存储适配器
 * - 开发环境：本地 uploads/ 目录
 * - 生产环境：Vercel Blob
 */

export interface StoredFile {
  fileId: string
  originalName: string
  mimeType: string
  size: number
  storagePath: string
  ownerUserId: string
}

async function checkBlob() {
  try {
    const mod = await import('@vercel/blob')
    return mod
  } catch { return null }
}

// ========== 保存文件 ==========

export async function saveFile(
  file: File | Blob,
  subDir: string,
  ownerUserId: string,
  filename: string,
): Promise<StoredFile> {
  const blobMod = await checkBlob()

  if (blobMod && process.env.BLOB_READ_WRITE_TOKEN) {
    // === Vercel Blob ===
    const key = `${subDir}/${filename}`
    const { url } = await blobMod.put(key, file, {
      access: 'public',
      addRandomSuffix: false,
    })
    return {
      fileId: filename,
      originalName: file instanceof File ? file.name : 'upload',
      mimeType: file.type,
      size: file.size,
      storagePath: url,
      ownerUserId,
    }
  }

  // === 本地文件系统 ===
  const dir = path.join(UPLOAD_BASE, subDir)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const storagePath = path.join(dir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(storagePath, buffer)

  return {
    fileId: filename,
    originalName: file instanceof File ? file.name : 'upload',
    mimeType: file.type,
    size: file.size,
    storagePath,
    ownerUserId,
  }
}

// ========== 删除文件 ==========

export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const blobMod = await checkBlob()

    if (blobMod && process.env.BLOB_READ_WRITE_TOKEN && storagePath.startsWith('http')) {
      // Vercel Blob — 通过 URL 删除
      await blobMod.del(storagePath)
      return
    }

    // 本地文件系统
    if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath)
  } catch (error) {
    console.error(`Failed to delete file: ${storagePath}`, error)
  }
}

// ========== 读取文件 ==========

export function readFile(storagePath: string): Buffer {
  // Vercel Blob URL 也可以在 API route 里用 Response 处理
  // readFile 只用于本地文件系统
  if (storagePath.startsWith('http')) {
    throw new Error('readFile not supported for remote URLs — use Response.redirect or fetch')
  }
  return fs.readFileSync(storagePath)
}

// ========== 工具函数 ==========

export function fileExists(storagePath: string): boolean {
  if (storagePath.startsWith('http')) return true
  return fs.existsSync(storagePath)
}

export function moveFile(from: string, to: string): void {
  if (from.startsWith('http')) return
  const toDir = path.dirname(to)
  if (!fs.existsSync(toDir)) fs.mkdirSync(toDir, { recursive: true })
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
