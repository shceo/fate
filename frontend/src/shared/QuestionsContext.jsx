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
  const [answersMeta, setAnswersMeta] = useState({});
  const [answersVersion, setAnswersVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const resetState = useCallback(() => {
    setQuestions([]);
    answersRef.current = {};
    setAnswersMeta({});
    setAnswersVersion((prev) => prev + 1);
    setLoading(false);
    setLoaded(true);
    setLastSaved(null);
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

      const preparedQuestions = Array.isArray(questionsPayload)
        ? questionsPayload
        : [];
      answersRef.current = normalized;
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
      setAnswersMeta({});
      answersRef.current = {};
      setAnswersVersion((prev) => prev + 1);
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
    ],
  );

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
