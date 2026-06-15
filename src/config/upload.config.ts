import { appConfig } from './app.config'

export const uploadConfig = {
  maxSizeBytes: appConfig.upload.maxSizeMB * 1024 * 1024,
  allowedMimeTypes: appConfig.upload.allowedImageTypes,
  allowedExtensions: appConfig.upload.allowedExtensions,

  /** 上传目录路径（相对于项目根目录） */
  baseDir: appConfig.upload.uploadDir,

  /** 各子目录 */
  dirs: {
    tmp: 'uploads/tmp',
    users: 'uploads/users',
    avatars: 'uploads/avatars',
    analysis: 'uploads/analysis',
  },

  /** 头像限制 */
  avatar: {
    maxSizeMB: 2,
    allowedTypes: ['image/jpeg', 'image/png'],
  },

  /** 截图限制 */
  screenshot: {
    maxCount: 1, // 仅支持单张
    maxSizeMB: appConfig.upload.maxSizeMB,
  },
} as const
