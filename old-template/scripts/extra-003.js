// Initialize Parse/Back4App
// Parse.initialize(
//     "GNK8XPOEloo3UHUHDVYiskNb5Juug0tUuNGX0u11",     // Application ID
//     "Fx4bcKkvdzSNTkxmSTVBBdwPiCsLRTPW3GIVB3q6"      // JavaScript Key
// );
// Parse.serverURL = "https://parseapi.back4app.com/";

// console.log('✅ Parse/Back4App initialized');

// ==========================
// INITIALIZATION
// ==========================
function initBack4App() {
    try {
        // Initialize Parse
        Parse.initialize(
            "GNK8XPOEloo3UHUHDVYiskNb5Juug0tUuNGX0u11",     // Application ID
            "Fx4bcKkvdzSNTkxmSTVBBdwPiCsLRTPW3GIVB3q6"      // JavaScript Key
        );
        Parse.serverURL = "https://parseapi.back4app.com/";
        
        console.log('✅ Back4App initialized');
        return true;
    } catch (error) {
        console.error('❌ Back4App init failed:', error);
        return false;
    }
}

// ==========================
// CRUD FUNCTIONS
// ==========================

// 1. CREATE - Add new object
async function createItem(className, data) {
    try {
        // Create Parse Object
        const ParseObject = Parse.Object.extend(className);
        const item = new ParseObject();
        
        // Set data
        Object.keys(data).forEach(key => {
            item.set(key, data[key]);
        });
        
        // Save to Back4App
        const result = await item.save();
        
        console.log('✅ Created:', result.id);
        return result;
        
    } catch (error) {
        console.error('❌ Create error:', error);
        throw error;
    }
}

// 2. READ - Get all objects
async function getAllItems(className, limit = 100) {
    try {
        const ParseObject = Parse.Object.extend(className);
        const query = new Parse.Query(ParseObject);
        
        // Optional: Add sorting
        query.descending('createdAt');
        query.limit(limit);
        
        const results = await query.find();
        
        console.log(`✅ Found ${results.length} items in ${className}`);
        return results;
        
    } catch (error) {
        console.error('❌ Read error:', error);
        throw error;
    }
}

// 3. READ ONE - Get single object by ID
async function getItemById(className, objectId) {
    try {
        const ParseObject = Parse.Object.extend(className);
        const query = new Parse.Query(ParseObject);
        
        const result = await query.get(objectId);
        
        console.log('✅ Found item:', result.id);
        return result;
        
    } catch (error) {
        console.error('❌ Get by ID error:', error);
        throw error;
    }
}

// 4. UPDATE - Modify object
async function updateItem(className, objectId, updates) {
    try {
        const ParseObject = Parse.Object.extend(className);
        const query = new Parse.Query(ParseObject);
        
        // Get the object first
        const item = await query.get(objectId);
        
        // Apply updates
        Object.keys(updates).forEach(key => {
            item.set(key, updates[key]);
        });
        
        // Save changes
        const result = await item.save();
        
        console.log('✅ Updated:', result.id);
        return result;
        
    } catch (error) {
        console.error('❌ Update error:', error);
        throw error;
    }
}

// 5. DELETE - Remove object
async function deleteItem(className, objectId) {
    try {
        const ParseObject = Parse.Object.extend(className);
        const query = new Parse.Query(ParseObject);
        
        const item = await query.get(objectId);
        await item.destroy();
        
        console.log('✅ Deleted:', objectId);
        return true;
        
    } catch (error) {
        console.error('❌ Delete error:', error);
        throw error;
    }
}

// 6. QUERY - Search with conditions
async function queryItems(className, conditions) {
    try {
        const ParseObject = Parse.Object.extend(className);
        const query = new Parse.Query(ParseObject);
        
        // Add conditions
        Object.keys(conditions).forEach(key => {
            query.equalTo(key, conditions[key]);
        });
        
        const results = await query.find();
        return results;
        
    } catch (error) {
        console.error('❌ Query error:', error);
        throw error;
    }
}

async function upsertItem(className, uniqueField, uniqueValue, data) {
    try {
        // 1. Try to find existing
        const ParseObject = Parse.Object.extend(className);
        const query = new Parse.Query(ParseObject);
        query.equalTo(uniqueField, uniqueValue);
        
        let existing = null;
        try {
            existing = await query.first();
        } catch (error) {
            // Not found - that's okay
        }
        
        // 2. Create or update
        const item = new ParseObject();
        
        if (existing) {
            // Update existing
            item.id = existing.id;
            console.log(`🔄 Updating existing ${className} (${existing.id})`);
        } else {
            // Create new
            console.log(`✨ Creating new ${className}`);
            item.set(uniqueField, uniqueValue);
        }
        
        // Set/update all fields
        Object.keys(data).forEach(key => {
            item.set(key, data[key]);
        });
        
        // 3. Save (upsert happens automatically!)
        const result = await item.save();
        
        console.log(`✅ ${existing ? 'Updated' : 'Created'} ${className}:`, result.id);
        return {
            action: existing ? 'updated' : 'created',
            object: result
        };
        
    } catch (error) {
        console.error('❌ Upsert error:', error);
        throw error;
    }
}

// ==========================
// EXAMPLE USAGE
// ==========================
async function exampleUsage() {
    // Initialize
    
    
    // 1. Create a user
    const newUser = await createItem('users', {
        username: 'john_doe',
        email: 'john@example.com',
        takenTest: true
    });
    
    // 2. Get all users
    const allUsers = await getAllItems('users');
    console.log('All users:', allUsers);
    
    // 3. Get specific user
    const singleUser = await getItemById('users', newUser.id);
    
    // 4. Update user
    await updateItem('users', newUser.id, {
        updatedAt: new Date()
    });
    
    // 5. Query users
    const activeUsers = await queryItems('users', {
        takenTest: true
    });
    
    // 6. Delete user
    await deleteItem('users', newUser.id);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!initBack4App()) {
        console.error('Cannot proceed without Back4App initialization');
        return;
    }
    // Run example
    // exampleUsage();
    await upsertItem('users', 'user_id', '12345', {
    name: 'John up Doe the junior',
    updatedAt: new Date(),
    email: 'johnupta2223@example.com',
    user_id: '12345'
});
});

export {createItem, getAllItems, getItemById, updateItem, deleteItem, queryItems, upsertItem};
