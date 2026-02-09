import { useState, useEffect, useCallback } from 'react';
import { ClinicalInsight, ClinicalHistory } from '../lib/types/ai';
import { analyzeClinicalCase, getClinicalHistory } from '../lib/api/ai';

export function useAiChat() {
  const [history, setHistory] = useState<ClinicalHistory[]>([]);
  const [currentResult, setCurrentResult] = useState<ClinicalInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await getClinicalHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const analyze = async (query: string) => {
    setLoading(true);
    setError(null);
    setCurrentResult(null);
    try {
      const result = await analyzeClinicalCase(query);
      setCurrentResult(result);
      loadHistory();
      return result;
    } catch {
      setError('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return { history, currentResult, loading, historyLoading, error, analyze, loadHistory };
}
