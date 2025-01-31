import React, { useState, useEffect } from 'react';
import { Plus, X, Filter } from 'lucide-react';
import { savePortfolio, getPortfolios, deletePortfolio } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import type { Portfolio } from '../types';

interface PortfolioManagerProps {
  onFilterByPortfolio: (terms: string[]) => void;
}

export function PortfolioManager({ onFilterByPortfolio }: PortfolioManagerProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioTerms, setNewPortfolioTerms] = useState('');

  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    try {
      const data = await getPortfolios();
      setPortfolios(data);
    } catch (error) {
      console.error('Error loading portfolios:', error);
    }
  };

  const handleSavePortfolio = async () => {
    if (!newPortfolioName || !newPortfolioTerms || !user) return;

    try {
      const terms = newPortfolioTerms.split('\n').map(term => term.trim()).filter(Boolean);
      await savePortfolio(newPortfolioName, terms, user.id);
      await loadPortfolios();
      setNewPortfolioName('');
      setNewPortfolioTerms('');
      setShowModal(false);
    } catch (error) {
      console.error('Error saving portfolio:', error);
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    try {
      await deletePortfolio(id);
      await loadPortfolios();
    } catch (error) {
      console.error('Error deleting portfolio:', error);
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <Plus className="w-4 h-4" />
        Manage Portfolios
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Portfolio Management</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* New Portfolio Form */}
              <div className="space-y-4">
                <h4 className="font-medium">Create New Portfolio</h4>
                <input
                  type="text"
                  placeholder="Portfolio name"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
                <textarea
                  placeholder="Enter terms (one per line)"
                  value={newPortfolioTerms}
                  onChange={(e) => setNewPortfolioTerms(e.target.value)}
                  className="w-full h-40 p-2 border rounded-lg"
                />
                <button
                  onClick={handleSavePortfolio}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Save Portfolio
                </button>
              </div>

              {/* Existing Portfolios */}
              <div>
                <h4 className="font-medium mb-4">Existing Portfolios</h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {portfolios.map((portfolio) => (
                    <div
                      key={portfolio.id}
                      className="p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium">{portfolio.name}</h5>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onFilterByPortfolio(portfolio.terms);
                              setShowModal(false);
                            }}
                            className="p-1 text-blue-500 hover:text-blue-700"
                            title="Filter by portfolio"
                          >
                            <Filter className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePortfolio(portfolio.id)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {portfolio.terms.length} terms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}