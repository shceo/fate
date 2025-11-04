import React, { useEffect } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import Progress from "../components/Progress.jsx";
import { useAuth } from "../shared/AuthContext.jsx";
import { getOrderStatusLabel } from "../shared/orderStatus.js";

export default function Complete() {
  const { user, refreshUser } = useAuth();
  const ordered = Boolean(user?.ordered);
  const orderStatusLabel =
    user?.statusLabel ?? getOrderStatusLabel(user?.status);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const orderStatusHeading = ordered
    ? "Заказ подтверждён"
    : "Ожидает подтверждения";
  const orderStatusDescription = ordered
    ? "Мы уже работаем над вашей книгой и будем обновлять статус по мере продвижения."
    : "Подтвердите заказ, чтобы мы могли перейти к подготовке книги.";
  const projectStageText = orderStatusLabel
    ? `Этап проекта: ${orderStatusLabel}.`
    : "Статус проекта появится, как только редакция начнёт работу.";

  return (
    <div>
      <Header />
      <div className="topbar">
        <div className="container mx-auto px-4 py-3 text-muted">
          Интервью отправлено редакции
        </div>
      </div>
      <section className="container mx-auto px-4 py-6">
        <div className="paper p-5 space-y-4">
          <div>
            <h2 className="font-serif text-[1.6rem] mb-1 text-ink">
              Спасибо! Мы получили ваши ответы.
            </h2>
            <p className="text-muted">
              Редакционная команда уже приступила к подготовке рукописи. Если
              появятся дополнительные вопросы, куратор свяжется с вами.
            </p>
          </div>

          <hr className="hairline" />

          <div>
            <h3 className="mb-2">Что будет дальше</h3>
            <div className="grid md:grid-cols-[160px_1fr] gap-3 items-center">
              <div className="cover bg-gradient-to-br from-blush to-lav w-[160px]">
                <div className="meta">Обложка: выбрана в кабинете</div>
              </div>
              <p className="text-muted m-0">
                Мы соберём текст, подготовим редакторский конспект и передадим
                материалы дизайнеру. После утверждения макета организуем печать
                тиража.
              </p>
            </div>
          </div>

          <hr className="hairline" />

          <div>
            <h3 className="mb-2">Готовность интервью</h3>
            <Progress value={100} />
            <p className="mt-2">
              100% вопросов заполнено — дальше команда Fate ведёт работу над
              книгой и будет держать вас в курсе.
            </p>
          </div>

          <hr className="hairline" />

          <div>
            <h3 className="mb-2">Статус производства</h3>
            <div className="status">
              <span className="text-lg" aria-hidden="true">
                ℹ️
              </span>
              <div>
                <div className="font-semibold">{orderStatusHeading}</div>
                <div className="text-muted">{orderStatusDescription}</div>
                <div className="text-muted mt-1">{projectStageText}</div>
              </div>
            </div>
            <p className="text-muted mt-2">
              (Эта страница всегда доступна в кабинете, чтобы вы могли отслеживать
              ход работы и обновления проекта.)
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
