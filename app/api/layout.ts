/**
 * Impede que o Next tente pré-renderizar Route Handlers no `next build`.
 * Sem isso, rotas com `request.url` e chamadas à Shopee rodam na compilação e poluem/falham o build.
 */
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function ApiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
