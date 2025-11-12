/**
 * Spec detail page with markdown rendering
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSpecById } from '@/lib/db/queries';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export default async function SpecDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const spec = await getSpecById(id);

  if (!spec) {
    notFound();
  }

  // Parse tags if stored as JSON string
  const tags = spec.tags ? (typeof spec.tags === 'string' ? JSON.parse(spec.tags) : spec.tags) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block">
            ← Back to Specs
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {spec.specNumber && `#${spec.specNumber} - `}{spec.title || spec.specName}
          </h1>
          
          {/* Metadata */}
          <div className="flex flex-wrap gap-4 mt-4">
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
              spec.status === 'complete' ? 'bg-green-100 text-green-800' :
              spec.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
              spec.status === 'planned' ? 'bg-gray-100 text-gray-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {spec.status}
            </span>
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
              spec.priority === 'critical' ? 'bg-red-100 text-red-800' :
              spec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
              spec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {spec.priority || 'medium'} priority
            </span>
            {tags.map((tag: string) => (
              <span key={tag} className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-50 text-blue-700">
                #{tag}
              </span>
            ))}
          </div>

          {spec.githubUrl && (
            <div className="mt-4">
              <a 
                href={spec.githubUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View on GitHub →
              </a>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <article className="bg-white rounded-lg shadow p-8 prose prose-slate max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {spec.contentMd}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
