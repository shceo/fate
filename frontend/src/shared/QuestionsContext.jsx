import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { apiPost } from "./api.js";

const QuestionsContext = createContext(null);

export function QuestionsProvider({ children }) {
  const { user } = useAuth();
  const interviewLocked = Boolean(user?.status);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const resetState = useCallback(() => {
    setQuestions([]);
    setAnswers({});
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

      setQuestions(Array.isArray(questionsPayload) ? questionsPayload : []);
      setAnswers(normalized);
      setLastSaved(null);
    } catch (error) {
      console.error("Failed to load questions:", error);
      if (!isActive) return;
      setQuestions([]);
      setAnswers({});
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

  const updateAnswer = useCallback((index, text) => {
    setAnswers((prev) => ({
      ...prev,
      [index]: text,
    }));
  }, []);

  const answeredCount = useMemo(() => {
    return questions.reduce((acc, _, idx) => {
      const value = answers[idx];
      return typeof value === "string" && value.trim() ? acc + 1 : acc;
    }, 0);
  }, [answers, questions]);

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
    Object.keys(answers || {}).forEach((key) => {
      const num = Number(key);
      if (Number.isFinite(num)) indexes.add(num);
    });

    const entries = Array.from(indexes)
      .sort((a, b) => a - b)
      .map((idx) => ({
        questionIndex: idx,
        text: answers[idx] ?? "",
      }));

    await apiPost("/api/answers", { entries });
    setLastSaved(new Date().toISOString());
  }, [answers, questions, interviewLocked]);

  const value = useMemo(
    () => ({
      questions,
      answers,
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
    }),
    [
      questions,
      answers,
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
