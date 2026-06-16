import fs from 'fs'
import path from 'path'

// 确保基于项目根目录
const PROJECT_ROOT = process.cwd()
const UPLOAD_BASE = path.join(PROJECT_ROOT, 'uploads')

/**
 * 文件存储适配器 — 本地存储实现
 * 后续切换对象存储只需实现相同接口
 */

export interface StoredFile {
  fileId: string
  originalName: string
  mimeType: string
  size: number
  storagePath: string
  ownerUserId: string
}

/**
 * 保存文件到本地
 */
export async function saveFile(
  file: File | Blob,
  subDir: string,
  ownerUserId: string,
  filename: string,
): Promise<StoredFile> {
  const dir = path.join(UPLOAD_BASE, subDir)
  ensureDir(dir)

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

/**
 * 删除文件
 */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath)
    }
  } catch (error) {
    // 文件删除失败记录日志，不抛异常阻断流程
    console.error(`Failed to delete file: ${storagePath}`, error)
  }
}

/**
 * 读取文件
 */
export function readFile(storagePath: string): Buffer {
  return fs.readFileSync(storagePath)
}

/**
 * 检查文件是否存在
 */
export function fileExists(storagePath: string): boolean {
  return fs.existsSync(storagePath)
}

/**
 * 移动文件
 */
export function moveFile(from: string, to: string): void {
  ensureDir(path.dirname(to))
  fs.renameSync(from, to)
}

/**
 * 确保目录存在
 */
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 生成随机文件名
 */
export function generateFilename(ext: string): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 10)
  return `${ts}_${rand}${ext}`
}

/**
 * 获取文件 MIME 类型
 */
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
