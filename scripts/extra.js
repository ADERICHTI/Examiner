import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://yomatxpzjpukhtewobex.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbWF0eHB6anB1a2h0ZXdvYmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODU4NzMsImV4cCI6MjA3OTE2MTg3M30.uQB9sHBNV4pr0G5DATphJ1INhPWWF7J4Z36dUgWmLwg'
const supabase = createClient(supabaseUrl, supabaseKey)

// Use the correct table name
async function testConnection() {
    console.log('Testing connection...')
    
    // Replace 'your_table' with your actual table name (e.g., 'users')
    const { data, error } = await supabase
        .from('users')  // ← Change this to your table name
        .select('*')
    
    if (error) {
        console.log('Error:', error.message)
    } else {
        console.log('✅ Success! Data:', data)
    }
}

// Add test data to your table
async function addTestData() {
    const { data, error } = await supabase
        .from('users')  // Your table name
        .insert([
            { name: 'Alice Johnson', email: 'alice@example.com' },
            { name: 'Bob Smith', email: 'bob@example.com' }
        ])
        .select()
    
    if (error) {
        console.log('Insert error:', error.message)
    } else {
        console.log('✅ Test data added:', data)
    }
}

async function addData(dataToAdd={ name: 'marku rae', email: 'marku@example.com', user_id: 'yg6t87t8r6r' }) {
    const { data, error } = await supabase
        .from('users')  // Your table name
        .insert([
            dataToAdd,
        ])
        .select()
    
    if (error) {
        console.log('Insert error:', error.message)
    } else {
        console.log('✅ Data added:', data)
    }
}

async function updateData(userId, updates={email: 'this is new@gmail.vom'}) {
    // if (!userId) {
    //     userId = prompt('Enter user ID to update:')
    //     if (!userId) return
    // }
    
    // const newName = prompt('Enter new name:') 
    // const newEmail = prompt('Enter new email:')
    
    
    if (Object.keys(updates).length === 0) {
        console.log('No changes made');
        return
    }
    
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', userId)
        .select()
    
    if (error) {
        console.error('Update error:', error)
        console.log('Error updating user: ' + error.message)
    } else {
        console.log('✏️ User updated:', data)
        console.log('User updated successfully!')
        readData() // Refresh the list
    }
}


async function readData(name='users') {
    const { data, error } = await supabase
        .from(name)
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Read error:', error)
        return []
    } else {
        console.log('📖 Users:', data)
        return data
    }
}

async function addIfNotExists(userData, uniqueColumn = 'email') {
    // First, check if exists
    const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq(uniqueColumn, userData[uniqueColumn])
        .maybeSingle() // Returns null instead of error if no rows

    if (checkError) {
        console.error('Check error:', checkError)
        return null
    }

    // If doesn't exist, insert
    if (!existing) {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()

        if (error) {
            console.error('Insert error:', error)
            return null
        }
        console.log('✅ New user added:', data[0])
        return data[0]
    } else {
        console.log('⚠️ User already exists:', existing)
        return existing
    }
}

// Usage
// await addIfNotExists({
//     email: 'john@example.com',
//     name: 'John Doe',
//     user_id: 'sgwygswvwfytwf2wr2'
// }, 'user_id')

// testConnection()
// addData()
// readData()
// updateData('yg6t87t8r6r')
export { testConnection, addData, readData, updateData, addIfNotExists };