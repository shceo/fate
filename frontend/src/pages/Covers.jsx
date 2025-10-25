import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Footer from "../components/Footer.jsx";
import { apiPost } from "../shared/api.js";
import { useAuth } from "../shared/AuthContext.jsx";
import { COVER_TEMPLATES, resolveCoverDisplay } from "../shared/coverTemplates.js";

export default function Covers() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const currentCover = useMemo(() => {
    const source = {
      slug: user?.cover?.slug ?? user?.coverSlug ?? null,
      label: user?.cover?.label ?? user?.coverTitle ?? user?.coverLabel ?? null,
      subtitle: user?.cover?.subtitle ?? user?.coverSubtitle ?? null,
    };
    return resolveCoverDisplay(source);
  }, [
    user?.cover,
    user?.coverSlug,
    user?.coverTitle,
    user?.coverLabel,
    user?.coverSubtitle,
  ]);

  const [selectedSlug, setSelectedSlug] = useState(currentCover.slug);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [customFlip, setCustomFlip] = useState(false);

  useEffect(() => {
    setSelectedSlug(currentCover.slug);
  }, [currentCover.slug]);

  const selectedTemplate = useMemo(
    () => COVER_TEMPLATES.find((template) => template.slug === selectedSlug) ?? null,
    [selectedSlug]
  );

  const selectedLabel = useMemo(() => {
    if (!selectedTemplate) return null;
    return selectedTemplate.subtitle
      ? `${selectedTemplate.title} — ${selectedTemplate.subtitle}`
      : selectedTemplate.title;
  }, [selectedTemplate]);

  const handlePick = async (option) => {
    if (busy) return;
    const isCustom = Boolean(option.isCustom);
    setCustomFlip(isCustom);
    setBusy(true);
    setError("");

    try {
      await apiPost("/api/cover", {
        slug: option.slug,
        label: option.title,
        subtitle: option.subtitle ?? null,
      });
      setSelectedSlug(option.slug);
      if (isCustom) {
        await new Promise((resolve) => setTimeout(resolve, 2200));
      }
      await refreshUser();
      setDialogOpen(true);
    } catch (err) {
      console.error("Failed to save cover template", err);
      setError("Не удалось сохранить обложку. Попробуйте ещё раз позже.");
    } finally {
      setBusy(false);
    }
  };

  const closeDialog = () => {
    if (busy) return;
    setCustomFlip(false);
    setDialogOpen(false);
  };

  const goBack = () => {
    setCustomFlip(false);
    setDialogOpen(false);
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="cover-page">
      <Header />

      <ConfirmDialog
        open={dialogOpen}
        title="Обложка выбрана"
        message={
          <div className="space-y-3 text-muted leading-relaxed">
            {selectedLabel ? (
              <p>
                Мы сохранили шаблон{" "}
                <span className="font-medium text-[#5b5246]">{selectedLabel}</span>.
              </p>
            ) : null}
            <p>Вы всегда можете изменить выбор позже на этой странице.</p>
          </div>
        }
        cancelLabel="Остаться здесь"
        confirmLabel="Назад в кабинет"
        onCancel={closeDialog}
        onConfirm={goBack}
      />

      <div className="topbar">
        <div className="container mx-auto px-4 py-3 text-muted">
          Выберите шаблон обложки для своего проекта
        </div>
      </div>

      <section className="container mx-auto px-4 mt-4 space-y-4">
        {error && (
          <div className="card-glass px-4 py-3 text-sm text-[#a23a2f]">{error}</div>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {COVER_TEMPLATES.map((option) => {
            const isSelected = option.slug === selectedSlug;
            const isCustom = Boolean(option.isCustom);
            const isFlipped = isCustom && customFlip;

            return (
              <label
                key={option.slug}
                className={`cover cover-card transition-transform duration-200 ${
                  busy ? "pointer-events-none" : ""
                } ${isSelected ? "ring-4 ring-[#d0b8a8]/80 ring-offset-2" : ""} ${
                  isCustom ? "cover-card--custom" : ""
                } ${isFlipped ? "cover-card--flipped" : ""}`}
              >
                <input
                  type="radio"
                  name="cover"
                  className="cover-input absolute inset-0 opacity-0 cursor-pointer"
                  onChange={() => handlePick(option)}
                  disabled={busy}
                  aria-label={`Выбрать обложку ${option.title}`}
                />
                <div className="cover-outer">
                  <div
                    className={`cover-face cover-front ${
                      isCustom ? `bg-gradient-to-br ${option.gradient}` : ""
                    }`}
                    style={
                      option.image
                        ? {
                            backgroundImage: `url(${option.image})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    <span className="tag">{option.title}</span>
                    <div className="meta font-serif">{option.subtitle}</div>
                  </div>
                  <div
                    className={`cover-face cover-back ${
                      isCustom ? `bg-gradient-to-br ${option.gradient}` : ""
                    } ${isCustom ? "cover-face--center" : ""}`}
                    style={
                      option.image
                        ? {
                            backgroundImage: `url(${option.image})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    {!isCustom && <span className="tag">{option.title}</span>}
                    <div className={`meta font-serif ${isCustom ? "meta--center" : ""}`}>
                      {isCustom ? (
                        <span className="cover-copy">{option.description}</span>
                      ) : (
                        option.subtitle
                      )}
                    </div>
                  </div>
                  <span className="cover-spine" aria-hidden="true" />
                  <span className="cover-edge" aria-hidden="true" />
                </div>
              </label>
            );
          })}
        </div>
      </section>
      <Footer />
    </div>
  );
}
