const { z } = require('zod');

const profileSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name too short").max(50).optional(),
        bio: z.string().max(160).optional(),
    }).strict(), // .strict() rejects any extra fields not defined here
});

module.exports = { profileSchema };