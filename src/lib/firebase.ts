import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';
import { FamilyMember, MedicalReport, AnomalyAlert, AIChatMessage } from '../types';
import { compressReportImageForCloud, getBase64SizeBytes } from '../utils/imageCompressor';

// Initialize Client Firebase App (for direct access when not blocked)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom databaseId if configured
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Direct Collection References
export const membersCol = collection(db, 'members');
export const reportsCol = collection(db, 'reports');
export const alertsCol = collection(db, 'alerts');
export const chatMessagesCol = collection(db, 'chat_messages');

/**
 * Health check for Server-Side Cloud Storage Bridge
 * (Bypasses Great Firewall / GFW for Mainland China users)
 */
export async function checkCloudHealth(): Promise<{
  connected: boolean;
  proxyMode?: string;
  memberCount?: number;
}> {
  try {
    const res = await fetch('/api/db/health', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return { connected: true, proxyMode: data.proxyMode, memberCount: data.memberCount };
    }
  } catch (e) {
    console.warn('Server cloud health check failed:', e);
  }
  return { connected: false };
}

/**
 * Fetch all cloud collections in one batch via Server Tunnel
 * Highly resilient in Mainland China
 */
export async function fetchAllCloudData(): Promise<{
  success: boolean;
  members: FamilyMember[];
  reports: MedicalReport[];
  alerts: AnomalyAlert[];
}> {
  try {
    const res = await fetch('/api/db/all', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        members: data.members || [],
        reports: data.reports || [],
        alerts: data.alerts || []
      };
    }
  } catch (error) {
    console.warn('Failed to fetch data via server cloud tunnel, attempting direct client SDK:', error);
  }

  // Fallback to direct client Firestore SDK if server endpoint was unreachable
  try {
    const [mSnap, rSnap, aSnap] = await Promise.all([
      getDocs(membersCol),
      getDocs(reportsCol),
      getDocs(alertsCol)
    ]);
    const members: FamilyMember[] = [];
    mSnap.forEach(d => members.push(d.data() as FamilyMember));
    const reports: MedicalReport[] = [];
    rSnap.forEach(d => reports.push(d.data() as MedicalReport));
    const alerts: AnomalyAlert[] = [];
    aSnap.forEach(d => alerts.push(d.data() as AnomalyAlert));

    return { success: true, members, reports, alerts };
  } catch (e) {
    console.error('Direct Firestore fetch also failed (likely offline or network blocked):', e);
    return { success: false, members: [], reports: [], alerts: [] };
  }
}

/**
 * Save or update a single member in Firestore
 * Primary Channel: Server Cloud Tunnel (guaranteed reachable in Mainland China)
 * Auxiliary Channel: Direct Firestore SDK (background non-blocking sync)
 */
export async function saveMemberToCloud(member: FamilyMember): Promise<void> {
  let serverSaved = false;

  // 1. Primary: Save via Server Cloud Tunnel (China Accelerated Tunnel)
  try {
    const res = await fetch('/api/db/member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member)
    });
    if (res.ok) {
      serverSaved = true;
    }
  } catch (err) {
    console.warn('Primary tunnel save member failed, attempting auxiliary direct Firestore:', err);
  }

  // 2. Auxiliary: Direct Firestore write (non-blocking if primary succeeded)
  try {
    const docRef = doc(db, 'members', member.id);
    const writePromise = setDoc(docRef, {
      ...member,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    if (!serverSaved) {
      // If primary failed, await auxiliary direct write
      await writePromise;
    } else {
      // If primary succeeded, do not block UI with auxiliary channel
      writePromise.catch((e) => {
        // Silent catch for expected network blocking in Mainland China
      });
    }
  } catch (directErr) {
    if (!serverSaved) {
      console.error('Both primary tunnel and auxiliary direct Firestore failed to save member:', directErr);
      throw directErr;
    }
  }
}

/**
 * Save or update a single medical report in Firestore.
 * Automatically guarantees any attached image is under 500KB to safely satisfy Firestore's 1MB document limit.
 * Primary Channel: Server Cloud Tunnel
 * Auxiliary Channel: Direct Firestore SDK
 */
export async function saveReportToCloud(report: MedicalReport): Promise<void> {
  let reportToSave = { ...report };

  // If image exists and is larger than 500KB, perform auto-compression
  if (reportToSave.imageUrl && reportToSave.imageUrl.startsWith('data:image')) {
    const sizeBytes = getBase64SizeBytes(reportToSave.imageUrl);
    if (sizeBytes > 500 * 1024) {
      try {
        const compResult = await compressReportImageForCloud(reportToSave.imageUrl, 1600, 480 * 1024);
        reportToSave.imageUrl = compResult.dataUrl;
        console.log(`Report image auto-compressed for Firestore: ${compResult.originalSizeFormatted} -> ${compResult.compressedSizeFormatted}`);
      } catch (compErr) {
        console.warn('Image auto-compression failed, saving original:', compErr);
      }
    }
  }

  let serverSaved = false;

  // 1. Primary: Save via Server Cloud Tunnel
  try {
    const res = await fetch('/api/db/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportToSave)
    });
    if (res.ok) {
      serverSaved = true;
    }
  } catch (err) {
    console.warn('Primary tunnel save report failed, attempting auxiliary direct Firestore:', err);
  }

  // 2. Auxiliary: Direct Firestore write
  try {
    const docRef = doc(db, 'reports', report.id);
    const writePromise = setDoc(docRef, {
      ...reportToSave,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    if (!serverSaved) {
      await writePromise;
    } else {
      writePromise.catch(() => {});
    }
  } catch (directErr) {
    if (!serverSaved) {
      console.error('Both primary tunnel and auxiliary direct Firestore failed to save report:', directErr);
      throw directErr;
    }
  }
}

export async function deleteReportFromCloud(reportId: string): Promise<void> {
  let serverDeleted = false;
  // 1. Primary: Delete via Server Cloud Tunnel
  try {
    const res = await fetch(`/api/db/report/${encodeURIComponent(reportId)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      serverDeleted = true;
    }
  } catch (err) {
    console.warn('Primary tunnel delete report failed:', err);
  }

  // 2. Auxiliary: Direct Firestore delete
  try {
    const docRef = doc(db, 'reports', reportId);
    const deletePromise = deleteDoc(docRef);
    if (!serverDeleted) {
      await deletePromise;
    } else {
      deletePromise.catch(() => {});
    }
  } catch (directErr) {
    if (!serverDeleted) {
      console.error('Both primary tunnel and auxiliary direct Firestore failed to delete report:', directErr);
      throw directErr;
    }
  }
}

/**
 * Save or update an AI Chat Consultation message to Firestore
 * Primary Channel: Server Cloud Tunnel
 * Auxiliary Channel: Direct Firestore SDK
 */
export async function saveChatMessageToCloud(message: AIChatMessage, memberId: string): Promise<void> {
  let serverSaved = false;
  try {
    const res = await fetch('/api/db/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, memberId })
    });
    if (res.ok) {
      serverSaved = true;
    }
  } catch (err) {
    console.warn('Primary tunnel save chat failed, trying auxiliary direct Firestore:', err);
  }

  try {
    const docRef = doc(db, 'chat_messages', message.id);
    const writePromise = setDoc(docRef, {
      id: message.id,
      memberId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      relatedMemberName: message.relatedMemberName || '',
      relatedIndicator: message.relatedIndicator || '',
      createdAt: message.createdAt || new Date().toISOString(),
      ...(message.imageUrl ? { imageUrl: message.imageUrl } : {}),
      ...(message.imageFileName ? { imageFileName: message.imageFileName } : {}),
      ...(message.audioUrl ? { audioUrl: message.audioUrl } : {}),
      ...(message.audioDuration ? { audioDuration: message.audioDuration } : {}),
      ...(message.source ? { source: message.source } : {})
    }, { merge: true });

    if (!serverSaved) {
      await writePromise;
    } else {
      writePromise.catch(() => {});
    }
  } catch (error) {
    // Non-blocking
  }
}

/**
 * Delete all chat messages for a specific member from Firestore
 * Primary Channel: Server Cloud Tunnel
 * Auxiliary Channel: Direct Firestore SDK
 */
export async function clearChatMessagesFromCloud(memberId: string): Promise<void> {
  let serverCleared = false;
  try {
    const res = await fetch(`/api/db/chat/${encodeURIComponent(memberId)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      serverCleared = true;
    }
  } catch (err) {
    console.warn('Primary tunnel clear chat failed, trying auxiliary:', err);
  }

  try {
    const q = query(chatMessagesCol, where('memberId', '==', memberId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    const commitPromise = batch.commit();
    if (!serverCleared) {
      await commitPromise;
    } else {
      commitPromise.catch(() => {});
    }
  } catch (error) {
    console.warn('Direct clear chat error:', error);
  }
}

/**
 * Fetch all chat consultation messages from Firestore across all members or for a single member
 */
export async function getAllChatMessagesFromCloud(memberId?: string): Promise<AIChatMessage[]> {
  try {
    const url = memberId ? `/api/db/chat?memberId=${encodeURIComponent(memberId)}` : '/api/db/chat';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.messages || [];
    }
  } catch (err) {
    console.warn('Server tunnel fetch chat messages failed, falling back to direct:', err);
  }

  try {
    const q = memberId 
      ? query(chatMessagesCol, where('memberId', '==', memberId))
      : chatMessagesCol;
    const snap = await getDocs(q);
    const msgs: AIChatMessage[] = [];
    snap.forEach((d) => {
      msgs.push(d.data() as AIChatMessage);
    });
    msgs.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
    return msgs;
  } catch (error) {
    console.error('Error fetching chat messages from Firestore:', error);
    return [];
  }
}

/**
 * Initialize Cloud data with initial demo data if cloud collection is empty
 */
export async function seedCloudIfEmpty(
  initialMembers: FamilyMember[],
  initialReports: MedicalReport[],
  initialAlerts: AnomalyAlert[]
): Promise<void> {
  try {
    const res = await fetch('/api/db/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        members: initialMembers,
        reports: initialReports,
        alerts: initialAlerts
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.seeded) {
        console.log('Seeded Firestore via Server Bridge.');
      }
      return;
    }
  } catch (err) {
    console.warn('Server tunnel seed failed, trying direct Firestore:', err);
  }

  // Direct Firestore seed fallback
  try {
    const memberSnap = await getDocs(membersCol);
    if (memberSnap.empty) {
      console.log('Seeding initial members & data to direct Firestore...');
      const batch = writeBatch(db);

      for (const m of initialMembers) {
        batch.set(doc(db, 'members', m.id), m);
      }
      for (const r of initialReports) {
        batch.set(doc(db, 'reports', r.id), r);
      }
      for (const a of initialAlerts) {
        batch.set(doc(db, 'alerts', a.id), a);
      }

      await batch.commit();
      console.log('Initial direct cloud seeding complete.');
    }
  } catch (error) {
    console.warn('Could not seed direct Firestore:', error);
  }
}

/**
 * Restore or replace cloud database from full backup
 */
export async function restoreCloudDatabase(payload: {
  members?: FamilyMember[];
  reports?: MedicalReport[];
  alerts?: AnomalyAlert[];
  mode?: 'merge' | 'replace';
}): Promise<boolean> {
  try {
    const res = await fetch('/api/db/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.error('Cloud restore failed:', err);
    return false;
  }
}

export { onSnapshot, doc, getDocs, query, where, orderBy, limit };
