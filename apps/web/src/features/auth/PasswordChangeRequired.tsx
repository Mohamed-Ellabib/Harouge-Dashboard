import { FormEvent, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";

import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";

const minimumPasswordLength = 12;

const copy = {
  ar: {
    confirm: "تأكيد كلمة المرور الجديدة",
    confirmPlaceholder: "أكد كلمة المرور الجديدة",
    current: "كلمة المرور الحالية",
    currentPlaceholder: "أدخل كلمة المرور الحالية",
    help: "يجب تغيير كلمة المرور قبل دخول النظام. استخدم كلمة مرور قوية لا تقل عن 12 حرفا.",
    hidePassword: "إخفاء كلمة المرور",
    mismatch: "تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة.",
    new: "كلمة المرور الجديدة",
    newPlaceholder: "أدخل كلمة المرور الجديدة",
    passwordRule: "استخدم أحرفا كبيرة وصغيرة وأرقاما ورموزا.",
    save: "تغيير كلمة المرور",
    showPassword: "إظهار كلمة المرور",
    subtitle: "هذه أول مرة تدخل بها إلى النظام.",
    title: "تغيير كلمة المرور مطلوب"
  },
  en: {
    confirm: "Confirm new password",
    confirmPlaceholder: "Confirm new password",
    current: "Current password",
    currentPlaceholder: "Enter current password",
    help: "You must change your password before entering the system. Use a strong password with at least 12 characters.",
    hidePassword: "Hide password",
    mismatch: "Password confirmation does not match the new password.",
    new: "New password",
    newPlaceholder: "Enter new password",
    passwordRule: "Use uppercase, lowercase, numbers, and symbols.",
    save: "Change Password",
    showPassword: "Show password",
    subtitle: "This is your first sign-in to the system.",
    title: "Password Change Required"
  }
} as const;

export function PasswordChangeRequired() {
  const { changePassword } = useAuth();
  const { language } = useI18n();
  const text = copy[language];
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setErrorMessage(text.mismatch);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await changePassword(currentPassword, newPassword);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.detail
          : "Password could not be changed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="password-change-page">
      <form
        aria-labelledby="password-change-title"
        className="password-change-card"
        onSubmit={handleSubmit}
      >
        <header className="password-change-header">
          <span>
            <ShieldCheck size={31} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div>
            <h1 id="password-change-title">{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
        </header>

        <p className="password-change-help">{text.help}</p>

        <PasswordField
          autoComplete="current-password"
          isVisible={showCurrentPassword}
          label={text.current}
          onToggle={() => setShowCurrentPassword((current) => !current)}
          placeholder={text.currentPlaceholder}
          setValue={setCurrentPassword}
          toggleLabel={showCurrentPassword ? text.hidePassword : text.showPassword}
          value={currentPassword}
        />

        <PasswordField
          autoComplete="new-password"
          isVisible={showNewPassword}
          label={text.new}
          minLength={minimumPasswordLength}
          onToggle={() => setShowNewPassword((current) => !current)}
          placeholder={text.newPlaceholder}
          setValue={setNewPassword}
          toggleLabel={showNewPassword ? text.hidePassword : text.showPassword}
          value={newPassword}
        />

        <PasswordField
          autoComplete="new-password"
          isVisible={showConfirmPassword}
          label={text.confirm}
          minLength={minimumPasswordLength}
          onToggle={() => setShowConfirmPassword((current) => !current)}
          placeholder={text.confirmPlaceholder}
          setValue={setConfirmPassword}
          toggleLabel={showConfirmPassword ? text.hidePassword : text.showPassword}
          value={confirmPassword}
        />

        <div className="password-change-rule">
          <KeyRound size={18} strokeWidth={2.25} aria-hidden="true" />
          <span>{text.passwordRule}</span>
        </div>

        {errorMessage ? <p className="password-change-error">{errorMessage}</p> : null}

        <button
          className="password-change-submit"
          disabled={isSubmitting}
          type="submit"
        >
          <LockKeyhole size={18} strokeWidth={2.2} aria-hidden="true" />
          {text.save}
        </button>
      </form>
    </main>
  );
}

function PasswordField({
  autoComplete,
  isVisible,
  label,
  minLength,
  onToggle,
  placeholder,
  setValue,
  toggleLabel,
  value
}: {
  autoComplete: string;
  isVisible: boolean;
  label: string;
  minLength?: number;
  onToggle: () => void;
  placeholder: string;
  setValue: (value: string) => void;
  toggleLabel: string;
  value: string;
}) {
  return (
    <label className="password-change-field">
      <span>{label}</span>
      <span className="password-change-input">
        <LockKeyhole size={18} strokeWidth={2.2} aria-hidden="true" />
        <input
          autoComplete={autoComplete}
          minLength={minLength}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          required
          type={isVisible ? "text" : "password"}
          value={value}
        />
        <button aria-label={toggleLabel} onClick={onToggle} type="button">
          {isVisible ? (
            <EyeOff size={18} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Eye size={18} strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
      </span>
    </label>
  );
}
