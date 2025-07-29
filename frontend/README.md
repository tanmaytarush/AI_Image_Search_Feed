# 🖼️ Interior Image Search Frontend

A modern, responsive frontend for the Interior Image Search API built with Vite.

## 🚀 Features

- **Search Interface**: Clean search bar with real-time search
- **Image Grid**: Responsive grid layout for displaying images
- **Image Modal**: Click on images to view them in full size
- **Loading States**: Smooth loading animations
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on desktop and mobile

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173`

## 🔗 API Integration

The frontend connects to your backend API at `http://localhost:3000`:

- **GET /api/images** - Load all images from CSV
- **GET /api/images/search** - Search images using vector similarity

## 🎯 Usage

1. **View All Images**: The page loads all images by default
2. **Search Images**: Type a search term and click "Search"
3. **Clear Search**: Click "Clear" to return to all images
4. **View Image**: Click on any image to see it in full size

## 📱 Responsive Design

- **Desktop**: 3+ columns grid layout
- **Tablet**: 2 columns grid layout
- **Mobile**: Single column layout

## 🎨 Features

- Modern gradient design
- Smooth hover animations
- Loading spinners
- Error handling
- Image lazy loading
- Fallback for broken images

## 🔧 Configuration

The API base URL is configured in `main.js`:

```javascript
const API_BASE_URL = "http://localhost:3000/api";
```

## 📦 Build for Production

```bash
npm run build
```

This creates a `dist` folder with optimized files for production deployment.
