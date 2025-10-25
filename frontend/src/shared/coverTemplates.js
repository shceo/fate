import templateImage1 from "../assets/templets/temp_1.png";
import templateImageHero from "../assets/templets/main_temp.png";

export const COVER_TEMPLATES = [
  {
    slug: "custom",
    title: "Индивидуальный дизайн",
    subtitle: "Создадим обложку специально под вашу историю",
    description:
      "✨ Индивидуальный дизайн активирован. Это дополнительная услуга — мы свяжемся, чтобы уточнить детали и стоимость.",
    isCustom: true,
    gradient: "from-lav to-sky",
    aliases: ["Индивидуальный дизайн — Создадим обложку специально под вашу историю"],
  },
  {
    slug: "temp-1",
    title: "Нежный архив",
    subtitle: "Тёплые оттенки и мягкая фактура для семейных историй",
    image: templateImage1,
    aliases: ["Нежный архив — Тёплые оттенки и мягкая фактура для семейных историй"],
  },
  {
    slug: "temp-2",
    title: "Современная геометрия",
    subtitle: "Выразительная композиция и лаконичные линии",
    image: templateImageHero,
    aliases: [
      "Современная геометрия — Выразительная композиция и лаконичные линии",
      "main_temp",
    ],
  },
];

export function getCoverTemplate(slug) {
  if (!slug) return null;
  return COVER_TEMPLATES.find((template) => template.slug === slug) ?? null;
}

function matchTemplateByLabel(label) {
  if (!label) return null;
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;

  const direct = COVER_TEMPLATES.find((template) => {
    const titleNorm = template.title.trim().toLowerCase();
    return normalized === titleNorm;
  });
  if (direct) return direct;

  const startsWithMatch = COVER_TEMPLATES.find((template) => {
    const titleNorm = template.title.trim().toLowerCase();
    return normalized.startsWith(titleNorm);
  });
  if (startsWithMatch) return startsWithMatch;

  return COVER_TEMPLATES.find((template) => {
    if (!Array.isArray(template.aliases)) return false;
    return template.aliases.some(
      (alias) => typeof alias === "string" && normalized === alias.trim().toLowerCase()
    );
  });
}

export function parseCoverValue(raw) {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null) {
    const { slug = null, label = null, subtitle = null } = raw;
    return { slug, label, subtitle };
  }
  if (typeof raw !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const { slug = null, label = null, subtitle = null } = parsed;
      if (slug || label) {
        return { slug, label, subtitle };
      }
    }
  } catch (_) {
    // Intentionally swallow JSON parse errors — fall back to legacy string
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return { slug: null, label: trimmed, subtitle: null };
}

export function resolveCoverDisplay(rawValue) {
  const parsed = parseCoverValue(rawValue);
  if (!parsed) {
    return {
      slug: null,
      title: null,
      subtitle: null,
      template: null,
      label: null,
    };
  }
  let template = parsed.slug ? getCoverTemplate(parsed.slug) : null;
  if (!template && parsed.label) {
    template = matchTemplateByLabel(parsed.label);
  }

  let subtitle = parsed.subtitle ?? template?.subtitle ?? null;
  if (!parsed.subtitle && parsed.label) {
    const labelParts = parsed.label.split("—");
    if (labelParts.length > 1) {
      const candidate = labelParts.slice(1).join("—").trim();
      if (candidate.length) {
        subtitle = candidate;
      }
    }
  }

  return {
    slug: parsed.slug ?? template?.slug ?? null,
    title: template?.title ?? (parsed.label ? parsed.label.split("—")[0].trim() : null),
    subtitle,
    template,

  }
}