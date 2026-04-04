import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAuth } from "../hooks/useAuth";
import { useAvatarPicker } from "../hooks/useAvatarPicker";
import { AvatarCropper } from "../components/AvatarCropper";
import { CroppedAvatar } from "../components/CroppedAvatar";
import * as profileService from "../services/profileService";
import * as authService from "../services/authService";
import client from "../api/client";
import type { SocialLinks, ProfileType, User } from "../types";

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = firstName?.charAt(0)?.toUpperCase() ?? "";
  const l = lastName?.charAt(0)?.toUpperCase() ?? "";
  return f + l || "?";
}

const SOCIAL_NETWORKS = [
  { key: "instagram" as const, iconClass: "fa-brands fa-instagram", label: "Instagram", placeholder: "@seu_perfil" },
  { key: "tiktok" as const, iconClass: "fa-brands fa-tiktok", label: "TikTok", placeholder: "@seu_perfil" },
  { key: "youtube" as const, iconClass: "fa-brands fa-youtube", label: "YouTube", placeholder: "@seu_canal" },
  { key: "strava" as const, iconClass: "fa-brands fa-strava", label: "Strava", placeholder: "Link do perfil" },
];

export function ProfilePage() {
  usePageTitle("Conta");
  const { user, updateUser, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Avatar
  const picker = useAvatarPicker();
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (picker.pickerError) {
      setError(picker.pickerError);
      picker.clearPickerError();
    }
  }, [picker.pickerError]);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [profileType, setProfileType] = useState<ProfileType>("regular");
  const [crefNumber, setCrefNumber] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  // Email edit
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [emailMsg, setEmailMsg] = useState("");

  // Delete account
  const [confirmDelete, setConfirmDelete] = useState(false);

  function resetForm(u: User) {
    setFirstName(u.first_name ?? "");
    setLastName(u.last_name ?? "");
    setNickname(u.nickname ?? "");
    setBirthDate(u.birth_date ?? "");
    setProfileType(u.profile_type);
    setCrefNumber(u.cref_number ?? "");
    setSocialLinks(u.social_links ?? {});
  }

  useEffect(() => {
    if (user) resetForm(user);
  }, [user]);

  function startEditing() {
    setIsEditing(true);
    setMessage("");
    setError("");
  }

  function cancelEditing() {
    if (user) resetForm(user);
    setIsEditing(false);
    setError("");
  }

  async function handleCropConfirm(cropData: import("../types").AvatarCrop) {
    const { file, crop } = picker.confirmCrop(cropData);
    setError("");

    setIsUploading(true);
    try {
      if (file) {
        const uploaded = await profileService.uploadAvatar(file);
        const updated = await profileService.updateAvatarCrop(crop);
        const bustUrl = uploaded.avatar_url
          ? `${uploaded.avatar_url}?t=${Date.now()}`
          : uploaded.avatar_url;
        updateUser({ ...uploaded, ...updated, avatar_url: bustUrl });
        setMessage("Avatar atualizado!");
      } else {
        const updated = await profileService.updateAvatarCrop(crop);
        updateUser(updated);
        setMessage("Enquadramento atualizado!");
      }
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setError(file ? "Erro ao enviar avatar." : "Erro ao salvar enquadramento.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim()) {
      setError("Nome e obrigatorio.");
      return;
    }
    if (!birthDate) {
      setError("Data de nascimento e obrigatoria.");
      return;
    }
    if (profileType === "professional" && !crefNumber.trim()) {
      setError("CREF e obrigatorio para profissionais.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await profileService.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        nickname: nickname.trim() || undefined,
        birth_date: birthDate,
        profile_type: profileType,
        cref_number: profileType === "professional" ? crefNumber.trim() : undefined,
        social_links: socialLinks,
      });
      updateUser(updated);
      setIsEditing(false);
      setMessage("Perfil atualizado!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message;
      setError(msg || "Erro ao atualizar perfil.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateEmail(e: FormEvent) {
    e.preventDefault();
    try {
      await authService.updateEmail({ email: emailValue });
      setEmailMsg("Email atualizado!");
      setEditingEmail(false);
      setTimeout(() => setEmailMsg(""), 3000);
    } catch {
      setEmailMsg("Erro ao atualizar email.");
    }
  }

  async function handleExport() {
    try {
      const [plans, catalog, history] = await Promise.all([
        client.get("/plans").then((r) => r.data),
        client.get("/catalog").then((r) => r.data),
        client.get("/history?limit=1000").then((r) => r.data),
      ]);
      const data = { plans, catalog, history, exported_at: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `liftdeck-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao exportar dados.");
    }
  }

  async function handleDeleteAccount() {
    await authService.deleteAccount();
    logout();
  }

  function updateSocial(key: keyof SocialLinks, value: string) {
    setSocialLinks((prev) => ({ ...prev, [key]: value || undefined }));
  }

  if (!user) return null;

  const initials = getInitials(user.first_name, user.last_name);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Conta</h1>
      </div>

      {/* Avatar + Info */}
      <div className="card" style={{ textAlign: "center", padding: "var(--space-xl)" }}>
        <div
          className={isEditing ? "avatar-editable" : undefined}
          style={isEditing ? undefined : { position: "relative", display: "inline-block" }}
          onClick={isEditing && !isUploading ? () => { if (user.avatar_url) { picker.openCropper(user.avatar_url); } else { picker.openFilePicker(); } } : undefined}
        >
          {user.avatar_url ? (
            <CroppedAvatar src={user.avatar_url} crop={user.avatar_crop} size={80} initials={initials} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--color-primary)", color: "var(--color-text-inverse)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)" }}>
              {initials}
            </div>
          )}
          {isEditing && (
            <>
              <div className="avatar-editable__overlay">
                <i className="fa-solid fa-camera" />
              </div>
              <input ref={picker.fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { const file = e.target.files?.[0]; if (file) picker.handleFileChange(file); e.target.value = ""; }} />
            </>
          )}
        </div>
        <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", marginTop: "var(--space-md)" }}>
          {user.first_name ?? user.email}{user.last_name ? ` ${user.last_name}` : ""}
        </div>
        {user.nickname && (
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginTop: "var(--space-xs)" }}>
            <i className="fa-solid fa-hashtag" style={{ marginRight: "var(--space-xs)" }} />{user.nickname}
          </div>
        )}
        {user.profile_type === "professional" && user.cref_verified && (
          <div style={{ color: "var(--color-success)", fontSize: "var(--text-sm)", marginTop: "var(--space-sm)" }}>
            <i className="fa-solid fa-check" style={{ marginRight: "var(--space-xs)" }} />CREF Verificado
          </div>
        )}
        {user.profile_type === "professional" && !user.cref_verified && user.cref_number && (
          <div style={{ color: "var(--color-warning)", fontSize: "var(--text-sm)", marginTop: "var(--space-sm)" }}>
            <i className="fa-solid fa-id-badge" style={{ marginRight: "var(--space-xs)" }} />CREF: {user.cref_number}
          </div>
        )}
      </div>

      {message && (
        <p style={{ color: "var(--color-success)", fontSize: "var(--text-sm)", marginTop: "var(--space-sm)", textAlign: "center" }}>{message}</p>
      )}

      {/* Edit profile button */}
      {!isEditing && (
        <div style={{ marginTop: "var(--space-lg)", textAlign: "center" }}>
          <button className="btn btn--secondary" onClick={startEditing}>
            <i className="fa-solid fa-pen" style={{ marginRight: "var(--space-sm)" }} />Editar Perfil
          </button>
        </div>
      )}

      {/* Edit form */}
      {isEditing && (
        <section className="section">
          <div className="section__header">
            <h2 className="section__title">Dados Pessoais</h2>
          </div>
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="profileFirstName">Nome *</label>
                <div className="input-icon-wrap">
                  <i className="fa-solid fa-user input-icon" aria-hidden="true" />
                  <input className="form-input form-input--icon" id="profileFirstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profileLastName">Sobrenome</label>
                <input className="form-input" id="profileLastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profileNickname">Apelido</label>
                <div className="input-icon-wrap">
                  <i className="fa-solid fa-hashtag input-icon" aria-hidden="true" />
                  <input className="form-input form-input--icon" id="profileNickname" type="text" placeholder={user.nickname ?? "SeuApelido"} value={nickname} onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profileBirthDate">Data de nascimento *</label>
                <div className="input-icon-wrap">
                  <i className="fa-solid fa-calendar input-icon" aria-hidden="true" />
                  <input className="form-input form-input--icon" id="profileBirthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-checkbox">
                  <input type="checkbox" checked={profileType === "professional"} onChange={(e) => setProfileType(e.target.checked ? "professional" : "regular")} />
                  <span>Sou profissional de Educacao Fisica</span>
                </label>
              </div>
              {profileType === "professional" && (
                <div className="form-group">
                  <label className="form-label" htmlFor="profileCref">CREF (ex: 123456-G/SP) *</label>
                  <div className="input-icon-wrap">
                    <i className="fa-solid fa-id-badge input-icon" aria-hidden="true" />
                    <input className="form-input form-input--icon" id="profileCref" type="text" placeholder="123456-G/SP" value={crefNumber} onChange={(e) => setCrefNumber(e.target.value.toUpperCase())} required />
                  </div>
                </div>
              )}
              <div style={{ marginTop: "var(--space-lg)" }}>
                <div className="form-label">Redes Sociais</div>
                {SOCIAL_NETWORKS.map((net) => (
                  <div className="form-group" key={net.key}>
                    <div className="input-icon-wrap">
                      <i className={`${net.iconClass} input-icon`} aria-hidden="true" />
                      <input className="form-input form-input--icon" type="text" placeholder={net.placeholder} value={socialLinks[net.key] ?? ""} onChange={(e) => updateSocial(net.key, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="form-actions">
                <button className="btn btn--primary" type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</button>
                <button className="btn btn--secondary" type="button" onClick={cancelEditing}>Cancelar</button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Social Links view */}
      {!isEditing && (
        <section className="section">
          <div className="section__header">
            <h2 className="section__title">Redes Sociais</h2>
          </div>
          <div className="card">
            {SOCIAL_NETWORKS.map((net) => (
              <div className="card__row" key={net.key} style={{ marginTop: net.key !== "instagram" ? "var(--space-sm)" : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                  <i className={net.iconClass} style={{ color: "var(--color-text-muted)", width: 20 }} />
                  <span style={{ color: socialLinks[net.key] ? "var(--color-text)" : "var(--color-text-muted)" }}>
                    {socialLinks[net.key] || "\u2014"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gerenciar */}
      {!isEditing && (
        <>
          <section className="section">
            <div className="section__header">
              <h2 className="section__title">Gerenciar</h2>
            </div>
            <Link to="/plans" className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: "inherit" }}>
              <div>
                <div className="card__title">Meus Planos</div>
                <div className="card__subtitle">Gerenciar treinos e exercicios</div>
              </div>
              <i className="fa-solid fa-list-check" style={{ color: "var(--color-text-muted)", fontSize: "var(--text-lg)" }} />
            </Link>
            <Link to="/catalog" className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: "inherit", marginTop: "var(--space-sm)" }}>
              <div>
                <div className="card__title">Exercicios</div>
                <div className="card__subtitle">Cadastrar e gerenciar exercicios</div>
              </div>
              <i className="fa-solid fa-dumbbell" style={{ color: "var(--color-text-muted)", fontSize: "var(--text-lg)" }} />
            </Link>
          </section>

          {/* Conta */}
          <section className="section">
            <div className="section__header">
              <h2 className="section__title">Conta</h2>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Email */}
              {!editingEmail ? (
                <div style={{ padding: "var(--space-lg)" }}>
                  <div className="card__row">
                    <div>
                      <div className="card__title">{user.email}</div>
                      <div className="card__subtitle">Email da conta</div>
                    </div>
                    <button className="btn btn--secondary" onClick={() => { setEditingEmail(true); setEmailValue(user.email); }}>Editar</button>
                  </div>
                  {emailMsg && <p style={{ color: "var(--color-success)", fontSize: "var(--text-sm)", marginTop: "var(--space-sm)" }}>{emailMsg}</p>}
                </div>
              ) : (
                <div style={{ padding: "var(--space-lg)" }}>
                  <form onSubmit={handleUpdateEmail}>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input className="form-input" type="email" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} required />
                    </div>
                    <div className="form-actions">
                      <button className="btn btn--primary" type="submit">Salvar</button>
                      <button className="btn btn--secondary" type="button" onClick={() => setEditingEmail(false)}>Cancelar</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="divider" />

              {/* Dados */}
              <div style={{ padding: "var(--space-lg)" }}>
                <div className="card__row" style={{ marginBottom: "var(--space-md)" }}>
                  <div>
                    <div className="card__title">Dados</div>
                    <div className="card__subtitle">Exportar seus treinos</div>
                  </div>
                </div>
                <button className="btn btn--secondary btn--full" onClick={handleExport}>
                  <i className="fa-solid fa-download" /> Exportar
                </button>
              </div>

              <div className="divider" />

              {/* Excluir conta */}
              <div style={{ padding: "var(--space-lg)" }}>
                {!confirmDelete ? (
                  <button className="btn btn--ghost btn--full" style={{ color: "var(--color-danger)" }} onClick={() => setConfirmDelete(true)}>
                    Excluir minha conta
                  </button>
                ) : (
                  <div style={{ borderLeft: "3px solid var(--color-danger)", paddingLeft: "var(--space-lg)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ color: "var(--color-danger)" }} />
                      <strong>Tem certeza?</strong>
                    </div>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>
                      Esta acao e irreversivel. Todos os seus dados serao apagados.
                    </p>
                    <div className="form-actions">
                      <button className="btn btn--danger" onClick={handleDeleteAccount}>Sim, excluir</button>
                      <button className="btn btn--secondary" onClick={() => setConfirmDelete(false)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Cropper modal */}
      {picker.cropSrc && (
        <AvatarCropper
          src={picker.cropSrc}
          initialCrop={!picker.pendingFile ? user.avatar_crop : null}
          onConfirm={handleCropConfirm}
          onCancel={picker.cancelCrop}
          onChangePhoto={() => { picker.cancelCrop(); picker.openFilePicker(); }}
        />
      )}
    </div>
  );
}
