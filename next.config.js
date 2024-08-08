const withNextIntl = require('next-intl/plugin')();

module.exports = withNextIntl({
  async rewrites() {
    return [
      {
        source: '/:locale/layout/:path*',
        destination: '/layout/:path*'
      },
      {
        source: '/:locale/themes/:path*',
        destination: '/themes/:path*'
      },
      {
        source: '/:locale/app/:path*',
        destination: '/app/:path*'
      }
    ];
  },
  // Diğer konfigürasyonlarınızı buraya ekleyin
});
