import { SiteSettings, PhotoItem, PackageItem, TestimonialItem, FaqItem, FilmItem, InquiryItem } from '../types';
import { DEFAULT_SETTINGS, INITIAL_PHOTOS, INITIAL_PACKAGES, INITIAL_TESTIMONIALS, INITIAL_FAQS, INITIAL_FILMS } from '../data/initialData';
import { FirebaseService } from './firebase';

const KEYS = {
  SETTINGS: 'unposed_settings',
  PHOTOS: 'unposed_photos',
  PACKAGES: 'unposed_packages',
  TESTIMONIALS: 'unposed_testimonials',
  FAQS: 'unposed_faqs',
  FILMS: 'unposed_films',
  INQUIRIES: 'unposed_inquiries',
  PIN: 'unposed_admin_pin',
};

// Safe LocalStorage access
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Storage get error for ${key}:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`Storage set error for ${key}:`, err);
    return false;
  }
}

export const StorageService = {
  getSettings(): SiteSettings {
    const saved = getItem<SiteSettings | null>(KEYS.SETTINGS, null);
    if (!saved) return { ...DEFAULT_SETTINGS };
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      stripAvatars: saved.stripAvatars && saved.stripAvatars.length > 0 ? saved.stripAvatars : DEFAULT_SETTINGS.stripAvatars,
      theme: { ...DEFAULT_SETTINGS.theme, ...(saved.theme || {}) }
    };
  },

  saveSettings(settings: SiteSettings): boolean {
    const res = setItem(KEYS.SETTINGS, settings);
    if (res && settings.firebaseSyncEnabled !== false) {
      FirebaseService.saveSettings(settings).catch(() => {});
    }
    return res;
  },

  getPhotos(): PhotoItem[] {
    const photos = getItem<PhotoItem[]>(KEYS.PHOTOS, INITIAL_PHOTOS);
    if (!photos || photos.length === 0) {
      setItem(KEYS.PHOTOS, INITIAL_PHOTOS);
      return INITIAL_PHOTOS;
    }
    return photos;
  },

  savePhotos(photos: PhotoItem[]): boolean {
    const res = setItem(KEYS.PHOTOS, photos);
    if (res) {
      FirebaseService.saveAllPhotos(photos).catch(() => {});
    }
    return res;
  },

  getPackages(): PackageItem[] {
    return getItem<PackageItem[]>(KEYS.PACKAGES, INITIAL_PACKAGES);
  },

  savePackages(pkgs: PackageItem[]): boolean {
    return setItem(KEYS.PACKAGES, pkgs);
  },

  getTestimonials(): TestimonialItem[] {
    return getItem<TestimonialItem[]>(KEYS.TESTIMONIALS, INITIAL_TESTIMONIALS);
  },

  saveTestimonials(items: TestimonialItem[]): boolean {
    return setItem(KEYS.TESTIMONIALS, items);
  },

  getFaqs(): FaqItem[] {
    return getItem<FaqItem[]>(KEYS.FAQS, INITIAL_FAQS);
  },

  saveFaqs(faqs: FaqItem[]): boolean {
    return setItem(KEYS.FAQS, faqs);
  },

  getFilms(): FilmItem[] {
    return getItem<FilmItem[]>(KEYS.FILMS, INITIAL_FILMS);
  },

  saveFilms(films: FilmItem[]): boolean {
    return setItem(KEYS.FILMS, films);
  },

  getInquiries(): InquiryItem[] {
    return getItem<InquiryItem[]>(KEYS.INQUIRIES, []);
  },

  saveInquiries(inquiries: InquiryItem[]): boolean {
    return setItem(KEYS.INQUIRIES, inquiries);
  },

  addInquiry(inquiry: Omit<InquiryItem, 'id' | 'createdAt' | 'read'>): InquiryItem {
    const inquiries = this.getInquiries();
    const settings = this.getSettings();
    const isAutoReplyOn = settings.autoReplyEnabled !== false;

    const newEntry: InquiryItem = {
      ...inquiry,
      id: 'inq_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: Date.now(),
      read: false,
      autoReplied: isAutoReplyOn,
      autoReplySentAt: isAutoReplyOn ? Date.now() : undefined,
      autoReplyNote: isAutoReplyOn ? 'Automated confirmation & pricing guide dispatched' : undefined,
    };

    inquiries.unshift(newEntry);
    this.saveInquiries(inquiries);

    // Save to Firebase Firestore Database / Storage Base
    FirebaseService.saveInquiry(newEntry).catch(() => {});

    return newEntry;
  },

  markInquiryAutoReplied(id: string, note?: string): boolean {
    const inquiries = this.getInquiries();
    const target = inquiries.find((i) => i.id === id);
    if (target) {
      target.autoReplied = true;
      target.autoReplySentAt = Date.now();
      if (note) target.autoReplyNote = note;
      this.saveInquiries(inquiries);
      FirebaseService.saveInquiry(target).catch(() => {});
      return true;
    }
    return false;
  },

  generateAutoReplyText(inquiry: InquiryItem, settings?: SiteSettings): {
    subject: string;
    greeting: string;
    body: string;
    whatsappUrl: string;
    mailToUrl: string;
  } {
    const cfg = settings || this.getSettings();
    const firstName = inquiry.name.split(' ')[0] || inquiry.name;
    const subject = cfg.autoReplySubject || `Thank You for Your Wedding Inquiry - ${cfg.siteName}`;
    const greeting = `Dear ${firstName}, ${cfg.autoReplyGreeting || 'Warmest congratulations on your upcoming wedding celebration!'}`;
    
    const body = `${greeting}

${cfg.autoReplyMessage || 'Thank you for getting in touch with us! We have safely received your wedding details and requirements.'}

---
Your Submitted Details:
• Couple / Client: ${inquiry.name}
• Wedding / Event Date: ${inquiry.weddingDate || 'To be finalized'}
• Contact Phone: ${inquiry.phone || 'Not provided'}
• Email: ${inquiry.email}
• Estimated Response Time: ${cfg.autoReplyEstimatedTime || 'Within 4–12 hours'}

Investment & Brochure Vault:
${cfg.autoReplyBrochureUrl || cfg.driveFolderUrl || 'Available upon request'}

Warm regards,
${cfg.founderName} (${cfg.founderTitle})
${cfg.siteName} · ${cfg.locationsLine}
Phone: ${cfg.contactPhone}
Email: ${cfg.contactEmail}`;

    const cleanPhone = (cfg.contactPhone || '').replace(/[^0-9]/g, '');
    const defaultWhatsAppPhone = cleanPhone || '917045278377';
    const waText = encodeURIComponent(
      `Hello Sandip! I just submitted a wedding inquiry on ${cfg.siteName} for ${inquiry.name} (Date: ${inquiry.weddingDate || 'TBD'}). Would love to connect!`
    );
    const whatsappUrl = `https://wa.me/${defaultWhatsAppPhone}?text=${waText}`;

    const mailToUrl = `mailto:${encodeURIComponent(inquiry.email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    return {
      subject,
      greeting,
      body,
      whatsappUrl,
      mailToUrl,
    };
  },

  getPin(): string | null {
    return getItem<string | null>(KEYS.PIN, '1234'); // Default PIN 1234
  },

  savePin(pin: string): boolean {
    return setItem(KEYS.PIN, pin);
  },

  /**
   * Compresses large camera image files (including 10MB-50MB high-res DSLR files)
   * with high-precision smoothing, optimal dimensions, and next-gen WebP/JPEG encoding.
   */
  compressImage(file: File, maxDim = 1800, quality = 0.84): Promise<string> {
    return this.compressImageWithStats(file, maxDim, quality).then((res) => res.dataUrl);
  },

  /**
   * Advanced image compressor returning compression diagnostics and metrics.
   */
  compressImageWithStats(
    file: File,
    maxDim = 1800,
    quality = 0.84
  ): Promise<{
    dataUrl: string;
    originalBytes: number;
    compressedBytes: number;
    originalSizeFormatted: string;
    compressedSizeFormatted: string;
    width: number;
    height: number;
    format: 'webp' | 'jpeg';
    savedPercent: number;
  }> {
    return new Promise((resolve, reject) => {
      const originalBytes = file.size;
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Maintain aspect ratio while bounding within maxDim
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            reject(new Error('Canvas rendering context unavailable'));
            return;
          }

          // Enable high-quality bicubic downsampling interpolation
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Clean white background in case of transparent png
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Try modern WebP first (supported by 97%+ browsers), fallback to JPEG
          let dataUrl = '';
          let format: 'webp' | 'jpeg' = 'webp';

          try {
            dataUrl = canvas.toDataURL('image/webp', quality);
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/jpeg', quality);
              format = 'jpeg';
            }
          } catch {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            format = 'jpeg';
          }

          // Calculate approximate byte size from base64
          const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
          const compressedBytes = Math.round((base64Length * 3) / 4);
          const savedPercent = Math.max(
            0,
            Math.round(((originalBytes - compressedBytes) / Math.max(1, originalBytes)) * 100)
          );

          const formatBytes = (bytes: number) => {
            if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
            return bytes + ' B';
          };

          resolve({
            dataUrl,
            originalBytes,
            compressedBytes,
            originalSizeFormatted: formatBytes(originalBytes),
            compressedSizeFormatted: formatBytes(compressedBytes),
            width,
            height,
            format,
            savedPercent,
          });
        };

        img.onerror = () => reject(new Error('Failed to process image file'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read image data'));
      reader.readAsDataURL(file);
    });
  },
};
