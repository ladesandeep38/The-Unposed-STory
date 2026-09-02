import React, { useState } from 'react';
import { FilmItem, PackageItem, TestimonialItem, FaqItem } from '../../types';
import { StorageService } from '../../services/storage';
import { parseVideoUrl, detectVideoProvider, extractInstagramShortcode } from '../../utils/videoHelper';
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Film,
  Instagram,
  Play,
  Sparkles,
  ExternalLink,
  CheckCircle,
  Video,
  Eye,
  RefreshCw,
} from 'lucide-react';

type EntityType = 'films' | 'packages' | 'testimonials' | 'faqs';

interface CrudManagerProps {
  entityType: EntityType;
  films: FilmItem[];
  packages: PackageItem[];
  testimonials: TestimonialItem[];
  faqs: FaqItem[];
  onFilmsUpdated: (items: FilmItem[]) => void;
  onPackagesUpdated: (items: PackageItem[]) => void;
  onTestimonialsUpdated: (items: TestimonialItem[]) => void;
  onFaqsUpdated: (items: FaqItem[]) => void;
}

export const CrudManager: React.FC<CrudManagerProps> = ({
  entityType,
  films,
  packages,
  testimonials,
  faqs,
  onFilmsUpdated,
  onPackagesUpdated,
  onTestimonialsUpdated,
  onFaqsUpdated,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Video Source selector tab inside the film form
  const [videoSourceType, setVideoSourceType] = useState<'instagram' | 'youtube' | 'custom'>('instagram');
  const [fetchStatus, setFetchStatus] = useState<string | null>(null);

  // Generic form state
  const [filmForm, setFilmForm] = useState<{
    title: string;
    videoUrl: string;
    date: string;
    coverImage: string;
    provider?: 'instagram' | 'youtube' | 'vimeo' | 'direct' | 'unknown';
    shortcode?: string;
    isVertical?: boolean;
  }>({
    title: '',
    videoUrl: '',
    date: new Date().toISOString().split('T')[0],
    coverImage: '',
    provider: 'instagram',
  });

  const [packageForm, setPackageForm] = useState({
    name: '',
    price: '',
    description: '',
    highlight: false,
  });

  const [testimonialForm, setTestimonialForm] = useState({
    coupleName: '',
    quote: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
  });

  const resetForms = () => {
    setEditingId(null);
    setFormOpen(false);
    setFetchStatus(null);
    setVideoSourceType('instagram');
    setFilmForm({
      title: '',
      videoUrl: '',
      date: new Date().toISOString().split('T')[0],
      coverImage: '',
      provider: 'instagram',
    });
    setPackageForm({
      name: '',
      price: '',
      description: '',
      highlight: false,
    });
    setTestimonialForm({
      coupleName: '',
      quote: '',
      date: new Date().toISOString().split('T')[0],
    });
    setFaqForm({
      question: '',
      answer: '',
    });
  };

  // Handle Video URL change with automatic detection & metadata extraction
  const handleVideoUrlChange = (url: string) => {
    const info = parseVideoUrl(url);
    if (info.provider === 'instagram') {
      setVideoSourceType('instagram');
    } else if (info.provider === 'youtube' || info.provider === 'vimeo') {
      setVideoSourceType('youtube');
    }

    setFilmForm((prev) => ({
      ...prev,
      videoUrl: url,
      provider: info.provider,
      shortcode: info.shortcode,
      isVertical: info.isVertical,
      // If user hasn't provided a coverImage, set smart default
      coverImage: prev.coverImage || (info.thumbnailUrl ? info.thumbnailUrl : prev.coverImage),
    }));

    if (info.provider === 'instagram' && info.shortcode) {
      setFetchStatus(`Instagram Reel shortcode (${info.shortcode}) detected successfully!`);
    } else if (info.provider === 'youtube' && info.shortcode) {
      setFetchStatus(`YouTube Video ID (${info.shortcode}) detected.`);
    } else {
      setFetchStatus(null);
    }
  };

  // Dedicated "Fetch Video from Instagram Link" action
  const handleFetchVideoFromLink = () => {
    if (!filmForm.videoUrl) {
      setFetchStatus('Please paste an Instagram Reel or YouTube link first.');
      return;
    }
    const info = parseVideoUrl(filmForm.videoUrl);
    setFilmForm((prev) => ({
      ...prev,
      provider: info.provider,
      shortcode: info.shortcode,
      isVertical: info.isVertical,
      coverImage: prev.coverImage || info.thumbnailUrl,
      title: prev.title || (info.provider === 'instagram' ? `Wedding Highlight Reel (${info.shortcode})` : prev.title),
    }));

    if (info.provider === 'instagram') {
      setFetchStatus(`Fetched Instagram Reel successfully! Embed preview ready.`);
    } else if (info.provider === 'youtube') {
      setFetchStatus(`Fetched YouTube Video (${info.shortcode}) with high-res thumbnail.`);
    } else {
      setFetchStatus(`Parsed video link as ${info.provider}.`);
    }
  };

  // Handle Editing
  const startEdit = (id: string) => {
    setEditingId(id);
    setFetchStatus(null);
    if (entityType === 'films') {
      const f = films.find((x) => x.id === id);
      if (f) {
        const info = parseVideoUrl(f.videoUrl);
        setVideoSourceType(info.provider === 'instagram' ? 'instagram' : 'youtube');
        setFilmForm({
          title: f.title,
          videoUrl: f.videoUrl,
          date: f.date || '',
          coverImage: f.coverImage || '',
          provider: f.provider || info.provider,
          shortcode: f.shortcode || info.shortcode,
          isVertical: f.isVertical ?? info.isVertical,
        });
      }
    } else if (entityType === 'packages') {
      const p = packages.find((x) => x.id === id);
      if (p) {
        setPackageForm({
          name: p.name,
          price: p.price,
          description: p.description,
          highlight: !!p.highlight,
        });
      }
    } else if (entityType === 'testimonials') {
      const t = testimonials.find((x) => x.id === id);
      if (t) {
        setTestimonialForm({
          coupleName: t.coupleName,
          quote: t.quote,
          date: t.date || '',
        });
      }
    } else if (entityType === 'faqs') {
      const q = faqs.find((x) => x.id === id);
      if (q) {
        setFaqForm({
          question: q.question,
          answer: q.answer,
        });
      }
    }
    setFormOpen(true);
  };

  // Handle Deleting
  const handleDelete = (id: string) => {
    if (entityType === 'films') {
      const updated = films.filter((x) => x.id !== id);
      StorageService.saveFilms(updated);
      onFilmsUpdated(updated);
      setActionNotice('Film removed successfully.');
    } else if (entityType === 'packages') {
      const updated = packages.filter((x) => x.id !== id);
      StorageService.savePackages(updated);
      onPackagesUpdated(updated);
      setActionNotice('Package deleted successfully.');
    } else if (entityType === 'testimonials') {
      const updated = testimonials.filter((x) => x.id !== id);
      StorageService.saveTestimonials(updated);
      onTestimonialsUpdated(updated);
      setActionNotice('Testimonial removed successfully.');
    } else if (entityType === 'faqs') {
      const updated = faqs.filter((x) => x.id !== id);
      StorageService.saveFaqs(updated);
      onFaqsUpdated(updated);
      setActionNotice('FAQ item deleted successfully.');
    }
    setConfirmDeleteId(null);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (entityType === 'films') {
      const info = parseVideoUrl(filmForm.videoUrl);
      const filmData: FilmItem = {
        id: editingId || 'film_' + Date.now().toString(36),
        title: filmForm.title,
        videoUrl: filmForm.videoUrl,
        provider: filmForm.provider || info.provider,
        shortcode: filmForm.shortcode || info.shortcode,
        isVertical: filmForm.isVertical ?? info.isVertical,
        date: filmForm.date,
        coverImage: filmForm.coverImage || info.thumbnailUrl,
        createdAt: editingId ? (films.find((f) => f.id === editingId)?.createdAt || Date.now()) : Date.now(),
      };

      let updated: FilmItem[];
      if (editingId) {
        updated = films.map((f) => (f.id === editingId ? filmData : f));
        setActionNotice('Film updated successfully.');
      } else {
        updated = [filmData, ...films];
        setActionNotice('New film added to portfolio.');
      }
      StorageService.saveFilms(updated);
      onFilmsUpdated(updated);
    } else if (entityType === 'packages') {
      let updated: PackageItem[];
      if (editingId) {
        updated = packages.map((p) => (p.id === editingId ? { ...p, ...packageForm } : p));
        setActionNotice('Package details updated.');
      } else {
        const item: PackageItem = {
          id: 'pkg_' + Date.now().toString(36),
          ...packageForm,
          createdAt: Date.now(),
        };
        updated = [...packages, item];
        setActionNotice('New package created successfully.');
      }
      StorageService.savePackages(updated);
      onPackagesUpdated(updated);
    } else if (entityType === 'testimonials') {
      let updated: TestimonialItem[];
      if (editingId) {
        updated = testimonials.map((t) => (t.id === editingId ? { ...t, ...testimonialForm } : t));
        setActionNotice('Testimonial updated.');
      } else {
        const item: TestimonialItem = {
          id: 'test_' + Date.now().toString(36),
          ...testimonialForm,
          createdAt: Date.now(),
        };
        updated = [item, ...testimonials];
        setActionNotice('New testimonial saved.');
      }
      StorageService.saveTestimonials(updated);
      onTestimonialsUpdated(updated);
    } else if (entityType === 'faqs') {
      let updated: FaqItem[];
      if (editingId) {
        updated = faqs.map((q) => (q.id === editingId ? { ...q, ...faqForm } : q));
        setActionNotice('FAQ item updated.');
      } else {
        const item: FaqItem = {
          id: 'faq_' + Date.now().toString(36),
          ...faqForm,
          createdAt: Date.now(),
        };
        updated = [...faqs, item];
        setActionNotice('New FAQ item added.');
      }
      StorageService.saveFaqs(updated);
      onFaqsUpdated(updated);
    }
    resetForms();
    setTimeout(() => setActionNotice(null), 3000);
  };

  const getTitle = () => {
    switch (entityType) {
      case 'films':
        return { name: 'Wedding Films & Reels', singular: 'Film / Reel', count: films.length };
      case 'packages':
        return { name: 'Investment Packages', singular: 'Package', count: packages.length };
      case 'testimonials':
        return { name: 'Client Testimonials', singular: 'Review', count: testimonials.length };
      case 'faqs':
        return { name: 'Frequently Asked Questions', singular: 'FAQ', count: faqs.length };
    }
  };

  const { name, singular, count } = getTitle();

  // Compute parsed info for live in-form preview
  const liveVideoInfo = filmForm.videoUrl ? parseVideoUrl(filmForm.videoUrl) : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            {name} ({count})
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-normal">
            Manage your wedding cinema, Instagram reels, and video highlights displayed on the live website.
          </p>
        </div>

        {!formOpen && (
          <button
            onClick={() => {
              resetForms();
              setFormOpen(true);
            }}
            id="add-new-crud-item-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-xs uppercase tracking-widest font-bold hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add {singular}</span>
          </button>
        )}
      </div>

      {/* Add / Edit Form Modal/Card */}
      {formOpen && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                {entityType === 'films' && <Video className="w-5 h-5 text-emerald-500" />}
                <span>{editingId ? `Edit ${singular}` : `Add New ${singular}`}</span>
              </h3>
              {entityType === 'films' && (
                <p className="text-xs text-gray-500 mt-0.5 font-normal">
                  Paste an Instagram Reel link, YouTube cinema link, or Vimeo URL to automatically fetch and embed the video.
                </p>
              )}
            </div>
            <button
              onClick={resetForms}
              className="p-1 text-gray-400 hover:text-black cursor-pointer rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* 1. FILMS & INSTAGRAM REELS FORM */}
            {entityType === 'films' && (
              <>
                {/* Source Selection Tabs */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoSourceType('instagram');
                      if (!filmForm.videoUrl || filmForm.videoUrl.includes('youtube')) {
                        handleVideoUrlChange('https://www.instagram.com/reel/C3b45XYZ890/');
                      }
                    }}
                    className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      videoSourceType === 'instagram'
                        ? 'bg-white text-black shadow-xs font-extrabold'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center shrink-0">
                      <Instagram className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span>Instagram Reel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVideoSourceType('youtube');
                      if (!filmForm.videoUrl || filmForm.videoUrl.includes('instagram')) {
                        handleVideoUrlChange('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                      }
                    }}
                    className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      videoSourceType === 'youtube'
                        ? 'bg-white text-black shadow-xs font-extrabold'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    <Film className="w-4 h-4 text-red-500" />
                    <span>YouTube / Vimeo Film</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoSourceType('custom')}
                    className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      videoSourceType === 'custom'
                        ? 'bg-white text-black shadow-xs font-extrabold'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    <Video className="w-4 h-4 text-emerald-600" />
                    <span>Custom / Direct MP4</span>
                  </button>
                </div>

                {/* Primary Video Link Input with Instant Fetch Button */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                    {videoSourceType === 'instagram'
                      ? 'Instagram Reel / Post Video Link *'
                      : videoSourceType === 'youtube'
                      ? 'YouTube / Vimeo Video URL *'
                      : 'Direct Video URL *'}
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        required
                        value={filmForm.videoUrl}
                        onChange={(e) => handleVideoUrlChange(e.target.value)}
                        placeholder={
                          videoSourceType === 'instagram'
                            ? 'https://www.instagram.com/reel/C3b45XYZ890/ or https://instagram.com/p/...'
                            : 'https://youtube.com/watch?v=... or https://vimeo.com/...'
                        }
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-mono focus:outline-none focus:border-black bg-white"
                      />
                      {filmForm.videoUrl && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {liveVideoInfo?.provider === 'instagram' ? (
                            <Instagram className="w-4 h-4 text-pink-500" />
                          ) : (
                            <Film className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleFetchVideoFromLink}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      <span>Fetch Video from Link</span>
                    </button>
                  </div>

                  {fetchStatus && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium pt-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{fetchStatus}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-gray-400 font-normal">
                    {videoSourceType === 'instagram'
                      ? 'Supports instagram.com/reel/..., instagram.com/reels/..., and instagram.com/p/... formats.'
                      : 'Supports full YouTube watch URLs, short URLs (youtu.be), YouTube Shorts, and Vimeo URLs.'}
                  </p>
                </div>

                {/* Film Title and Celebration Date */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-8">
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                      Wedding Title / Reel Caption *
                    </label>
                    <input
                      type="text"
                      required
                      value={filmForm.title}
                      onChange={(e) => setFilmForm({ ...filmForm, title: e.target.value })}
                      placeholder="e.g. Tara & Neil — Sunset Haldi & Joyful Sangeet Reel"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                      Celebration Date
                    </label>
                    <input
                      type="date"
                      value={filmForm.date}
                      onChange={(e) => setFilmForm({ ...filmForm, date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                {/* Cover Thumbnail URL */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                    Cover Image / Video Poster Thumbnail URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={filmForm.coverImage}
                      onChange={(e) => setFilmForm({ ...filmForm, coverImage: e.target.value })}
                      placeholder="https://images.unsplash.com/... or leave blank for auto-generated poster"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:border-black font-mono"
                    />
                  </div>
                </div>

                {/* Live In-Form Video Player Preview Card */}
                {liveVideoInfo && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 text-white space-y-3 border border-neutral-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs uppercase tracking-widest font-bold">
                          Live Video Player Preview ({liveVideoInfo.provider.toUpperCase()})
                        </span>
                      </div>

                      {liveVideoInfo.provider === 'instagram' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white text-[10px] font-bold">
                          <Instagram className="w-3 h-3" />
                          <span>Reel #{liveVideoInfo.shortcode}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                      {liveVideoInfo.provider === 'instagram' ? (
                        <div className="w-full max-w-[280px] aspect-[9/16] bg-black rounded-xl overflow-hidden border border-white/10 mx-auto">
                          <iframe
                            src={liveVideoInfo.embedUrl}
                            title="Instagram Reel Preview"
                            className="w-full h-full border-0"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            scrolling="no"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10">
                          <iframe
                            src={liveVideoInfo.embedUrl}
                            title="Film Preview"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2. PACKAGES FORM */}
            {entityType === 'packages' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                      Package Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={packageForm.name}
                      onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                      placeholder="e.g. The Full Wedding Story"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                      Pricing Line *
                    </label>
                    <input
                      type="text"
                      required
                      value={packageForm.price}
                      onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                      placeholder="e.g. ₹1,95,000 onward"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                    Inclusions (one item per line) *
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={packageForm.description}
                    onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                    placeholder="• 2–3 Days of coverage&#10;• Lead Candid Photographer + 2 Associates&#10;• 600+ hand-edited photographs&#10;• 3–5 min cinematic teaser"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pkg-highlight"
                    checked={packageForm.highlight}
                    onChange={(e) => setPackageForm({ ...packageForm, highlight: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black cursor-pointer"
                  />
                  <label htmlFor="pkg-highlight" className="text-xs font-semibold text-gray-900 cursor-pointer">
                    Highlight as "Most Chosen by Couples" badge
                  </label>
                </div>
              </>
            )}

            {/* 3. TESTIMONIALS FORM */}
            {entityType === 'testimonials' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                      Couple Name &amp; Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={testimonialForm.coupleName}
                      onChange={(e) =>
                        setTestimonialForm({ ...testimonialForm, coupleName: e.target.value })
                      }
                      placeholder="e.g. Ananya & Kabir · Umaid Bhawan, Jodhpur"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                      Wedding Date
                    </label>
                    <input
                      type="date"
                      value={testimonialForm.date}
                      onChange={(e) =>
                        setTestimonialForm({ ...testimonialForm, date: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                    Couple's Review / Words *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={testimonialForm.quote}
                    onChange={(e) =>
                      setTestimonialForm({ ...testimonialForm, quote: e.target.value })
                    }
                    placeholder="Describe their experience..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black leading-relaxed"
                  />
                </div>
              </>
            )}

            {/* 4. FAQS FORM */}
            {entityType === 'faqs' && (
              <>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                    Question *
                  </label>
                  <input
                    type="text"
                    required
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    placeholder="e.g. How far in advance should we book?"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                    Answer *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                    placeholder="Write a clear, helpful response..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black leading-relaxed"
                  />
                </div>
              </>
            )}

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                id="crud-submit-btn"
                className="px-6 py-2.5 rounded-full bg-black text-white text-xs uppercase tracking-widest font-bold hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
              >
                {editingId ? `Update ${singular}` : `Save & Add ${singular}`}
              </button>
              <button
                type="button"
                onClick={resetForms}
                className="px-5 py-2.5 rounded-full border border-gray-200 text-xs uppercase tracking-widest font-bold text-gray-500 hover:text-black cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-black text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-gray-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* List Views */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-2xs">
        {/* Films List */}
        {entityType === 'films' &&
          films.map((f) => {
            const videoInfo = parseVideoUrl(f.videoUrl);
            const isInstagram = videoInfo.provider === 'instagram' || f.provider === 'instagram';
            const isDeleting = confirmDeleteId === f.id;

            return (
              <div key={f.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Thumbnail */}
                  <div className="w-16 h-12 rounded-lg bg-black overflow-hidden relative shrink-0 border border-gray-200">
                    <img
                      src={
                        f.coverImage ||
                        (isInstagram
                          ? 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=300&auto=format&fit=crop'
                          : 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=300&auto=format&fit=crop')
                      }
                      alt={f.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-white fill-current" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 truncate max-w-sm">{f.title}</p>
                      {isInstagram ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white text-[9px] font-extrabold uppercase tracking-wider">
                          <Instagram className="w-2.5 h-2.5" />
                          <span>Reel</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[9px] font-bold uppercase tracking-wider">
                          <Film className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Cinema</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md font-mono">{f.videoUrl}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isDeleting ? (
                    <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-xl border border-red-200">
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase tracking-wider font-extrabold cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 rounded-lg text-gray-500 hover:text-black cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <a
                        href={f.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                        title="Open Video Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => startEdit(f.id)}
                        className="p-2 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Edit Film"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(f.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Film"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

        {/* Packages List */}
        {entityType === 'packages' &&
          packages.map((p) => {
            const isDeleting = confirmDeleteId === p.id;
            return (
              <div key={p.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{p.name}</p>
                    {p.highlight && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-black text-[9px] uppercase tracking-widest font-extrabold">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-black font-extrabold mt-0.5">{p.price}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isDeleting ? (
                    <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-xl border border-red-200">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase tracking-wider font-extrabold cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 rounded-lg text-gray-500 hover:text-black cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(p.id)}
                        className="p-2 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Edit Package"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

        {/* Testimonials List */}
        {entityType === 'testimonials' &&
          testimonials.map((t) => {
            const isDeleting = confirmDeleteId === t.id;
            return (
              <div key={t.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.coupleName}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">"{t.quote}"</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isDeleting ? (
                    <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-xl border border-red-200">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase tracking-wider font-extrabold cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 rounded-lg text-gray-500 hover:text-black cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(t.id)}
                        className="p-2 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Edit Testimonial"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(t.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Testimonial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

        {/* FAQs List */}
        {entityType === 'faqs' &&
          faqs.map((q) => {
            const isDeleting = confirmDeleteId === q.id;
            return (
              <div key={q.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{q.question}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{q.answer}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isDeleting ? (
                    <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-xl border border-red-200">
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase tracking-wider font-extrabold cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 rounded-lg text-gray-500 hover:text-black cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(q.id)}
                        className="p-2 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Edit FAQ"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(q.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
