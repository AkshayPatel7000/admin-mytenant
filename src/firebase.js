import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  addDoc,
  updateDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Single Admin Authentication via Email & Password
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return userCredential.user;
  } catch (error) {
    console.error("Email/Password login error:", error.code, error.message);
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error("Invalid Admin Email or Password. Please check your credentials.");
    }
    if (error.code === 'auth/too-many-requests') {
      throw new Error("Too many failed attempts. Please try again later.");
    }
    throw error;
  }
};

export const logoutAdmin = () => signOut(auth);

// PUBLIC ACTIVE TENANT DATA FETCH (For QR Code Tenant View)
// Returns ONLY current active tenant's electricity & rent records
export const fetchPublicActiveTenantData = async (userId, roomId) => {
  // Auto anonymous login for unauthenticated mobile tenants to bypass request.auth != null Firestore checks
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn("Anonymous auth fallback notice:", e);
    }
  }

  let permissionError = null;

  // 1. Fetch Landlord details for contact & UPI pay
  let landlord = null;
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      landlord = { id: userSnap.id, ...userSnap.data() };
    }
  } catch (e) {
    console.warn("Landlord profile fetch warning:", e);
    if (e.code === 'permission-denied' || e.message?.includes('permission')) {
      permissionError = e;
    }
  }

  // 2. Fetch Room details (Direct Doc ID check + Subcollection scan fallback)
  let room = null;
  try {
    const roomRef = doc(db, "users", userId, "rooms", roomId);
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      room = { id: roomSnap.id, ...roomSnap.data() };
    }
  } catch (e) {
    console.warn("Direct room doc fetch warning:", e);
    if (e.code === 'permission-denied' || e.message?.includes('permission')) {
      permissionError = e;
    }
  }

  // Fallback: Scan rooms subcollection if direct doc look up returned null
  if (!room) {
    try {
      const roomsRef = collection(db, "users", userId, "rooms");
      const roomsSnap = await getDocs(roomsRef);
      roomsSnap.forEach((rDoc) => {
        if (rDoc.id === roomId || rDoc.data().roomNo === roomId || rDoc.data().roomName === roomId) {
          room = { id: rDoc.id, ...rDoc.data() };
        }
      });
    } catch (e) {
      console.warn("Rooms collection scan warning:", e);
      if (e.code === 'permission-denied' || e.message?.includes('permission')) {
        permissionError = e;
      }
    }
  }

  // If permission denied error occurred during read
  if (permissionError && !room) {
    throw new Error("Firestore Permission Denied: Unauthenticated public reads are restricted by Firestore security rules. Please allow public read access for room records in Firebase Console.");
  }

  if (!room) {
    throw new Error(`Property document "${roomId}" not found under landlord "${userId}". Please verify the QR Code or room ID.`);
  }

  // 3. Find current active tenant ONLY
  let activeTenant = null;
  let tenantsSnap = null;
  try {
    const tenantsRef = collection(db, "users", userId, "rooms", room.id, "Tenants");
    tenantsSnap = await getDocs(tenantsRef);
  } catch (e) {
    console.warn("Tenants collection fetch warning:", e);
  }

  if (tenantsSnap) {
    if (room.currentTenantId) {
      tenantsSnap.forEach((tDoc) => {
        if (tDoc.id === room.currentTenantId) {
          activeTenant = { id: tDoc.id, ...tDoc.data() };
        }
      });
    }

    // Fallback: match by active tenant name
    if (!activeTenant && room.tenetName && room.tenetName !== "No Tenant") {
      tenantsSnap.forEach((tDoc) => {
        const data = tDoc.data();
        if (data.name === room.tenetName) {
          activeTenant = { id: tDoc.id, ...data };
        }
      });
    }
  }

  if (!activeTenant) {
    return { landlord, room, tenant: null, records: [], latestRecord: null };
  }

  // 4. Fetch records ONLY for this active tenant
  const records = [];
  try {
    const recordsRef = collection(db, "users", userId, "rooms", room.id, "Tenants", activeTenant.id, "record");
    const recordsSnap = await getDocs(recordsRef);
    recordsSnap.forEach((rDoc) => {
      records.push({ id: rDoc.id, ...rDoc.data() });
    });
    records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (e) {
    console.warn("Records collection fetch warning:", e);
  }

  const latestRecord = records.length > 0 ? records[0] : null;

  return {
    landlord,
    room,
    tenant: activeTenant,
    records,
    latestRecord
  };
};

// Firestore Data Helpers

// Fetch all users (Landlords)
export const fetchAllUsers = async () => {
  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);
  const users = [];
  
  for (const userDoc of snapshot.docs) {
    const userData = { id: userDoc.id, ...userDoc.data() };
    
    try {
      const roomsRef = collection(db, "users", userDoc.id, "rooms");
      const roomsSnap = await getDocs(roomsRef);
      userData.roomsCount = roomsSnap.size;
    } catch (e) {
      userData.roomsCount = 0;
    }
    
    users.push(userData);
  }
  
  return users;
};

// Fetch single user detail with their rooms
export const fetchUserDetail = async (userId) => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return null;
  
  const userData = { id: userSnap.id, ...userSnap.data() };
  
  try {
    const roomsRef = collection(db, "users", userId, "rooms");
    const roomsSnap = await getDocs(roomsRef);
    
    const rooms = [];
    for (const roomDoc of roomsSnap.docs) {
      const roomData = { id: roomDoc.id, ...roomDoc.data() };
      
      try {
        const tenantsRef = collection(db, "users", userId, "rooms", roomDoc.id, "Tenants");
        const tenantsSnap = await getDocs(tenantsRef);
        roomData.tenantsCount = tenantsSnap.size;
      } catch (e) {
        roomData.tenantsCount = 0;
      }
      
      rooms.push(roomData);
    }
    
    userData.rooms = rooms;
  } catch (e) {
    userData.rooms = [];
  }
  
  return userData;
};

// Fetch single room detail with tenants list
export const fetchRoomDetail = async (userId, roomId) => {
  const roomRef = doc(db, "users", userId, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) return null;
  const roomData = { id: roomSnap.id, ...roomSnap.data() };
  
  try {
    const tenantsRef = collection(db, "users", userId, "rooms", roomId, "Tenants");
    const tenantsSnap = await getDocs(tenantsRef);
    
    const tenants = [];
    for (const tDoc of tenantsSnap.docs) {
      const tenantData = { id: tDoc.id, ...tDoc.data() };
      tenants.push(tenantData);
    }
    
    roomData.tenants = tenants;
  } catch (e) {
    roomData.tenants = [];
  }
  
  return roomData;
};

// Fetch single tenant detail with electricity & rent records
export const fetchTenantDetail = async (userId, roomId, tenantId) => {
  const tenantRef = doc(db, "users", userId, "rooms", roomId, "Tenants", tenantId);
  const tenantSnap = await getDoc(tenantRef);
  
  if (!tenantSnap.exists()) return null;
  const tenantData = { id: tenantSnap.id, ...tenantSnap.data() };
  
  try {
    const recordsRef = collection(db, "users", userId, "rooms", roomId, "Tenants", tenantId, "record");
    const recordsSnap = await getDocs(recordsRef);
    
    const records = [];
    recordsSnap.forEach((rDoc) => {
      records.push({ id: rDoc.id, ...rDoc.data() });
    });
    
    records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    tenantData.records = records;
  } catch (e) {
    tenantData.records = [];
  }
  
  return tenantData;
};

// Add User
export const addUser = async (userData) => {
  const customId = userData.uid || `user_${Date.now()}`;
  const userRef = doc(db, "users", customId);
  await setDoc(userRef, {
    uid: customId,
    name: userData.name,
    email: userData.email,
    phone: userData.phone || '',
    upi: userData.upi || '',
    picture: userData.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name)}`,
    createdAt: Date.now()
  });
  return customId;
};

// Delete User
export const deleteUser = async (userId) => {
  const userRef = doc(db, "users", userId);
  await deleteDoc(userRef);
};

// Add Room to User
export const addRoomToUser = async (userId, roomData) => {
  const roomsRef = collection(db, "users", userId, "rooms");
  const docRef = await addDoc(roomsRef, {
    roomName: roomData.roomName,
    roomNo: roomData.roomNo,
    rent: Number(roomData.rent) || 0,
    advance: String(roomData.advance || 0),
    perUnit: Number(roomData.perUnit) || 0,
    startReading: Number(roomData.startReading) || 0,
    currentTenantId: "",
    tenetName: "No Tenant",
    startDate: roomData.startDate || new Date().toISOString().split('T')[0],
    createdAt: Date.now()
  });
  return docRef.id;
};

// Delete Room
export const deleteRoom = async (userId, roomId) => {
  const roomRef = doc(db, "users", userId, "rooms", roomId);
  await deleteDoc(roomRef);
};

// Add Tenant to Room
export const addTenantToRoom = async (userId, roomId, tenantData) => {
  const tenantsRef = collection(db, "users", userId, "rooms", roomId, "Tenants");
  const docRef = await addDoc(tenantsRef, {
    name: tenantData.name,
    phone: tenantData.phone,
    aadharNo: tenantData.aadharNo || "",
    startDate: tenantData.startDate || new Date().toISOString().split('T')[0],
    createdAt: Date.now()
  });
  
  const roomRef = doc(db, "users", userId, "rooms", roomId);
  await updateDoc(roomRef, {
    currentTenantId: docRef.id,
    tenetName: tenantData.name
  });
  
  return docRef.id;
};

// Delete Tenant
export const deleteTenant = async (userId, roomId, tenantId) => {
  const tenantRef = doc(db, "users", userId, "rooms", roomId, "Tenants", tenantId);
  await deleteDoc(tenantRef);
};

// Add Billing Record to Tenant
export const addBillingRecord = async (userId, roomId, tenantId, recordData) => {
  const recordsRef = collection(db, "users", userId, "rooms", roomId, "Tenants", tenantId, "record");
  const docRef = await addDoc(recordsRef, {
    currentReading: Number(recordData.currentReading) || 0,
    previousReading: Number(recordData.previousReading) || 0,
    totalUnitBurned: Number(recordData.totalUnitBurned) || 0,
    perUnit: Number(recordData.perUnit) || 0,
    totalAmount: Number(recordData.totalAmount) || 0,
    paidAmount: Number(recordData.paidAmount) || 0,
    pendingAmount: Number(recordData.pendingAmount) || 0,
    paidStatus: Boolean(recordData.paidStatus),
    partialPaid: Boolean(recordData.partialPaid),
    note: recordData.note || "",
    createdAt: Date.now()
  });
  return docRef.id;
};

// Delete Billing Record
export const deleteBillingRecord = async (userId, roomId, tenantId, recordId) => {
  const recordRef = doc(db, "users", userId, "rooms", roomId, "Tenants", tenantId, "record", recordId);
  await deleteDoc(recordRef);
};
