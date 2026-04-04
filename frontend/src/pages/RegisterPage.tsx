import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogoFull } from "../components/Logo";
import { AvatarCropper } from "../components/AvatarCropper";
import { CroppedAvatar } from "../components/CroppedAvatar";
import { useAuth } from "../hooks/useAuth";
import { useAvatarPicker } from "../hooks/useAvatarPicker";
import { usePageTitle } from "../hooks/usePageTitle";
import * as profileService from "../services/profileService";
import type { AvatarCrop, ProfileType, SocialLinks } from "../types";

export function RegisterPage() {
  usePageTitle("Cadastro");

  // Required
  const [firstName, setFirstName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Optional
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [profileType, setProfileType] = useState<ProfileType>("regular");
  const [crefNumber, setCrefNumber] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  // Avatar
  const picker = useAvatarPicker();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarCrop, setAvatarCrop] = useState<AvatarCrop | null>(null);

  // UI
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    profileService.suggestNickname().then(setNickname).catch(() => {});
  }, []);

  useEffect(() => {
    if (picker.pickerError) {
      setError(picker.pickerError);
      picker.clearPickerError();
    }
  }, [picker.pickerError]);

  const maxBirthDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 12);
    return d.toISOString().split("T")[0];
  })();

  const passwordChecks = [
    { label: "Minimo 8 caracteres", valid: password.length >= 8 },
    { label: "Uma letra maiuscula", valid: /[A-Z]/.test(password) },
    { label: "Um numero", valid: /\d/.test(password) },
    { label: "Um simbolo", valid: /[^a-zA-Z0-9]/.test(password) },
  ];
  const allValid = passwordChecks.every((c) => c.valid);

  function handleCropConfirm(cropData: AvatarCrop) {
    const { file, crop } = picker.confirmCrop(cropData);
    setAvatarCrop(crop);
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  function updateSocial(key: keyof SocialLinks, value: string) {
    setSocialLinks((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim()) {
      setError("Informe seu nome.");
      return;
    }
    if (!birthDate) {
      setError("Informe sua data de nascimento.");
      return;
    }
    if (!allValid) {
      setError("A senha nao atende todos os requisitos.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas nao coincidem.");
      return;
    }
    if (profileType === "professional" && !crefNumber.trim()) {
      setError("CREF e obrigatorio para profissionais.");
      return;
    }

    setIsLoading(true);
    try {
      const hasSocial = Object.values(socialLinks).some(Boolean);
      await register({
        email,
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        nickname: nickname.trim() || undefined,
        birth_date: birthDate,
        profile_type: profileType === "professional" ? "professional" : undefined,
        cref_number: profileType === "professional" ? crefNumber.trim() : undefined,
        social_links: hasSocial ? socialLinks : undefined,
      });

      // Upload avatar after registration (now authenticated)
      if (avatarFile) {
        try {
          await profileService.uploadAvatar(avatarFile);
          if (avatarCrop) {
            await profileService.updateAvatarCrop(avatarCrop);
          }
        } catch {
          // Avatar upload failure shouldn't block registration
        }
      }

      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message;
      setError(msg || "Erro ao criar conta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  const initials = firstName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-lg)" }}>
          <LogoFull size="lg" />
        </div>
        <div className="page-header">
          <h1 className="page-title">Cadastro</h1>
          <Link to="/login" className="btn btn--secondary" style={{ gap: "var(--space-xs)" }}>
            <i className="fa-solid fa-arrow-left" />Voltar
          </Link>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Avatar */}
          <div style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
            <div className="avatar-editable" onClick={() => { if (avatarPreview) { picker.openCropper(avatarPreview); } else { picker.openFilePicker(); } }}>
              {avatarPreview ? (
                <CroppedAvatar src={avatarPreview} crop={avatarCrop} size={64} initials={initials} />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "var(--color-surface-alt)", color: "var(--color-text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)",
                }}>
                  {initials}
                </div>
              )}
              <div className="avatar-editable__overlay">
                <i className="fa-solid fa-camera" />
              </div>
            </div>
            <input
              ref={picker.fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) picker.handleFileChange(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* Nome + Sobrenome */}
          <div className="form-row">
            <div className="form-group">
              <div className="input-icon-wrap">
                <i className="fa-solid fa-user input-icon" aria-hidden="true" />
                <input className="form-input form-input--icon" id="firstName" type="text" placeholder="Nome *" aria-label="Nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <input className="form-input" type="text" placeholder="Sobrenome" aria-label="Sobrenome" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          {/* Apelido */}
          <div className="form-group">
            <div className="input-icon-wrap">
              <i className="fa-solid fa-hashtag input-icon" aria-hidden="true" />
              <input className="form-input form-input--icon" type="text" placeholder="Apelido" aria-label="Apelido" value={nickname} onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))} />
            </div>
          </div>

          {/* Data de nascimento */}
          <div className="form-group">
            <div className="input-icon-wrap">
              <i className="fa-solid fa-calendar input-icon" aria-hidden="true" />
              <input className="form-input form-input--icon" id="birthDate" type="date" aria-label="Data de nascimento" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={maxBirthDate} required />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <div className="input-icon-wrap">
              <i className="fa-solid fa-envelope input-icon" aria-hidden="true" />
              <input className="form-input form-input--icon" id="email" type="email" placeholder="seu@email.com *" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          {/* Profissional */}
          <div className="form-group">
            <label className="form-checkbox">
              <input type="checkbox" checked={profileType === "professional"} onChange={(e) => setProfileType(e.target.checked ? "professional" : "regular")} />
              <span>Sou profissional de Educacao Fisica</span>
            </label>
          </div>
          {profileType === "professional" && (
            <div className="form-group">
              <div className="input-icon-wrap">
                <i className="fa-solid fa-id-badge input-icon" aria-hidden="true" />
                <input className="form-input form-input--icon" type="text" placeholder="CREF (ex: 123456-G/SP) *" aria-label="CREF" value={crefNumber} onChange={(e) => setCrefNumber(e.target.value.toUpperCase())} />
              </div>
            </div>
          )}

          {/* Senha */}
          <div className="form-group">
            <div className="input-icon-wrap">
              <i className="fa-solid fa-lock input-icon" aria-hidden="true" />
              <input className="form-input form-input--icon" id="password" type="password" placeholder="Senha *" aria-label="Senha" value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setPasswordTouched(true)} required />
            </div>
          </div>
          {password.length > 0 && (
            <ul className="password-checklist">
              {passwordChecks.map((check) => (
                <li key={check.label} className={check.valid ? "check-pass" : passwordTouched ? "check-error" : "check-fail"}>
                  <i className={`fa-solid ${check.valid ? "fa-check" : "fa-xmark"}`} />
                  {check.label}
                </li>
              ))}
            </ul>
          )}
          <div className="form-group">
            <div className="input-icon-wrap">
              <i className="fa-solid fa-lock input-icon" aria-hidden="true" />
              <input className="form-input form-input--icon" id="confirmPassword" type="password" placeholder="Confirmar senha *" aria-label="Confirmar senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="form-group">
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-sm)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Redes Sociais</div>
            {[
              { key: "instagram" as const, icon: "fa-brands fa-instagram", placeholder: "@seu_perfil" },
              { key: "tiktok" as const, icon: "fa-brands fa-tiktok", placeholder: "@seu_perfil" },
              { key: "youtube" as const, icon: "fa-brands fa-youtube", placeholder: "@seu_canal" },
              { key: "strava" as const, icon: "fa-brands fa-strava", placeholder: "Link do perfil" },
            ].map((net) => (
              <div className="form-group" key={net.key}>
                <div className="input-icon-wrap">
                  <i className={`${net.icon} input-icon`} aria-hidden="true" />
                  <input className="form-input form-input--icon" type="text" placeholder={net.placeholder} value={socialLinks[net.key] ?? ""} onChange={(e) => updateSocial(net.key, e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button className="btn btn--primary btn--full btn--lg" type="submit" disabled={isLoading}>
              {isLoading ? "Criando conta..." : "Criar Conta"}
            </button>
          </div>
        </form>
        <p className="auth-footer">
          Ja tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>

      {picker.cropSrc && (
        <AvatarCropper
          src={picker.cropSrc}
          initialCrop={!picker.pendingFile ? avatarCrop : null}
          onConfirm={handleCropConfirm}
          onCancel={picker.cancelCrop}
          onChangePhoto={() => { picker.cancelCrop(); picker.openFilePicker(); }}
        />
      )}
    </div>
  );
}
