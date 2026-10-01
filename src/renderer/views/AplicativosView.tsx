import React, { useState } from 'react';
import { 
  AppWindow, 
  Smartphone, 
  Globe, 
  CreditCard, 
  QrCode, 
  ExternalLink, 
  ShieldCheck, 
  ArrowRight, 
  MessageSquare, 
  Check, 
  Sparkles,
  Zap
} from 'lucide-react';
import { Modal } from '../components/Modal';

interface AplicativosViewProps {
  onNavigate: (tab: string) => void;
}

export const AplicativosView: React.FC<AplicativosViewProps> = ({ onNavigate }) => {
  const [modalQrAberto, setModalQrAberto] = useState<boolean>(false);
  const [appSelecionado, setAppSelecionado] = useState<string>('');

  const apps = [
    {
      id: 'web',
      titulo: 'Sistema na Web',
      descricao: 'Acesse o painel da sua loja de qualquer computador ou notebook pelo navegador.',
      badge: 'Nuvem Ativa',
      badgeCor: 'bg-emerald-100 text-emerald-800',
      icone: Globe,
      corIcone: 'bg-sky-500 text-white',
      acao: () => {
        setAppSelecionado('Sistema na Web');
        setModalQrAberto(true);
      },
      btnTexto: 'Acessar Web / Gerar Link'
    },
    {
      id: 'mobile',
      titulo: 'Sistema no Celular (App de Vendas)',
      descricao: 'Transforme qualquer smartphone Android ou iPhone em um terminal móvel de vendas e consulta de estoque.',
      badge: 'Pareamento Rápido',
      badgeCor: 'bg-sky-100 text-sky-800',
      icone: Smartphone,
      corIcone: 'bg-purple-600 text-white',
      acao: () => {
        setAppSelecionado('App Mobile WS Gestão PDV');
        setModalQrAberto(true);
      },
      btnTexto: 'Conectar Celular via QR Code'
    },
    {
      id: 'catalogo',
      titulo: 'Catálogo Online (Loja Virtual)',
      descricao: 'Sua vitrine virtual no WhatsApp para clientes navegarem e fazerem pedidos diretamente.',
      badge: 'Loja Virtual',
      badgeCor: 'bg-amber-100 text-amber-800',
      icone: Globe,
      corIcone: 'bg-amber-500 text-white',
      acao: () => onNavigate('catalogo'),
      btnTexto: 'Gerenciar Catálogo Online'
    },
    {
      id: 'tef',
      titulo: 'Integração com Maquininha (TEF)',
      descricao: 'Pagamentos no cartão integrados diretamente ao caixa sem necessidade de digitar valores manualmente.',
      badge: 'Automação TEF',
      badgeCor: 'bg-slate-100 text-slate-800',
      icone: CreditCard,
      corIcone: 'bg-emerald-600 text-white',
      acao: () => onNavigate('fiscal'),
      btnTexto: 'Configurar PinPad / TEF'
    },
    {
      id: 'whatsapp',
      titulo: 'Notificações via WhatsApp',
      descricao: 'Envio automático de cupom não fiscal, aviso de entrega e cobrança de fiados para o WhatsApp dos clientes.',
      badge: 'Comunicação VIP',
      badgeCor: 'bg-emerald-100 text-emerald-800',
      icone: MessageSquare,
      corIcone: 'bg-emerald-500 text-white',
      acao: () => {
        setAppSelecionado('WhatsApp Notificações');
        setModalQrAberto(true);
      },
      btnTexto: 'Conectar WhatsApp Web'
    }
  ];

  return (
    <div className="h-full flex flex-col p-6 bg-slate-100 overflow-y-auto space-y-6 font-sans">
      
      {/* 1. CABEÇALHO */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
            <AppWindow className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-800">Hub Central de Aplicativos & Integrações</h2>
              <span className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Recursos Integrados
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Conecte celulares, terminais adicionais na nuvem, catálogo web e maquininhas de cartão integradas ao seu PDV.
            </p>
          </div>
        </div>
      </div>

      {/* 2. GRID DE CARDS DOS APLICATIVOS */}
      <div className="grid grid-cols-2 gap-5">
        {apps.map((app) => {
          const Icon = app.icone;
          return (
            <div
              key={app.id}
              className="bg-white border border-slate-200 hover:border-sky-400 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl ${app.corIcone} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{app.titulo}</h3>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${app.badgeCor}`}>
                      {app.badge}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{app.descricao}</p>

              <button
                type="button"
                onClick={app.acao}
                className="w-full bg-slate-50 hover:bg-sky-600 hover:text-white border border-slate-200 hover:border-sky-600 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>{app.btnTexto}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL DE PAREAMENTO QR CODE */}
      <Modal isOpen={modalQrAberto} onClose={() => setModalQrAberto(false)} title={`Pareamento — ${appSelecionado}`} maxWidth="md">
        <div className="space-y-4 text-center p-2">
          <div className="w-48 h-48 bg-white border-2 border-slate-800 rounded-2xl p-3 mx-auto flex flex-col items-center justify-center shadow-lg relative">
            <QrCode className="w-36 h-36 text-slate-900" />
            <span className="text-[9px] font-mono text-slate-500 font-bold mt-1">TOKEN-APP-2026-OK</span>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-sm">Aponte a câmera do seu celular</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Abra o aplicativo NexPDV Mobile no seu smartphone e escaneie o código QR acima para sincronizar seu caixa instantaneamente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalQrAberto(false)}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl text-xs"
          >
            Concluído
          </button>
        </div>
      </Modal>

    </div>
  );
};
