import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // theme: 'light' | 'dark' | 'system'
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('theme');
      return stored || 'system';
    } catch (e) {
      return 'system';
    }
  });
  const [effectiveTheme, setEffectiveTheme] = useState('light');

  const applyEffectiveTheme = useCallback((effective) => {
    const root = document.documentElement;
    setEffectiveTheme(effective);
    if (effective === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, []);

  useEffect(() => {
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

    const compute = () => {
      let effective;
      if (theme === 'system') {
        effective = mq && mq.matches ? 'dark' : 'light';
      } else {
        effective = theme;
      }
      applyEffectiveTheme(effective);
    };

    compute();

    const handleChange = () => {
      if (theme === 'system') compute();
    };

    if (mq && mq.addEventListener) mq.addEventListener('change', handleChange);
    else if (mq && mq.addListener) mq.addListener(handleChange);

    try { localStorage.setItem('theme', theme); } catch (e) {}

    return () => {
      if (mq && mq.removeEventListener) mq.removeEventListener('change', handleChange);
      else if (mq && mq.removeListener) mq.removeListener(handleChange);
    };
  }, [theme, applyEffectiveTheme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
