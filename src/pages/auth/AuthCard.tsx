import { createContext, useContext, useId, useRef, useState } from 'react'
import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CircleAlert, Eye, EyeOff, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../../components/shell/Logo'
import { safeNext, signIn } from '../../lib/session'
import './auth-flow.css'

/** Field errors by input name; fields read their own message from here */
type Errors = Record<string, string>
export const AuthErrors = createContext<Errors>({})

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Shared email check (sign-in and password recovery) */
export function emailError(email: string): string | null {
  if (!email) return 'ایمیل را وارد کنید'
  if (!EMAIL.test(email)) return 'قالب ایمیل درست نیست'
  return null
}

/** Design-review states (same idea as the alert panel's `preview()`): ?state=error | locked */
const BANNERS: Record<string, string> = {
  error: 'ایمیل یا رمز عبور درست نیست.',
  locked: 'به‌دلیل چند تلاش ناموفق، حساب برای ۱۵ دقیقه قفل شد.',
}

export function AuthBanner({ text }: { text: string }) {
  return (
    <div className="auth-banner" role="alert">
      <CircleAlert size={18} aria-hidden="true" />
      <p>{text}</p>
    </div>
  )
}

export function AuthCard({
  title,
  description,
  submitLabel,
  switchPrompt,
  switchLabel,
  switchTo,
  children,
}: {
  title: string
  description: string
  submitLabel: string
  switchPrompt: string
  switchLabel: string
  switchTo: string
  children: ReactNode
}) {
  // Sign-in is wired (temporary session); registration still only validates its fields.
  const login = useLocation().pathname === '/login'
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const preview = login ? params.get('state') : null
  const locked = preview === 'locked'
  const banner = locked ? BANNERS.locked : preview === 'error' ? BANNERS.error : null

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!login || busy || locked) return
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const next: Errors = {}
    const emailMsg = emailError(email)
    if (emailMsg) next.email = emailMsg
    if (!password) next.password = 'رمز عبور را وارد کنید'
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
      return
    }
    // ?state=error: the sample answer is «wrong email or password» (the banner already says so)
    if (preview === 'error') {
      return
    }
    setBusy(true)
    setTimeout(() => {
      signIn(email)
      navigate(safeNext(params.get('next')), { replace: true })
    }, 400)
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-card__logo">
        <Logo />
      </div>
      <header className="auth-card__header">
        <h1 id="auth-title">{title}</h1>
        <p>{description}</p>
      </header>

      {banner && <AuthBanner text={banner} />}

      <form ref={formRef} className="auth-form" onSubmit={onSubmit} noValidate={login}>
        <AuthErrors.Provider value={errors}>{children}</AuthErrors.Provider>
        <button type="submit" className="auth-form__submit" disabled={busy || locked}>
          {busy ? 'در حال ورود…' : submitLabel}
        </button>
      </form>

      <p className="auth-card__switch">
        {switchPrompt} <Link to={switchTo}>{switchLabel}</Link>
      </p>
    </section>
  )
}

type FieldProps = { label: string; icon?: LucideIcon } & InputHTMLAttributes<HTMLInputElement>

/** Error line under a field, tied to its input with aria-describedby */
function useFieldError(name: string | undefined) {
  const errors = useContext(AuthErrors)
  const id = useId()
  const msg = name ? errors[name] : undefined
  return {
    msg,
    id,
    aria: msg ? { 'aria-invalid': true as const, 'aria-describedby': id } : {},
    line: msg ? (
      <span id={id} className="auth-field__error">
        {msg}
      </span>
    ) : null,
  }
}

export function AuthField({ label, icon: Icon, ...input }: FieldProps) {
  const err = useFieldError(input.name)
  return (
    <label className={`auth-field ${err.msg ? 'is-invalid' : ''}`}>
      <span className="auth-field__label">{label}</span>
      <span className="auth-field__control">
        {Icon && <Icon size={18} aria-hidden="true" />}
        <input dir="auto" required {...input} {...err.aria} />
      </span>
      {err.line}
    </label>
  )
}

export function PasswordField({ label, ...input }: Omit<FieldProps, 'icon' | 'type'>) {
  const [visible, setVisible] = useState(false)
  const err = useFieldError(input.name)
  // The sign-in password (not a new one) offers recovery
  const forgot = input.autoComplete === 'current-password'
  return (
    <div className="auth-field-wrap">
      <label className={`auth-field ${err.msg ? 'is-invalid' : ''}`}>
        <span className="auth-field__label">{label}</span>
        <span className="auth-field__control">
          <Lock size={18} aria-hidden="true" />
          <input type={visible ? 'text' : 'password'} dir="auto" required {...input} {...err.aria} />
          <button
            type="button"
            className="auth-field__toggle"
            aria-label={visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
        {err.line}
      </label>
      {forgot && (
        <Link to="/forgot-password" className="auth-forgot">
          رمز عبور را فراموش کرده‌اید؟
        </Link>
      )}
    </div>
  )
}
