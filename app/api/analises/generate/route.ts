// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { marked } from "marked";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  try {
    const { markdown, clientName, analysisType } = await request.json();

    if (!markdown || !clientName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const htmlContent = marked(markdown);

    // Adiciona papel timbrado como background
    const papelTimbradoPath = path.resolve(
      process.cwd(),
      "public/assets/modelorelatoriologo.png"
    );
    const papelTimbradoBase64 = fs.readFileSync(papelTimbradoPath, {
      encoding: "base64",
    });
    const papelTimbradoUrl = `data:image/png;base64,${papelTimbradoBase64}`;

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
            width: 100vw;
            height: 100vh;
            min-height: 100vh;
            position: relative;
          }
          .papel-timbrado-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            object-fit: cover;
            z-index: -1;
          }
          #content {
            max-width: 170mm;
            margin: 0 auto;
            padding: 0 0 20mm 0;
            background: transparent;
            box-sizing: border-box;
            min-height: calc(297mm - 60mm);
            display: block;
            text-align: left;
          }
          h1 {
            color: #1976d2;
            font-size: 1.3rem;
            font-weight: bold;
            text-align: center;
            margin-top: 0;
            margin-bottom: 20px;
            letter-spacing: 1px;
            text-transform: uppercase;
            page-break-inside: avoid;
          }
          h2 {
            color: #1976d2;
            font-size: 1.1rem;
            font-weight: bold;
            text-align: left;
            margin-top: 28px;
            margin-bottom: 12px;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 2px;
            page-break-inside: avoid;
          }
          h3 {
            color: #1976d2;
            font-size: 1rem;
            font-weight: bold;
            text-align: left;
            margin-top: 18px;
            margin-bottom: 8px;
            page-break-inside: avoid;
          }
          p, ul, ol, table, blockquote {
            text-align: left;
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 12px;
          }
          strong {
            color: #222;
            font-weight: bold;
          }
          table {
          border-collapse: collapse;
          
          margin-left: -30px;
          font-size: 0.95rem;
          background: #fff;
          page-break-inside: avoid;
        }

        th, td {
          border: 1px solid #1976d2;
          padding: 8px 12px;
          text-align: left; /* Mantém o alinhamento do texto dentro das células */
        }

          th {
            background: #1976d2;
            color: #fff;
            font-size: 1rem;
            text-align: center;
          }
          ul, ol { 
            margin-left: 24px; 
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          li { margin-bottom: 4px; }
          blockquote {
            border-left: 4px solid #1976d2;
            padding-left: 12px;
            color: #666;
            margin: 12px 0;
            font-style: italic;
            background: #fafafa;
            page-break-inside: avoid;
          }
          hr {
            border: none;
            border-top: 2px solid #1976d2;
            margin: 20px 0;
          }
          .no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block;
          }
          .product-block, .no-break, .projecao-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block;
            margin-bottom: 16px;
          }
          /* Evitar quebras de página em blocos importantes */
          h1, h2, h3, table, blockquote, ul, ol, .product-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .header-space {
            height: 30mm; /* ajuste para a altura do seu header na imagem */
            width: 100%;
            display: block;
          }
          @page {
            margin-top: 30mm;
            margin-right: 20mm;
            margin-bottom: 20mm;
            margin-left: 20mm;
            size: A4;
          }
        </style>
        <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
      </head>
      <body>
        <img class="papel-timbrado-bg" src="${papelTimbradoUrl}" />
        <div id="content">
          <div class="header-space"></div>
          ${htmlContent}
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(fullHtml, { waitUntil: "networkidle0" });

    await page.evaluate(() => {
      const content = document.getElementById("content");
      if (!content) return;

      const isProductStart = (p: any) => {
        return (
          p &&
          p.textContent &&
          (p.textContent.trim().startsWith("Produto:") ||
            p.textContent.trim().match(/^\*\*Produto:/))
        );
      };

      const paragraphs = content.querySelectorAll("p");

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];

        if (isProductStart(p)) {
          const wrapper = document.createElement("div");
          wrapper.className = "product-block";
          p.parentNode?.insertBefore(wrapper, p);

          wrapper.appendChild(p);

          let nextP = wrapper.nextSibling;
          while (nextP && nextP.nodeName === "P" && !isProductStart(nextP)) {
            const current = nextP;
            nextP = nextP.nextSibling;
            wrapper.appendChild(current);
          }
        }
      }
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: "<span></span>",
      preferCSSPageSize: true,
    });

    await browser.close();

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
  }
}
