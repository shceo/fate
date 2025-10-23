import asyncio 
import logging
import os
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv
from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    Update,
)
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

BOT_TOKEN = os.environ.get("TG_BOT_TOKEN")
BOT_SECRET = os.environ.get("TG_BOT_INTERNAL_SECRET")
API_BASE = os.environ.get("API_BASE", "http://localhost:8787").rstrip("/")
SITE_URL = os.environ.get("SITE_URL", "https://my-fate.ru").rstrip("/")

if not BOT_TOKEN:
    raise RuntimeError("TG_BOT_TOKEN environment variable is required")
if not BOT_SECRET:
    raise RuntimeError("TG_BOT_INTERNAL_SECRET environment variable is required")


def build_claim_payload(
    nonce: str, update: Update, phone: Optional[str] = None
) -> dict[str, object]:
    user = update.effective_user
    payload: dict[str, object] = {
        "nonce": nonce,
        "tg_id": user.id,
    }
    if user.first_name:
        payload["first_name"] = user.first_name
    if user.last_name:
        payload["last_name"] = user.last_name
    if user.username:
        payload["username"] = user.username
    if phone:
        payload["phone"] = phone
    return payload


async def post_claim(payload: dict[str, object]) -> Optional[requests.Response]:
    """Send claim payload to the Fate API in a thread pool."""

    def _do_post() -> requests.Response:
        return requests.post(
            f"{API_BASE}/api/auth/tg_claim",
            json=payload,
            headers={"X-TG-BOT-SECRET": BOT_SECRET},
            timeout=10,
        )

    try:
        return await asyncio.to_thread(_do_post)
    except Exception:
        logger.exception("Failed to call /api/auth/tg_claim")
        return None


def contact_keyboard() -> ReplyKeyboardMarkup:
    button = KeyboardButton("Отправить номер телефона", request_contact=True)
    return ReplyKeyboardMarkup([[button]], resize_keyboard=True, one_time_keyboard=True)


def site_keyboard(text: str = "Открыть сайт") -> InlineKeyboardMarkup:
    button = InlineKeyboardButton(text, url=SITE_URL)
    return InlineKeyboardMarkup([[button]])


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    args = context.args

    # Без кода — показываем приветствие + инлайн-кнопку на сайт
    if not args:
        await message.reply_text(
            "Здравствуйте! Я помогу познакомиться с сервисом и оформить заказ.\n"
            "Нажмите «Открыть сайт», чтобы посмотреть услуги, примеры и условия. "
            "Если вы уже на сайте — продолжайте там, мы вас узнаем автоматически",
            reply_markup=site_keyboard("Открыть сайт"),
        )
        return
    nonce = args[0]
    context.user_data["nonce"] = nonce

    payload = build_claim_payload(nonce, update)
    response = await post_claim(payload)
    if not response or not response.ok:
        status = response.status_code if response else "нет ответа"
        await message.reply_text(
            f"Не удалось подтвердить вход (status: {status}). Попробуйте позже."
        )
        return

    await message.reply_text(
        "Отлично! Авторизация прошла.\n"
        "Вернитесь на сайт по кнопке ниже.\n"
        "Чтобы мы могли оперативно связаться, отправьте номер кнопкой ниже (по желанию).",
        reply_markup=site_keyboard("Вернуться на сайт"),
    )

    # Отдельным сообщением — клавиатура для отправки телефона
    await message.reply_text(
        "Отправьте номер (по желанию):",
        reply_markup=contact_keyboard(),
    )


async def handle_contact(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    contact = update.effective_message.contact
    nonce = context.user_data.get("nonce")
    if not nonce:
        await update.effective_message.reply_text(
            "Нет активного входа. Откройте ссылку через кнопку на сайте ещё раз."
        )
        return

    if contact.user_id != update.effective_user.id:
        await update.effective_message.reply_text(
            "Можно отправлять только свой собственный номер телефона."
        )
        return

    payload = build_claim_payload(
        nonce,
        update,
        phone=contact.phone_number,
    )
    response = await post_claim(payload)
    if not response or not response.ok:
        status = response.status_code if response else "нет ответа"
        await update.effective_message.reply_text(
            f"Не удалось сохранить телефон (status: {status}). Попробуйте позже.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    await update.effective_message.reply_text(
        "Спасибо! Телефон обновлён. Можно закрыть диалог.",
        reply_markup=ReplyKeyboardRemove(),
    )


async def help_command(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        "Чтобы просто посмотреть услуги — нажмите «Открыть сайт». "
        "Для входа откройте ссылку с сайта — бот подтвердит авторизацию автоматически."
    )


def main() -> None:
    application = ApplicationBuilder().token(BOT_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(MessageHandler(filters.CONTACT, handle_contact))

    application.run_polling()


if __name__ == "__main__":
    main()
