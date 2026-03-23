// Generic Firestore Service for CRUD operations on any collection
'use client';

import {
  db,
} from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  QueryConstraint,
  Timestamp,
  CollectionReference,
} from 'firebase/firestore';

export class FirestoreService<T extends { id?: string }> {
  private collectionRef: CollectionReference;

  constructor(collectionName: string) {
    this.collectionRef = collection(db as any, collectionName);
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>, createdBy?: string): Promise<string> {
    try {
      const docRef = await addDoc(this.collectionRef, {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...(createdBy && { createdBy }),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error creating document in ${this.collectionRef.path}:`, error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(this.collectionRef, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error getting document from ${this.collectionRef.path}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents
   */
  async getAll(constraints?: QueryConstraint[]): Promise<T[]> {
    try {
      const q = constraints ? query(this.collectionRef, ...constraints) : this.collectionRef;
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      console.error(`Error getting all documents from ${this.collectionRef.path}:`, error);
      throw error;
    }
  }

  /**
   * Update document
   */
  async update(id: string, data: Partial<T>, updatedBy?: string): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
        ...(updatedBy && { updatedBy }),
      });
    } catch (error) {
      console.error(`Error updating document in ${this.collectionRef.path}:`, error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${this.collectionRef.path}:`, error);
      throw error;
    }
  }

  /**
   * Batch get documents
   */
  async batchGet(ids: string[]): Promise<T[]> {
    try {
      const promises = ids.map((id) => this.getById(id));
      const results = await Promise.all(promises);
      return results.filter((doc) => doc !== null) as T[];
    } catch (error) {
      console.error(`Error batch getting documents from ${this.collectionRef.path}:`, error);
      throw error;
    }
  }

  /**
   * Get collection count
   */
  async getCount(constraints?: QueryConstraint[]): Promise<number> {
    try {
      const q = constraints ? query(this.collectionRef, ...constraints) : this.collectionRef;
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error(`Error getting count from ${this.collectionRef.path}:`, error);
      throw error;
    }
  }
}
