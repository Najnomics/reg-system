# Progressive Web App (PWA) Setup Guide

## Overview

Your Church Attendance Management System is now configured as a Progressive Web App (PWA), allowing users to install it on their devices and use it offline.

## Features Enabled

✅ **Installable** - Users can install the app on their home screen  
✅ **Offline Support** - Basic offline functionality with service worker  
✅ **App-like Experience** - Standalone display mode  
✅ **Caching** - API responses and images are cached  
✅ **Fast Loading** - Optimized caching strategies  

## PWA Icons Required

You need to create the following icon files in the `public/` directory:

1. **pwa-192x192.png** - 192x192 pixels (required)
2. **pwa-512x512.png** - 512x512 pixels (required)
3. **apple-touch-icon.png** - 180x180 pixels (for iOS)

### Creating Icons

You can use any image editor or online tool to create these icons:

1. **Design your icon** (recommended: 1024x1024px square)
2. **Export in required sizes:**
   - 192x192px → `pwa-192x192.png`
   - 512x512px → `pwa-512x512.png`
   - 180x180px → `apple-touch-icon.png`

**Icon Design Tips:**
- Use your church logo or a simple, recognizable icon
- Ensure it looks good at small sizes (192px)
- Use high contrast colors
- Keep it simple and recognizable
- Test on both light and dark backgrounds

**Online Tools:**
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

## Testing PWA Features

### Local Development

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Preview the build:**
   ```bash
   npm run preview
   ```

3. **Open in browser:**
   - Navigate to `http://localhost:4173`
   - Open DevTools → Application → Service Workers
   - Check if service worker is registered

### Testing Installation

1. **Chrome/Edge (Desktop):**
   - Look for install icon in address bar
   - Click to install
   - App opens in standalone window

2. **Chrome/Edge (Mobile):**
   - Tap menu (three dots)
   - Select "Install app" or "Add to Home Screen"

3. **Safari (iOS):**
   - Tap Share button
   - Select "Add to Home Screen"
   - Customize name if needed

4. **Firefox (Mobile):**
   - Tap menu
   - Select "Install" or "Add to Home Screen"

### Testing Offline Mode

1. **Open DevTools:**
   - F12 or Right-click → Inspect

2. **Go to Network tab:**
   - Check "Offline" checkbox
   - Refresh the page
   - App should still load (cached resources)

3. **Check Service Worker:**
   - DevTools → Application → Service Workers
   - Verify service worker is active
   - Check cache storage

## Configuration

### Manifest Settings

The PWA manifest is configured in `vite.config.js`. Key settings:

- **name**: Full app name
- **short_name**: Short name for home screen
- **theme_color**: App theme color (#4f46e5 - indigo)
- **background_color**: Splash screen background
- **display**: "standalone" for app-like experience
- **start_url**: Where app opens (/)

### Service Worker Caching

The service worker caches:

1. **Static Assets**: JS, CSS, HTML, images (CacheFirst)
2. **API Responses**: NetworkFirst with 24h expiration
3. **Images**: CacheFirst with 30-day expiration

### Updating the App

The PWA uses `autoUpdate` registration type:
- Service worker updates automatically
- Users get new version on next visit
- No manual update required

## Production Deployment

### HTTPS Required

PWAs require HTTPS in production:
- ✅ Vercel/Netlify provide HTTPS automatically
- ✅ Railway provides HTTPS automatically
- ⚠️ Local development works on HTTP

### Build and Deploy

1. **Build:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   - Push to your repository
   - Vercel/Netlify auto-deploys
   - Service worker is included in build

### Verify Deployment

1. **Check manifest:**
   - Visit: `https://your-domain.com/manifest.json`
   - Should return JSON manifest

2. **Check service worker:**
   - Visit: `https://your-domain.com/sw.js` or `/sw.js`
   - Should return service worker code

3. **Test installation:**
   - Visit your site
   - Check for install prompt
   - Install and test offline

## Troubleshooting

### Service Worker Not Registering

1. **Check HTTPS:** PWAs require HTTPS in production
2. **Check build:** Ensure `npm run build` completed successfully
3. **Clear cache:** Clear browser cache and hard refresh
4. **Check console:** Look for service worker errors

### Icons Not Showing

1. **Verify files exist:** Check `public/` directory
2. **Check paths:** Ensure paths match manifest.json
3. **Check sizes:** Verify icon dimensions are correct
4. **Clear cache:** Clear browser cache

### App Not Installing

1. **Check manifest:** Verify manifest.json is valid
2. **Check HTTPS:** Ensure site uses HTTPS
3. **Check scope:** Verify start_url is within scope
4. **Check icons:** Ensure icons are present and valid

### Offline Not Working

1. **Check service worker:** Verify it's registered
2. **Check cache:** Verify resources are cached
3. **Check network:** Test with Network tab offline
4. **Check console:** Look for caching errors

## Customization

### Change Theme Color

Edit `vite.config.js`:
```javascript
theme_color: '#your-color',
```

Also update `index.html`:
```html
<meta name="theme-color" content="#your-color" />
```

### Change App Name

Edit `vite.config.js`:
```javascript
name: 'Your App Name',
short_name: 'Short Name',
```

### Add More Shortcuts

Edit `vite.config.js` in the `shortcuts` array:
```javascript
shortcuts: [
  {
    name: 'Your Shortcut',
    url: '/your-path',
    icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
  }
]
```

### Modify Caching Strategy

Edit `vite.config.js` in the `workbox.runtimeCaching` section to change caching behavior.

## Best Practices

1. **Keep icons simple** - Complex icons don't scale well
2. **Test on multiple devices** - Different browsers behave differently
3. **Monitor cache size** - Large caches can cause issues
4. **Update regularly** - Keep service worker updated
5. **Test offline** - Ensure critical features work offline

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Web App Manifest](https://web.dev/add-manifest/)
