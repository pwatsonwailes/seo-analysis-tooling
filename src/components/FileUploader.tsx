import React, { useCallback, useState, useEffect } from 'react';
import { Upload, Save, AlertTriangle, Trash2, X } from 'lucide-react';
import { saveKeywordList, getKeywordLists, deleteKeywordList } from '../lib/db';
import { parseUrlData } from '../utils/urlParser';
import type { KeywordList } from '../types';
import { useAuth } from '../hooks/useAuth';

interface FileUploaderProps {
  onFileLoad: (urls: string[], searchVolumes: Record<string, number>, fromSavedList?: boolean) => void;
}

export function FileUploader({ onFileLoad }: FileUploaderProps) {
  const { user } = useAuth();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [listName, setListName] = useState('');
  const [currentUrls, setCurrentUrls] = useState<string[]>([]);
  const [currentSearchVolumes, setCurrentSearchVolumes] = useState<Record<string, number>>({});
  const [savedLists, setSavedLists] = useState<KeywordList[]>([]);
  const [showSavedLists, setShowSavedLists] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [deletingList, setDeletingList] = useState<string | null>(null);

  useEffect(() => {
    if (showSavedLists) {
      loadSavedLists();
    }
  }, [showSavedLists]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      const errors: string[] = [];
      const validUrls: string[] = [];
      const searchVolumes: Record<string, number> = {};

      lines.forEach((line, index) => {
        const urlData = parseUrlData(line);
        if (urlData) {
          validUrls.push(urlData.url);
          searchVolumes[urlData.url] = urlData.searchVolume;
        } else {
          errors.push(`Line ${index + 1}: Invalid format. Expected "URL\tSearch Volume"`);
        }
      });

      if (errors.length > 0) {
        setParseErrors(errors);
      } else {
        setParseErrors([]);
        setCurrentUrls(validUrls);
        setCurrentSearchVolumes(searchVolumes);
        onFileLoad(validUrls, searchVolumes, false);
        setShowSaveDialog(true);
      }
    };
    reader.readAsText(file);
  }, [onFileLoad]);

  const handleSaveList = async () => {
    if (!listName || currentUrls.length === 0 || !user) return;
    
    try {
      await saveKeywordList(listName, currentUrls, currentSearchVolumes, user.id);
      setShowSaveDialog(false);
      setListName('');
      // Refresh the lists if the modal is open
      if (showSavedLists) {
        await loadSavedLists();
      }
    } catch (error) {
      console.error('Error saving keyword list:', error);
    }
  };

  const loadSavedLists = async () => {
    try {
      const lists = await getKeywordLists();
      setSavedLists(lists);
    } catch (error) {
      console.error('Error loading keyword lists:', error);
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      setDeletingList(id);
      await deleteKeywordList(id);
      await loadSavedLists();
    } catch (error) {
      console.error('Error deleting keyword list:', error);
    } finally {
      setDeletingList(null);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="flex gap-2">
        <label className="flex-1 flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white transition-colors">
          <Upload className="w-8 h-8" />
          <span className="mt-2 text-sm">Select a tab-separated file (URL, Search Volume)</span>
          <input type="file" className="hidden" accept=".txt,.tsv" onChange={handleFileChange} />
        </label>
        <button
          onClick={() => setShowSavedLists(true)}
          className="px-4 py-2 bg-gray-100 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
        >
          Manage Lists
        </button>
      </div>

      {parseErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-medium">File Format Errors</h3>
          </div>
          <ul className="text-sm text-red-600 list-disc list-inside">
            {parseErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Save Keyword List</h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Enter list name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="w-full p-2 border rounded-lg mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveList}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save List
              </button>
            </div>
          </div>
        </div>
      )}

      {showSavedLists && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Manage Keyword Lists</h3>
              <button
                onClick={() => setShowSavedLists(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {savedLists.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No saved lists yet. Upload a file to create one.
                </div>
              ) : (
                <div className="grid gap-4">
                  {savedLists.map((list) => (
                    <div
                      key={list.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-lg">{list.name}</h4>
                          <div className="text-sm text-gray-500 mt-1">
                            {list.urls.length} URLs • Created {new Date(list.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onFileLoad(list.urls, list.search_volumes, true);
                              setShowSavedLists(false);
                            }}
                            className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            Select
                          </button>
                          <button
                            onClick={() => handleDeleteList(list.id)}
                            disabled={deletingList === list.id}
                            className="p-1 text-red-500 hover:text-red-700 rounded disabled:opacity-50"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}