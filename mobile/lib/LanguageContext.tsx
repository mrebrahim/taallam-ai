import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { setLang, type Lang, LANG_KEY, LANG_CHOSEN_KEY } from './i18n'

interface LangContextType {
  lang: Lang
  isAr: boolean
  chosen: boolean
  changeLang: (l: Lang) => Promise<void>
  loading: boolean
}

const LangContext = createContext<LangContextType>({
  lang: 'ar',
  isAr: true,
  chosen: false,
  changeLang: async () => {},
  loading: true,
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')
  const [chosen, setChosen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [storedLang, storedChosen] = await Promise.all([
        AsyncStorage.getItem(LANG_KEY),
        AsyncStorage.getItem(LANG_CHOSEN_KEY),
      ])
      const l = (storedLang as Lang) || 'ar'
      setLangState(l)
      setLang(l) // sync module-level variable too
      setChosen(storedChosen === 'true')
      setLoading(false)
    }
    load()
  }, [])

  const changeLang = async (l: Lang) => {
    setLangState(l)
    setLang(l)
    await Promise.all([
      AsyncStorage.setItem(LANG_KEY, l),
      AsyncStorage.setItem(LANG_CHOSEN_KEY, 'true'),
    ])
    setChosen(true)
  }

  return (
    <LangContext.Provider value={{ lang, isAr: lang === 'ar', chosen, changeLang, loading }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
