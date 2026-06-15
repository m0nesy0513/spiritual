-- ============================================
-- 社交媒体焦虑分析工具 — 数据库建表脚本
-- 数据库: MariaDB / MySQL
-- 字符集: utf8mb4
-- 引擎: InnoDB
-- ============================================

CREATE DATABASE IF NOT EXISTS spiritualrefuge
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE spiritualrefuge;

-- ============================================
-- 用户与账号
-- ============================================

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(20) NOT NULL COMMENT '展示名，可重复，支持中文/英文/数字/下划线',
  avatar_file_id BIGINT UNSIGNED NULL COMMENT '头像文件 ID -> file_assets',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_credentials (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  credential_type ENUM('phone','email') NOT NULL,
  credential_value VARCHAR(255) NOT NULL COMMENT '规范化后的手机号或邮箱',
  password_hash VARCHAR(255) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否为主凭证',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_credential (credential_type, credential_value),
  INDEX idx_user_id (user_id),
  CONSTRAINT fk_credential_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE verification_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  target_type ENUM('phone','email') NOT NULL,
  target_value VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  purpose ENUM('register','reset_password','bind_credential') NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_target_purpose (target_value, purpose, created_at),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_preferences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  reference_history_default BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pref_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  bio VARCHAR(200) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_compliance_confirmations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  confirmation_type ENUM('terms_and_privacy','disclaimer') NOT NULL,
  content_version VARCHAR(50) NULL COMMENT '确认时的文案版本',
  confirmed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_confirmed (user_id, confirmation_type),
  CONSTRAINT fk_compliance_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 文件与附件
-- ============================================

CREATE TABLE file_assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  file_type ENUM('avatar','screenshot','ocr_text','other') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  storage_type ENUM('local','oss') NOT NULL DEFAULT 'local',
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_owner (owner_user_id),
  INDEX idx_type (file_type),
  CONSTRAINT fk_file_user FOREIGN KEY (owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 分析历史主表
-- ============================================

CREATE TABLE analysis_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  record_public_id VARCHAR(32) NOT NULL UNIQUE COMMENT '对外 ID，URL 中使用',
  parent_record_id BIGINT UNSIGNED NULL COMMENT '重新分析时的来源记录 ID',
  user_feeling_text TEXT NULL COMMENT '用户感受，最多 500 字',
  anxiety_score_before TINYINT UNSIGNED NULL COMMENT '分析前焦虑强度 0-10',
  anxiety_score_after TINYINT UNSIGNED NULL COMMENT '分析后焦虑强度 0-10',
  source_platform ENUM('wechat_moments','xiaohongshu','weibo','douyin','bilibili','other') NULL,
  reference_history_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  manual_text VARCHAR(200) NULL COMMENT '手动补充关键文字',
  ocr_full_text TEXT NULL COMMENT '完整 OCR 识别文字（用户勾选保存后才有值）',
  screenshot_file_id BIGINT UNSIGNED NULL COMMENT '用户勾选保存后的截图 -> file_assets',
  save_original_screenshot BOOLEAN NOT NULL DEFAULT FALSE,
  save_full_recognized_text BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_time (user_id, created_at DESC),
  INDEX idx_public_id (record_public_id),
  INDEX idx_parent (parent_record_id),
  CONSTRAINT fk_record_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_record_screenshot FOREIGN KEY (screenshot_file_id) REFERENCES file_assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- AI 分析结果
-- ============================================

CREATE TABLE analysis_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL UNIQUE,
  one_sentence_summary VARCHAR(30) NULL,
  screenshot_summary TEXT NULL COMMENT '截图内容概括，最多 100 字',
  packaging_analysis TEXT NULL,
  comparison_trap_analysis TEXT NULL,
  why_you_feel_anxious TEXT NULL,
  cbt_method_name VARCHAR(100) NULL,
  cbt_content TEXT NULL,
  suggestions JSON NULL COMMENT '1-5 条具体建议',
  raw_ai_response_json JSON NULL COMMENT '原始 AI 响应，开发排查用',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_result_record FOREIGN KEY (record_id) REFERENCES analysis_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI 关键词
CREATE TABLE analysis_keywords (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL,
  keyword VARCHAR(50) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_record (record_id),
  CONSTRAINT fk_kw_record FOREIGN KEY (record_id) REFERENCES analysis_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI 人设标签
CREATE TABLE analysis_persona_tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL,
  tag_name VARCHAR(50) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_record (record_id),
  CONSTRAINT fk_pt_record FOREIGN KEY (record_id) REFERENCES analysis_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI 焦虑类型标签
CREATE TABLE analysis_anxiety_tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL,
  tag_name VARCHAR(50) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_record (record_id),
  CONSTRAINT fk_at_record FOREIGN KEY (record_id) REFERENCES analysis_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 来源快照与免责声明快照
-- ============================================

CREATE TABLE analysis_sources_snapshot (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL,
  knowledge_item_id BIGINT UNSIGNED NULL COMMENT '可能为 NULL（0 匹配时）',
  title_snapshot VARCHAR(60) NOT NULL,
  category_name_snapshot VARCHAR(50) NULL,
  summary_snapshot TEXT NULL,
  reason_snapshot VARCHAR(50) NULL COMMENT '为什么用于本次分析',
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_record (record_id),
  CONSTRAINT fk_ss_record FOREIGN KEY (record_id) REFERENCES analysis_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE analysis_disclaimer_snapshots (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL UNIQUE,
  disclaimer_text TEXT NOT NULL,
  snapshot_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ds_record FOREIGN KEY (record_id) REFERENCES analysis_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 分析反馈
-- ============================================

CREATE TABLE analysis_feedbacks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  feeling_after_option ENUM('much_better','better','no_change','worse') NULL,
  usefulness_option ENUM('very_useful','useful','average','not_useful') NULL,
  anxiety_score_after TINYINT UNSIGNED NULL,
  followup_text TEXT NULL COMMENT '后续感受，最多 500 字',
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  CONSTRAINT fk_fb_record FOREIGN KEY (record_id) REFERENCES analysis_records(id) ON DELETE CASCADE,
  CONSTRAINT fk_fb_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 高风险提醒
-- ============================================

CREATE TABLE analysis_risk_states (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL UNIQUE,
  is_high_risk BOOLEAN NOT NULL DEFAULT FALSE,
  risk_status ENUM('none','pending','handled') NOT NULL DEFAULT 'none',
  trigger_reason_summary TEXT NULL,
  handled_at DATETIME NULL,
  handled_action ENUM('continue_view','return_home') NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_risk_record FOREIGN KEY (record_id) REFERENCES analysis_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 历史摘要（用于"参考历史"功能）
-- ============================================

CREATE TABLE analysis_history_summaries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  one_sentence_summary VARCHAR(30) NULL,
  persona_types JSON NULL COMMENT '所有人设类型',
  anxiety_types JSON NULL COMMENT '所有焦虑类型',
  keywords JSON NULL COMMENT '关键词数组',
  feedback_summary VARCHAR(100) NULL COMMENT '反馈概况，如"好很多，很有用"',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  CONSTRAINT fk_hs_record FOREIGN KEY (record_id) REFERENCES analysis_records(id) ON DELETE CASCADE,
  CONSTRAINT fk_hs_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 历史自定义标签
-- ============================================

CREATE TABLE record_custom_tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  tag_name VARCHAR(10) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_tag (user_id, tag_name),
  INDEX idx_user (user_id),
  CONSTRAINT fk_rct_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE record_custom_tag_relations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_record_tag (record_id, tag_id),
  INDEX idx_record (record_id),
  CONSTRAINT fk_rctr_record FOREIGN KEY (record_id) REFERENCES analysis_records(id) ON DELETE CASCADE,
  CONSTRAINT fk_rctr_tag FOREIGN KEY (tag_id) REFERENCES record_custom_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 知识库 / 百宝箱
-- ============================================

CREATE TABLE knowledge_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE knowledge_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(60) NOT NULL,
  body TEXT NOT NULL COMMENT '正文，支持 Markdown 子集，最多 5000 字',
  applicable_scene VARCHAR(200) NULL,
  source_note VARCHAR(200) NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_home_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_id),
  INDEX idx_enabled_time (is_enabled, updated_at DESC),
  INDEX idx_recommended (is_home_recommended, is_enabled),
  CONSTRAINT fk_ki_category FOREIGN KEY (category_id) REFERENCES knowledge_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE knowledge_tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tag_name VARCHAR(10) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE knowledge_item_tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  knowledge_item_id BIGINT UNSIGNED NOT NULL,
  knowledge_tag_id BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_item_tag (knowledge_item_id, knowledge_tag_id),
  INDEX idx_item (knowledge_item_id),
  CONSTRAINT fk_kit_item FOREIGN KEY (knowledge_item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_kit_tag FOREIGN KEY (knowledge_tag_id) REFERENCES knowledge_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 个人笔记
-- ============================================

CREATE TABLE notes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(60) NOT NULL,
  body TEXT NULL COMMENT '正文，最多 5000 字',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_time (user_id, updated_at DESC),
  CONSTRAINT fk_note_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE note_tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  tag_name VARCHAR(10) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_note_user_tag (user_id, tag_name),
  INDEX idx_user (user_id),
  CONSTRAINT fk_nt_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE note_tag_relations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  note_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_note_tag (note_id, tag_id),
  INDEX idx_note (note_id),
  CONSTRAINT fk_ntr_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_ntr_tag FOREIGN KEY (tag_id) REFERENCES note_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE note_source_relations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  note_id BIGINT UNSIGNED NOT NULL,
  source_type ENUM('history','knowledge') NOT NULL,
  source_id BIGINT UNSIGNED NULL COMMENT '可为空（关联源已删除时）',
  source_title_snapshot VARCHAR(100) NULL,
  source_status_snapshot ENUM('active','deleted','disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_note (note_id),
  CONSTRAINT fk_nsr_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 用户提议 / 反馈
-- ============================================

CREATE TABLE user_suggestions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL COMMENT '注销后置 NULL',
  suggestion_type ENUM('feature_request','bug_feedback','content_correction','experience_optimization','other') NOT NULL,
  content TEXT NULL COMMENT '反馈正文，注销后置 NULL',
  contact_text VARCHAR(100) NULL COMMENT '注销后置 NULL',
  status ENUM('pending','processing','adopted','not_adopted','completed') NOT NULL DEFAULT 'pending',
  submitter_display_snapshot VARCHAR(30) NULL COMMENT '提交时用户名快照',
  anonymized_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  CONSTRAINT fk_us_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 首页内容
-- ============================================

CREATE TABLE home_quotes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  text VARCHAR(50) NOT NULL,
  author VARCHAR(50) NOT NULL DEFAULT '系统推荐',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE home_songs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  artist VARCHAR(100) NOT NULL,
  reason VARCHAR(50) NULL,
  suitable_mood VARCHAR(50) NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 系统文案
-- ============================================

CREATE TABLE admin_contents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_type ENUM('disclaimer','product_intro','tutorial','greeting','coming_soon') NOT NULL UNIQUE,
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 管理员
-- ============================================

CREATE TABLE admin_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  role ENUM('super_admin','admin') NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 搜索日志（可选）
-- ============================================

CREATE TABLE search_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  search_type ENUM('home','history','knowledge','notes') NOT NULL,
  keyword VARCHAR(200) NOT NULL,
  result_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 审计日志（可选）
-- ============================================

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NULL,
  target_id BIGINT UNSIGNED NULL,
  detail JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin (admin_user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
