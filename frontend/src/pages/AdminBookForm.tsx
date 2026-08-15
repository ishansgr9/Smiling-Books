import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import type { Book } from '../types';
import { ArrowLeft, Loader2, Save, FileText, Image, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AdminBookForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  // Metadata Form State
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [description, setDescription] = useState('');
  const [languageName, setLanguageName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [ageGroup, setAgeGroup] = useState('5-8');
  const [publicationYear, setPublicationYear] = useState<number | ''>('');
  const [rightsStatus, setRightsStatus] = useState<'PUBLIC_DOMAIN' | 'LICENSED' | 'PERMISSION_GRANTED' | 'PENDING_REVIEW'>('PENDING_REVIEW');
  const [published, setPublished] = useState(false);

  // File Upload States
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadedKey, setCoverUploadedKey] = useState<string | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUploadedKey, setPdfUploadedKey] = useState<string | null>(null);

  // Lifecycle states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch book if editing
  useEffect(() => {
    if (!isEditMode) return;

    const fetchBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const book = await api.get<Book>(`/api/admin/books/${id}`);
        setTitle(book.title);
        setAuthorName(book.author_name);
        setDescription(book.description);
        setLanguageName(book.language_name);
        setCategoryName(book.category_name);
        setAgeGroup(book.age_group);
        setPublicationYear(book.publication_year || '');
        setRightsStatus(book.rights_status);
        setPublished(book.published);
        setCoverUploadedKey(book.cover_object_key);
        setPdfUploadedKey(book.pdf_object_key);
      } catch (e: any) {
        console.error('Failed to load book for editing:', e);
        setError(e.message || 'Could not load book details.');
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id, isEditMode]);

  // Handle rights status change business rule
  const handleRightsChange = (status: typeof rightsStatus) => {
    setRightsStatus(status);
    if (status === 'PENDING_REVIEW') {
      setPublished(false); // Disallow publishing pending books
    }
  };

  const handleMetadataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !authorName || !languageName || !categoryName || !ageGroup || !rightsStatus) {
      setError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title,
      author_name: authorName,
      description,
      language_name: languageName,
      category_name: categoryName,
      age_group: ageGroup,
      publication_year: publicationYear === '' ? null : Number(publicationYear),
      rights_status: rightsStatus,
      published: rightsStatus === 'PENDING_REVIEW' ? false : published,
    };

    try {
      if (isEditMode) {
        await api.put(`/api/admin/books/${id}`, payload);
        alert('Book metadata updated successfully!');
      } else {
        // We call POST /api/admin/books
        const created = await api.post<Book>(`/api/admin/books`, payload);
        alert('Book created successfully! Now redirecting to upload cover and PDF.');
        navigate(`/admin/books/${created.id}/edit`, { replace: true });
      }
    } catch (e: any) {
      console.error('Failed to save metadata:', e);
      setError(e.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Upload Cover Action
  const handleCoverUpload = async () => {
    if (!coverFile || !id) return;
    setCoverUploading(true);
    setError(null);
    try {
      const res = await api.uploadFile<{ cover_key: string }>(`/api/admin/books/${id}/upload-cover`, coverFile);
      setCoverUploadedKey(res.cover_key);
      setCoverFile(null);
      alert('Cover image uploaded successfully!');
    } catch (e: any) {
      console.error('Cover upload error:', e);
      setError(e.message || 'Cover upload failed.');
    } finally {
      setCoverUploading(false);
    }
  };

  // Upload PDF Action
  const handlePDFUpload = async () => {
    if (!pdfFile || !id) return;
    setPdfUploading(true);
    setError(null);
    try {
      const res = await api.uploadFile<{ pdf_key: string }>(`/api/admin/books/${id}/upload-pdf`, pdfFile);
      setPdfUploadedKey(res.pdf_key);
      setPdfFile(null);
      alert('Book PDF document uploaded successfully!');
    } catch (e: any) {
      console.error('PDF upload error:', e);
      setError(e.message || 'PDF upload failed.');
    } finally {
      setPdfUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Navigation Header */}
      <div>
        <Link
          to="/admin/books"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-stone-500 hover:text-brand-600 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={14} />
          <span>Back to Management</span>
        </Link>
      </div>

      {/* Title */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-black text-stone-900 leading-tight">
          {isEditMode ? 'Edit Book Details' : 'Add New Book'}
        </h1>
        <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mt-0.5">
          {isEditMode ? 'Update book records and files' : 'Register a new catalog entry'}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/50 rounded-xl text-red-700 text-sm flex items-start space-x-2.5">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">{error}</p>
        </div>
      )}

      {/* Main Form Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Metadata Form Section (Left Column) */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/50 p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
            Book Metadata
          </h2>

          <form onSubmit={handleMetadataSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Title */}
            <div className="sm:col-span-2 space-y-2">
              <label htmlFor="title" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Book Title *
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Alice's Adventures in Wonderland"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-800 font-sans"
              />
            </div>

            {/* Author */}
            <div className="space-y-2">
              <label htmlFor="author" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Author Name *
              </label>
              <input
                id="author"
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Lewis Carroll"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-800 font-sans"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label htmlFor="category" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Category *
              </label>
              <input
                id="category"
                type="text"
                required
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Children's Literature"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-800 font-sans"
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label htmlFor="language" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Language *
              </label>
              <input
                id="language"
                type="text"
                required
                value={languageName}
                onChange={(e) => setLanguageName(e.target.value)}
                placeholder="e.g. English"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-800 font-sans"
              />
            </div>

            {/* Age Group */}
            <div className="space-y-2">
              <label htmlFor="age-group" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Age Group *
              </label>
              <select
                id="age-group"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-800 font-sans"
              >
                <option value="5-8">5-8 Years</option>
                <option value="9-12">9-12 Years</option>
                <option value="13+">13+ Years</option>
                <option value="All Ages">All Ages</option>
              </select>
            </div>

            {/* Publication Year */}
            <div className="space-y-2">
              <label htmlFor="pub-year" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Publication Year
              </label>
              <input
                id="pub-year"
                type="number"
                value={publicationYear}
                onChange={(e) => setPublicationYear(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 1865"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-800 font-sans"
              />
            </div>

            {/* Rights Status */}
            <div className="space-y-2">
              <label htmlFor="rights-status" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Rights Status *
              </label>
              <select
                id="rights-status"
                value={rightsStatus}
                onChange={(e) => handleRightsChange(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-800 font-sans"
              >
                <option value="PUBLIC_DOMAIN">Public Domain (Legal)</option>
                <option value="LICENSED">Licensed (Explicit Agreement)</option>
                <option value="PERMISSION_GRANTED">Author/Publisher Permission</option>
                <option value="PENDING_REVIEW">Pending Review (Do Not Publish)</option>
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-2 space-y-2">
              <label htmlFor="description" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Description / Summary
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of the book plot, theme and content..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-800 font-sans resize-none"
              />
            </div>

            {/* Legal compliance helper banner */}
            <div className="sm:col-span-2 bg-amber-50/50 p-4 border border-amber-200/50 rounded-xl flex items-start space-x-2.5 text-amber-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed">
                <strong>Legal Rule:</strong> Only upload content that Akshar Paaul NGO has the legal right to make digitally available. If Rights Status is set to <em>Pending Review</em>, the book will be automatically unpublished and cannot be made public until verified.
              </p>
            </div>

            {/* Publish Checkbox */}
            <div className="sm:col-span-2 flex items-center space-x-2.5 py-2">
              <input
                id="published"
                type="checkbox"
                checked={published}
                disabled={rightsStatus === 'PENDING_REVIEW'}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
              />
              <label
                htmlFor="published"
                className={`text-xs font-bold ${
                  rightsStatus === 'PENDING_REVIEW' ? 'text-stone-400' : 'text-stone-700'
                } cursor-pointer`}
              >
                Make this book publicly available (Publish)
              </label>
            </div>

            {/* Submit Bar */}
            <div className="sm:col-span-2 pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-75"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>{isEditMode ? 'Update Metadata' : 'Create Book'}</span>
              </button>
            </div>

          </form>
        </section>

        {/* File Upload Section (Right Column) */}
        <section className="bg-white rounded-2xl border border-stone-200/50 p-6 shadow-sm space-y-8">
          <h2 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
            Book Files
          </h2>

          {!isEditMode ? (
            <div className="bg-stone-50 border border-dashed border-stone-200 rounded-2xl p-6 text-center text-stone-400 text-xs leading-relaxed">
              <p>You must save the book metadata first before you can upload the cover image and book PDF document.</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Cover Image Upload */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Cover Image (.jpg, .png, .webp)
                </label>
                <div className="flex items-center space-x-1">
                  <span className={`w-2 h-2 rounded-full ${coverUploadedKey ? 'bg-emerald-500' : 'bg-red-400 animate-pulse'}`} />
                  <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                    {coverUploadedKey ? 'Cover Uploaded' : 'Cover Missing'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 file:cursor-pointer cursor-pointer"
                  />
                  {coverFile && (
                    <button
                      onClick={handleCoverUpload}
                      disabled={coverUploading}
                      className="flex items-center space-x-1.5 w-full justify-center py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-70"
                      type="button"
                    >
                      {coverUploading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Image size={12} />
                      )}
                      <span>Upload Cover Image</span>
                    </button>
                  )}
                </div>
              </div>

              {/* PDF Document Upload */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Book Text Document (.pdf)
                </label>
                <div className="flex items-center space-x-1">
                  <span className={`w-2 h-2 rounded-full ${pdfUploadedKey ? 'bg-emerald-500' : 'bg-red-400 animate-pulse'}`} />
                  <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                    {pdfUploadedKey ? 'PDF Uploaded' : 'PDF Missing'}
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 file:cursor-pointer cursor-pointer"
                  />
                  {pdfFile && (
                    <button
                      onClick={handlePDFUpload}
                      disabled={pdfUploading}
                      className="flex items-center space-x-1.5 w-full justify-center py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-70"
                      type="button"
                    >
                      {pdfUploading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <FileText size={12} />
                      )}
                      <span>Upload PDF Document</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rights Status Check info */}
              <div className="bg-emerald-50/40 p-4 border border-emerald-200/50 rounded-xl text-emerald-800 flex items-start space-x-2.5">
                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed">
                  Upload files directly to secure Cloudflare R2 object storage buckets. Ensure PDFs do not exceed 50MB and are fully clean and readable.
                </p>
              </div>

            </div>
          )}
        </section>

      </div>

    </div>
  );
};
export default AdminBookForm;
