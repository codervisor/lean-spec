/**
 * Home page - Browse LeanSpec specifications
 */

import Link from 'next/link';
import { getProjects, getStats, getSpecs } from '@/lib/db/queries';

export default async function Home() {
  const [projects, stats, specs] = await Promise.all([
    getProjects(),
    getStats(),
    getSpecs(),
  ]);

  const featuredProject = projects.find(p => p.isFeatured);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">LeanSpec Web</h1>
          <p className="text-gray-600 mt-2">Interactive spec showcase for AI-powered development</p>
        </div>
      </header>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-blue-600">{stats.totalSpecs}</div>
            <div className="text-sm text-gray-600 mt-1">Total Specs</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-green-600">{stats.completionRate}%</div>
            <div className="text-sm text-gray-600 mt-1">Completion Rate</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-purple-600">{stats.specsByStatus.find(s => s.status === 'in-progress')?.count || 0}</div>
            <div className="text-sm text-gray-600 mt-1">In Progress</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-orange-600">{stats.specsByStatus.find(s => s.status === 'planned')?.count || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Planned</div>
          </div>
        </div>
      </section>

      {/* Specs List */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Specifications</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spec
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {specs.map((spec) => (
                <tr key={spec.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/specs/${spec.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {spec.specNumber ? `#${spec.specNumber}` : spec.specName}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{spec.title || spec.specName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      spec.status === 'complete' ? 'bg-green-100 text-green-800' :
                      spec.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      spec.status === 'planned' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {spec.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      spec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      spec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      spec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {spec.priority || 'medium'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-600">
        <p>LeanSpec - Lightweight spec methodology for AI-powered development</p>
        <p className="mt-2 text-sm">
          <a href="https://github.com/codervisor/lean-spec" className="text-blue-600 hover:text-blue-800">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
