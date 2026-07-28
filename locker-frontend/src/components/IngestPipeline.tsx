import React from 'react';
import { Upload } from 'lucide-react';
import type { UploadQueueItem } from '../types/cluster';

interface IngestPipelineProps { uploadQueue: UploadQueueItem[]; onUpload: (file: File) => void; }

export const IngestPipeline: React.FC<IngestPipelineProps> = ({ uploadQueue, onUpload }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
      e.target.value = ''; 
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-4">INGEST PIPELINE</h3>
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <label className="flex-1 border border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 flex flex-col justify-center items-center group select-none">
          <input type="file" className="hidden" onChange={handleFileChange} />
          <Upload className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors mb-2" />
          <p className="text-xs font-semibold text-slate-700">Stage target binary files for split sharding</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Asynchronously writes chunks to verified replica matrices.</p>
        </label>

        {uploadQueue.length > 0 && (
          <div className="lg:w-1/3 flex flex-col gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl overflow-y-auto max-h-[110px]">
            {uploadQueue.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 p-2 rounded-lg relative overflow-hidden shrink-0 shadow-sm">
                <p className="text-[10px] font-mono text-slate-700 truncate pr-4">{item.name}</p>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-indigo-600 h-full transition-all duration-200" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};