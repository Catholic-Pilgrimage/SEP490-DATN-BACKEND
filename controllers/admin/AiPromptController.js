const { AiPromptService, VALID_PROMPT_KEYS } = require('../../services/ai/aiPromptService');
const Logger = require('../../utils/logger.util');

/**
 * Admin AI Prompt Controller
 * Manages AI prompt instructions via admin API
 */
class AiPromptController {

    /**
     * GET /api/admin/ai-prompts
     * List all prompt definitions (DB + defaults merged)
     */
    static async getAllPrompts(req, res) {
        try {
            const prompts = await AiPromptService.getAllPromptDefinitions();

            return res.status(200).json({
                success: true,
                message: req.__('ai_prompt.list_success', { defaultValue: 'AI prompts retrieved successfully' }),
                data: prompts.map(p => ({
                    prompt_key: p.promptKey,
                    description: p.description,
                    instruction_text: p.instructionText,
                    version: p.version,
                    source: p.source,
                    updated_at: p.updatedAt
                }))
            });
        } catch (err) {
            Logger.error(`[AiPromptController] getAllPrompts error: ${err.message}`);
            return res.status(500).json({
                success: false,
                message: req.__('common.server_error', { defaultValue: 'Internal server error' })
            });
        }
    }

    /**
     * GET /api/admin/ai-prompts/:key
     * Get a single prompt by key (returns fallback/default if not in DB)
     */
    static async getPromptByKey(req, res) {
        try {
            const { key } = req.params;

            const prompt = await AiPromptService.getPromptByKey(key);
            if (!prompt) {
                return res.status(404).json({
                    success: false,
                    message: req.__('ai_prompt.not_found', { defaultValue: 'Prompt not found' })
                });
            }

            return res.status(200).json({
                success: true,
                message: req.__('ai_prompt.get_success', { defaultValue: 'AI prompt retrieved successfully' }),
                data: {
                    prompt_key: prompt.promptKey,
                    description: prompt.description,
                    instruction_text: prompt.instructionText,
                    version: prompt.version,
                    source: prompt.source,
                    updated_at: prompt.updatedAt
                }
            });
        } catch (err) {
            Logger.error(`[AiPromptController] getPromptByKey error: ${err.message}`);
            return res.status(500).json({
                success: false,
                message: req.__('common.server_error', { defaultValue: 'Internal server error' })
            });
        }
    }

    /**
     * PUT /api/admin/ai-prompts/:key
     * Update (or upsert) a prompt's instruction_text
     */
    static async updatePromptByKey(req, res) {
        try {
            const { key } = req.params;
            const { instruction_text, description } = req.body;

            const updated = await AiPromptService.upsertPrompt(
                key,
                instruction_text,
                req.user.id,
                description
            );

            return res.status(200).json({
                success: true,
                message: req.__('ai_prompt.update_success', { defaultValue: 'AI prompt updated successfully' }),
                data: {
                    prompt_key: updated.prompt_key,
                    description: updated.description,
                    instruction_text: updated.instruction_text,
                    version: updated.version,
                    updated_at: updated.updated_at
                }
            });
        } catch (err) {
            Logger.error(`[AiPromptController] updatePromptByKey error: ${err.message}`);

            if (err.message.startsWith('Invalid prompt key')) {
                return res.status(400).json({
                    success: false,
                    message: req.__('ai_prompt.invalid_key', { defaultValue: err.message })
                });
            }

            return res.status(500).json({
                success: false,
                message: req.__('common.server_error', { defaultValue: 'Internal server error' })
            });
        }
    }
}

module.exports = AiPromptController;
