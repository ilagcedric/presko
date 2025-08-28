'use client';

import ClientPanel from '../../../components/client/ClientPanel';
import { RealtimeProvider } from '@/app/RealtimeContext';

export default function ClientDynamicPage({ params }: { params: { id: string } }) {
  return (
    <RealtimeProvider>
      <ClientPanel params={params} />
    </RealtimeProvider>
  );
}
