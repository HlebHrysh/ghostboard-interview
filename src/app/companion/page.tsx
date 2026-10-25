import { redirect } from 'next/navigation';

export default function CompanionPage() {
  redirect('/interview?modal=companion');
}
