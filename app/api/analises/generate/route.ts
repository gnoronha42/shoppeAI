import { NextRequest, NextResponse } from "next/server";
import puppeteerCore from "puppeteer-core";
import { marked } from "marked";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  let browser = null;

  try {
    const { markdown, clientName } = await request.json();

    if (!markdown || !clientName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Converte markdown para HTML
    const htmlContent = marked(markdown);

    // Lê o papel timbrado como base64
    let papelTimbradoBase64 = "";
    try {
      const papelTimbradoPath = path.resolve(
        process.cwd(),
        "public/assets/modelorelatoriologo.png"
      );
      papelTimbradoBase64 = fs.readFileSync(papelTimbradoPath, {
        encoding: "base64",
      });
    } catch (err) {
      console.error("Erro ao ler papel timbrado:", err);
      return NextResponse.json(
        { message: "Erro ao ler papel timbrado", error: String(err) },
        { status: 500 }
      );
    }

    // Monta o HTML final
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório - ${clientName}</title>
        <style>
          body {
            font-family: 'Inter', Arial, sans-serif;
            color: #222;
            margin: 0;
            padding: 0;
          }
          #content {
            max-width: 180mm;
            margin: 0 auto;
            padding: 0 0 16mm 0;
            background: transparent;
            box-sizing: border-box;
            min-height: calc(297mm - 60mm);
            display: block;
            text-align: left;
          }
          h1, h2, h3 {
            color: #1976d2;
            font-weight: bold;
            page-break-inside: avoid;
          }
          h1 {
            font-size: 1.2rem;
            text-align: center;
            margin-top: 0;
            margin-bottom: 16px;
            text-transform: uppercase;
          }
          h2 {
            font-size: 1rem;
            margin-top: 24px;
            margin-bottom: 10px;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 2px;
          }
          h3 {
            font-size: 0.95rem;
            margin-top: 16px;
            margin-bottom: 6px;
          }
          p, ul, ol, blockquote {
            text-align: left;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 10px;
          }
          table {
            border-collapse: collapse;
            font-size: 0.85rem;
            background: #fff;
            width: 100%;
            margin-bottom: 16px;
          }
          th, td {
            border: 1px solid #1976d2;
            padding: 6px 8px;
            text-align: left;
          }
          th {
            background: #1976d2;
            color: #fff;
            text-align: center;
          }
          blockquote {
            border-left: 4px solid #1976d2;
            padding-left: 10px;
            color: #666;
            margin: 10px 0;
            font-style: italic;
            background: #fafafa;
            font-size: 0.9rem;
          }
          hr {
            border: none;
            border-top: 2px solid #1976d2;
            margin: 18px 0;
          }
          @page {
            margin-top: 60px;
            margin-right: 16mm;
            margin-bottom: 18mm;
            margin-left: 16mm;
            size: A4;
          }
        </style>
      </head>
      <body>
        <div id="content">
          ${htmlContent}
        </div>
      </body>
      </html>
    `;

    // Conecta ao Browserless via WebSocket
    browser = await puppeteerCore.connect({
      browserWSEndpoint: `wss://production-sfo.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
      defaultViewport: { width: 1200, height: 800 },
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(60000);

    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Gera o PDF com headerTemplate para o papel timbrado
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "60px",
        right: "16mm",
        bottom: "18mm",
        left: "16mm",
      },
      displayHeaderFooter: true,
      footerTemplate: "<span></span>",
      preferCSSPageSize: true,
      timeout: 60000,
    });

    await browser.disconnect();

    const response = new NextResponse(pdfBuffer);
    response.headers.set("Content-Type", "application/pdf");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="relatorio_${clientName}.pdf"`
    );

    return response;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { message: "Error generating PDF", error: String(error) },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
}