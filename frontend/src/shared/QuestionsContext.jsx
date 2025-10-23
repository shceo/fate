import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { apiPost } from "./api.js";

const QuestionsContext = createContext(null);

export function QuestionsProvider({ children }) {
  const { user } = useAuth();
  const interviewLocked = Boolean(user?.status);
  const answersRef = useRef({});
  const [questions, setQuestions] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [answersMeta, setAnswersMeta] = useState({});
  const [answersVersion, setAnswersVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [resumeIndex, setResumeIndex] = useState(null);

  const resetState = useCallback(() => {
    setQuestions([]);
    setChapters([]);
    answersRef.current = {};
    setAnswersMeta({});
    setAnswersVersion((prev) => prev + 1);
    setLoading(false);
    setLoaded(true);
    setLastSaved(null);
    setResumeIndex(null);
  }, []);

  const load = useCallback(async () => {
    if (!user || interviewLocked) {
      resetState();
      return;
    }

    setLoading(true);
    setLoaded(false);
    let isActive = true;

    try {
      const [qRes, aRes] = await Promise.all([
        fetch("/api/questions", { credentials: "include" }),
        fetch("/api/answers", { credentials: "include" }),
      ]);

      if (!isActive) return;

      const questionsPayload = qRes.ok ? await qRes.json() : [];
      const answersPayload = aRes.ok ? await aRes.json() : [];

      const normalized = {};
      answersPayload.forEach((entry) => {
        if (entry && Number.isFinite(Number(entry.questionIndex))) {
          normalized[Number(entry.questionIndex)] = String(entry.text ?? "");
        }
      });

      let preparedQuestions = [];
      let preparedChapters = [];

      if (Array.isArray(questionsPayload)) {
        preparedQuestions = questionsPayload;
      } else if (questionsPayload && typeof questionsPayload === "object") {
        const rawQuestions = Array.isArray(questionsPayload.questions)
          ? questionsPayload.questions
          : [];
        preparedQuestions = rawQuestions.map((entry) => {
          if (typeof entry === "string") return entry;
          if (entry && typeof entry.text === "string") return entry.text;
          return "";
        });
        preparedChapters = Array.isArray(questionsPayload.chapters)
          ? questionsPayload.chapters.map((chapter) => ({
              id: chapter.id ?? null,
              title: chapter.title ?? "",
              position: Number(chapter.position ?? 0),
              questionCount: Number(chapter.questionCount ?? 0),
              startIndex: Number(chapter.startIndex ?? 0),
            }))
          : [];
      }

      if (!preparedChapters.length) {
        preparedChapters = [
          {
            id: null,
            title: "",
            position: 0,
            questionCount: preparedQuestions.length,
            startIndex: 0,
          },
        ];
      }

      answersRef.current = normalized;
      setChapters(preparedChapters);
      const nextMeta = {};
      Object.keys(normalized).forEach((key) => {
        const num = Number(key);
        if (!Number.isFinite(num)) return;
        const text = normalized[num];
        if (typeof text === "string" && text.trim()) {
          nextMeta[num] = true;
        }
      });
      setQuestions(preparedQuestions);
      setAnswersMeta(nextMeta);
      setAnswersVersion((prev) => prev + 1);
      setLastSaved(null);
    } catch (error) {
      console.error("Failed to load questions:", error);
      if (!isActive) return;
      setQuestions([]);
      setChapters([]);
      setAnswersMeta({});
      answersRef.current = {};
      setAnswersVersion((prev) => prev + 1);
      setResumeIndex(null);
    } finally {
      if (!isActive) return;
      setLoading(false);
      setLoaded(true);
    }

    return () => {
      isActive = false;
    };
  }, [user, interviewLocked, resetState]);

  useEffect(() => {
    let dispose;
    load().then((cleanup) => {
      dispose = cleanup;
    });
    return () => {
      if (typeof dispose === "function") dispose();
    };
  }, [load]);

  const updateAnswer = useCallback((rawIndex, rawText) => {
    const index = Number(rawIndex);
    if (!Number.isFinite(index)) return;
    const text = typeof rawText === "string" ? rawText : "";
    const store = answersRef.current || {};
    const existing = store[index] ?? "";
    if (existing === text) return;
    store[index] = text;
    answersRef.current = store;
    setAnswersMeta((prev) => {
      const hasText = text.trim().length > 0;
      const previous = prev[index] ?? false;
      if (hasText === previous) {
        return prev;
      }
      const next = { ...prev };
      if (hasText) {
        next[index] = true;
      } else {
        delete next[index];
      }
      return next;
    });
    setAnswersVersion((prev) => prev + 1);
  }, []);

  const answeredCount = useMemo(() => {
    if (!questions.length) return 0;
    return questions.reduce((acc, _, idx) => {
      return answersMeta[idx] ? acc + 1 : acc;
    }, 0);
  }, [answersMeta, questions]);

  const totalCount = useMemo(() => questions.length, [questions]);

  const progress = useMemo(() => {
    if (!totalCount) return 0;
    return Math.round((answeredCount / totalCount) * 100);
  }, [answeredCount, totalCount]);

  const saveAnswers = useCallback(async () => {
    if (interviewLocked) {
      throw new Error("Анкета уже отправлена и недоступна для редактирования.");
    }

    const indexes = new Set();
    questions.forEach((_, idx) => indexes.add(idx));
    const answersSnapshot = answersRef.current || {};
    Object.keys(answersSnapshot).forEach((key) => {
      const num = Number(key);
      if (Number.isFinite(num)) indexes.add(num);
    });

    const entries = Array.from(indexes)
      .sort((a, b) => a - b)
      .map((idx) => ({
        questionIndex: idx,
        text: answersSnapshot[idx] ?? "",
      }));

    await apiPost("/api/answers", { entries });
    setLastSaved(new Date().toISOString());
  }, [questions, interviewLocked, answersRef]);

  const getAnswer = useCallback((rawIndex) => {
    const index = Number(rawIndex);
    if (!Number.isFinite(index)) return "";
    const store = answersRef.current || {};
    return store[index] ?? "";
  }, []);

  const value = useMemo(
    () => ({
      questions,
      getAnswer,
      updateAnswer,
      answeredCount,
      totalCount,
      progress,
      saveAnswers,
      loading,
      loaded,
      lastSaved,
      interviewLocked,
      reload: load,
      answersVersion,
      chapters,
      resumeIndex,
    }),
    [
      questions,
      getAnswer,
      updateAnswer,
      answeredCount,
      totalCount,
      progress,
      saveAnswers,
      loading,
      loaded,
      lastSaved,
      interviewLocked,
      load,
      answersVersion,
      chapters,
      resumeIndex,
    ],
  );

  useEffect(() => {
    if (!questions.length) {
      setResumeIndex(null);
      return;
    }
    let nextIndex = null;
    for (let idx = 0; idx < questions.length; idx += 1) {
      if (!answersMeta[idx]) {
        nextIndex = idx;
        break;
      }
    }
    if (nextIndex === null) {
      nextIndex = questions.length - 1;
    }
    setResumeIndex(nextIndex);
  }, [questions, answersMeta]);

  return (
    <QuestionsContext.Provider value={value}>
      {children}
    </QuestionsContext.Provider>
  );
}

export function useQuestions() {
  const ctx = useContext(QuestionsContext);
  if (!ctx) {
    throw new Error("useQuestions must be used within QuestionsProvider");
  }
  return ctx;
}
