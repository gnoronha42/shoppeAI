import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json();

    if (!html) {
      return new NextResponse('Missing HTML content', { status: 400 });
    }

    // Retorna uma página HTML estática com o conteúdo
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: 'Inter', Arial, sans-serif;
            }
            #relatorio {
              padding: 20px;
              max-width: 100%;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div id="relatorio">
            ${html}
          </div>
        </body>
      </html>
    `;

    return new NextResponse(fullHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error in PDF viewer route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 