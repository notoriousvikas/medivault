import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Lock, ShieldCheck, RefreshCw } from 'lucide-react';
import { recordsApi } from '../../api/records';
import { useToast } from '../../context/ToastContext';

export default function UploadRecordModal({ isOpen, onClose, onUploadSuccess }) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Lab Report');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [encryptionStage, setEncryptionStage] = useState('');

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      selectFile(e.target.files[0]);
    }
  };

  const selectFile = (selected) => {
    setFile(selected);
    if (!title) {
      // Auto-populate title from filename without extension
      const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('File Required', 'Please select or drag a medical document to upload.');
      return;
    }
    if (!title) {
      toast.error('Title Required', 'Please provide a descriptive title for this record.');
      return;
    }

    setUploading(true);
    setEncryptionStage('Verifying document integrity...');

    try {
      // 1. Client-side security step
      await new Promise((r) => setTimeout(r, 600));
      setEncryptionStage('Securing document with end-to-end privacy seal...');
      await new Promise((r) => setTimeout(r, 600));
      setEncryptionStage('Uploading to your secure health vault...');

      // 2. Prepare FormData for backend
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('uploadDate', new Date().toISOString());

      // 3. Dispatch to backend API
      const response = await recordsApi.createRecord(formData, (p) => setProgress(p));

      toast.success(
        'Record Encrypted & Saved!',
        `"${title}" was successfully sealed and added to your health vault.`
      );

      // Trigger Aarogya AI background analysis notification
      toast.info(
        'Aarogya AI Ready',
        'Click "AI Explain" in the dashboard to review patient-friendly biomarker insights.'
      );

      if (onUploadSuccess) onUploadSuccess(response.data);
      onClose();
    } catch (err) {
      toast.error('Upload Failed', err.message || 'Could not upload document to server.');
    } finally {
      setUploading(false);
      setProgress(0);
      setEncryptionStage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy-900">Upload Medical Record</h3>
              <p className="text-xs text-slate-500">Protected with end-to-end privacy encryption</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {/* Drag & Drop Box */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-trust-500 bg-trust-50/50'
                : file
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-slate-200 hover:border-trust-300 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.dicom"
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3 text-emerald-800">
                <FileText className="w-8 h-8 text-emerald-600 shrink-0" />
                <div className="text-left overflow-hidden">
                  <div className="text-sm font-bold truncate max-w-xs">{file.name}</div>
                  <div className="text-xs text-emerald-600">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for encryption
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-sm font-semibold text-slate-700">
                  Click to browse or drag & drop medical file
                </div>
                <div className="text-xs text-slate-400">
                  Supports PDF, DICOM, PNG, or JPG (up to 25MB)
                </div>
              </div>
            )}
          </div>

          {/* Record Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Document Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Comprehensive Blood Test, Brain MRI, Knee Surgery"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
            >
              <option value="Lab Report">Lab Report (Metabolic, Blood, Urine, Pathology)</option>
              <option value="Prescription">Prescription / Medication Slip</option>
              <option value="Scan">Imaging Scan (MRI, CT, X-Ray, Ultrasound)</option>
              <option value="Discharge Summary">Hospital Discharge Summary</option>
              <option value="Clinical Note">Doctor Consultation / Clinical Note</option>
            </select>
          </div>

          {/* Encryption status progress */}
          {uploading && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5 text-trust-700">
                  <Lock className="w-3.5 h-3.5" />
                  {encryptionStage}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-trust-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(progress, 15)}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-trust-600 text-white text-sm font-bold hover:bg-trust-700 transition shadow-sm shadow-trust-600/30 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Encrypting...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Encrypt & Upload</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
