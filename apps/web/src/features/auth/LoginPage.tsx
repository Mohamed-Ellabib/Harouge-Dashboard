import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  UserRound
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { ApiError } from "../../api/client";
import { resolvePostLoginRoute } from "../../app/navigation";

const minimumSignInLoadingMs = 2000;

export function LoginPage() {
  const { isLoading, session, login } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && session && !isSubmitting) {
    return <Navigate replace to={resolvePostLoginRoute(session)} />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const minimumLoading = delay(minimumSignInLoadingMs);

    try {
      await login(email, password);
      await minimumLoading;
    } catch (error) {
      await minimumLoading;

      if (error instanceof ApiError) {
        setErrorMessage(
          error.status === 401
            ? resolveInvalidCredentialsMessage(t)
            : error.detail
        );
      } else {
        setErrorMessage(t("login.failed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <div className="auth-background-layer" aria-hidden="true">
        <span className="auth-background-oil" />
        <span className="auth-background-archive" />
        <span className="auth-background-dots auth-background-dots--top" />
        <span className="auth-background-dots auth-background-dots--bottom" />
      </div>

      <div className="auth-shell">
        <div className="auth-language-control" aria-label={t("language.appLanguage")} dir="ltr">
          <button
            aria-pressed={language === "en"}
            className="auth-language-button"
            onClick={() => setLanguage("en")}
            type="button"
          >
            EN
          </button>
          <button
            aria-pressed={language === "ar"}
            className="auth-language-button"
            onClick={() => setLanguage("ar")}
            type="button"
          >
            AR
          </button>
        </div>

        <section className="auth-card" aria-label={t("login.panelTitle")}>
          {isSubmitting ? (
            <div className="auth-loading-overlay" role="status" aria-live="polite">
              <span className="auth-loading-mark" aria-hidden="true">
                <span />
              </span>
              <strong>{t("login.signingIn")}</strong>
            </div>
          ) : null}

          <header className="auth-card-header">
            <img className="auth-logo" src="/harouge-logo.svg" alt="Harouge Operations" />
            <h1>{t("login.panelTitle")}</h1>
            <p className="auth-card-subtitle">{t("shell.systemName")}</p>
            <span className="auth-title-accent" aria-hidden="true" />
            <p className="auth-help-text">{t("login.panelSummary")}</p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-field-label">{t("login.username")}</span>
              <span className="auth-input-shell">
                <UserRound className="auth-input-icon" size={22} aria-hidden="true" />
                <input
                  autoComplete="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("login.usernamePlaceholder")}
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="auth-field">
              <span className="auth-field-label">{t("login.password")}</span>
              <span className="auth-input-shell">
                <LockKeyhole className="auth-input-icon" size={20} aria-hidden="true" />
                <input
                  autoComplete="current-password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </span>
            </label>

            <div className="auth-form-options">
              <label className="auth-remember">
                <input
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <Check size={14} aria-hidden="true" />
                </span>
                {t("login.rememberMe")}
              </label>
            </div>

            {errorMessage ? <p className="form-error auth-error">{errorMessage}</p> : null}

            <button className="auth-submit-button" disabled={isSubmitting} type="submit">
              <span>{isSubmitting ? t("login.signingIn") : t("login.signIn")}</span>
              <ArrowRight size={24} aria-hidden="true" />
            </button>
          </form>

          <div className="auth-internal-divider">
            <span aria-hidden="true" />
            <strong>
              <ShieldCheck size={22} aria-hidden="true" />
              {t("login.internalUseOnly")}
            </strong>
            <span aria-hidden="true" />
          </div>
        </section>

        <footer className="auth-footer">
          <span>{t("login.footer")}</span>
        </footer>
      </div>
    </main>
  );
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function resolveInvalidCredentialsMessage(t: (key: string) => string) {
  return t("login.invalidCredentials");
}
