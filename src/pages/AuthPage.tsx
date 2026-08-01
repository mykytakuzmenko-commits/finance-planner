import { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    setInfo(null)
    if (!email.trim() || !password) {
      setError('Вкажіть пошту та пароль.')
      return
    }
    if (mode === 'up' && password.length < 6) {
      setError('Пароль має містити щонайменше 6 символів.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'in') {
        await signIn(email.trim(), password)
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password)
        if (needsConfirmation) {
          setInfo('Готово! Підтвердьте пошту за посиланням у листі, потім увійдіть.')
          setMode('in')
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося виконати вхід.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <div className="onboarding__badge" aria-hidden="true">
          ₴
        </div>
        <div className="onboarding__step">
          <h1>Finance Planner</h1>
          <p className="onboarding__lead">
            {mode === 'in'
              ? 'Увійдіть, щоб отримати доступ до своїх фінансів на будь-якому пристрої.'
              : 'Створіть акаунт — дані синхронізуються між пристроями.'}
          </p>

          <div className="field" style={{ textAlign: 'left' }}>
            <TextField
              label="Пошта"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Пароль"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          {info && <p className="save-hint">{info}</p>}

          <Button fullWidth onClick={submit} disabled={busy}>
            {busy ? 'Зачекайте…' : mode === 'in' ? 'Увійти' : 'Створити акаунт'}
          </Button>

          <p className="auth-switch">
            {mode === 'in' ? 'Немає акаунта? ' : 'Вже маєте акаунт? '}
            <button
              type="button"
              className="auth-switch__btn"
              onClick={() => {
                setMode(mode === 'in' ? 'up' : 'in')
                setError(null)
                setInfo(null)
              }}
            >
              {mode === 'in' ? 'Зареєструватися' : 'Увійти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
