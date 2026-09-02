import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { PhotoItem, InquiryItem, SiteSettings, PackageItem, TestimonialItem, FaqItem, FilmItem } from '../types';

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(firebaseConfig);
    }
  }
  return appInstance;
}

export function getDb(): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    if (firebaseConfig.firestoreDatabaseId) {
      firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      firestoreInstance = getFirestore(app);
    }
  }
  return firestoreInstance;
}

export const FirebaseService = {
  isConfigured(): boolean {
    return !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
  },

  getProjectInfo() {
    return {
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
      storageBucket: firebaseConfig.storageBucket || '',
      authDomain: firebaseConfig.authDomain || '',
    };
  },

  // --- Photos Storage Base & Firestore ---
  async savePhoto(photo: PhotoItem): Promise<boolean> {
    try {
      const db = getDb();
      const photoRef = doc(db, 'photos', photo.id);
      await setDoc(photoRef, {
        ...photo,
        cloudSynced: true,
        updatedAt: Date.now(),
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('Firebase savePhoto error:', err);
      return false;
    }
  },

  async saveAllPhotos(photos: PhotoItem[]): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const db = getDb();
      let successCount = 0;
      for (const photo of photos) {
        const photoRef = doc(db, 'photos', photo.id);
        await setDoc(photoRef, {
          ...photo,
          cloudSynced: true,
          updatedAt: Date.now(),
        }, { merge: true });
        successCount++;
      }
      return { success: true, count: successCount };
    } catch (err: any) {
      console.warn('Firebase saveAllPhotos error:', err);
      return { success: false, count: 0, error: err.message };
    }
  },

  async fetchPhotos(): Promise<PhotoItem[] | null> {
    try {
      const db = getDb();
      const photosCol = collection(db, 'photos');
      const q = query(photosCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const list: PhotoItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PhotoItem;
        list.push({ ...data, id: docSnap.id, cloudSynced: true });
      });
      return list;
    } catch (err) {
      console.warn('Firebase fetchPhotos error:', err);
      return null;
    }
  },

  async deletePhoto(id: string): Promise<boolean> {
    try {
      const db = getDb();
      const photoRef = doc(db, 'photos', id);
      await deleteDoc(photoRef);
      return true;
    } catch (err) {
      console.warn('Firebase deletePhoto error:', err);
      return false;
    }
  },

  // --- Inquiries with Auto-Reply Tracking ---
  async saveInquiry(inquiry: InquiryItem): Promise<boolean> {
    try {
      const db = getDb();
      const inqRef = doc(db, 'inquiries', inquiry.id);
      await setDoc(inqRef, {
        ...inquiry,
        savedToCloudAt: Date.now(),
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('Firebase saveInquiry error:', err);
      return false;
    }
  },

  async fetchInquiries(): Promise<InquiryItem[] | null> {
    try {
      const db = getDb();
      const inqCol = collection(db, 'inquiries');
      const q = query(inqCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const list: InquiryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as InquiryItem;
        list.push({ ...data, id: docSnap.id });
      });
      return list;
    } catch (err) {
      console.warn('Firebase fetchInquiries error:', err);
      return null;
    }
  },

  async deleteInquiry(id: string): Promise<boolean> {
    try {
      const db = getDb();
      const inqRef = doc(db, 'inquiries', id);
      await deleteDoc(inqRef);
      return true;
    } catch (err) {
      console.warn('Firebase deleteInquiry error:', err);
      return false;
    }
  },

  // --- Site Settings ---
  async saveSettings(settings: SiteSettings): Promise<boolean> {
    try {
      const db = getDb();
      const settingsRef = doc(db, 'settings', 'main');
      await setDoc(settingsRef, {
        ...settings,
        firebaseLastSyncedAt: Date.now(),
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('Firebase saveSettings error:', err);
      return false;
    }
  },

  async fetchSettings(): Promise<SiteSettings | null> {
    try {
      const db = getDb();
      const settingsRef = doc(db, 'settings', 'main');
      const snapshot = await getDoc(settingsRef);
      if (snapshot.exists()) {
        return snapshot.data() as SiteSettings;
      }
      return null;
    } catch (err) {
      console.warn('Firebase fetchSettings error:', err);
      return null;
    }
  },

  // --- Full Sync Utility ---
  async syncEverythingToCloud(data: {
    photos: PhotoItem[];
    settings: SiteSettings;
    inquiries: InquiryItem[];
    packages?: PackageItem[];
    testimonials?: TestimonialItem[];
    faqs?: FaqItem[];
    films?: FilmItem[];
  }): Promise<{ success: boolean; message: string }> {
    try {
      await this.saveSettings(data.settings);
      await this.saveAllPhotos(data.photos);
      
      const db = getDb();
      for (const inq of data.inquiries) {
        await setDoc(doc(db, 'inquiries', inq.id), inq, { merge: true });
      }

      return {
        success: true,
        message: `Successfully synced ${data.photos.length} photos, ${data.inquiries.length} inquiries, and site settings to Firebase Cloud database.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to sync with Firebase Cloud database.',
      };
    }
  },
};
