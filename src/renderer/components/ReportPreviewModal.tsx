import React, { useRef } from 'react';
import { Printer, Download, X, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { formatarDataHoraBR, formatarMoedaBR } from '../utils/datetime';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  periodo?: string;
  dataEmissao?: string;
  children: React.ReactNode;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  periodo,
  dataEmissao,
  children
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const dataAtual = dataEmissao || formatarDataHoraBR(new Date().toISOString());

  const handlePrint = () => {
    if (!printAreaRef.current) return;
    const content = printAreaRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      // Fallback
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - WS Gestão PDV</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 10px;
              font-size: 12px;
              line-height: 1.4;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .title {
              font-size: 18px;
              font-weight: bold;
              color: #0f172a;
              margin: 0 0 4px 0;
            }
            .subtitle {
              font-size: 12px;
              color: #64748b;
              margin: 0;
            }
            .meta {
              text-align: right;
              font-size: 11px;
              color: #64748b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
              margin-bottom: 12px;
            }
            th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 700;
              text-align: left;
              padding: 8px 10px;
              font-size: 11px;
              border-bottom: 1px solid #cbd5e1;
              text-transform: uppercase;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 11px;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .total-box {
              margin-top: 16px;
              padding: 12px;
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 13px;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${title}</div>
              ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
              ${periodo ? `<div class="subtitle">Período: <strong>${periodo}</strong></div>` : ''}
            </div>
            <div class="meta">
              <div><strong>WS Gestão PDV</strong></div>
              <div>Emissão: ${dataAtual}</div>
            </div>
          </div>
          ${content}
          <div class="footer">
            Documento gerado automaticamente pelo WS Gestão PDV.
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-600/30 text-sky-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">{title}</h2>
              <p className="text-xs text-slate-400">Pré-visualização para impressão e exportação</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Relatório</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com o Relatório Estilizado */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-100/70">
          <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 max-w-3xl mx-auto text-slate-800" ref={printAreaRef}>
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h1>
                {subtitle && <p className="text-sm text-slate-600 font-medium">{subtitle}</p>}
                {periodo && (
                  <p className="text-xs text-slate-500 mt-1">
                    Período: <span className="font-bold text-slate-700">{periodo}</span>
                  </p>
                )}
              </div>
              <div className="text-right text-xs text-slate-500">
                <span className="font-bold text-slate-800 block text-sm">WS Gestão PDV</span>
                <span>Emissão: {dataAtual}</span>
              </div>
            </div>

            {children}

            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400">
              WS Gestão PDV — Sistema Comercial & Financeiro Offline
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Formato otimizado para papel A4 e bobina</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-all cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
