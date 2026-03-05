const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('  Supabase credentials not found in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Multer memory storage for 3D model upload (50MB limit)
 */
const upload3DModel = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 * Upload file to Supabase Storage
 */
async function uploadToSupabase(fileBuffer, fileName, bucket = '3d-models') {
    try {
        const filePath = `${Date.now()}-${fileName}`;

        const ext = fileName.split('.').pop().toLowerCase();
        const contentType = ext === 'gltf' ? 'model/gltf+json' : 'model/gltf-binary';

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileBuffer, {
                contentType,
                upsert: false
            });

        if (error) {
            throw error;
        }


        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return {
            url: publicUrl,
            path: data.path
        };
    } catch (error) {
        console.error('Supabase upload error:', error);
        throw error;
    }
}

/**
 * Delete file from Supabase Storage
 */
async function deleteFromSupabase(filePath, bucket = '3d-models') {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            throw error;
        }

        return true;
    } catch (error) {
        console.error('Supabase delete error:', error);
        throw error;
    }
}

module.exports = {
    supabase,
    upload3DModel,
    uploadToSupabase,
    deleteFromSupabase
};
