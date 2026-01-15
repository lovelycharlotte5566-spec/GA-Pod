# GA POD - Anonymous Messaging App

A modern, anonymous messaging platform with database support, built with HTML, CSS, JavaScript, Node.js, Express, and SQLite.

## Features

- ✨ Anonymous message posting (up to 500 words)
- 💬 Comments and nested replies
- ❤️ Like/reaction system
- 🏷️ Category filtering (Christianity, Relationship, Education, Social, Career, Health, Other)
- 🎨 Beautiful pink/blue gradient theme
- 📱 Mobile-responsive design
- 🖼️ Animated background carousel
- 🗄️ SQLite database integration
- 🔄 Pull-to-refresh functionality
- ⬆️ Scroll-to-top button
- ⏰ Auto-expiration of messages (5 days)

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher) - [Download here](https://nodejs.org/)
- TablePlus (optional, for database management) - [Download here](https://tableplus.com/)

### Installation

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   npm run setup-db
   ```
   This will create the SQLite database file (`ga-pod.db`) with all necessary tables.

3. **Start the server:**
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3000`

4. **Open in browser:**
   Navigate to `http://localhost:3000` in your web browser.

## Database Setup with TablePlus

1. **Open TablePlus**
2. Click "Create a new connection"
3. Select "SQLite"
4. Browse to your project folder and select `ga-pod.db`
5. Click "Connect"

You'll see the following tables:
- `messages` - Stores all posts
- `likes` - Stores user likes on messages
- `comments` - Stores comments and replies

## Project Structure

```
ga-pod/
├── index.html          # Main HTML file
├── style.css           # Stylesheet
├── script-api.js       # Frontend JavaScript (API version)
├── server.js           # Express server with API endpoints
├── setup-database.js   # Database setup script
├── package.json        # Node.js dependencies
├── ga-pod.db           # SQLite database (created after setup)
└── README.md           # This file
```

## API Endpoints

### Messages
- `GET /api/messages` - Get all messages (optional `?category=CategoryName`)
- `POST /api/messages` - Create a new message
- `DELETE /api/messages` - Delete all messages

### Likes
- `GET /api/messages/:id/likes` - Get like count
- `GET /api/messages/:id/likes/check` - Check if user liked
- `POST /api/messages/:id/likes/toggle` - Toggle like

### Comments
- `GET /api/messages/:id/comments` - Get all comments for a message
- `GET /api/messages/:id/comments/count` - Get comment count
- `POST /api/messages/:id/comments` - Create a comment/reply

### Utilities
- `POST /api/cleanup` - Remove expired messages (older than 5 days)

## Database Schema

### messages
- `id` (INTEGER PRIMARY KEY)
- `text` (TEXT)
- `author` (TEXT)
- `category` (TEXT)
- `timestamp` (INTEGER)
- `created_at` (DATETIME)

### likes
- `id` (INTEGER PRIMARY KEY)
- `message_id` (INTEGER, FOREIGN KEY)
- `user_identifier` (TEXT)
- `created_at` (DATETIME)

### comments
- `id` (INTEGER PRIMARY KEY)
- `message_id` (INTEGER, FOREIGN KEY)
- `text` (TEXT)
- `author` (TEXT)
- `parent_id` (INTEGER, FOREIGN KEY - for replies)
- `timestamp` (INTEGER)
- `created_at` (DATETIME)

## Development

- **Server:** Runs on port 3000
- **Database:** SQLite (`ga-pod.db`)
- **Frontend:** Vanilla JavaScript (no frameworks)

## Troubleshooting

### Server won't start
- Make sure port 3000 is not in use
- Check that `node_modules` are installed (`npm install`)
- Verify database exists (`npm run setup-db`)

### Database errors
- Delete `ga-pod.db` and run `npm run setup-db` again
- Check file permissions in the project folder

### API errors
- Ensure server is running (`npm start`)
- Check browser console for CORS or connection errors
- Verify you're accessing `http://localhost:3000`

## Notes

- Messages automatically expire after 5 days
- All data is stored in the SQLite database
- The app uses IP + User-Agent for anonymous user identification
- Background images rotate every 6 seconds

## License

ISC
