import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useAuth } from "../shared/AuthContext.jsx";
import { useQuestions } from "../shared/QuestionsContext.jsx";
import { resolveCoverDisplay } from "../shared/coverTemplates.js";

export default function Dashboard() {
  const { user } = useAuth();
  const { loaded, loading, totalCount, answeredCount, interviewLocked } =
    useQuestions();
  const navigate = useNavigate();
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);

  const greeting = user?.name
    ? `Добро пожаловать, ${user.name}`
    : "Добро пожаловать";
  const hasQuestions = loaded && totalCount > 0;
  const questionsSummary =
    hasQuestions && !interviewLocked
      ? `Ответов: ${answeredCount} из ${totalCount}`
      : null;
  const showQuestionsButton = hasQuestions && !interviewLocked;
  const loadingQuestions = loading || !loaded;
  const coverSource = {
    slug: user?.cover?.slug ?? user?.coverSlug ?? null,
    label: user?.cover?.label ?? user?.coverTitle ?? user?.coverLabel ?? null,
    subtitle: user?.cover?.subtitle ?? user?.coverSubtitle ?? null,
  };
  const coverDisplay = resolveCoverDisplay(coverSource);
  const coverTemplate = coverDisplay.template;
  const hasCover = Boolean(coverDisplay.title);

  return (
    <div>
      <Header />

      <section className="container mx-auto px-4 mt-4 grid gap-4 md:grid-cols-[280px_1fr] items-start">
        <aside className="paper p-4 space-y-4">
          <div>
            <h2 className="font-serif text-[clamp(1.4rem,3.2vw,2rem)] text-ink">
              {greeting}
            </h2>
            <p className="text-muted">
              Здесь собрана основная информация о вашем проекте. При необходимости вы всегда можете перейти к заполнению вопросов.
            </p>
          </div>
          <div className="border-t border-dashed border-line pt-4 space-y-2">
            <div className="font-semibold">Обложка</div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-[110px] h-[150px] rounded-[16px] overflow-hidden shadow-tiny border border-line bg-gradient-to-br from-lav to-sky">
                {coverTemplate?.image ? (
                  <img
                    src={coverTemplate.image}
                    alt={coverDisplay.title ?? "Выбранный шаблон обложки"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center px-3 text-center text-sm text-white/90">
                    {hasCover ? coverDisplay.title : "Шаблон не выбран"}
                  </div>
                )}
              </div>
              <div className="space-y-1 min-w-[200px]">
                <div className="font-semibold">
                  {coverDisplay.title ?? "Обложка ещё не выбрана"}
                </div>
                <div className="text-muted text-sm">
                  {coverDisplay.subtitle ?? "Выберите шаблон, чтобы мы могли подготовить обложку."}
                </div>
                <Link className="btn mt-2" to="/covers">
                  {hasCover ? "Изменить обложку" : "Выбрать обложку"}
                </Link>
              </div>
            </div>
          </div>

          {user?.email && (
            <div className="border-t border-dashed border-line pt-4 space-y-1">
              <div className="font-semibold">Учётная запись</div>
              <div className="text-muted text-sm">Email: {user.email}</div>
              {user?.createdAt && (
                <div className="text-muted text-sm">
                  Вы с нами с{" "}
                  {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              )}
            </div>
          )}
        </aside>

        <main className="paper p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="font-serif text-xl">Ваш проект</h3>
            <p className="text-muted">
              Здесь отображаются актуальные данные по интервью.
            </p>
          </div>

          {loadingQuestions ? (
            <div className="text-center text-muted py-10">
              Загружаем информацию...
            </div>
          ) : interviewLocked ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 border border-line rounded-[14px] bg-[rgba(255,255,255,.65)]">
                <span className="text-xl" aria-hidden="true">
                  ✅
                </span>
                <div>
                  <div className="font-semibold text-ink">Ответы отправлены редакции</div>
                  <div className="text-muted">
                    Мы изучим ваши материалы и свяжемся, если потребуются
                    уточнения. Следите за статусом проекта на итоговой странице.
                  </div>
                </div>
              </div>
              <Link className="btn" to="/complete">
                Открыть итоговую страницу
              </Link>
            </div>
          ) : showQuestionsButton ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 border border-line rounded-[14px] bg-[rgba(255,255,255,.65)]">
                <span className="text-xl" aria-hidden="true">
                  ✍️
                </span>
                <div>
                  <div className="font-semibold">
                    Вопросы готовы к заполнению
                  </div>
                  <div className="text-muted">
                    Вы можете отвечать в удобном темпе. Все изменения
                    сохраняются на странице вопросов.
                  </div>
                  {questionsSummary && (
                    <div className="text-muted text-sm mt-2">
                      {questionsSummary}
                    </div>
                  )}
                </div>
              </div>
              <button
                className="btn primary"
                onClick={() => setShowQuestionDialog(true)}
              >
                Перейти к вопросам
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 border border-line rounded-[14px] bg-[rgba(255,255,255,.65)]">
              <span className="text-xl" aria-hidden="true">
                ⏳
              </span>
              <div>
                <div className="font-semibold text-ink">Вопросы ещё не назначены</div>
                <div className="text-muted">
                  Как только редакция подготовит список вопросов, мы отправим
                  уведомление и вы сможете перейти к заполнению.
                </div>
              </div>
            </div>
          )}
        </main>
      </section>

      <Footer />

      <ConfirmDialog
        open={showQuestionDialog}
        title="готовы поделиться кусочком себя?"
        message="Отвечайте искренне и подробно — мы буквально превратим ваши слова в книгу. Чем глубже ответы, тем теплее получится результат."
        confirmLabel="Я готов(а)"
        cancelLabel="Не сейчас"
        confirmTone="primary"
        onConfirm={() => {
          setShowQuestionDialog(false);
          navigate("/qa");
        }}
        onCancel={() => setShowQuestionDialog(false)}
      />
    </div>
  );
}
