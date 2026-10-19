import type { Metadata } from 'next';
import DualStreamCopilot from '@/components/interview/DualStreamCopilot';

export const metadata: Metadata = {
  title: 'Interview Copilot | Ghostboard',
  description: 'Dual-stream live dialogue and AI teleprompter.',
};

export default function InterviewPage() {
  return <DualStreamCopilot />;
}
