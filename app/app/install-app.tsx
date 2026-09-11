'use client';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [installed, setInstalled] = useState(false),
    [help, setHelp] = useState(false);
  useEffect(() => {
    if ('serviceWorker' in navigator)
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {});
    const media = window.matchMedia('(display-mode: standalone)');
    const check = () =>
      setInstalled(
        media.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    check();
    media.addEventListener('change', check);
    const before = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const after = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('appinstalled', after);
    return () => {
      media.removeEventListener('change', check);
      window.removeEventListener('beforeinstallprompt', before);
      window.removeEventListener('appinstalled', after);
    };
  }, []);
  async function install() {
    if (!prompt) {
      setHelp(true);
      return;
    }
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      setHelp(true);
    } finally {
      setPrompt(null);
    }
  }
  if (installed) return null;
  return (
    <>
      <button
        type="button"
        className="secondary install-app"
        onClick={() => void install()}
      >
        <Download size={17} />
        Instalar aplicativo
      </button>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar a OCA</DialogTitle>
            <DialogDescription>
              Abra este endereço no Chrome ou no Microsoft Edge. No menu do
              navegador, procure “Instalar aplicativo” ou “Instalar esta página
              como aplicativo”. No iPhone, use Compartilhar → Adicionar à Tela
              de Início.
            </DialogDescription>
          </DialogHeader>
          <p className="hint">
            A instalação cria um ícone e uma janela própria. O aplicativo
            precisa de internet para consultar e registrar operações.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
