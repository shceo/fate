import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Footer from "../components/Footer.jsx";
import { apiPost } from "../shared/api.js";

const coverOptions = [
  {
    title: "Индивидуальный дизайн",
    subtitle: "Создадим обложку специально под вашу историю",
    gradient: "from-lav to-sky",
    isCustom: true,
    backMessage:
      "✨ Индивидуальный дизайн активирован. Это платная услуга. Наш админ скоро напишет вам в ЛС, чтобы утвердить детали и стоимость",
  },
  {
    title: "Пастельная классика",
    subtitle: "Тёплая палитра и спокойный ритм — для семейных историй",
    gradient: "from-sage to-gold",
  },
  {
    title: "Современная фактура",
    subtitle: "Минималистичный рисунок и строгая композиция",
    gradient: "from-blush to-lav",
  },
  {
    title: "Акварельный рельеф",
    subtitle: "Лёгкие мазки и динамика пятен для творческих сюжетов",
    gradient: "from-[#f9f1ea] to-gold",
  },
  {
    title: "Лавандовые облака",
    subtitle: "Нежное сочетание оттенков с воздушным объёмом",
    gradient: "from-sky to-sage",
  },
  {
    title: "Городские огни",
    subtitle: "Контрастные блоки и световые вспышки в ночном городе",
    gradient: "from-[#f6e9e4] to-[#f1f3f9]",
  },
  {
    title: "Рукописные заметки",
    subtitle: "Фрагменты бумаги и рукописных строк с деликатным тоном",
    gradient: "from-[#efe8de] to-[#f6f0ea]",
  },
  {
    title: "Скандинавский минимализм",
    subtitle: "Чистые линии и комфортная палитра для современных историй",
    gradient: "from-[#eee8ff] to-[#f7f2ea]",
  },
];

export default function Covers() {
  const navigate = useNavigate();
  const [selection, setSelection] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [customFlip, setCustomFlip] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!selection) return null;
    return `${selection.title} — ${selection.subtitle}`;
  }, [selection]);

  const handlePick = async (option) => {
    if (busy) return;
    const isCustom = Boolean(option.isCustom);
    if (isCustom) {
      setCustomFlip(true);
    } else {
      setCustomFlip(false);
    }
    setBusy(true);
    setError("");
    try {
      const label = `${option.title} — ${option.subtitle}`;
      await apiPost("/api/cover", { name: label });
      setSelection(option);
      if (isCustom) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
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
                Мы сохранили шаблон&nbsp;
                <span className="font-medium text-[#5b5246]">
                  {selectedLabel}
                </span>
                .
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
          <div className="card-glass px-4 py-3 text-sm text-[#a23a2f]">
            {error}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {coverOptions.map((option) => {
            const label = `${option.title} — ${option.subtitle}`;
            const isSelected = selection?.title === option.title;
            const isCustom = Boolean(option.isCustom);
            const isFlipped = isCustom && customFlip;
            return (
              <label
                key={option.title}
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
                  aria-label={`Выбрать обложку ${label}`}
                />
                <div className="cover-outer">
                  <div
                    className={`cover-face cover-front bg-gradient-to-br ${option.gradient}`}
                  >
                    <span className="tag">{option.title}</span>
                    <div className="meta font-serif">{option.subtitle}</div>
                  </div>
                  <div
                    className={`cover-face cover-back bg-gradient-to-br ${option.gradient} ${
                      isCustom ? "cover-face--center" : ""
                    }`}
                  >
                    {!isCustom && <span className="tag">{option.title}</span>}
                    <div className={`meta font-serif ${isCustom ? "meta--center" : ""}`}>
                      {isCustom ? (
                        <span className="cover-copy">{option.backMessage}</span>
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
