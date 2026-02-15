import { Service } from '@rabjs/react';

type Theme = 'light' | 'dark';

export class ThemeService extends Service {
  isDark = false;

  constructor() {
    super();
    // Check localStorage and system preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      this.isDark = savedTheme === 'dark';
    } else {
      this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }

  loadTheme(): void {
    this.applyTheme();
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    this.applyTheme();
  }

  private applyTheme(): void {
    const theme = this.isDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);

    // Apply dark class to document
    if (this.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
