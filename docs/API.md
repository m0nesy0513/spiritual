# API\.md

# **文档目的**

本文档用于将《社交媒体焦虑分析工具 PRD（十次修订版）》、ARCHITECTURE\.md 和 DATABASE\.md 转换为前后端接口契约。

本文档的定位是：

- 明确前端与后端之间的数据交互方式；

- 明确账号、鉴权、上传、OCR、AI 分析、历史、反馈、百宝箱、个人笔记、首页内容、用户提议、管理员后台等模块的接口边界；

- 明确用户私人数据隔离、管理员权限、高风险提醒、来源快照、免责声明快照、物理删除、注销匿名化、AI 分析边界等核心规则；

- 为后续开发联调、接口 Mock、任务拆解和测试用例编写提供依据。

本文档不替代 PRD，不反向修改产品需求，不重新审查 PRD，不删减、弱化或重新解释 PRD 中已经确认的产品需求。

PRD 是唯一产品需求来源。ARCHITECTURE\.md 和 DATABASE\.md 仅作为技术架构与数据结构参考。

当某些接口细节 PRD 未明确时，本文档会给出合理默认方案，并明确标记为 **「API 设计建议」**。

---

# **API 设计原则**

## **2\.1 基本原则**

- RESTful 风格优先。

- 请求和响应默认使用 JSON。

- 文件上传使用 `multipart/form-data`。

- 登录后接口必须校验身份。

- 用户私人数据必须按 `user_id` 隔离。

- 管理员接口必须同时校验登录状态和管理员身份。

- 文件访问必须校验归属。

- AI 分析由后端封装，前端不直接调用 AI Provider。

- 错误响应格式统一。

- 第一版不做公开分享接口。

- 第一版不开放第三方 API。

- 第一版面向 V0\.1 朋友内测完整体验版，不设计成大型开放平台。

- 项目运行环境面向中国大陆网络环境，默认使用自建后端 API，不依赖国外 BaaS。

## **2\.2 数据安全原则**

- 所有涉及用户私人数据的接口都必须从登录态中读取当前用户身份，不允许前端传入 `userId` 来决定数据归属。

- 查询历史、分析结果、反馈、笔记、头像、截图、OCR 文本、备注、自定义标签等私人数据时，后端必须校验资源归属。

- 管理员接口不得返回用户私人历史、截图、感受、分析结果、反馈记录、个人笔记、用户标签、备注。

- 普通用户不得访问管理员接口。

- 删除历史记录和注销账号时，必须遵守 PRD 中的物理删除与匿名化规则。

- 结果页 URL 包含历史记录 ID，但该 ID 仅对当前登录用户有效，不构成公开分享链接。

## **2\.3 AI 分析边界**

- 前端不得直接调用 AI Provider。

- 后端负责 OCR 辅助、知识库匹配、AI 调用、结果结构化、风险识别、来源快照、免责声明快照和历史记录保存。

- AI 输出模块必须稳定映射到结果页 13 个模块。

- 免责声明属于系统渲染模块，不由 AI 动态生成。

- 相关百宝箱推荐由后端基于知识条目匹配与排序生成，不作为 AI 直接输出内容。

- 高风险提醒不代表医疗干预、危机干预、心理咨询、心理治疗或医学诊断。

---

# **通用约定**

## **3\.1 Base URL**

```Plain Text
/api
```

示例：

```Plain Text
POST /api/auth/login
GET /api/history
GET /api/analysis/:recordId
```

## **3\.2 请求格式**

### **普通接口**

```HTTP
Content-Type: application/json
```

### **文件上传接口**

```HTTP
Content-Type: multipart/form-data
```

### **请求命名风格**

第一版统一使用 camelCase。

示例：

```JSON
{
  "credentialType": "phone",
  "credentialValue": "13800000000",
  "referenceHistoryEnabled": true
}
```

## **3\.3 响应格式**

### **统一成功格式**

```JSON
{
  "success": true,
  "data": {}
}
```

### **统一失败格式**

```JSON
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误提示",
    "details": {}
  }
}
```

### **说明**

- `success`：布尔值，表示请求是否成功。

- `data`：成功时返回业务数据。

- `error.code`：稳定错误码，供前端判断。

- `error.message`：用户可理解的错误提示。

- `error.details`：参数校验失败、字段错误、调试辅助信息等。

## **3\.4 分页格式**

用于历史、百宝箱、笔记、后台列表。

### **请求参数**

### **响应格式**

```JSON
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100
    }
  }
}
```

### **API 设计建议**

- 第一版默认 `pageSize = 20`。

- 第一版建议最大 `pageSize = 50`。

- 超过最大值时后端自动截断为最大值，或返回 `VALIDATION_ERROR`，具体策略在后续实现中统一。

## **3\.5 鉴权方式**

登录成功后服务端签发登录态。

第一版推荐：

```Plain Text
HttpOnly Cookie + Session
```

也可采用：

```Plain Text
HttpOnly Cookie + JWT
```

规则：

- 前端不得在 `localStorage` 明文保存敏感 token。

- 所有私人数据接口必须校验当前用户。

- 登录态失效时返回 `401 UNAUTHORIZED`。

- 管理员接口必须先校验登录，再校验管理员身份。

- 修改密码、注销账号等敏感操作必须要求当前登录态有效。

## **3\.6 权限错误**

访问非本人历史记录时，前端可重定向至首页，但 API 层必须返回 `403`，不得返回任何历史内容。

---

# **错误码规范**

## **4\.1 参数错误示例**

```JSON
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数错误",
    "details": {
      "username": "用户名不能为空"
    }
  }
}
```

## **4\.2 权限错误示例**

```JSON
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "无权限访问该资源",
    "details": {}
  }
}
```

## **4\.3 AI 分析失败示例**

```JSON
{
  "success": false,
  "error": {
    "code": "AI_ANALYSIS_FAILED",
    "message": "分析失败，请稍后重试",
    "details": {
      "canRetry": true
    }
  }
}
```

---

# **账号与鉴权接口**

## **5\.1 发送验证码**

```HTTP
POST /api/auth/send-code
```

### **用途**

- 注册。

- 找回密码。

- 绑定第二凭证。

### **请求**

```JSON
{
  "targetType": "phone",
  "targetValue": "13800000000",
  "purpose": "register"
}
```

### **字段说明**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "expiresIn": 300,
    "resendAfter": 60
  }
}
```

### **规则**

- 手机号使用短信验证码。

- 邮箱使用邮件验证码。

- 验证码有效期 5 分钟。

- 重发冷却 60 秒。

- 不返回验证码明文。

- 冷却期间重复请求返回 `RATE_LIMITED` 或正常返回剩余冷却时间。

### **可能错误**

---

## **5\.2 注册**

```HTTP
POST /api/auth/register
```

### **请求**

```JSON
{
  "credentialType": "phone",
  "credentialValue": "13800000000",
  "code": "123456",
  "password": "abc12345",
  "username": "小邓",
  "agreedToTermsAndPrivacy": true,
  "confirmedDisclaimer": true
}
```

### **字段说明**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "user": {
      "id": "user_001",
      "username": "小邓",
      "avatarUrl": "/api/files/avatar_default_user_001",
      "isAdmin": false,
      "onboardingCompleted": false,
      "tutorialCompleted": false
    },
    "nextPage": "/onboarding"
  }
}
```

### **规则**

- 用户名必填。

- 用户名最多 20 字。

- 用户名支持中文、英文、数字、下划线。

- 用户名不允许纯空格。

- 用户名不强制唯一。

- 密码至少 8 位，包含字母和数字。

- 注册场景不校验旧密码。

- `agreedToTermsAndPrivacy` 必须为 `true`。

- `confirmedDisclaimer` 必须为 `true`。

- 注册成功后自动登录。

- 新用户跳转首次进入引导页。

- 注册时保存协议与免责声明确认记录。

### **可能错误**

---

## **5\.3 登录**

```HTTP
POST /api/auth/login
```

### **请求**

```JSON
{
  "credentialType": "phone",
  "credentialValue": "13800000000",
  "password": "abc12345"
}
```

### **字段说明**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "user": {
      "id": "user_001",
      "username": "小邓",
      "avatarUrl": "/api/files/avatar_default_user_001",
      "isAdmin": false,
      "onboardingCompleted": true,
      "tutorialCompleted": false
    },
    "nextPage": "/home"
  }
}
```

### **规则**

- 登录成功后写入 HttpOnly Cookie 登录态。

- 未完成首次引导的用户，前端跳转首次进入引导页。

- 已完成首次引导的用户，前端跳转首页。

- 登录失败不得暴露过多账号存在性细节。

### **可能错误**

---

## **5\.4 登出**

```HTTP
POST /api/auth/logout
```

### **请求**

无。

### **响应**

```JSON
{
  "success": true,
  "data": {
    "loggedOut": true
  }
}
```

### **规则**

- 清除服务端 Session 或使 JWT 失效。

- 清除登录 Cookie。

- 登出后前端跳转登录 / 注册入口页。

---

## **5\.5 获取当前用户**

```HTTP
GET /api/auth/me
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "user": {
      "id": "user_001",
      "username": "小邓",
      "avatarUrl": "/api/files/avatar_user_001",
      "isAdmin": false,
      "onboardingCompleted": true,
      "tutorialCompleted": true,
      "preferences": {
        "referenceHistoryDefault": false
      }
    }
  }
}
```

### **返回内容**

- 用户基础信息。

- 是否管理员。

- 是否完成首次引导。

- 是否完成新手教程。

- 偏好设置。

### **可能错误**

---

## **5\.6 找回 / 重置密码：验证凭证**

```HTTP
POST /api/auth/reset-password/verify
```

### **请求**

```JSON
{
  "credentialType": "email",
  "credentialValue": "user@example.com",
  "code": "123456"
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "resetToken": "reset_flow_token",
    "expiresIn": 600
  }
}
```

### **规则**

- 仅支持通过已绑定手机号或邮箱找回。

- 手机号发送短信验证码。

- 邮箱发送邮件验证码。

- 验证码有效期 5 分钟。

- 验证成功后返回短期 `resetToken`。

- `resetToken` 只用于设置新密码，不等同登录态。

### **可能错误**

---

## **5\.7 找回 / 重置密码：设置新密码**

```HTTP
POST /api/auth/reset-password/confirm
```

### **请求**

```JSON
{
  "resetToken": "reset_flow_token",
  "newPassword": "newabc123",
  "confirmPassword": "newabc123"
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "passwordReset": true,
    "nextPage": "/login"
  }
}
```

### **规则**

- 新密码至少 8 位，包含字母和数字。

- `newPassword` 与 `confirmPassword` 必须一致。

- 重置成功后清除找回流程状态。

- 跳转登录页由前端处理。

- 提示用户使用新密码重新登录。

- 重置密码成功后不自动登录。

---

# **用户与我的页面接口**

## **6\.1 获取用户资料**

```HTTP
GET /api/user/profile
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "id": "user_001",
    "username": "小邓",
    "avatarUrl": "/api/files/avatar_user_001",
    "credentials": {
      "phoneBound": true,
      "emailBound": false
    },
    "createdAt": "2026-06-15T12:00:00+08:00"
  }
}
```

### **规则**

- 仅返回当前登录用户资料。

- 不返回密码 Hash、验证码、Session 等敏感信息。

---

## **6\.2 修改用户名**

```HTTP
PATCH /api/user/profile/username
```

### **请求**

```JSON
{
  "username": "新用户名"
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "username": "新用户名"
  }
}
```

### **规则**

- 用户名必填。

- 最多 20 字。

- 支持中文、英文、数字、下划线。

- 不允许纯空格。

- 不强制唯一。

---

## **6\.3 上传 / 修改头像**

```HTTP
POST /api/user/avatar
```

### **请求格式**

```HTTP
Content-Type: multipart/form-data
```

### **表单字段**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "avatarFileId": "file_avatar_001",
    "avatarUrl": "/api/files/file_avatar_001"
  }
}
```

### **规则**

- 支持 JPG / PNG。

- 文件大小上限 2MB。

- 超限返回 `UPLOAD_TOO_LARGE`。

- 格式不支持返回 `UNSUPPORTED_FILE_TYPE`。

- 默认头像由系统根据用户名首字母生成。

- 用户只能访问自己的头像文件。

---

## **6\.4 修改密码**

```HTTP
POST /api/user/password
```

### **请求**

```JSON
{
  "oldPassword": "abc12345",
  "newPassword": "newabc123",
  "confirmPassword": "newabc123"
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "passwordChanged": true
  }
}
```

### **规则**

- 必须校验旧密码。

- 新密码至少 8 位，包含字母和数字。

- `newPassword` 与 `confirmPassword` 必须一致。

- 新密码不能与旧密码相同。

- 修改成功后可保留当前登录态，也可要求重新登录。

### **API 设计建议**

第一版建议修改密码成功后保留当前登录态，同时清除其他设备 Session。

---

## **6\.5 绑定第二凭证**

```HTTP
POST /api/user/credentials/bind
```

### **请求**

```JSON
{
  "credentialType": "email",
  "credentialValue": "user@example.com",
  "code": "123456"
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "credentialType": "email",
    "bound": true
  }
}
```

### **规则**

- 当前用户必须已登录。

- 绑定手机号时使用短信验证码。

- 绑定邮箱时使用邮件验证码。

- 同一凭证不能绑定多个账号。

- 已绑定同类型凭证时是否允许替换，后续交互文档细化。

---

## **6\.6 获取用户偏好**

```HTTP
GET /api/user/preferences
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "referenceHistoryDefault": false,
    "onboardingCompleted": true,
    "tutorialCompleted": true
  }
}
```

---

## **6\.7 修改用户偏好**

```HTTP
PATCH /api/user/preferences
```

### **请求**

```JSON
{
  "referenceHistoryDefault": true,
  "onboardingCompleted": true,
  "tutorialCompleted": true
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "referenceHistoryDefault": true,
    "onboardingCompleted": true,
    "tutorialCompleted": true
  }
}
```

### **字段说明**

### **规则**

- 未传字段保持原值。

- “第一次”状态按账号维度记录，换设备登录后不重复自动展示。

---

## **6\.8 注销账号**

```HTTP
DELETE /api/user/account
```

### **请求**

```JSON
{
  "confirmText": "确认注销"
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "accountDeleted": true,
    "loggedOut": true
  }
}
```

### **规则**

- 必须登录。

- 建议二次确认。

- 注销后退出登录。

- 注销账号必须物理删除用户私人数据。

- 用户提议 / 反馈按 PRD 匿名化规则处理。

- 注销后该用户不能再登录原账号。

### **物理删除范围**

包括但不限于：

- 用户账号基础资料。

- 登录凭证。

- 头像。

- 临时截图。

- 已保存原截图。

- OCR 文本。

- 完整识别文字。

- 分析记录。

- 分析结果。

- 来源快照。

- 免责声明快照。

- 高风险状态。

- 反馈记录。

- 历史备注。

- 用户自定义标签。

- 个人笔记。

- 笔记关联关系。

- 用户偏好设置。

### **匿名化保留范围**

用户提议 / 反馈不作为私人分析数据直接删除，但需按 PRD 匿名化规则处理：

- 解除与用户账号的直接关联。

- 提交人显示为“已注销用户提交”。

- 用户主动填写的联系方式如需保留，必须遵循 PRD 与隐私政策约束。

---

# **文件上传接口**

## **7\.1 上传截图临时文件**

```HTTP
POST /api/files/screenshot-temp
```

### **用途**

- 上传页上传单张截图。

- 用于分析前临时处理。

- 用于 OCR 与 AI 分析输入。

### **请求格式**

```HTTP
Content-Type: multipart/form-data
```

### **表单字段**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "fileId": "file_tmp_001",
    "previewUrl": "/api/files/file_tmp_001",
    "mimeType": "image/png",
    "size": 1024000,
    "width": 1080,
    "height": 1920
  }
}
```

### **规则**

- 仅支持 PNG / JPG / JPEG / WEBP。

- 最大 10MB。

- 第一版仅单图。

- 重新上传为覆盖单图模式，由前端使用新 `fileId` 替换旧 `fileId`。

- 失败返回对应错误码。

- 临时文件仍必须绑定当前用户。

- 未登录用户不可上传。

### **可能错误**

---

## **7\.2 访问文件**

```HTTP
GET /api/files/:fileId
```

### **响应**

返回文件二进制内容。

### **规则**

- 必须校验登录态。

- 必须校验 `owner_user_id`。

- 用户只能访问自己的头像 / 截图。

- 管理员不能通过该接口查看用户私人截图。

- 文件不存在返回 `404`。

- 文件不属于当前用户返回 `403`。

### **API 设计建议**

第一版可直接由后端鉴权后输出文件流。后续如使用对象存储，可改为后端生成短期签名 URL，但签名前仍必须校验文件归属。

---

# **OCR 与图片预览辅助接口**

## **8\.1 图片 OCR 识别**

```HTTP
POST /api/ocr/recognize
```

### **用途**

- OCR 辅助识别截图文字。

- 判断是否需要提示手动补充关键文字。

- 为知识库匹配提供关键词辅助。

- 为 AI 分析提供文字兜底信息。

### **请求**

```JSON
{
  "fileId": "file_tmp_001"
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "text": "识别出的文字",
    "confidence": 0.82,
    "needManualSupplement": false
  }
}
```

### **规则**

- 必须校验文件归属。

- OCR 失败时允许用户手动补充关键文字。

- 手动补充关键文字最多 200 字。

- OCR 不是 AI 分析的唯一依据。

- 第一版 AI 优先基于多模态能力直接分析截图图像，OCR 文字作为辅助输入。

- OCR 低置信度或无法提取有效文字时，前端显示手动补充关键文字输入框。

### **API 设计建议**

可补充返回：

```JSON
{
  "recognizedBlocks": [],
  "lowConfidenceReason": "text_too_blurry"
}
```

但第一版前端只依赖 `text`、`confidence`、`needManualSupplement` 即可。

---

# **AI 分析接口**

## **9\.1 创建分析任务 / 开始分析**

```HTTP
POST /api/analysis
```

### **请求**

```JSON
{
  "screenshotFileId": "file_tmp_001",
  "userFeelingText": "看到这张图有点焦虑，感觉别人过得都很好。",
  "manualText": "朋友圈文案提到了保研、旅行和实习。",
  "anxietyScoreBefore": 8,
  "sourcePlatform": "wechat_moments",
  "referenceHistoryEnabled": false,
  "saveOriginalScreenshot": false,
  "saveFullRecognizedText": false
}
```

### **字段说明**

### **sourcePlatform 枚举**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "recordId": "record_001",
    "resultPageUrl": "/analysis/record_001",
    "riskStatus": "pending"
  }
}
```

### **规则**

- 必须登录。

- 必须校验截图文件归属。

- 后端负责 OCR 辅助结果读取或触发。

- 后端负责知识库匹配。

- 后端负责 AI 调用。

- 后端负责保存历史记录。

- 后端负责保存来源快照与免责声明快照。

- 后端负责写入高风险状态。

- 前端不能直接调用 AI Provider。

- 分析成功后自动创建历史记录。

- 分析失败不创建最终历史记录。

- 分析失败后前端保留已上传截图、感受、焦虑强度、来源平台、手动补充关键文字。

- `saveOriginalScreenshot` 和 `saveFullRecognizedText` 默认均为 `false`。

- 用户主动勾选后才保存原截图和完整识别文字。

- 即使用户不保存完整识别文字，系统仍可保存必要的摘要、关键词和结构化分析结果。

### **同步 / 异步策略**

**API 设计建议：第一版采用同步分析接口，前端展示等待状态，后端设置 60 秒超时。**

同步方案规则：

- 前端请求 `POST /api/analysis`。

- 后端在 60 秒内完成 OCR、知识库匹配、AI 分析、结构化保存。

- 成功后返回 `recordId`。

- 超时返回 `AI_ANALYSIS_FAILED`，前端进入失败状态。

如后续改为异步任务，可增加：

```HTTP
GET /api/analysis/tasks/:taskId
```

第一版不强制实现。

### **可能错误**

---

## **9\.2 获取分析结果**

```HTTP
GET /api/analysis/:recordId
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "recordId": "record_001",
    "createdAt": "2026-06-15T12:00:00+08:00",
    "input": {
      "userFeelingText": "看到这张图有点焦虑，感觉别人过得都很好。",
      "anxietyScoreBefore": 8,
      "sourcePlatform": "wechat_moments",
      "referenceHistoryEnabled": false,
      "hasOriginalScreenshot": false,
      "hasFullRecognizedText": false,
      "screenshotPreviewUrl": null
    },
    "modules": {
      "oneSentenceSummary": "别人的高光不等于你的失败",
      "keywords": ["朋友圈", "比较焦虑", "保研", "精致生活"],
      "screenshotSummary": "截图展示了他人在社交平台上的学习、旅行和生活状态。",
      "personaTypes": {
        "primary": "学霸 / 上岸人设",
        "all": ["学霸 / 上岸人设", "精致生活人设"]
      },
      "anxietyTypes": {
        "primary": "学习 / 成绩 / 上岸焦虑",
        "all": ["学习 / 成绩 / 上岸焦虑", "熟人朋友圈比较焦虑"]
      },
      "packagingAnalysis": "对方展示的是片段化高光，并不代表完整生活。",
      "comparisonTrapAnalysis": "你可能把对方的一段高光和自己的全部现实进行了比较。",
      "whyYouFeelAnxious": "这类内容容易触发对进度、能力和未来不确定性的担心。",
      "cbtAssistance": {
        "methodName": "事实与推测区分",
        "content": "先区分截图中真实可见的信息，以及你额外推断出的结论。"
      },
      "suggestions": [
        "先写下截图里真正可见的事实，不把推测当事实。",
        "把注意力拉回今天能做的一件小事。"
      ],
      "knowledgeRecommendations": [
        {
          "id": "knowledge_001",
          "title": "为什么朋友圈容易制造比较焦虑",
          "categoryName": "焦虑类型解释",
          "summary": "解释熟人动态如何触发比较心理。"
        }
      ],
      "sources": [
        {
          "knowledgeId": "knowledge_001",
          "title": "为什么朋友圈容易制造比较焦虑",
          "categoryName": "焦虑类型解释",
          "summary": "解释熟人动态如何触发比较心理。",
          "reason": "本次分析涉及熟人朋友圈比较焦虑。"
        }
      ],
      "disclaimer": {
        "text": "本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。",
        "snapshotVersion": "2026-06-15"
      }
    },
    "risk": {
      "isHighRisk": true,
      "riskStatus": "pending",
      "triggerReasonSummary": "检测到明显危险表达"
    },
    "feedback": {
      "submitted": false
    },
    "note": {
      "noteText": ""
    },
    "customTags": []
  }
}
```

### **返回必须包含**

- 13 个结果模块所需数据。

- AI 生成模块。

- 系统渲染模块。

- 相关百宝箱推荐。

- 来源 / 参考依据。

- 免责声明快照或当前免责声明，按 PRD 场景区分。

- 高风险提醒状态。

- 保存原截图 / 保存完整识别文字状态。

### **13 个结果模块映射**

### **规则**

- 必须校验 `record.user_id = current_user.id`。

- 非本人记录返回 `403`。

- 刷新结果页时通过该接口恢复结果。

- 不重新触发 AI 分析。

- 所有分析模块都应出现。

- 信息不足时返回“当前信息不足，无法判断”，而不是缺失模块。

- 百宝箱推荐无匹配时返回空数组，前端显示“暂无相关推荐”或“当前无匹配知识条目”。

- 来源 / 参考依据使用分析时快照。

- 免责声明在历史记录中使用分析时保存的免责声明快照。

- 结果页 URL 不构成公开分享链接。

---

## **9\.3 重新分析**

```HTTP
POST /api/analysis/:recordId/reanalyze
```

### **请求**

```JSON
{
  "mode": "overwrite_current",
  "saveOriginalScreenshot": false,
  "saveFullRecognizedText": false
}
```

### **字段说明**

### **响应：覆盖当前记录**

```JSON
{
  "success": true,
  "data": {
    "recordId": "record_001",
    "resultPageUrl": "/analysis/record_001",
    "createdNewRecord": false,
    "riskStatus": "none"
  }
}
```

### **响应：生成新记录**

```JSON
{
  "success": true,
  "data": {
    "recordId": "record_002",
    "sourceRecordId": "record_001",
    "resultPageUrl": "/analysis/record_002",
    "createdNewRecord": true,
    "riskStatus": "pending"
  }
}
```

### **规则**

- 必须校验旧记录归属。

- 仅上传页首次分析结果页且未提交反馈时允许覆盖当前记录。

- 从历史详情页或历史恢复进入结果页时，重新分析统一生成新记录。

- 已提交反馈的记录重新分析生成新记录。

- 新记录复用原截图、原感受、原焦虑强度、原来源平台、原参考历史设置。

- 生成新记录时不覆盖旧记录。

- 覆盖当前记录时保留原历史记录 ID。

- 覆盖当前记录时更新分析结果、来源快照、免责声明快照和高风险状态。

- 覆盖当前记录时保留用户此前对“是否保存原截图”和“是否保存完整识别文字”的选择，不重置为默认值。

### **API 设计建议**

后端不完全信任前端传入的 `mode`。最终是否覆盖或生成新记录，应由后端根据记录来源、反馈状态、访问场景标记综合判断。

---

# **高风险提醒接口**

## **10\.1 获取高风险状态**

```HTTP
GET /api/analysis/:recordId/risk-state
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "isHighRisk": true,
    "riskStatus": "pending",
    "triggerReasonSummary": "检测到明显危险表达"
  }
}
```

### **riskStatus 枚举**

### **规则**

- 必须校验记录归属。

- 高风险状态随历史记录保存。

- 高风险状态随历史记录删除而删除。

- 若 `riskStatus = pending`，前端需要弹出全屏提醒。

---

## **10\.2 处理高风险提醒**

```HTTP
POST /api/analysis/:recordId/risk-state/handle
```

### **请求**

```JSON
{
  "action": "continue_view"
}
```

### **action 可选值**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "riskStatus": "handled",
    "nextPage": "/analysis/record_001"
  }
}
```

### **规则**

- 必须校验记录归属。

- `pending` → `handled`。

- `handled` 后不再重复弹出。

- 未处理时再次打开历史详情仍触发一次。

- 用户选择“返回首页”后，分析结果和历史记录仍保留。

- 该接口不代表医疗干预、危机干预或危机处理。

- 该接口仅记录用户已看过并处理了产品内提醒。

---

# **反馈接口**

## **11\.1 提交分析反馈**

```HTTP
POST /api/analysis/:recordId/feedback
```

### **请求**

```JSON
{
  "feelingAfterOption": "better",
  "usefulnessOption": "useful",
  "anxietyScoreAfter": 4,
  "followupText": "看完之后没那么焦虑了。"
}
```

### **字段说明**

### **feelingAfterOption 枚举**

### **usefulnessOption 枚举**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "submitted": true,
    "recordId": "record_001",
    "nextActions": {
      "homeUrl": "/home",
      "knowledgeUrl": "/knowledge",
      "historyDetailUrl": "/history/record_001"
    }
  }
}
```

### **规则**

- 反馈非强制。

- 提交后更新历史记录。

- 第一版不允许历史详情补交反馈。

- 提交失败保留前端输入。

- 提交前可编辑，提交后不可直接修改。

- 若用户跳过反馈，不影响历史保存。

- 跳过反馈视为放弃本次反馈。

- 后续补充通过历史详情页备注完成。

### **可能错误**

---

## **11\.2 获取反馈**

```HTTP
GET /api/analysis/:recordId/feedback
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "submitted": true,
    "feelingAfterOption": "better",
    "usefulnessOption": "useful",
    "anxietyScoreBefore": 8,
    "anxietyScoreAfter": 4,
    "followupText": "看完之后没那么焦虑了。",
    "submittedAt": "2026-06-15T12:10:00+08:00"
  }
}
```

### **规则**

- 仅本人可访问。

- 未提交反馈时返回：

```JSON
{
  "success": true,
  "data": {
    "submitted": false
  }
}
```

---

# **历史记录接口**

## **12\.1 获取历史列表**

```HTTP
GET /api/history
```

### **查询参数**

### **响应：普通列表**

```JSON
{
  "success": true,
  "data": {
    "items": [
      {
        "recordId": "record_001",
        "createdAt": "2026-06-15T12:00:00+08:00",
        "thumbnailUrl": null,
        "thumbnailPlaceholder": true,
        "primaryPersonaType": "学霸 / 上岸人设",
        "primaryAnxietyType": "学习 / 成绩 / 上岸焦虑",
        "oneSentenceSummary": "别人的高光不等于你的失败",
        "keywords": ["朋友圈", "比较焦虑"],
        "feedbackSummary": {
          "submitted": true,
          "feelingAfterOption": "better",
          "usefulnessOption": "useful"
        },
        "customTags": ["考试"]
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  }
}
```

### **响应：按人设分组**

```JSON
{
  "success": true,
  "data": {
    "groups": [
      {
        "personaType": "学霸 / 上岸人设",
        "items": []
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  }
}
```

### **规则**

- 必须登录。

- 默认最新在前。

- 支持搜索与筛选交集。

- 历史标签筛选指用户自定义标签，不含 AI 关键词和百宝箱标签。

- 未保存原截图时返回统一占位状态。

- 自定义时间范围最长跨度不超过 1 年。

- 分组查看时只展示有历史记录的人设类型分组，不展示空分组。

---

## **12\.2 获取历史详情**

```HTTP
GET /api/history/:recordId
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "recordId": "record_001",
    "createdAt": "2026-06-15T12:00:00+08:00",
    "analysis": {},
    "feedback": {
      "submitted": true
    },
    "note": {
      "noteText": "我的补充想法"
    },
    "customTags": ["考试", "朋友圈"],
    "sourceSnapshots": [],
    "disclaimerSnapshot": {
      "text": "本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。"
    },
    "risk": {
      "isHighRisk": true,
      "riskStatus": "pending",
      "triggerReasonSummary": "检测到明显危险表达"
    }
  }
}
```

### **规则**

- 必须校验 `user_id`。

- 非本人返回 `403`。

- 返回完整分析、反馈、备注、标签、来源快照、免责声明快照。

- 如果高风险状态为 `pending`，前端需要弹出提醒。

- 历史详情页图片预览仅支持查看大图和关闭，不支持重新上传。

- 历史详情页不允许补交反馈。

- 历史详情页可编辑备注和自定义标签。

---

## **12\.3 删除历史记录**

```HTTP
DELETE /api/history/:recordId
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

### **规则**

- 必须校验记录归属。

- 物理删除历史相关私人数据。

- 删除截图、识别文字、分析结果、反馈、备注、标签关联、来源快照、免责声明快照、高风险状态。

- 不删除个人笔记。

- 如果笔记关联该历史记录，需要解除笔记关联，并显示“关联来源已删除”。

- 删除后该 `recordId` 再访问返回 `404`。

---

## **12\.4 更新历史备注**

```HTTP
PATCH /api/history/:recordId/note
```

### **请求**

```JSON
{
  "noteText": "这是我自己的补充想法。"
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "noteText": "这是我自己的补充想法。",
    "updatedAt": "2026-06-15T12:20:00+08:00"
  }
}
```

### **规则**

- 必须校验记录归属。

- 最多 500 字。

- 不覆盖 AI 原文。

- UI 上应分为 AI 结论区和用户备注区。

---

## **12\.5 更新历史自定义标签**

```HTTP
PUT /api/history/:recordId/tags
```

### **请求**

```JSON
{
  "tags": ["考试", "朋友圈"]
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "tags": ["考试", "朋友圈"]
  }
}
```

### **规则**

- 必须校验记录归属。

- 最多 5 个。

- 单个最多 10 字。

- 用户自定义标签与 AI 关键词分开。

- 传入新标签数组会覆盖该记录原有自定义标签。

---

# **百宝箱接口**

## **13\.1 获取百宝箱列表**

```HTTP
GET /api/knowledge
```

### **查询参数**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "knowledge_001",
        "title": "为什么朋友圈容易制造比较焦虑",
        "category": {
          "id": "cat_001",
          "name": "焦虑类型解释"
        },
        "tags": ["朋友圈", "比较焦虑"],
        "summary": "解释熟人动态如何触发比较心理。",
        "updatedAt": "2026-06-15T12:00:00+08:00"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  }
}
```

### **规则**

- 只返回已启用内容。

- 默认按更新时间倒序。

- 支持分类、标签、搜索。

- 百宝箱正文支持 Markdown 子集。

- 不返回停用内容。

---

## **13\.2 获取百宝箱详情**

```HTTP
GET /api/knowledge/:id
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "id": "knowledge_001",
    "title": "为什么朋友圈容易制造比较焦虑",
    "category": {
      "id": "cat_001",
      "name": "焦虑类型解释"
    },
    "tags": ["朋友圈", "比较焦虑"],
    "body": "正文 Markdown 内容",
    "applicableScene": "适合熟人朋友圈比较焦虑场景",
    "sourceNote": "内容依据或备注",
    "updatedAt": "2026-06-15T12:00:00+08:00"
  }
}
```

### **规则**

- 只展示已启用内容。

- 停用内容普通用户不可访问。

- 不支持图片和视频内容。

---

## **13\.3 获取百宝箱分类**

```HTTP
GET /api/knowledge/categories
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cat_001",
        "name": "焦虑类型解释",
        "sortOrder": 1
      }
    ]
  }
}
```

### **规则**

- 只返回启用分类。

- 前端可用于横向滚动分类标签栏。

---

## **13\.4 获取百宝箱首页推荐**

```HTTP
GET /api/knowledge/home-recommendations
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "knowledge_001",
        "title": "为什么朋友圈容易制造比较焦虑",
        "categoryName": "焦虑类型解释",
        "summary": "解释熟人动态如何触发比较心理。"
      }
    ]
  }
}
```

### **规则**

- 管理员推荐 3\-5 条置顶内容。

- 无手动推荐时按更新时间取前 5 条。

- 内容列表前端渲染去重，数据库查询不排除。

- 只返回已启用内容。

---

# **个人笔记接口**

## **14\.1 获取笔记列表**

```HTTP
GET /api/notes
```

### **查询参数**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "items": [
      {
        "noteId": "note_001",
        "title": "今天的想法",
        "bodyPreview": "看完分析后，我发现自己是在和别人的高光比较。",
        "tags": ["反思"],
        "sourceRelations": [
          {
            "targetType": "history",
            "targetId": "record_001",
            "titleSnapshot": "别人的高光不等于你的失败",
            "deleted": false
          }
        ],
        "createdAt": "2026-06-15T12:00:00+08:00",
        "updatedAt": "2026-06-15T12:10:00+08:00"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  }
}
```

### **规则**

- 必须登录。

- 只返回当前用户笔记。

- 支持关键词搜索。

- 支持标签筛选。

---

## **14\.2 新建笔记**

```HTTP
POST /api/notes
```

### **请求**

```JSON
{
  "title": "今天的想法",
  "body": "看完分析后，我发现自己是在和别人的高光比较。",
  "tags": ["反思"],
  "sourceRelations": [
    {
      "targetType": "history",
      "targetId": "record_001"
    },
    {
      "targetType": "knowledge",
      "targetId": "knowledge_001"
    }
  ]
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "noteId": "note_001"
  }
}
```

### **规则**

- 标题最多 60 字。

- 正文最多 5000 字。

- 标签最多 5 个，单个 10 字。

- 可关联历史记录或百宝箱内容。

- 关联关系保存目标 ID \+ 标题快照 \+ 目标类型。

- 关联历史记录时必须校验该历史属于当前用户。

- 关联百宝箱时必须校验该知识条目已启用。

- 删除历史记录后不删除笔记，只解除关联并显示“关联来源已删除”。

---

## **14\.3 获取笔记详情**

```HTTP
GET /api/notes/:noteId
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "noteId": "note_001",
    "title": "今天的想法",
    "body": "看完分析后，我发现自己是在和别人的高光比较。",
    "tags": ["反思"],
    "sourceRelations": [
      {
        "targetType": "history",
        "targetId": "record_001",
        "titleSnapshot": "别人的高光不等于你的失败",
        "deleted": false
      }
    ],
    "createdAt": "2026-06-15T12:00:00+08:00",
    "updatedAt": "2026-06-15T12:10:00+08:00"
  }
}
```

### **规则**

- 必须校验笔记归属。

- 非本人笔记返回 `403`。

---

## **14\.4 更新笔记**

```HTTP
PATCH /api/notes/:noteId
```

### **请求**

```JSON
{
  "title": "新的标题",
  "body": "新的正文",
  "tags": ["反思", "焦虑"],
  "sourceRelations": [
    {
      "targetType": "knowledge",
      "targetId": "knowledge_001"
    }
  ]
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "noteId": "note_001",
    "updatedAt": "2026-06-15T12:20:00+08:00"
  }
}
```

### **规则**

- 必须校验笔记归属。

- 未传字段保持原值。

- 若传入 `sourceRelations`，则覆盖原有关联关系。

- 关联历史记录时校验归属。

- 关联百宝箱时校验启用状态。

---

## **14\.5 删除笔记**

```HTTP
DELETE /api/notes/:noteId
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

### **规则**

- 必须校验笔记归属。

- 只删除笔记本身。

- 不影响历史和百宝箱。

- 删除笔记时删除笔记标签关联和来源关联关系。

---

## **14\.6 搜索关联来源**

```HTTP
GET /api/notes/source-search
```

### **查询参数**

### **搜索范围**

- 历史记录一句话摘要。

- 百宝箱标题。

### **响应**

```JSON
{
  "success": true,
  "data": {
    "history": [
      {
        "targetType": "history",
        "targetId": "record_001",
        "title": "别人的高光不等于你的失败",
        "createdAt": "2026-06-15T12:00:00+08:00"
      }
    ],
    "knowledge": [
      {
        "targetType": "knowledge",
        "targetId": "knowledge_001",
        "title": "为什么朋友圈容易制造比较焦虑",
        "categoryName": "焦虑类型解释"
      }
    ]
  }
}
```

### **规则**

- 历史记录只搜索当前用户数据。

- 百宝箱只搜索已启用内容。

- 返回结果用于笔记关联选择。

---

# **首页内容接口**

## **15\.1 获取首页内容**

```HTTP
GET /api/home
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "greeting": {
      "text": "今天想聊聊哪条截图？"
    },
    "quote": {
      "text": "慢慢来也是一种前进。",
      "author": "系统推荐",
      "placeholder": false
    },
    "song": {
      "title": "示例歌曲",
      "artist": "示例歌手",
      "reason": "适合放松时听",
      "suitableMood": "焦虑时",
      "placeholder": false
    },
    "userState": {
      "isLoggedIn": true,
      "onboardingCompleted": true,
      "tutorialCompleted": true,
      "hasHistory": true
    }
  }
}
```

### **返回内容**

- 轻柔情绪问候。

- 名言。

- 好歌推荐。

- 当前用户必要状态。

### **规则**

- 必须登录。

- 好歌只展示，不播放、不跳转。

- 名言未配置时返回占位状态。

- 好歌未配置时返回占位状态。

- 首页默认展示 1 首好歌。

- 首页每次展示 1 条名言。

- 轻柔情绪问候第一版使用固定文案，可由管理员后台维护。

---

## **15\.2 首页统一搜索**

```HTTP
GET /api/search
```

### **查询参数**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "history": {
      "items": [
        {
          "recordId": "record_001",
          "title": "别人的高光不等于你的失败",
          "createdAt": "2026-06-15T12:00:00+08:00"
        }
      ],
      "hasMore": true
    },
    "knowledge": {
      "items": [
        {
          "id": "knowledge_001",
          "title": "为什么朋友圈容易制造比较焦虑",
          "categoryName": "焦虑类型解释"
        }
      ],
      "hasMore": false
    },
    "notes": {
      "items": [
        {
          "noteId": "note_001",
          "title": "今天的想法",
          "updatedAt": "2026-06-15T12:10:00+08:00"
        }
      ],
      "hasMore": false
    }
  }
}
```

### **规则**

- 必须登录。

- 返回分组：`history`、`knowledge`、`notes`。

- 每组默认前 5 条。

- 支持查看更多跳转对应模块局部搜索。

- 历史和笔记只搜索当前用户数据。

- 百宝箱只搜索已启用内容。

---

# **用户提议 / 反馈接口**

## **16\.1 提交用户提议 / 反馈**

```HTTP
POST /api/suggestions
```

### **请求**

```JSON
{
  "suggestionType": "bug_feedback",
  "content": "上传失败时提示可以更清楚一点。",
  "contactText": "可以通过微信联系我"
}
```

### **suggestionType 枚举**

### **字段说明**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "suggestionId": "suggestion_001",
    "submitted": true
  }
}
```

### **规则**

- 第一版仅文字，不支持附件。

- 联系方式可选，最多 100 字。

- 提交后用户不能查看处理状态。

- 管理员后台可查看和修改处理状态。

- 用户注销后，提议按匿名化规则处理，显示“已注销用户提交”。

---

# **管理员接口总规则**

管理员接口统一前缀：

```Plain Text
/api/admin
```

所有管理员接口必须：

- 校验登录。

- 校验管理员身份。

- 非管理员返回 `403`。

- 不允许返回用户私人历史。

- 不允许返回用户截图。

- 不允许返回用户感受。

- 不允许返回用户分析结果。

- 不允许返回用户反馈记录。

- 不允许返回个人笔记。

- 不允许返回用户标签。

- 不允许返回历史备注。

管理员后台第一版只管理公共内容与用户主动提交的提议 / 反馈。

---

# **管理员：百宝箱管理接口**

## **18\.1 获取知识条目列表**

```HTTP
GET /api/admin/knowledge
```

### **查询参数**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "knowledge_001",
        "title": "为什么朋友圈容易制造比较焦虑",
        "categoryId": "cat_001",
        "categoryName": "焦虑类型解释",
        "tags": ["朋友圈", "比较焦虑"],
        "isEnabled": true,
        "isHomeRecommended": true,
        "updatedAt": "2026-06-15T12:00:00+08:00"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  }
}
```

### **规则**

- 管理员可查看启用和停用内容。

- 不返回用户私人数据。

---

## **18\.2 新建知识条目**

```HTTP
POST /api/admin/knowledge
```

### **请求**

```JSON
{
  "title": "为什么朋友圈容易制造比较焦虑",
  "categoryId": "cat_001",
  "tags": ["朋友圈", "比较焦虑"],
  "body": "正文 Markdown 内容",
  "applicableScene": "适合熟人朋友圈比较焦虑场景",
  "sourceNote": "内容依据或备注",
  "isEnabled": true,
  "isHomeRecommended": false
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "id": "knowledge_001"
  }
}
```

### **规则**

- 标题最多 60 字。

- 正文最多 5000 字。

- 正文支持 Markdown 子集：标题、列表、加粗、链接。

- 正文不支持图片和视频。

- 适用场景最多 200 字。

- 来源说明最多 200 字。

- 标签最多 5 个。

- 单个标签最多 10 字。

- 启用后才可展示和被 AI 引用。

- 推荐 / 置顶到百宝箱首页开关只对已启用内容生效。

- 未启用内容不展示、不被 AI 引用。

---

## **18\.3 更新知识条目**

```HTTP
PATCH /api/admin/knowledge/:id
```

### **请求**

```JSON
{
  "title": "更新后的标题",
  "categoryId": "cat_001",
  "tags": ["朋友圈"],
  "body": "更新后的正文",
  "applicableScene": "更新后的适用场景",
  "sourceNote": "更新后的来源说明",
  "isEnabled": true,
  "isHomeRecommended": true
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "id": "knowledge_001",
    "updatedAt": "2026-06-15T12:30:00+08:00"
  }
}
```

### **规则**

- 未传字段保持原值。

- 若 `isEnabled = false`，则普通用户不可访问，该条也不可被 AI 引用。

- 若 `isEnabled = false`，`isHomeRecommended` 应自动置为 `false` 或推荐不生效。

---

## **18\.4 启用 / 停用知识条目**

```HTTP
PATCH /api/admin/knowledge/:id/status
```

### **请求**

```JSON
{
  "isEnabled": false
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "id": "knowledge_001",
    "isEnabled": false,
    "isHomeRecommended": false
  }
}
```

### **规则**

- 停用后不展示。

- 停用后不被 AI 引用。

- 停用后首页推荐不生效。

- 历史记录中的来源快照不受影响，仍保留分析当时的来源信息。

---

## **18\.5 管理知识分类**

### **获取分类**

```HTTP
GET /api/admin/knowledge/categories
```

### **新建分类**

```HTTP
POST /api/admin/knowledge/categories
```

### **更新分类**

```HTTP
PATCH /api/admin/knowledge/categories/:id
```

### **新建 / 更新请求示例**

```JSON
{
  "name": "焦虑类型解释",
  "sortOrder": 1,
  "isEnabled": true
}
```

### **规则**

- 分类名称必填。

- 分类用于百宝箱筛选和知识条目归类。

- 停用分类后，该分类下内容是否自动停用，由后续实现细化。

---

# **管理员：首页内容管理接口**

## **19\.1 名言管理**

### **获取名言列表**

```HTTP
GET /api/admin/home/quotes
```

### **新建名言**

```HTTP
POST /api/admin/home/quotes
```

### **更新名言**

```HTTP
PATCH /api/admin/home/quotes/:id
```

### **删除名言**

```HTTP
DELETE /api/admin/home/quotes/:id
```

### **新建 / 更新请求示例**

```JSON
{
  "text": "慢慢来也是一种前进。",
  "author": "系统推荐",
  "isEnabled": true
}
```

### **规则**

- 正文 ≤ 50 字。

- 支持启用 / 停用。

- 首页每次展示 1 条启用名言。

- 未配置或全部停用时，首页返回占位状态。

- 后台库第一版至少配置 10 条名言。

---

## **19\.2 好歌管理**

### **获取好歌列表**

```HTTP
GET /api/admin/home/songs
```

### **新建好歌**

```HTTP
POST /api/admin/home/songs
```

### **更新好歌**

```HTTP
PATCH /api/admin/home/songs/:id
```

### **删除好歌**

```HTTP
DELETE /api/admin/home/songs/:id
```

### **新建 / 更新请求示例**

```JSON
{
  "title": "示例歌曲",
  "artist": "示例歌手",
  "reason": "适合放松时听",
  "suitableMood": "焦虑时",
  "isEnabled": true
}
```

### **规则**

- 推荐理由 ≤ 50 字。

- 好歌只展示，不播放、不跳转。

- 首页默认展示 1 首启用好歌。

- 未配置或全部停用时，首页返回占位状态。

---

# **管理员：用户提议 / 反馈管理接口**

## **20\.1 获取用户提议列表**

```HTTP
GET /api/admin/suggestions
```

### **查询参数**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "suggestion_001",
        "suggestionType": "bug_feedback",
        "content": "上传失败时提示可以更清楚一点。",
        "contactText": "可以通过微信联系我",
        "status": "pending",
        "submitter": {
          "type": "registered_user",
          "displayName": "小邓"
        },
        "createdAt": "2026-06-15T12:00:00+08:00"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  }
}
```

### **规则**

- 管理员可看用户主动填写的联系方式。

- 注销用户显示“已注销用户提交”。

- 不返回该用户私人历史、分析、笔记、截图等信息。

---

## **20\.2 修改处理状态**

```HTTP
PATCH /api/admin/suggestions/:id/status
```

### **请求**

```JSON
{
  "status": "processing"
}
```

### **状态枚举**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "id": "suggestion_001",
    "status": "processing"
  }
}
```

### **规则**

- 只能修改处理状态。

- 第一版用户不能查看处理状态。

- 该接口不向用户发送通知。

---

# **管理员：系统文案设置接口**

## **21\.1 获取系统文案**

```HTTP
GET /api/admin/contents
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "items": [
      {
        "contentType": "disclaimer",
        "title": "免责声明",
        "body": "本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。",
        "updatedAt": "2026-06-15T12:00:00+08:00"
      }
    ]
  }
}
```

---

## **21\.2 更新系统文案**

```HTTP
PATCH /api/admin/contents/:contentType
```

### **contentType 至少包括**

### **请求**

```JSON
{
  "title": "免责声明",
  "body": "本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。",
  "isEnabled": true
}
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "contentType": "disclaimer",
    "updatedAt": "2026-06-15T12:30:00+08:00"
  }
}
```

### **规则**

- 免责声明核心条款不可删除。

- 免责声明必须包含“不替代医疗 / 心理咨询 / 心理治疗 / 诊断”等核心含义。

- 用户协议和隐私政策第一版为静态页面，代码维护，不通过后台接口修改。

- 产品说明和免责声明可由 `admin_contents` 提供。

- Coming Soon 文案可由 `admin_contents` 提供。

---

# **合规与说明静态页接口**

如果采用纯静态页面，以下页面不需要 API：

- 用户协议页。

- 隐私政策页。

- 免责声明页。

- 产品说明页。

## **22\.1 规则**

- 用户协议和隐私政策第一版代码维护。

- 免责声明和产品说明可由 `admin_contents` 提供。

- 注册时必须确认用户协议、隐私政策和免责声明。

- 每次分析结果页必须展示免责声明。

- 结果页使用系统渲染的免责声明模块，不依赖 AI 动态生成。

## **22\.2 可选接口：获取免责声明**

```HTTP
GET /api/contents/disclaimer
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "title": "免责声明",
    "body": "本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。",
    "version": "2026-06-15"
  }
}
```

## **22\.3 可选接口：获取产品说明**

```HTTP
GET /api/contents/product-intro
```

### **响应**

```JSON
{
  "success": true,
  "data": {
    "title": "产品说明",
    "body": "产品说明正文",
    "version": "2026-06-15"
  }
}
```

---

# **Coming Soon 接口**

第一版以下功能为占位入口：

- 情绪疏导室。

- 长期复盘。

- 成就墙。

- 焦虑档案。

## **23\.1 说明**

第一版可使用静态页面或 `admin_contents` 中的 Coming Soon 文案，不需要复杂 API。

## **23\.2 可选接口：获取 Coming Soon 文案**

```HTTP
GET /api/contents/coming-soon
```

### **查询参数**

### **响应**

```JSON
{
  "success": true,
  "data": {
    "title": "功能正在准备中",
    "body": "这个功能还在内测中继续优化。",
    "feature": "emotion_room"
  }
}
```

### **规则**

- 不需要为占位功能设计完整业务 API。

- 不生成完整情绪疏导室、长期复盘、成就墙、焦虑档案接口。

---

# **接口权限矩阵**

说明：

- 管理员作为用户时，仍只能访问自己的私人数据。

- 管理员身份不赋予查看其他用户私人截图、历史、分析、反馈、笔记、标签、备注的权限。

- 管理员后台仅管理公共内容和用户主动提交的提议 / 反馈。

---

# **关键业务接口时序**

## **25\.1 注册并进入首次引导**

```Plain Text
用户填写手机号/邮箱
→ POST /api/auth/send-code
→ 用户填写验证码、密码、用户名、勾选协议/隐私政策、确认免责声明
→ POST /api/auth/register
→ 后端创建账号并写入登录态
→ 返回 onboardingCompleted = false
→ 前端跳转首次进入引导页
→ 用户点击继续或跳过
→ PATCH /api/user/preferences
→ 前端进入首页
→ 第一次进入首页弹出新手教程遮罩
```

---

## **25\.2 上传截图并生成分析结果**

```Plain Text
用户点击中间相机按钮
→ 进入上传截图页
→ POST /api/files/screenshot-temp
→ 后端保存临时截图并绑定 owner_user_id
→ POST /api/ocr/recognize
→ 后端返回 OCR 文本、置信度、是否需要手动补充
→ 用户填写可选感受、焦虑强度、来源平台、参考历史开关
→ 用户点击开始分析
→ POST /api/analysis
→ 后端校验截图归属
→ 后端读取 OCR / 手动补充文字
→ 后端匹配已启用知识条目
→ 后端调用 AI Provider
→ 后端结构化 13 个结果模块
→ 后端生成相关百宝箱推荐
→ 后端保存来源快照
→ 后端保存免责声明快照
→ 后端识别并保存高风险状态
→ 后端自动创建历史记录
→ 返回 recordId 和 resultPageUrl
→ 前端进入分析结果页
→ GET /api/analysis/:recordId
```

---

## **25\.3 高风险分析结果处理**

```Plain Text
POST /api/analysis 分析完成
→ 后端判断存在高风险信号
→ 历史记录写入 isHighRisk = true
→ riskStatus = pending
→ 前端进入结果页
→ GET /api/analysis/:recordId
→ 前端发现 riskStatus = pending
→ 弹出全屏高风险提醒
→ 用户选择“继续查看”
→ POST /api/analysis/:recordId/risk-state/handle action = continue_view
→ 后端更新 riskStatus = handled
→ 前端移除弹层并展示结果
```

或：

```Plain Text
用户选择“返回首页”
→ POST /api/analysis/:recordId/risk-state/handle action = return_home
→ 后端更新 riskStatus = handled
→ 前端返回首页
→ 分析结果和历史记录仍保留
```

---

## **25\.4 提交反馈并查看历史**

```Plain Text
用户在结果页点击进入反馈页
→ 用户填写“有没有好一点”“有没有用”“分析后焦虑强度”“后续感受”
→ POST /api/analysis/:recordId/feedback
→ 后端校验记录归属
→ 后端写入反馈并更新历史记录
→ 前端展示反馈完成状态
→ 用户点击查看历史
→ GET /api/history/:recordId
→ 前端展示历史详情
```

---

## **25\.5 从历史详情重新分析**

```Plain Text
用户进入历史详情页
→ GET /api/history/:recordId
→ 用户点击“基于这条记录重新分析”
→ POST /api/analysis/:recordId/reanalyze
→ 后端校验记录归属
→ 后端判断来源为历史详情
→ 后端复用原截图、原感受、原焦虑强度、原来源平台、原参考历史设置
→ 后端重新匹配知识、调用 AI、生成结果
→ 后端创建新历史记录
→ 返回新 recordId
→ 前端跳转新分析结果页
```

规则：

- 历史详情重新分析不覆盖旧记录。

- 已提交反馈的记录重新分析不覆盖旧记录。

- 只有上传页首次分析结果页且未提交反馈时，才允许覆盖当前记录。

---

## **25\.6 注销账号**

```Plain Text
用户进入我的页面
→ 点击注销账号
→ 前端展示二次确认
→ DELETE /api/user/account
→ 后端校验登录态
→ 后端物理删除用户私人数据
→ 后端匿名化用户提议 / 反馈
→ 后端清除登录态
→ 返回 accountDeleted = true
→ 前端跳转登录 / 注册入口页
```

物理删除范围：

```Plain Text
账号资料
→ 登录凭证
→ 头像
→ 截图
→ OCR 文本
→ 完整识别文字
→ 分析结果
→ 历史记录
→ 来源快照
→ 免责声明快照
→ 高风险状态
→ 反馈
→ 备注
→ 自定义标签
→ 个人笔记
→ 笔记关联
→ 用户偏好
```

---

# **暂不提供的接口**

第一版不提供：

- 公开分享接口。

- 社区接口。

- 私信接口。

- 用户互相关注接口。

- 小程序专用接口。

- App 专用接口。

- 真人咨询接口。

- 医疗诊断接口。

- 实时多设备同步接口。

- 完整长期复盘接口。

- 完整情绪疏导室接口。

- 社交媒体自动抓取接口。

- 多图分析接口。

- 视频分析接口。

- PDF 分析接口。

- 导出接口。

- 下载接口。

- 收藏接口。

- 用户贡献百宝箱内容接口。

- 第三方开放 API。

---

# **后续待细化内容**

后续结合技术实现再细化：

- 同步分析还是异步任务分析。

- OCR 服务具体返回字段。

- AI Provider 错误重试策略。

- AI Provider 超时策略。

- AI 输出 JSON Schema 的严格校验规则。

- 文件存储签名访问方式。

- 临时文件清理策略。

- 分页最大 `pageSize`。

- 管理员后台是否需要操作日志。

- 是否记录搜索日志。

- 是否增加请求频率限制。

- 验证码服务商选型。

- 短信 / 邮件发送失败降级策略。

- 修改密码后是否清除其他设备登录态。

- 绑定第二凭证时是否允许替换已有凭证。

- 停用知识分类后其下知识条目的处理方式。

- 高风险判断的 AI 提示词与后端规则兜底策略。

- 历史重新分析时原截图不存在的兜底处理。

- 用户注销后用户提议联系方式的保留与脱敏细则。

---

# **API 设计结论**

本 API 设计支持《社交媒体焦虑分析工具 PRD（十次修订版）》中的 V0\.1 朋友内测完整体验版。

本版 API 的核心重点是：

- 账号安全；

- 登录态与用户数据隔离；

- 单张截图上传与预览；

- OCR 辅助识别；

- 后端封装 AI 分析；

- 知识库匹配与来源快照；

- 13 个结果模块稳定返回；

- 免责声明系统渲染与快照保存；

- 高风险提醒三态处理；

- 分析成功自动生成历史；

- 反馈提交与历史更新；

- 历史搜索、筛选、删除；

- 个人笔记增删改查与来源关联；

- 百宝箱内容展示；

- 首页轻柔内容；

- 用户提议 / 反馈；

- 管理员后台权限控制；

- 物理删除与注销匿名化规则。

后续可继续生成：

- `TASKS.md`

- `INTERACTION_SPEC.md`

- `TEST_CASES.md`

