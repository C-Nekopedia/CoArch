import { onMounted, onUnmounted, ref } from 'vue';

/**
 * 回到顶部功能组合式函数
 * @param buttonId 按钮元素的ID，默认为'backToTop'
 * @returns 返回按钮的显示状态和滚动到顶部的函数
 */
export function useBackToTop(buttonId: string = 'backToTop') {
  const showButton = ref(false);
  let backToTopButton: HTMLElement | null = null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScroll = () => {
    showButton.value = window.scrollY > 300;
    if (backToTopButton) {
      if (showButton.value) {
        backToTopButton.classList.add('show');
      } else {
        backToTopButton.classList.remove('show');
      }
    }
  };

  onMounted(() => {
    backToTopButton = document.getElementById(buttonId);
    if (!backToTopButton) {
      console.warn(`Back to top button with id "${buttonId}" not found`);
      return;
    }

    backToTopButton.addEventListener('click', scrollToTop);
    window.addEventListener('scroll', handleScroll);

    // 初始检查
    handleScroll();
  });

  onUnmounted(() => {
    if (backToTopButton) {
      backToTopButton.removeEventListener('click', scrollToTop);
    }
    window.removeEventListener('scroll', handleScroll);
  });

  return {
    showButton,
    scrollToTop
  };
}