// -----------------------------------------------------------------------
// iOS PWA support is weaker than Android — Safari ignores manifest.json
// display mode unless these specific meta tags/links are present in <head>.
// Copy this block into your existing root layout's <head>, alongside your
// current metadata — do not replace the whole layout file.
// -----------------------------------------------------------------------

export const iosPwaHeadTags = (
  <>
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
    <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Business OS POS" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
    />
    <meta name="theme-color" content="#0f172a" />
  </>
);
