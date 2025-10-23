import React, { useMemo, useState } from "react";

export default function ExpandableText({ text, limit = 300 }) {
  const safeText = typeof text === "string" ? text : "";
  const normalized = useMemo(
    () => safeText.replace(/\r\n/g, "\n"),
    [safeText]
  );
  const needsClamp = normalized.length > limit;
  const [expanded, setExpanded] = useState(false);

  const collapsedText = useMemo(() => {
    if (!needsClamp) {
      return normalized.length ? normalized : "-";
    }
    const slice = normalized.slice(0, limit);
    const lastBreak = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
    const trimmed =
      lastBreak > Math.floor(limit * 0.6) ? slice.slice(0, lastBreak) : slice;
    return `${trimmed.trimEnd()}...`;
  }, [normalized, needsClamp, limit]);

  const fullText = normalized.length ? normalized : "-";
  const content = expanded ? fullText : collapsedText;
  const showToggle = needsClamp;

  return (
    <div className="space-y-2">
      <div className="relative whitespace-pre-wrap break-words">
        {content}
        {showToggle && !expanded ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[rgba(250,247,242,1)] via-[rgba(250,247,242,0.9)] to-transparent" />
        ) : null}
      </div>
      {showToggle ? (
        <button
          type="button"
          className="btn text-sm px-4 py-2"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Скрыть" : "Открыть больше"}
        </button>
      ) : null}
    </div>
  );
}
