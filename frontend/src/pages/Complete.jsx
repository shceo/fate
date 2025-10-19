import React from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import Progress from "../components/Progress.jsx";

export default function Complete() {
  const showStatus = false; // Измените на true, чтобы показать альтернативный пример статуса производства

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
            <h2 className="font-serif text-[1.6rem] mb-1">
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
            {!showStatus ? (
              <div className="status">
                <span className="text-lg" aria-hidden="true">
                  ℹ️
                </span>
                <div>
                  <div className="font-semibold">
                    Рукопись передана в редакцию на согласование
                  </div>
                  <div className="text-muted">
                    Мы сообщим, когда потребуется ваша обратная связь или будет
                    готов первый макет книги.
                  </div>
                </div>
              </div>
            ) : (
              <div className="status">
                <span className="text-lg" aria-hidden="true">
                  ✅
                </span>
                <div>
                  <div className="font-semibold">
                    Тираж готов: ожидает выдачи в студии Fate
                  </div>
                  <div className="text-muted">
                    Куратор свяжется с вами в ближайшее время, чтобы согласовать
                    дату получения.
                  </div>
                </div>
              </div>
            )}
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
