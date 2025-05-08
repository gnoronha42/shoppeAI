// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { marked } from "marked";

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
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
          }
          h1, h2, h3 {
            color: #f57c00;
            font-weight: bold;
            margin-top: 24px;
            margin-bottom: 12px;
            page-break-after: avoid;
          }
          h1 { font-size: 1.3rem; }
          h2 { font-size: 1.1rem; }
          h3 { font-size: 1rem; }
          
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
            font-size: 0.95rem;
            page-break-inside: avoid;
          }
          th, td {
            border: 1px solid #f57c00;
            padding: 6px 10px;
            text-align: left;
          }
          th {
            background: #f57c00;
            color: #fff;
          }
          
          ul, ol { 
            margin-left: 24px; 
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          li { margin-bottom: 4px; }
          
          blockquote {
            border-left: 4px solid #f57c00;
            padding-left: 12px;
            color: #666;
            margin: 12px 0;
            font-style: italic;
            background: #fafafa;
            page-break-inside: avoid;
          }
          
          hr {
            border: none;
            border-top: 2px solid #f57c00;
            margin: 24px 0;
          }
          
          /* Classe para evitar quebras em qualquer elemento */
          .no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block;
          }
          
          /* Classe para blocos de produto */
          .product-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block;
            margin-bottom: 16px;
          }
          
          @page {
            margin: 15mm;
            size: A4;
          }
        </style>
      </head>
      <body>
        <h1>Relatório de Análise - ${clientName}</h1>
        <p style="color: #888; margin-bottom: 24px;">
          Tipo: ${analysisType === "account" ? "Conta" : "Anúncios"}
        </p>
        <div id="content">${htmlContent}</div>
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

      const isProductStart = (p:any) => {
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
          while (
            nextP &&
            nextP.nodeName === "P" &&
            !isProductStart(nextP)
          ) {
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
      margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
      displayHeaderFooter: false,
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
