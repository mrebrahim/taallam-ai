import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useLang } from '@/lib/LanguageContext'
import { type Lang } from '@/lib/i18n'
import { Colors } from '@/constants/Colors'

export default function LangScreen() {
  const { lang, changeLang } = useLang()
  const [selected, setSelected] = useState<Lang>(lang || 'ar')

  const handleContinue = async () => {
    await changeLang(selected)
    router.replace('/(auth)/login')
  }

  return (
    <View style={s.container}>
      <View style={s.logo}>
        <Text style={s.emoji}>🤖</Text>
        <Text style={s.appName}>Taallam AI</Text>
        <Text style={s.appAr}>تعلّم AI</Text>
      </View>

      <Text style={s.title}>
        {selected === 'ar' ? 'اختر لغتك' : 'Choose Your Language'}
      </Text>
      <Text style={s.sub}>
        {selected === 'ar'
          ? 'يمكنك تغييرها لاحقاً من الملف الشخصي'
          : 'You can change this later in your profile'}
      </Text>

      <View style={s.opts}>
        {([
          ['ar', '🇸🇦', 'العربية', 'Arabic'],
          ['en', '🇺🇸', 'English', 'الإنجليزية'],
        ] as [Lang, string, string, string][]).map(([l, flag, name, sub]) => (
          <TouchableOpacity
            key={l}
            style={[s.opt, selected === l && s.optActive]}
            onPress={() => setSelected(l)}
          >
            <Text style={s.flag}>{flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.optName, selected === l && { color: Colors.blue }]}>{name}</Text>
              <Text style={s.optSub}>{sub}</Text>
            </View>
            <View style={[s.radio, selected === l && s.radioOn]}>
              {selected === l && <View style={s.dot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.btn} onPress={handleContinue}>
        <Text style={s.btnTxt}>
          {selected === 'ar' ? 'متابعة ←' : 'Continue →'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 28 },
  logo: { alignItems: 'center', marginBottom: 40 },
  emoji: { fontSize: 72, marginBottom: 12 },
  appName: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  appAr: { fontSize: 18, fontWeight: '700', color: Colors.green, marginTop: 4 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 36, textAlign: 'center' },
  opts: { width: '100%', gap: 14, marginBottom: 36 },
  opt: { backgroundColor: '#1e293b', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: '#334155' },
  optActive: { borderColor: Colors.blue, backgroundColor: '#1e3a5f' },
  flag: { fontSize: 38 },
  optName: { fontSize: 19, fontWeight: '800', color: '#fff' },
  optSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#475569', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: Colors.blue },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.blue },
  btn: { width: '100%', backgroundColor: Colors.blue, borderRadius: 16, padding: 18, alignItems: 'center', shadowColor: Colors.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  btnTxt: { fontSize: 17, fontWeight: '900', color: '#fff' },
})
