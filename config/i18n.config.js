const i18n = require('i18n');
const path = require('path');

const stripBom = (content) => {
  if (typeof content !== 'string') {
    return content;
  }

  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
};

i18n.configure({
  locales: ['vi', 'en'],
  defaultLocale: 'vi',
  directory: path.join(__dirname, '../locales'),
  objectNotation: true,
  parser: {
    parse: (content) => JSON.parse(stripBom(content)),
    stringify: (content) => JSON.stringify(content, null, 2)
  },
  updateFiles: false,
  syncFiles: false
});

module.exports = i18n;
