// Safe Supabase Client with fallback CDNs and error handling
let supabase = null;
let supabaseStatus = {
  initialized: false,
  error: null,
  retryCount: 0,
  lastRetry: null
};

// List of CDNs to try (in order of preference)
const CDNS = [
  'https://esm.sh/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
  'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

const CONFIG = {
  supabaseUrl: 'https://yomatxpzjpukhtewobex.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbWF0eHB6anB1a2h0ZXdvYmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODU4NzMsImV4cCI6MjA3OTE2MTg3M30.uQB9sHBNV4pr0G5DATphJ1INhPWWF7J4Z36dUgWmLwg',
  maxRetries: 3,
  retryDelay: 1000, // ms
  tableName: 'users',
  defaultUniqueColumn: 'email'
};

// Safely initialize Supabase with retry logic
async function initializeSupabase() {
  if (supabaseStatus.initialized && supabase) {
    return { success: true, supabase };
  }
  
  // Prevent too many rapid retries
  if (supabaseStatus.lastRetry && Date.now() - supabaseStatus.lastRetry < 5000) {
    return { 
      success: false, 
      error: new Error('Retry too soon after previous attempt'),
      supabase: null 
    };
  }
  
  supabaseStatus.lastRetry = Date.now();
  
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    console.log(`Supabase initialization attempt ${attempt}/${CONFIG.maxRetries}`);
    
    try {
      const createClient = await loadSupabaseWithFallback();
      
      if (!createClient) {
        throw new Error('Failed to load Supabase client from any CDN');
      }
      
      supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
      
      // Test the connection
      const testResult = await testConnectionInternal();
      if (testResult.error) {
        throw testResult.error;
      }
      
      supabaseStatus.initialized = true;
      supabaseStatus.error = null;
      supabaseStatus.retryCount = 0;
      
      console.log('✅ Supabase initialized successfully');
      return { success: true, supabase };
      
    } catch (error) {
      supabaseStatus.error = error;
      supabaseStatus.retryCount++;
      
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < CONFIG.maxRetries) {
        // Exponential backoff
        const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return { 
    success: false, 
    error: supabaseStatus.error || new Error('Max retries exceeded'),
    supabase: null 
  };
}

// Try multiple CDNs
async function loadSupabaseWithFallback() {
  for (const cdn of CDNS) {
    try {
      if (cdn.includes('.min.js')) {
        // UMD bundle (global variable)
        return await loadUMDBundle(cdn);
      } else {
        // ES Module
        const module = await import(cdn);
        return module.createClient || module.default?.createClient;
      }
    } catch (error) {
      console.warn(`CDN failed (${cdn}):`, error.message);
      continue;
    }
  }
  return null;
}

// Load UMD bundle (script tag)
async function loadUMDBundle(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => {
      if (window.supabase?.createClient) {
        resolve(window.supabase.createClient);
      } else if (window.createSupabaseClient) {
        resolve(window.createSupabaseClient);
      } else {
        reject(new Error('Supabase not found in global scope'));
      }
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

// Internal connection test
async function testConnectionInternal() {
  if (!supabase) {
    return { success: false, error: new Error('Supabase not initialized') };
  }
  
  try {
    // Use a simple query to test connection
    const { data, error, count } = await supabase
      .from(CONFIG.tableName)
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      // Check if it's an RLS error (permission denied) vs actual connection error
      if (error.code === '42501' || error.message.includes('permission denied')) {
        // RLS error - connection works but no permissions
        return { 
          success: true, 
          warning: 'Connected but RLS may restrict access',
          error: null 
        };
      }
      return { success: false, error };
    }
    
    return { success: true, count, error: null };
  } catch (error) {
    return { success: false, error };
  }
}

// Safe wrapper for all database operations
async function safeDbOperation(operation, operationName, fallbackValue = null) {
  // Ensure Supabase is initialized
  if (!supabase || !supabaseStatus.initialized) {
    const initResult = await initializeSupabase();
    if (!initResult.success) {
      console.error(`❌ Cannot perform ${operationName}: Supabase not available`);
      return { 
        success: false, 
        data: null, 
        error: initResult.error,
        fallbackUsed: true,
        fallbackValue 
      };
    }
  }
  
  try {
    const result = await operation();
    
    // Check for Supabase errors
    if (result.error) {
      console.error(`⚠️ Supabase error in ${operationName}:`, result.error.message);
      
      // Attempt to reconnect on certain errors
      if (shouldReconnect(result.error)) {
        console.log('Attempting to reconnect...');
        supabaseStatus.initialized = false;
        const reinit = await initializeSupabase();
        if (reinit.success) {
          console.log('Reconnected, retrying operation...');
          const retryResult = await operation();
          return {
            success: !retryResult.error,
            data: retryResult.data,
            error: retryResult.error,
            retried: true
          };
        }
      }
      
      return {
        success: false,
        data: null,
        error: result.error,
        fallbackValue
      };
    }
    
    return {
      success: true,
      data: result.data,
      error: null,
      count: result.count
    };
    
  } catch (error) {
    console.error(`❌ Exception in ${operationName}:`, error);
    return {
      success: false,
      data: null,
      error,
      fallbackUsed: true,
      fallbackValue
    };
  }
}

// Determine if we should attempt reconnection
function shouldReconnect(error) {
  const reconnectCodes = [
    'PGRST116', // JWT expired
    'PGRST301'  // Missing authorization header
  ];
  
  const reconnectMessages = [
    'JWT expired',
    'not authenticated',
    'connection',
    'network',
    'timeout'
  ];
  
  if (reconnectCodes.includes(error.code)) return true;
  
  return reconnectMessages.some(msg => 
    error.message?.toLowerCase().includes(msg.toLowerCase())
  );
}

// Enhanced database functions with safety wrappers

async function testConnection() {
  return safeDbOperation(
    () => supabase.from(CONFIG.tableName).select('*').limit(5),
    'testConnection'
  );
}

async function addData(dataToAdd, tableName = CONFIG.tableName) {
  if (!dataToAdd || typeof dataToAdd !== 'object') {
    return {
      success: false,
      data: null,
      error: new Error('Invalid data provided'),
      fallbackUsed: false
    };
  }
  
  return safeDbOperation(
    () => supabase.from(tableName).insert([dataToAdd]).select(),
    'addData'
  );
}

async function readData(tableName = CONFIG.tableName, options = {}) {
  const { 
    limit = 100, 
    orderBy = 'created_at', 
    ascending = false,
    filters = {}
  } = options;
  
  return safeDbOperation(
    async () => {
      let query = supabase.from(tableName).select('*');
      
      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy, { ascending });
      }
      
      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
      
      return query;
    },
    'readData',
    [] // Fallback empty array
  );
}

async function updateData(userId, updates = {}, tableName = CONFIG.tableName) {
  if (!userId) {
    return {
      success: false,
      data: null,
      error: new Error('User ID is required'),
      fallbackUsed: false
    };
  }
  
  if (!updates || Object.keys(updates).length === 0) {
    return {
      success: false,
      data: null,
      error: new Error('No updates provided'),
      fallbackUsed: false
    };
  }
  
  return safeDbOperation(
    () => supabase.from(tableName).update(updates).eq('user_id', userId).select(),
    'updateData'
  );
}

async function addIfNotExists(userData, uniqueColumn = CONFIG.defaultUniqueColumn, tableName = CONFIG.tableName) {
  if (!userData || !userData[uniqueColumn]) {
    return {
      success: false,
      data: null,
      error: new Error(`User data must include ${uniqueColumn}`),
      fallbackUsed: false
    };
  }
  
  return safeDbOperation(
    async () => {
      // Check if exists
      const { data: existing, error: checkError } = await supabase
        .from(tableName)
        .select('id')
        .eq(uniqueColumn, userData[uniqueColumn])
        .maybeSingle();
      
      if (checkError) {
        return { data: null, error: checkError };
      }
      
      // Insert if doesn't exist
      if (!existing) {
        return supabase.from(tableName).insert([userData]).select();
      }
      
      // Already exists
      return { data: [existing], error: null };
    },
    'addIfNotExists'
  );
}

// Utility function to check database status
function getDatabaseStatus() {
  return {
    initialized: supabaseStatus.initialized,
    error: supabaseStatus.error?.message || null,
    retryCount: supabaseStatus.retryCount,
    lastRetry: supabaseStatus.lastRetry,
    config: {
      url: CONFIG.supabaseUrl ? '✓ Set' : '✗ Missing',
      key: CONFIG.supabaseKey ? '✓ Set' : '✗ Missing'
    }
  };
}

// Initialize on import (optional)
// Comment this out if you want manual initialization
(async () => {
  console.log('Initializing Supabase...');
  const result = await initializeSupabase();
  
  if (result.success) {
    console.log('✅ Supabase ready for use');
  } else {
    console.error('❌ Supabase initialization failed:', result.error?.message);
    
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('supabase-error', {
      detail: { error: result.error }
    }));
  }
})();

// Export safe functions
export { 
  testConnectionInternal as testConnection, 
  addData, 
  readData, 
  updateData, 
  addIfNotExists,
  initializeSupabase,
  getDatabaseStatus,
  CONFIG as dbConfig
};