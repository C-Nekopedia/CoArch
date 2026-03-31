/**
 * 验证工具函数
 */

import { EMAIL_REGEX, USERNAME_REGEX, PASSWORD_REGEX, PASSWORD_STRENGTH_RULES } from '../constants/validation';

/**
 * 验证邮箱格式
 * @param email - 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * 验证用户名格式（允许汉字、字母、数字、下划线、连字符，3-15位）
 * 注意：后端使用同样的规则
 * @param username - 用户名
 * @returns 是否有效
 */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

/**
 * 验证注册密码格式（匹配后端规则）
 * 规则：至少8位，包含字母和数字即可
 * @param password - 密码
 * @returns 是否有效
 */
export function isValidRegisterPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

/**
 * 验证密码强度
 * @param password - 密码
 * @returns 强度等级：'weak', 'medium', 'strong'
 */
export function checkPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (!password) return 'weak';

  let score = 0;
  if (password.length >= PASSWORD_STRENGTH_RULES.MIN_LENGTH) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

/**
 * 验证URL格式
 * @param url - URL地址
 * @returns 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}