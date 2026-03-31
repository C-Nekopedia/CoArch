/**
 * 验证规则常量定义
 */

/**
 * 邮箱验证正则表达式
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 用户名验证正则表达式（允许汉字、字母、数字、下划线、连字符，3-15位）
 * 注意：前后端使用相同的规则
 */
export const USERNAME_REGEX = /^[\p{L}\p{N}_-]{3,15}$/u;

/**
 * 注册密码验证正则表达式（至少8位，包含字母和数字即可）
 * 注意：前后端使用相同的规则
 */
export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

/**
 * 密码强度检查规则
 */
export const PASSWORD_STRENGTH_RULES = {
  MIN_LENGTH: 8,
  REQUIRE_LOWERCASE: true,
  REQUIRE_UPPERCASE: false, // 可选
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: false, // 可选
} as const;