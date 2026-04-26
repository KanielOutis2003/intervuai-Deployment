import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const COLOR_BLIND_MODES = ['none', 'protanopia', 'deuteranopia', 'tritanopia']

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  const [colorBlindMode, setColorBlindMode] = useState(() => {
    return localStorage.getItem('colorBlindMode') || 'none'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const body = document.body
    // Remove any existing color-blind classes
    COLOR_BLIND_MODES.forEach(m => body.classList.remove(`cb-${m}`))
    if (colorBlindMode !== 'none') {
      body.classList.add(`cb-${colorBlindMode}`)
    }
    localStorage.setItem('colorBlindMode', colorBlindMode)
  }, [colorBlindMode])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorBlindMode, setColorBlindMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
