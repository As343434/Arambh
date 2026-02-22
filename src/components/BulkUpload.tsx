import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { FirebaseBatchService } from '../services/FirebaseBatchService';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BulkUploadProps {
  onComplete?: () => void;
}

export const BulkUpload: React.FC<BulkUploadProps> = ({ onComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const processCSV = async () => {
    if (!file) return;
    setUploading(true);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const row of rows) {
          // Mapping and validation
          const name = row.name || 'Unknown';
          const role = (row.role || 'student').toLowerCase();
          const rollNo = row.rollNo || '';
          const email = row.email || (role === 'student' ? `roll${rollNo}@arambh.com` : `user${Math.random().toString(36).substring(7)}@arambh.com`);
          const password = row.password || 'arambh123';
          
          const userData = {
            email,
            password,
            name,
            role,
            assignedClass: row.class,
            assignedSection: row.section,
            subjects: row.subjects ? row.subjects.split(',').map((s: string) => s.trim()) : [],
            rollNo: role === 'student' ? rollNo : undefined,
            employeeId: role === 'teacher' ? (row.employeeId || `T-${Math.floor(Math.random() * 1000)}`) : undefined
          };

          const result = await FirebaseBatchService.createUser(userData);
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            errors.push(`${email}: ${result.error}`);
          }
        }

        setResults({ success: successCount, failed: failedCount, errors });
        setUploading(false);
        setFile(null);
        if (onComplete) onComplete();
      },
      error: (error) => {
        console.error('CSV Parsing Error:', error);
        setUploading(false);
        alert('Failed to parse CSV file.');
      }
    });
  };

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Upload className="w-6 h-6 text-indigo-600" />
          Bulk User Upload
        </h3>
        <a 
          href="data:text/csv;charset=utf-8,name,email,password,role,class,section,subjects,rollNo,employeeId%0AJohn Doe,john@example.com,pass123,student,10,A,,101,%0AJane Smith,,pass456,teacher,11,B,Math,Science,,T-501"
          download="arambh_template.csv"
          className="text-sm font-bold text-indigo-600 hover:underline"
        >
          Download Template
        </a>
      </div>

      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-[32px] p-12 text-center cursor-pointer transition-all ${
          file ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".csv" 
          className="hidden" 
        />
        
        {file ? (
          <div className="flex flex-col items-center">
            <FileText className="w-12 h-12 text-indigo-600 mb-4" />
            <p className="font-bold text-slate-900">{file.name}</p>
            <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="mt-4 text-red-600 hover:text-red-700 text-sm font-bold flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <p className="font-bold text-slate-900">Click or drag CSV file here</p>
            <p className="text-sm text-slate-500 mt-1">Only .csv files are supported</p>
          </div>
        )}
      </div>

      {file && !uploading && (
        <button 
          onClick={processCSV}
          className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all"
        >
          Start Bulk Upload
        </button>
      )}

      {uploading && (
        <div className="mt-6 p-6 bg-slate-50 rounded-2xl flex items-center justify-center gap-4">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <p className="font-bold text-slate-700">Processing users... please wait.</p>
        </div>
      )}

      <AnimatePresence>
        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-[32px] border border-slate-100 bg-slate-50"
          >
            <h4 className="font-bold text-slate-900 mb-4">Upload Results</h4>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                <p className="text-2xl font-bold">{results.success}</p>
                <p className="text-xs font-medium uppercase tracking-wider">Successful</p>
              </div>
              <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
                <p className="text-2xl font-bold">{results.failed}</p>
                <p className="text-xs font-medium uppercase tracking-wider">Failed</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase">Error Details</p>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-2">
                  {results.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
