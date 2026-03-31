/**
 * 评论系统相关类型定义
 */

/**
 * 评论信息
 */
export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  replies?: Comment[]; // 回复评论
  parentId?: string;   // 父评论ID（用于嵌套评论）
  isLiked?: boolean;   // 当前用户是否已点赞
}

/**
 * 添加评论请求参数
 */
export interface AddCommentRequest {
  articleId: string;
  content: string;
  parentId?: string; // 回复评论时指定父评论ID
}

/**
 * 更新评论请求参数
 */
export interface UpdateCommentRequest {
  content: string;
}