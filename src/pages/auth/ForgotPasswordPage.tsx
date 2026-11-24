import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Logo } from '../../components/shell/Logo'
import { AuthErrors, AuthField, emailError } from './AuthCard'

/**
 * Lucide `mail-check` drawn inline so the check stroke can animate on its own:
 * the blue badge pops in, the envelope settles, then the check draws and a ring ripples once.
 */
function SentBadge() {
  return (
    <span className="auth-sent__badge" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <g className="auth-sent__mail">
          <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </g>
        <path className="auth-sent__check" d="m16 19 2 2 4-4" pathLength={1} />
      </svg>
    </span>
  )
}

/**
 * «بازیابی رمز عبور». The recovery service is not wired yet: after a valid email the card turns to a
 * neutral message that does not reveal whether the email is registered.
 */
export function ForgotPasswordPage() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim()
    const msg = emailError(email)
    setErrors(msg ? { email: msg } : {})
    if (msg) {
      formRef.current?.querySelector<HTMLInputElement>('[name="email"]')?.focus()
      return
    }
    setBusy(true)
    setTimeout(() => setSent(true), 400)
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-card__logo">
        <Logo />
      </div>
      <header className="auth-card__header">
        <h1 id="auth-title">بازیابی رمز عبور</h1>
      </header>

      {sent ? (
        <div className="auth-sent" role="status">
          <SentBadge />
          <p>اگر این ایمیل در سامانه ثبت شده باشد، لینک بازیابی برایش فرستاده شد.</p>
          <Link to="/login" className="auth-form__submit auth-form__submit--link">
            بازگشت به ورود
          </Link>
        </div>
      ) : (
        <form ref={formRef} className="auth-form" onSubmit={onSubmit} noValidate>
          <AuthErrors.Provider value={errors}>
            <AuthField label="ایمیل" icon={Mail} name="email" type="email" autoComplete="email" placeholder="example@domain.com" />
          </AuthErrors.Provider>
          <button type="submit" className="auth-form__submit" disabled={busy}>
            ارسال لینک بازیابی
          </button>
        </form>
      )}
    </section>
  )
}
