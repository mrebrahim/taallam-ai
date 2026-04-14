import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native'
import { router } from 'expo-router'
import { saveLang, type Lang } from '@/lib/i18n'
import { Colors } from '@/constants/Colors'

export default function LangScreen() {
  const [selected, setSelected] = useState<Lang>('ar')

  const handleContinue = async () => {
    await saveLang(selected)
    router.replace('/(auth)/login')
  }

  return (
    <View style={s.container}>
      {/* Logo */}
      <View style={s.logoArea}>
        <Text style={s.logo}>🤖</Text>
        <Text style={s.appName}>Taallam AI</Text>
        <Text style={s.appNameAr}>تعلّم AI</Text>
      </View>

      {/* Title */}
      <Text style={s.title}>
        {selected === 'ar' ? 'اختر لغتك' : 'Choose Your Language'}
      </Text>
      <Text style={s.subtitle}>
        {selected === 'ar'
          ? 'يمكنك تغييرها لاحقاً من الملف الشخصي'
          : 'You can change this later in your profile'}
      </Text>

      {/* Language Options */}
      <View style={s.options}>
        <TouchableOpacity
          style={[s.option, selected === 'ar' && s.optionActive]}
          onPress={() => setSelected('ar')}
        >
          <Text style={s.optionFlag}>🇸🇦</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.optionLang, selected === 'ar' && { color: Colors.blue }]}>
              العربية
            </Text>
            <Text style={s.optionSub}>Arabic</Text>
          </View>
          <View style={[s.radio, selected === 'ar' && s.radioActive]}>
            {selected === 'ar' && <View style={s.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.option, selected === 'en' && s.optionActive]}
          onPress={() => setSelected('en')}
        >
          <Text style={s.optionFlag}>🇺🇸</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.optionLang, selected === 'en' && { color: Colors.blue }]}>
              English
            </Text>
            <Text style={s.optionSub}>الإنجليزية</Text>
          </View>
          <View style={[s.radio, selected === 'en' && s.radioActive]}>
            {selected === 'en' && <View style={s.radioDot} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Continue Button */}
      <TouchableOpacity style={s.btn} onPress={handleContinue}>
        <Text style={s.btnText}>
          {selected === 'ar' ? 'متابعة ←' : 'Continue →'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 28 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 72, marginBottom: 12 },
  appName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  appNameAr: { fontSize: 18, fontWeight: '700', color: Colors.green, marginTop: 4 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 36, textAlign: 'center' },
  options: { width: '100%', gap: 14, marginBottom: 36 },
  option: { backgroundColor: '#1e293b', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: '#334155' },
  optionActive: { borderColor: Colors.blue, backgroundColor: '#1e3a5f' },
  optionFlag: { fontSize: 36 },
  optionLang: { fontSize: 18, fontWeight: '800', color: '#fff' },
  optionSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#475569', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.blue },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.blue },
  btn: { width: '100%', backgroundColor: Colors.blue, borderRadius: 16, padding: 18, alignItems: 'center', shadowColor: Colors.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  btnText: { fontSize: 17, fontWeight: '900', color: '#fff' },
})
