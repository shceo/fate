import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { useAuth } from "../shared/AuthContext.jsx";
import { useQuestions } from "../shared/QuestionsContext.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const { loaded, loading, totalCount, answeredCount, interviewLocked } =
    useQuestions();

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
  const coverLabel = user?.cover ?? "Обложка ещё не выбрана";

  return (
    <div>
      <Header />

      <section className="container mx-auto px-4 mt-4 grid gap-4 md:grid-cols-[280px_1fr] items-start">
        <aside className="paper p-4 space-y-4">
          <div>
            <h2 className="font-serif text-[clamp(1.4rem,3.2vw,2rem)]">
              {greeting}
            </h2>
            <p className="text-muted">
              Здесь собрана основная информация о вашем проекте. При необходимости вы всегда можете перейти к заполнению вопросов.
            </p>
          </div>
          <div className="border-t border-dashed border-line pt-4">
            <div className="font-semibold mb-2">Обложка</div>
            <div className="flex items-center gap-2">
              <div className="cover bg-gradient-to-br from-blush to-lav w-[84px] min-w-[84px]">
                <div className="meta">{coverLabel}</div>
              </div>
              <Link className="btn" to="/covers">
                Выбрать обложку
              </Link>
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
                  <div className="font-semibold">Ответы отправлены редакции</div>
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
              <Link className="btn primary" to="/qa">
                Перейти к вопросам
              </Link>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 border border-line rounded-[14px] bg-[rgba(255,255,255,.65)]">
              <span className="text-xl" aria-hidden="true">
                ⏳
              </span>
              <div>
                <div className="font-semibold">Вопросы ещё не назначены</div>
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
    </div>
  );
}
