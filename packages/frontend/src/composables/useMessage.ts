import { ref } from 'vue';

export type MessageType = 'info' | 'success' | 'warning' | 'error';

export interface Message {
  id: number;
  text: string;
  type: MessageType;
  duration: number;
}

/**
 * 消息提示组合式函数
 * @returns 显示消息的方法和消息列表
 */
export function useMessage() {
  const messages = ref<Message[]>([]);
  let nextId = 1;

  const showMessage = (text: string, type: MessageType = 'info', duration: number = 3000) => {
    const id = nextId++;
    const message: Message = { id, text, type, duration };
    messages.value.push(message);

    // 自动移除
    setTimeout(() => {
      removeMessage(id);
    }, duration);
  };

  const removeMessage = (id: number) => {
    const index = messages.value.findIndex(msg => msg.id === id);
    if (index !== -1) {
      messages.value.splice(index, 1);
    }
  };

  const clearAllMessages = () => {
    messages.value = [];
  };

  return {
    messages,
    showMessage,
    removeMessage,
    clearAllMessages,
    // 快捷方法
    info: (text: string, duration?: number) => showMessage(text, 'info', duration),
    success: (text: string, duration?: number) => showMessage(text, 'success', duration),
    warning: (text: string, duration?: number) => showMessage(text, 'warning', duration),
    error: (text: string, duration?: number) => showMessage(text, 'error', duration)
  };
}