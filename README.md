# Chat Application

A real-time chat application built with Node.js, Express, React, MongoDB, and Socket.io. Features include user authentication, direct messaging, group chats, message encryption, voice/file sharing, and more.

## 🚀 Features

- **Real-time Messaging** - Instant message delivery with Socket.io
- **User Authentication** - Secure JWT-based authentication
- **Group Chats** - Create and manage group conversations
- **Direct Messaging** - One-on-one encrypted conversations
- **Message Encryption** - End-to-end encryption using CryptoJS
- **Voice Messages** - Record and share voice messages
- **File Sharing** - Share files and documents
- **Image Sharing** - Send and receive images
- **Read Receipts** - See when messages are read (individual & group)
- **Typing Indicators** - Real-time typing status
- **Online Status** - View who's online
- **User Profiles** - View user information and avatars
- **Message Search** - Search through chat history
- **Scheduled Messages** - Schedule messages to send later
- **Message Reactions** - React to messages with emojis
- **Message Replies** - Reply to specific messages

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or cloud instance)
- Cloudinary account (for image/file uploads)

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/chat-app.git
cd chat-app
```

### 2. Backend Setup

Navigate to the backend directory and create a `.env` file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
PORT=5001
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chat-app?retryWrites=true&w=majority
JWT_SECRET=your-very-strong-secret-key-min-32-characters-long
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

Install backend dependencies:

```bash
npm install
```

### 3. Frontend Setup

Navigate to the frontend directory and create a `.env.local` file:

```bash
cd ../frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=chat-app
```

Install frontend dependencies:

```bash
npm install
```

### 4. MongoDB Setup

- If using MongoDB Atlas, create a cluster and user
- Copy your connection URI and add it to `backend/.env`

### 5. Cloudinary Setup

- Sign up at [Cloudinary](https://cloudinary.com/)
- Get your Cloud Name
- Create an unsigned upload preset named `chat-app`
- Add these to `frontend/.env.local`

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**

```bash
cd backend
npm start
```

Backend will run on `http://localhost:5001`

**Terminal 2 - Frontend:**

```bash
cd frontend
npm start
```

Frontend will run on `http://localhost:3000`

The app will automatically open in your browser.

### Production Mode

```bash
# Build frontend
cd frontend
npm run build

# Build backend (if applicable)
cd ../backend
NODE_ENV=production npm start
```

## 📁 Project Structure

```
chat-app/
├── backend/
│   ├── config/           # Database and token generation
│   ├── controllers/      # Route controllers
│   ├── models/           # MongoDB models
│   ├── middleware/       # Authentication and error handling
│   ├── routes/           # API routes
│   ├── server.js         # Express server setup
│   ├── .env.example      # Environment variables template
│   └── package.json
│
├── frontend/
│   ├── public/           # Static files
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── config/       # API configuration
│   │   ├── Context/      # React Context
│   │   ├── Pages/        # Page components
│   │   ├── utils/        # Utility functions
│   │   ├── App.js        # Main app component
│   │   └── index.js      # Entry point
│   ├── .env.example      # Environment variables template
│   └── package.json
│
├── .gitignore
└── README.md
```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Message encryption with CryptoJS
- Environment variables for sensitive data
- CORS protection

## 🛠️ Technologies Used

**Backend:**
- Express.js
- MongoDB with Mongoose
- Socket.io
- JWT (JSON Web Tokens)
- bcryptjs for password hashing

**Frontend:**
- React
- Socket.io-client
- Axios for HTTP requests
- CryptoJS for encryption
- Tailwind CSS for styling
- React Lottie for animations

## 📝 API Endpoints

### Authentication
- `POST /api/user` - Register new user
- `POST /api/user/login` - Login user

### Chats
- `GET /api/chat` - Get all chats
- `POST /api/chat` - Create new chat
- `POST /api/chat/group` - Create group chat
- `PUT /api/chat/group/:id` - Update group chat

### Messages
- `POST /api/message` - Send message
- `GET /api/message/:chatId` - Get chat messages
- `PUT /api/message/:messageId` - Edit message
- `DELETE /api/message/:messageId` - Delete message

## 🐛 Troubleshooting

### Connection Issues

- Ensure MongoDB connection string is correct
- Check CORS_ORIGIN matches your frontend URL
- Verify both backend and frontend are running

### File Upload Issues

- Verify Cloudinary credentials are correct
- Check that upload preset is created and unsigned
- Ensure `.env.local` has correct values

### Socket.io Issues

- Clear browser cache and restart
- Check browser console for connection errors
- Ensure Socket.io is properly initialized

## 📄 Environment Variables

### Backend (`backend/.env`)

```env
PORT=5001
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<your-secret-key>
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_CLOUDINARY_CLOUD_NAME=<your-cloud-name>
REACT_APP_CLOUDINARY_UPLOAD_PRESET=chat-app
```

## 🤝 Contributing

Feel free to fork and submit pull requests!

## 📄 License

ISC

## 👨‍💻 Author

Venkat Golla

## 🔗 Links

- [Cloudinary Docs](https://cloudinary.com/documentation)
- [Socket.io Docs](https://socket.io/docs/)
- [MongoDB Docs](https://docs.mongodb.com/)
