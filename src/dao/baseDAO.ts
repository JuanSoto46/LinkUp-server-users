import { db } from "../config/firebase";


/**
 * Base DAO class for Firestore operations
 * @class
 */

export class baseDAO {
    collection: string;
    db: FirebaseFirestore.Firestore;
    /**
     * Constructor for baseDAO
     * @param {string} collection - The Firestore collection name
     */
    constructor(collection: string) {
        this.collection = collection;
        this.db = db;
    }

    /**
     * Get all documents from the collection
     * @returns {Promise<any[]>} Array of documents
     */
    async getAll() {
        const snapshot = await this.db.collection(this.collection).get();
        return snapshot.docs.map(doc => doc.data());
    }

    /**
     * Get a single document by ID
     * @param {string} id - Document ID
     * @returns {Promise<any>} Document data
     */
    async getOne(id: string) {
        const doc = await this.db.collection(this.collection).doc(id).get();
        return doc.data();
    }

    /**
     * Create a new document in the collection
     * @param {any} data - Document data
     * @returns {Promise<string>} Document ID
     */
    async create(data: any) {
        const doc = await this.db.collection(this.collection).doc( data.uid ).set(data);
        return doc;
    }

    /**
     * Update a document in the collection
     * @param {string} id - Document ID
     * @param {any} data - Document data
     */
    async update(id: string, data: any) {
        await this.db.collection(this.collection).doc(id).update(data);
    }

    /**
     * Delete a document from the collection
     * @param {string} id - Document ID
     */
    async delete(id: string) {
        await this.db.collection(this.collection).doc(id).delete();
    }
}