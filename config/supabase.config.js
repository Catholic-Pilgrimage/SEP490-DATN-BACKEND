const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const MAX_3D_MODEL_FILE_SIZE_MB = 100;
const MAX_3D_MODEL_FILE_SIZE_BYTES = MAX_3D_MODEL_FILE_SIZE_MB * 1024 * 1024;
const LOCAL_3D_MODEL_THRESHOLD_MB = 50;
const LOCAL_3D_MODEL_THRESHOLD_BYTES = LOCAL_3D_MODEL_THRESHOLD_MB * 1024 * 1024;
const LOCAL_3D_MODEL_DIRECTORY = process.env.LOCAL_3D_MODEL_UPLOAD_DIR || path.join(process.cwd(), 'uploads', '3d-models');

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
    console.warn('  Supabase credentials not found in .env - Supabase features will be disabled');
} else {
    supabase = createClient(supabaseUrl, supabaseKey);
}

fs.mkdirSync(LOCAL_3D_MODEL_DIRECTORY, { recursive: true });

/**
 * Disk storage for 3D model upload (100MB limit)
 */
const upload3DModel = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, LOCAL_3D_MODEL_DIRECTORY),
        filename: (req, file, cb) => {
            const extension = path.extname(file.originalname).toLowerCase();
            const safeBaseName = path.basename(file.originalname, extension)
                .replace(/[^a-zA-Z0-9-_]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 80) || '3d-model';

            cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeBaseName}${extension}`);
        }
    }),
    limits: { fileSize: MAX_3D_MODEL_FILE_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        if (!['.glb', '.gltf'].includes(extension)) {
            return cb(new Error('Invalid 3D model format. Only .glb and .gltf are allowed.'));
        }

        cb(null, true);
    }
});

const shouldStore3DModelLocally = (fileSize) => fileSize > LOCAL_3D_MODEL_THRESHOLD_BYTES || !supabase;

const buildLocal3DModelUrl = (req, fileName) => {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
    const baseUrl = (process.env.SERVER_BASE_URL || `${protocol}://${req.get('host')}`).replace(/\/+$/, '');

    return `${baseUrl}/uploads/3d-models/${encodeURIComponent(fileName)}`;
};

async function deleteLocal3DModelFile(filePath) {
    if (!filePath) {
        return;
    }

    try {
        await fs.promises.unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Local 3D model cleanup error:', error);
        }
    }
}

/**
 * Upload file to Supabase Storage
 */
async function uploadToSupabase(fileBuffer, fileName, bucket = '3d-models') {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    }
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
    if (!supabase) {
        throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    }
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
    MAX_3D_MODEL_FILE_SIZE_MB,
    LOCAL_3D_MODEL_THRESHOLD_MB,
    LOCAL_3D_MODEL_THRESHOLD_BYTES,
    upload3DModel,
    shouldStore3DModelLocally,
    buildLocal3DModelUrl,
    deleteLocal3DModelFile,
    uploadToSupabase,
    deleteFromSupabase
};
