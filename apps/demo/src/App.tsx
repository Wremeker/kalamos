import { useEffect, useState } from 'react';
import { EditorProvider } from '@kalamos/editor';
import { httpUploadAdapter } from './uploadAdapter';
import { Workspace } from './components/DocumentList';

const demoUser = { id: 'demo-user', name: 'Demo User', email: 'demo@example.com' };

function getRouteId(): string | null {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return hash.startsWith('doc/') ? hash.slice('doc/'.length) : null;
}

export function App() {
  const [docId, setDocId] = useState<string | null>(getRouteId());

  useEffect(() => {
    const onHashChange = () => setDocId(getRouteId());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const open = (id: string) => {
    window.location.hash = `#/doc/${id}`;
  };
  const back = () => {
    window.location.hash = '#/';
  };

  return (
    <EditorProvider uploadAdapter={httpUploadAdapter} user={demoUser}>
      <Workspace docId={docId} onOpen={open} onBack={back} />
    </EditorProvider>
  );
}
