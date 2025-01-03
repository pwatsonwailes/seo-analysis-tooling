import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFileLoad: (urls: string[]) => void;
}

export function FileUploader({ onFileLoad }: FileUploaderProps) {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Split on newlines and filter out empty lines and whitespace
      const urls = text
        .split(/\r?\n/)
        .map(url => url.trim())
        .filter(url => url.length > 0);
      onFileLoad(urls);
    };
    reader.readAsText(file);
  }, [onFileLoad]);

  return (
    <div className="w-full max-w-md">
      <label className="flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white transition-colors">
        <Upload className="w-8 h-8" />
        <span className="mt-2 text-sm">Select a text file with URLs</span>
        <input type="file" className="hidden" accept=".txt" onChange={handleFileChange} />
      </label>
    </div>
  );
}