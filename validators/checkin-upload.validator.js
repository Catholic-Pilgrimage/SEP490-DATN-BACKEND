const { body, param } = require('express-validator');

class CheckinUploadValidator {
    static checkin = [
        param('id')
            .optional()
            .isUUID()
            .withMessage((value, { req }) => req.__('validation.invalid_uuid')),

        param('itemId')
            .optional()
            .isUUID()
            .withMessage((value, { req }) => req.__('validation.invalid_uuid')),

        body()
            .custom((_, { req }) => {
                const latRaw = req.body.checkin_latitude !== undefined
                    ? req.body.checkin_latitude
                    : req.body.latitude;
                const lngRaw = req.body.checkin_longitude !== undefined
                    ? req.body.checkin_longitude
                    : req.body.longitude;

                if (latRaw === undefined || latRaw === null || String(latRaw).trim() === '') {
                    throw new Error(req.__('checkin.latitude_required'));
                }

                if (lngRaw === undefined || lngRaw === null || String(lngRaw).trim() === '') {
                    throw new Error(req.__('checkin.longitude_required'));
                }

                const latitude = Number(latRaw);
                const longitude = Number(lngRaw);

                if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
                    throw new Error(req.__('checkin.latitude_invalid'));
                }

                if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
                    throw new Error(req.__('checkin.longitude_invalid'));
                }

                return true;
            }),

        body('photo')
            .custom((_, { req }) => {
                if (!req.file || !req.file.path) {
                    throw new Error(req.__('checkin.photo_required'));
                }

                return true;
            }),

        body('note')
            .optional({ checkFalsy: true })
            .isString()
            .withMessage((value, { req }) => req.__('checkin.note_invalid'))
            .isLength({ max: 500 })
            .withMessage((value, { req }) => req.__('checkin.note_too_long'))
            .trim()
    ];
}

module.exports = CheckinUploadValidator;
