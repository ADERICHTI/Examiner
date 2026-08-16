import CONFIG from "./secret.js";

// ==========================
// STEP 1: INITIALIZATION
// ==========================

// Global variables
let client = null;
let database = null;

// Initialize Appwrite
function initAppwrite() {
    try {
        // 1. Create client
        client = new Appwrite.Client()
            .setEndpoint('https://cloud.appwrite.io/v1')
            .setProject(CONFIG.projectId);
        
        // 2. Create database instance
        database = new Appwrite.Databases(client);
        
        console.log('✅ Appwrite initialized');
        return true;
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        return false;
    }
}

// ==========================
// STEP 2: CRUD FUNCTIONS
// ==========================

// CREATE - Add new item
async function createItem(data) {
    try {
        const result = await database.createDocument(
            CONFIG.databaseId,
            CONFIG.collectionId,
            'unique()', // Auto-generate ID
            {
                ...data,
                $createdAt: new Date().toISOString()
            }
        );
        console.log('✅ Created:', result);
        return result;
    } catch (error) {
        console.error('❌ Create error:', error);
        throw error;
    }
}

// UPSERT - add or update item
async function upsertDocument(uniqueField, uniqueValue, data) {
    // 1. Try to find by unique field
    const query = [Appwrite.Query.equal(uniqueField, uniqueValue)];
    
    try {
        const response = await database.listDocuments(
            CONFIG.databaseId,
            CONFIG.collectionId,
            query,
            1
        );
        
        const existing = response.documents[0];
        
        // 2. If exists, update it
        if (existing) {
            console.log(`🔄 Updating existing document (${existing.$id})`);
            
            return await database.updateDocument(
                CONFIG.databaseId,
                CONFIG.collectionId,
                existing.$id,
                {
                    ...data,
                    $updatedAt: new Date().toISOString(),
                    // Preserve the unique field
                    [uniqueField]: uniqueValue
                }
            );
        }
        
        // 3. If not exists, create new
        console.log('✨ Creating new document');
        
        return await database.createDocument(
            CONFIG.databaseId,
            CONFIG.collectionId,
            'unique()',
            {
                [uniqueField]: uniqueValue, // Ensure unique field is set
                ...data,
                $createdAt: new Date().toISOString()
            }
        );
        
    } catch (error) {
        console.error('Upsert failed:', error);
        throw error;
    }
}

// READ - Get all items
async function getAllItems() {
    try {
        const response = await database.listDocuments(
            CONFIG.databaseId,
            CONFIG.collectionId
        );
        console.log(`✅ Found ${response.documents.length} items`);
        return response.documents;
    } catch (error) {
        console.error('❌ Read error:', error);
        throw error;
    }
}

// READ ONE - Get single item by ID
async function getItemById(itemId) {
    try {
        const item = await database.getDocument(
            CONFIG.databaseId,
            CONFIG.collectionId,
            itemId
        );
        console.log('✅ Found item:', item);
        return item;
    } catch (error) {
        console.error('❌ Get by ID error:', error);
        throw error;
    }
}

// UPDATE - Modify item
async function updateItem(itemId, newData) {
    try {
        const result = await database.updateDocument(
            CONFIG.databaseId,
            CONFIG.collectionId,
            itemId,
            {
                ...newData,
                $updatedAt: new Date().toISOString()
            }
        );
        console.log('✅ Updated:', result);
        return result;
    } catch (error) {
        console.error('❌ Update error:', error);
        throw error;
    }
}

// DELETE - Remove item
async function deleteItem(itemId) {
    try {
        await database.deleteDocument(
            CONFIG.databaseId,
            CONFIG.collectionId,
            itemId
        );
        console.log('✅ Deleted item:', itemId);
        return true;
    } catch (error) {
        console.error('❌ Delete error:', error);
        throw error;
    }
}

// const newItem = await createItem({ name: 'marku rae', email: 'marku@example.com', user_id: 'yg6t87t8r6r' });

// ==========================
// STEP 3: USAGE EXAMPLES
// ==========================

async function main() {
    // Initialize first
    if (!initAppwrite()) {
        console.error('Cannot proceed without Appwrite');
        return;
    }
    
    try {
        // 1. CREATE example
        const newItem = await createItem({ name: 'marku rae', email: 'marku@example.com', user_id: 'yg6t87t8r6r' });
        
        // 2. READ ALL example
        const allItems = await getAllItems();
        console.log('All items:', allItems);
        
        // 3. READ ONE example
        const singleItem = await getItemById(newItem.$id);
        
        // 4. UPDATE example
        const updated = await updateItem(newItem.$id, { name: 'marku rae upta', email: 'markuupata@example.com'});
        
        // 5. DELETE example
        const deleted = await deleteItem(newItem.$id);
        
    } catch (error) {
        console.error('Main function error:', error);
    }
}

// Run the example
// main();

document.addEventListener('DOMContentLoaded', async () => {
    // main();
    initAppwrite();
    // const newItem = await upsertDocument( 'user_id', 'yg6t87t8r6r', { name: 'marku up rae', email: 'markupta@example.com', user_id: 'yg6t87t8r6r' });
});

export { createItem, upsertDocument, getAllItems, getItemById, updateItem, deleteItem, initAppwrite };