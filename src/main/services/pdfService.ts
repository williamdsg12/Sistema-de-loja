import { BrowserWindow, dialog, shell, app } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * Serviço de geração de PDF e impressão utilizando Chromium/Electron
 */
export async function gerarPdfDeHtml(html: string): Promise<Buffer> {
  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 1100,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  try {
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await win.loadURL(dataUrl);

    // Aguarda o carregamento de fontes e renderização completa
    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        if (document.fonts) {
          document.fonts.ready.then(resolve);
        } else {
          resolve(true);
        }
      });
    `);

    // Pequeno delay para garantir layout final
    await new Promise((resolve) => setTimeout(resolve, 100));

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      preferCSSPageSize: true
    });

    return pdfBuffer;
  } finally {
    if (!win.isDestroyed()) {
      win.destroy();
    }
  }
}

/**
 * Salva o PDF abrindo a caixa de diálogo nativa de "Salvar Como"
 */
export async function salvarPdfComDialogo(
  html: string,
  nomeArquivoSugerido: string = 'documento_crediario.pdf'
): Promise<{ sucesso: boolean; caminho?: string; cancelado?: boolean; erro?: string }> {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salvar Documento em PDF',
      defaultPath: path.join(app.getPath('documents'), nomeArquivoSugerido),
      filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) {
      return { sucesso: false, cancelado: true };
    }

    const buffer = await gerarPdfDeHtml(html);
    fs.writeFileSync(filePath, buffer);

    // Abre o PDF no leitor padrão do sistema
    try {
      shell.openPath(filePath);
    } catch (e) {}

    return { sucesso: true, caminho: filePath };
  } catch (err: any) {
    console.error('Erro ao salvar PDF com diálogo:', err);
    return { sucesso: false, erro: err?.message || String(err) };
  }
}

/**
 * Gera um arquivo PDF temporário e abre no leitor de PDF padrão
 */
export async function abrirPdfVisualizacao(
  html: string,
  prefixo: string = 'documento_crediario'
): Promise<{ sucesso: boolean; caminho?: string; erro?: string }> {
  try {
    const buffer = await gerarPdfDeHtml(html);
    const tempDir = app.getPath('temp');
    const fileName = `${prefixo}_${Date.now()}.pdf`;
    const tempPath = path.join(tempDir, fileName);

    fs.writeFileSync(tempPath, buffer);
    await shell.openPath(tempPath);

    return { sucesso: true, caminho: tempPath };
  } catch (err: any) {
    console.error('Erro ao abrir visualização de PDF:', err);
    return { sucesso: false, erro: err?.message || String(err) };
  }
}

/**
 * Envia o HTML diretamente para impressão na impressora padrão ou abre o diálogo de impressão
 */
export async function imprimirHtmlDireto(html: string): Promise<{ sucesso: boolean; erro?: string }> {
  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 1100,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  try {
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await win.loadURL(dataUrl);

    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        if (document.fonts) {
          document.fonts.ready.then(resolve);
        } else {
          resolve(true);
        }
      });
    `);

    await new Promise((resolve) => setTimeout(resolve, 100));

    return new Promise((resolve) => {
      let resolvido = false;
      const fim = (r: { sucesso: boolean; erro?: string }) => {
        if (resolvido) return;
        resolvido = true;
        if (!win.isDestroyed()) win.destroy();
        resolve(r);
      };

      // Se o diálogo não responder em 8s (janela oculta no Windows), cai para o PDF no leitor nativo
      const t = setTimeout(async () => {
        const r = await abrirPdfVisualizacao(html, 'impressao');
        fim(r.sucesso ? { sucesso: true } : { sucesso: false, erro: r.erro });
      }, 8000);

      win.webContents.print(
        {
          silent: false,
          printBackground: true,
          pageSize: 'A4',
          margins: { marginType: 'none' }
        },
        (ok, motivo) => {
          clearTimeout(t);
          fim(ok ? { sucesso: true } : { sucesso: false, erro: motivo });
        }
      );
    });
  } catch (err: any) {
    if (!win.isDestroyed()) win.destroy();
    return { sucesso: false, erro: err?.message || String(err) };
  }
}
