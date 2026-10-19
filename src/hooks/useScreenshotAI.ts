import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { InterviewQAItem } from '@/types/interview';
import { CandidateProfile } from '@/components/CandidateProfileModal';

interface UseScreenshotAIOptions {
  speechLanguageRef: React.MutableRefObject<string>;
  outputLanguageRef: React.MutableRefObject<string>;
  candidateProfileRef: React.MutableRefObject<CandidateProfile>;
  tabCaptureRef: React.MutableRefObject<any>;
  setInterviewQAs: React.Dispatch<React.SetStateAction<InterviewQAItem[]>>;
  setActiveQAId: (id: string) => void;
  isFrozenRef: React.MutableRefObject<boolean>;
  activeQAIdRef: React.MutableRefObject<string | null>;
  setPendingNewCount: React.Dispatch<React.SetStateAction<number>>;
  hudBroadcastRef: React.MutableRefObject<BroadcastChannel | null>;
  sessionModeRef: React.MutableRefObject<'interview' | 'meeting'>;
  sessionDuration: number;
}

export function useScreenshotAI({
  speechLanguageRef,
  outputLanguageRef,
  candidateProfileRef,
  tabCaptureRef,
  setInterviewQAs,
  setActiveQAId,
  isFrozenRef,
  activeQAIdRef,
  setPendingNewCount,
  hudBroadcastRef,
  sessionModeRef,
  sessionDuration,
}: UseScreenshotAIOptions) {
  const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const captureScreenFrame = async (): Promise<string | null> => {
    if (!tabCaptureRef.current?.stream) return null;
    const videoTrack = tabCaptureRef.current.stream.getVideoTracks()[0];
    if (!videoTrack) return null;

    try {
      const imageCapture = new (window as any).ImageCapture(videoTrack);
      const bitmap = await imageCapture.grabFrame();

      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0);

      const dataUrl = canvas.toDataURL('image/png', 0.8);
      return dataUrl.split(',')[1]; 
    } catch (err) {
      console.warn('Failed to capture local video frame:', err);
    }
    return null;
  };

  const analyzeScreenshotData = (data: any) => {
    if (data?.quickAnswer) {
      const now = Date.now();
      const finalQA: InterviewQAItem = {
        id: `qa_${now}`,
        timestamp: now,
        timecode: formatTime(sessionDuration),
        question: data.question || 'Знімок екрана (Аналіз коду)',
        startHook: data.startHook || data.quickAnswer,
        quickAnswer: data.quickAnswer,
        hints: data.hints?.length ? data.hints : ['Опиши логіку', 'Оціни складність алгоритму'],
        tag: data.tag || '#VisionAI',
        codeSnippet: data.codeSnippet,
        deliveryTip: data.deliveryTip,
      };

      setInterviewQAs((prev) => [finalQA, ...prev]);

      if (isFrozenRef.current) {
        setPendingNewCount((prev) => prev + 1);
        toast.info('📸 Vision AI проаналізував код (+1 у черзі). [Space] для переходу.', {
          id: 'freeze-queue-toast',
          duration: 4000,
        });
      } else {
        setActiveQAId(finalQA.id);
        activeQAIdRef.current = finalQA.id;
      }

      fetch('/api/ai/interview-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_OR_UPDATE_QA',
          qa: finalQA,
          activeId: isFrozenRef.current ? activeQAIdRef.current : finalQA.id,
        }),
      }).catch(() => {});

      hudBroadcastRef.current?.postMessage({
        type: 'NEW_QA',
        qa: finalQA,
      });
    }
  };

  const handleTriggerScreenshot = async () => {
    if (isAnalyzingScreenshot) return;
    setIsAnalyzingScreenshot(true);
    const toastId = toast.loading('📸 Роблю знімок екрана та аналізую код (Gemini Vision)...');

    try {
      const liveFrameBase64 = await captureScreenFrame();

      let res: Response;
      if (liveFrameBase64) {
        res = await fetch('/api/ai/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: liveFrameBase64,
            mimeType: 'image/png',
            locale: speechLanguageRef.current,
            outputLanguage: outputLanguageRef.current,
            candidateProfile: candidateProfileRef.current,
            sessionMode: sessionModeRef.current,
          }),
        });
      } else {
        res = await fetch('/api/ai/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            captureHost: true,
            locale: speechLanguageRef.current,
            outputLanguage: outputLanguageRef.current,
            candidateProfile: candidateProfileRef.current,
            sessionMode: sessionModeRef.current,
          }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Помилка захоплення екрана ПК');
      }

      const data = await res.json();
      analyzeScreenshotData(data);

      toast.success(
        data.codeFound
          ? `✅ Код (${data.language || 'Code'}) проаналізовано!`
          : '📸 Знімок екрана оброблено!',
        { id: toastId }
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Помилка аналізу екрана', { id: toastId });
    } finally {
      setIsAnalyzingScreenshot(false);
    }
  };

  const handleTriggerScreenshotRef = useRef(handleTriggerScreenshot);
  useEffect(() => {
    handleTriggerScreenshotRef.current = handleTriggerScreenshot;
  }, [handleTriggerScreenshot]);
  return {
    isAnalyzingScreenshot,
    handleTriggerScreenshot,
    handleTriggerScreenshotRef,
  };
}
