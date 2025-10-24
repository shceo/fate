import React from "react";
import Logo from "./Logo.jsx";

export default function Footer() {
  return (
    <footer className="border-t border-line py-8 text-muted bg-gradient-to-t from-white/60 to-transparent">
      <div className="container mx-auto px-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-serif text-[1.1rem]">
            <Logo className="h-12 max-w-[200px]" />
          </div>
          <div className="mt-1">© 2025 Fate. Все права защищены.</div>
        </div>
        <div>
          <div>
            Напишите нам:{" "}
            <a className="underline" href="mailto:hello@fate.books">
              hello@my-fate.ru
            </a>
          </div>
          <div className="mt-1">Москва · Санкт-Петербург</div>
        </div>
      </div>
    </footer>
  );
}
