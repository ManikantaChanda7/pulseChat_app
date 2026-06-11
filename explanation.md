Chat Application Architecture Notes (Interview Prep)

1. Socket.IO Basics

Problem without sockets

Normal web apps work like this:

Frontend → HTTP Request → Backend → HTTP Response

Example:

await API.post('/api/message', {
content: 'Hi',
chatId: 'chat123'
});

Backend saves message and responds.

Problem:
The other user does NOT know instantly.
They would need polling:

GET /messages
GET /messages
GET /messages

This is inefficient.

⸻

What Socket solves

Socket creates a persistent connection.

Browser <=========================> Server

Now server can push data anytime.

Example:

"New message arrived"

without frontend asking.

⸻

2. Socket Connection in This Project

Frontend

import io from 'socket.io-client';
const socket = io('http://localhost:5001');

Meaning:

Connect browser to socket server

⸻

Backend

const server = app.listen(PORT);
const io = require('socket.io')(server);

Meaning:

Attach Socket.IO server to Express server

⸻

3. Identifying Connected User

Backend only knows:

A browser connected

It does NOT know which user.

Frontend

socket.emit('setup', {
\_id: userInfo.\_id,
});

Meaning:

This connection belongs to this user

⸻

Backend

socket.on('setup', (userData) => {
console.log(userData.\_id);
});

Now backend knows who connected.

⸻

4. Socket Rooms (Critical Concept)

Without rooms:

io.emit('message', msg);

Everyone gets the event.

Bad.

⸻

Solution:

socket.join(userData.\_id.toString());

Example:

User:

user123

gets room:

"user123"

Another user:

user456

gets room:

"user456"


# Real-Time Messaging Flow (Socket.IO)

## emit vs on

These are the most basic Socket.IO concepts.

### emit
Used to **send an event**

Example:

```js
socket.emit("hello", "Hi bro");
```

Meaning:

```text
Send an event called "hello" with data "Hi bro"
```

---

### on
Used to **listen for an event**

Example:

```js
socket.on("hello", (msg) => {
  console.log(msg);
});
```

Meaning:

```text
When "hello" event arrives, run this code
```

Output:

```text
Hi bro
```

---

## Simple analogy

Think of a phone call.

You speak:

```text
emit
```

Other person listens:

```text
on
```

Both frontend and backend can:
- emit (send)
- on (listen)

---

# Different types of emit

## 1. socket.emit()

```js
socket.emit("connected");
```

Meaning:

```text
Send only to THIS connected client
```

---

## 2. io.emit()

```js
io.emit("server restart");
```

Meaning:

```text
Broadcast to ALL connected users
```

---

## 3. io.to(room).emit()

```js
io.to("456").emit("message received");
```

Meaning:

```text
Send only to a specific room/user
```

This is what chat apps mainly use.

---

# Real-Time Message Flow

Assume:

Manikanta:

```text
user123
```

Rohith:

```text
user456
```

During socket setup:

```js
socket.join("user123");
socket.join("user456");
```

Now each user has their own private room.

---

# Step 1: User sends message

Frontend:

```js
await API.post("/api/message", {
  content: "Hi Rohith",
  chatId: "chat123",
});
```

Question:

Why API request first?

Because message must be saved in database.

If only socket is used:

```text
Message appears instantly
Refresh page → message disappears
```

So database save must happen first.

---

# Step 2: Backend receives request

Controller:

```js
const sendMessage = async (req, res) => {
```

Request body:

```js
{
  content: "Hi Rohith",
  chatId: "chat123"
}
```

Authenticated user:

```js
req.user._id = "user123"
```

So backend knows:

```text
Sender = Manikanta
```

---

# Step 3: Save message in MongoDB

```js
const message = await Message.create({
  sender: req.user._id,
  content: req.body.content,
  chat: req.body.chatId,
});
```

MongoDB document:

```js
{
  _id: "msg001",
  sender: "user123",
  content: "Hi Rohith",
  chat: "chat123"
}
```

Now message is permanently stored.

Even after refresh.

---

# Step 4: Update latest chat preview

Sidebar chat preview needs:

```text
Rohith
Hi Rohith
```

So backend updates chat:

```js
await Chat.findByIdAndUpdate(req.body.chatId, {
  latestMessage: message,
});
```

Chat becomes:

```js
{
  _id: "chat123",
  latestMessage: "msg001"
}
```

---

# Step 5: Find recipients

Suppose chat users:

```js
[
  "user123",
  "user456"
]
```

Loop:

```js
chat.users.forEach((user) => {
```

Skip sender:

```js
if (user._id.toString() === req.user._id.toString()) {
  return;
}
```

Meaning:

```text
Don't send message back to sender
```

Remaining:

```text
Rohith
```

---

# Step 6: Emit realtime socket event

Backend:

```js
io.to(user._id.toString()).emit(
  "message received",
  message
);
```

Suppose recipient:

```js
user._id = "user456"
```

This becomes:

```js
io.to("user456").emit(
  "message received",
  message
);
```

Meaning:

```text
Go to room "user456"
Send event "message received"
Attach message data
```

This is the realtime delivery part.

---

# What data is sent?

Example:

```js
{
  _id: "msg001",
  sender: "user123",
  content: "Hi Rohith",
  chat: "chat123"
}
```

---

# Step 7: Recipient frontend listens

Frontend:

```js
socket.on("message received", (newMessage) => {
```

Meaning:

```text
Whenever backend sends "message received",
run this code
```

Backend emitted:

```js
io.to("user456").emit(...)
```

So this listener runs.

---

# Step 8: Update UI state

```js
setMessages((prev) => [...prev, newMessage]);
```

Old:

```js
[
  "Hello",
  "How are you?"
]
```

New:

```js
[
  "Hello",
  "How are you?",
  "Hi Rohith"
]
```

React rerenders.

Recipient sees message instantly.

---

# Full End-to-End Flow

```text
User clicks Send
    ↓
Frontend API request
    ↓
Backend receives request
    ↓
Save message in MongoDB
    ↓
Update latest chat preview
    ↓
Find recipient users
    ↓
Socket emit to recipient room
    ↓
Recipient frontend socket listener runs
    ↓
React state updates
    ↓
UI shows message instantly
```

---

# Why Socket instead of Polling?

Without sockets:

Frontend:

```js
setInterval(() => {
  fetchMessages();
}, 1000);
```

Meaning:

Every second:

```text
Any new message?
Any new message?
Any new message?
```

Problems:
- unnecessary API calls
- server load
- delayed updates

With sockets:

```text
Server pushes only when needed
```

Much better.

---

# Interview Explanation

"Real-time messaging works by first saving the message through a REST API to ensure persistence in MongoDB. After saving, the backend uses Socket.IO to emit the message to recipient-specific socket rooms. The recipient frontend listens for that event and immediately updates React state, giving realtime chat behavior."


# Typing Indicator Flow (Socket.IO)

## Goal

When Manikanta starts typing:

```text
Rohith should see:
"Manikanta is typing..."
```

instantly.

This is NOT saved in database.

Because typing is temporary state.

So this feature uses only sockets.

---

# Why no API?

Imagine:

Every keystroke:

```js
POST /typing
```

If user types:

```text
hello
```

Requests:

```text
h
he
hel
hell
hello
```

Too many API calls.

Wasteful.

Sockets are perfect for this.

---

# Step 1: User starts typing

Frontend:

```js
socket.emit("typing", selectedChat._id);
```

Meaning:

```text
Backend, user is typing in this chat
```

Example:

```js
socket.emit("typing", "chat123");
```

---

# What is sent?

Event:

```text
typing
```

Data:

```text
chat123
```

Meaning:

```text
Typing is happening in chat123
```

---

# Step 2: Backend listens

Backend:

```js
socket.on("typing", (chatId) => {
```

Meaning:

```text
When frontend sends typing event,
run this code
```

Frontend emitted:

```js
socket.emit("typing", "chat123");
```

So backend receives:

```js
chatId = "chat123"
```

---

# Step 3: Send to others in same chat

Backend:

```js
socket.in(chatId).emit("typing");
```

This is important.

---

## What is socket.in()?

Suppose chat123 has:

```text
Manikanta
Rohith
```

Manikanta triggered typing.

If backend uses:

```js
io.to(chatId).emit("typing");
```

EVERYONE gets event.

Including sender.

Meaning:

```text
Manikanta sees:
"Manikanta is typing"
```

Wrong.

---

So instead:

```js
socket.in(chatId).emit("typing");
```

Meaning:

```text
Send to everyone in this room
EXCEPT current sender
```

So only Rohith gets it.

Correct.

---

# Step 4: Recipient frontend listens

Frontend:

```js
socket.on("typing", () => {
  setIsTyping(true);
});
```

Meaning:

```text
When typing event arrives,
show typing indicator
```

UI:

```text
Manikanta is typing...
```

---

# But typing should disappear

If user stops typing, indicator should hide.

So sender emits another event.

Frontend:

```js
socket.emit("stop typing", selectedChat._id);
```

Meaning:

```text
User stopped typing
```

---

# Backend listens

```js
socket.on("stop typing", (chatId) => {
  socket.in(chatId).emit("stop typing");
});
```

Meaning:

```text
Tell others typing has stopped
```

---

# Recipient frontend

```js
socket.on("stop typing", () => {
  setIsTyping(false);
});
```

Typing indicator disappears.

---

# Full Flow

```text
User starts typing
    ↓
Frontend emits "typing"
    ↓
Backend listens
    ↓
Backend emits to others in same chat
    ↓
Recipient frontend listens
    ↓
Show "typing..."
```

Stopping:

```text
User stops typing
    ↓
Frontend emits "stop typing"
    ↓
Backend listens
    ↓
Backend emits to others
    ↓
Recipient hides indicator
```

---

# Why sockets are ideal

Typing is:

- temporary
- realtime
- frequent
- not persistent

Database would be wrong.

Sockets are perfect.

---

# Interview Explanation

"Typing indicator uses Socket.IO only, without database persistence. When a user starts typing, frontend emits a typing event with the chat ID. Backend listens and broadcasts that event to other users in the same chat using socket.in(chatId).emit(), excluding the sender. Recipient frontend listens and shows the typing indicator."


# Typing Indicator - Real Implementation Details

## Does `stop typing` emit continuously?

Short answer:

**No.**

That would be inefficient and incorrect.

---

# Wrong Approach

Example:

```js
onChange={() => {
  socket.emit("typing");
  socket.emit("stop typing");
}}
```

For typing:

```text
hello
```

Events become:

```text
typing
stop typing
typing
stop typing
typing
stop typing
```

Problems:
- unnecessary socket traffic
- UI flickering
- poor performance

---

# Correct Approach: Debounce / Timer Logic

We only:

- emit `typing` once when user starts typing
- emit `stop typing` once after inactivity

---

## Example Code

```js
let typing = false;
let lastTypingTime;

const typingHandler = (e) => {
  setMessage(e.target.value);

  if (!typing) {
    typing = true;
    socket.emit("typing", chatId);
  }

  lastTypingTime = Date.now();

  const timerLength = 3000;

  setTimeout(() => {
    const timeNow = Date.now();
    const diff = timeNow - lastTypingTime;

    if (diff >= timerLength && typing) {
      socket.emit("stop typing", chatId);
      typing = false;
    }
  }, timerLength);
};
```

---

# Step-by-Step Flow

## First character typed

User types:

```text
h
```

Current state:

```js
typing = false
```

Condition:

```js
if (!typing)
```

True.

So:

```js
socket.emit("typing", chatId);
```

Sent.

Then:

```js
typing = true;
```

---

## User keeps typing

After 1 second:

```text
he
```

Check:

```js
if (!typing)
```

Now:

```js
typing = true
```

Condition fails.

So:

```text
NO new typing emit
```

Only timer resets.

---

Typing continues:

```text
hel
hell
hello
```

Still:

```text
No repeated typing events
```

---

# What timer does

Each keystroke updates:

```js
lastTypingTime = Date.now();
```

Meaning:

```text
Remember latest typing time
```

Timer checks:

```js
const diff = Date.now() - lastTypingTime;
```

If:

```js
diff >= 3000
```

means:

```text
User stopped typing for 3 seconds
```

Then:

```js
socket.emit("stop typing", chatId);
typing = false;
```

---

# Timeline Example

User types:

```text
0s   h
1s   e
2s   l
3s   l
4s   o
```

Flow:

### 0s

First character:

```js
socket.emit("typing");
```

---

### 1s

Typed again:

```text
No new typing emit
```

Timer reset.

---

### 2s

Typed again:

```text
No new typing emit
```

Timer reset.

---

### 3s

Typed again:

```text
No new typing emit
```

Timer reset.

---

### 4s

Typed again:

```text
No new typing emit
```

Timer reset.

---

### 7s

No typing for 3 seconds.

Timer detects inactivity:

```js
socket.emit("stop typing");
```

---

# Actual Socket Traffic

Only:

```text
typing
stop typing
```

NOT:

```text
typing
typing
typing
typing
typing
stop
stop
stop
```

---

# What if user just opens chat?

No typing happened.

So:

```text
No typing event
No stop typing event
```

Opening chat alone does nothing.

---

# What if user sends message?

User clearly stopped typing.

So after send:

```js
socket.emit("stop typing", chatId);
typing = false;
```

This immediately hides typing indicator.

---

# Why this design?

Typing status is:

- temporary
- frequent
- realtime
- not worth saving in DB

Sockets + debounce are ideal.

---

# Interview Explanation

"Typing indicators use debounced Socket.IO events. We emit `typing` only once when typing starts, then emit `stop typing` after a short inactivity timeout or immediately after sending the message. This prevents excessive socket traffic and keeps the UI responsive."


# Online / Offline Presence + Last Seen

## Goal

Show:

```text
🟢 Online
```

when user is active.

Show:

```text
Last seen 10:30 PM
```

when offline.

This must update in realtime.

---

# Basic Idea

When user opens app:

```text
mark online
```

When user closes app:

```text
mark offline
```

Other users should see this instantly.

Sockets are perfect for this.

---

# Step 1: User connects socket

Frontend:

```js
const socket = io("http://localhost:5001");
```

Then:

```js
socket.emit("setup", {
  _id: userInfo._id,
});
```

Meaning:

```text
Server, this user is connected
```

---

# Backend receives setup

```js
socket.on("setup", async (userData) => {
```

Now backend knows:

```text
user123 connected
```

---

# Old Simple Approach (Local Memory)

Example:

```js
const onlineUsers = new Map();
```

On setup:

```js
onlineUsers.set(userId, socket.id);
```

Example:

```text
Map:
{
  user123 -> socketABC
}
```

Meaning:

```text
user123 is online
```

---

# Disconnect

Socket event:

```js
socket.on("disconnect", () => {
```

Remove:

```js
onlineUsers.delete(userId);
```

Now:

```text
user offline
```

---

# Why this fails in production

Imagine:

```text
Server A
Server B
```

Manikanta connected to:

```text
Server A
```

Map A:

```text
{
  user123
}
```

Rohith connected to:

```text
Server B
```

Map B:

```text
{
  user456
}
```

Problem:

Server A does NOT know user456 exists.

Server B does NOT know user123 exists.

Presence becomes incorrect.

---

# Multiple Device Problem

Suppose same user opens app on:

- laptop
- mobile

Old Map:

```js
onlineUsers.set("user123", socket1);
```

Then mobile:

```js
onlineUsers.set("user123", socket2);
```

Map becomes:

```text
{
  user123 -> socket2
}
```

Old socket overwritten.

Problem:

Close laptop:

```text
user marked offline
```

even though mobile is still active.

Wrong.

---

# Redis Solution

Instead of local memory:

```js
await redis.sadd(`presence:${userId}`, socket.id);
```

Example:

```text
presence:user123
   socket1
   socket2
```

Redis set stores ALL active sockets.

---

# Why Redis?

Redis is shared memory.

Every backend server sees same data.

Example:

```text
Server A
Server B
Server C
```

All read:

```text
presence:user123
```

Single source of truth.

---

# User comes online

Setup:

```js
socket.on("setup", async (userData) => {
  await addUserSocket(userData._id, socket.id);
});
```

Inside helper:

```js
const addUserSocket = async (userId, socketId) => {
  await redis.sadd(`presence:${userId}`, socketId);
};
```

Meaning:

```text
Add this socket for this user
```

---

# Check if online

```js
const count = await redis.scard(`presence:${userId}`);
```

Example:

```text
2
```

Means:

```text
2 active sockets
```

So:

```text
user online
```

---

# Notify others

Backend:

```js
io.emit("user online", userId);
```

Meaning:

```text
Tell everyone user became online
```

---

# Frontend listens

```js
socket.on("user online", (userId) => {
  setOnlineUsers((prev) => [...prev, userId]);
});
```

UI:

```text
🟢 Online
```

appears.

---

# User disconnects

Browser closes.

Socket:

```js
socket.on("disconnect", async () => {
```

Remove socket:

```js
await redis.srem(`presence:${userId}`, socket.id);
```

Example:

Before:

```text
presence:user123
  socket1
  socket2
```

After laptop closes:

```text
presence:user123
  socket2
```

Still online.

Correct.

---

# Final offline detection

Check count:

```js
const remaining = await redis.scard(`presence:${userId}`);
```

If:

```text
remaining > 0
```

Still online.

Do nothing.

---

If:

```text
remaining = 0
```

Now truly offline.

---

# Save last seen

Backend:

```js
await User.findByIdAndUpdate(userId, {
  lastSeen: new Date(),
});
```

Example:

```text
10:45 PM
```

Saved in DB.

---

# Notify others

Backend:

```js
io.emit("user offline", {
  userId,
  lastSeen: new Date(),
});
```

Meaning:

```text
Tell everyone user went offline
```

---

# Frontend listens

```js
socket.on("user offline", ({ userId, lastSeen }) => {
```

Update:

```js
setOnlineUsers((prev) =>
  prev.filter((id) => id !== userId)
);
```

Save:

```js
setLastSeenMap((prev) => ({
  ...prev,
  [userId]: lastSeen,
}));
```

UI:

```text
Last seen 10:45 PM
```

---

# Full Flow

## Online

```text
User opens app
    ↓
Socket connects
    ↓
setup event sent
    ↓
Backend stores socket in Redis
    ↓
Backend emits user online
    ↓
Other users frontend updates UI
```

---

## Offline

```text
User closes app
    ↓
Socket disconnect
    ↓
Remove socket from Redis
    ↓
Check remaining sockets
    ↓
If none:
   save lastSeen
   emit user offline
    ↓
Frontend updates UI
```

---

# Why Redis + sockets is strong

This solves:

✅ realtime updates  
✅ multi-server scaling  
✅ multiple devices per user  
✅ accurate online/offline state  
✅ last seen support  

---

# Interview Explanation

"Online presence is managed using Socket.IO with Redis-backed presence tracking. Each active socket connection is stored in Redis sets per user, allowing accurate multi-device presence and horizontal scaling. On disconnect, the socket is removed, and only when no active sockets remain is the user marked offline and last seen updated."

# Redis Adapter (Socket Scaling Across Multiple Servers)

## Problem Statement

Socket.IO works fine on one backend server.

Example:

```text
Frontend users
      ↓
Backend Server A
```

Everything works.

---

# Single server message flow

Manikanta connected to:

```text
Server A
```

Rohith connected to:

```text
Server A
```

Backend sends:

```js
io.to("user456").emit("message received");
```

Server A knows:

```text
user456 socket exists here
```

So message reaches Rohith.

Works perfectly.

---

# Production scaling problem

Real apps often run multiple backend servers.

Example:

```text
Frontend users
   ↓
Load Balancer
   ↓
Server A
Server B
Server C
```

Why?

Because one server cannot handle huge traffic.

So traffic is distributed.

---

# Example issue

Manikanta connects.

Load balancer sends him to:

```text
Server A
```

Rohith connects.

Load balancer sends him to:

```text
Server B
```

Now:

```text
Manikanta socket exists on Server A
Rohith socket exists on Server B
```

---

# What breaks?

Manikanta sends message.

Backend on Server A runs:

```js
io.to("user456").emit("message received");
```

Problem:

Server A checks:

```text
Do I have room user456?
```

Answer:

```text
NO
```

Because Rohith is on Server B.

So event disappears.

Message never arrives realtime.

---

# Visual

Broken flow:

```text
Manikanta
   ↓
Server A
   ↓
emit to user456
   ↓
Server A cannot find user456
   ↓
message lost
```

---

# Why?

Because Socket.IO memory is local by default.

Server A only knows:

```text
its own sockets
its own rooms
```

Server B only knows:

```text
its own sockets
its own rooms
```

No shared knowledge.

---

# Solution: Redis Adapter

Redis acts like shared communication channel.

Install:

```js
@socket.io/redis-adapter
```

Setup:

```js
const { createAdapter } = require("@socket.io/redis-adapter");
```

Create Redis clients:

```js
const pubClient = redis.duplicate();
const subClient = redis.duplicate();
```

Attach adapter:

```js
io.adapter(createAdapter(pubClient, subClient));
```

---

# What changed?

Now all servers communicate through Redis.

Architecture:

```text
Server A
   ↕
 Redis Pub/Sub
   ↕
Server B
   ↕
Server C
```

---

# New message flow

Manikanta sends message.

Connected to:

```text
Server A
```

Server A:

```js
io.to("user456").emit("message received");
```

Now Server A asks Redis:

```text
Which server has room user456?
```

Redis knows:

```text
Server B
```

Redis forwards event.

Server B receives event.

Server B delivers to Rohith.

---

# Visual flow

Working flow:

```text
Manikanta
   ↓
Server A
   ↓
emit message
   ↓
Redis adapter
   ↓
Server B
   ↓
Rohith
```

---

# Why pub/sub?

Redis uses Publish / Subscribe pattern.

Server A:

```text
Publishes event
```

Server B:

```text
Subscribed to events
```

So event reaches correct server.

---

# Simple analogy

Imagine offices.

Without Redis:

Office A employees only know Office A people.

Office B employees only know Office B people.

Message:

```text
"Give this to Rohith"
```

Office A says:

```text
No Rohith here
```

Lost.

---

With Redis:

Central receptionist.

Office A asks:

```text
Where is Rohith?
```

Reception:

```text
Office B
```

Message delivered.

---

# Why this matters

Without Redis adapter:

Single server only.

With Redis adapter:

Horizontal scaling.

Meaning:

```text
Add more backend servers safely
```

Supports thousands/millions of users.

---

# Difference between Redis Presence and Redis Adapter

Common confusion.

## Redis Presence

Stores:

```text
who is online
which sockets belong to user
```

Example:

```text
presence:user123
```

Used for:

```text
online/offline tracking
multi-device presence
```

---

## Redis Adapter

Used for:

```text
cross-server socket event delivery
```

Example:

```text
Server A → Server B messaging
```

Not same purpose.

---

# Interview Explanation

"Socket.IO stores socket rooms in local server memory by default, which breaks in multi-server deployments because one server cannot access sockets connected to another. We solved this using the Socket.IO Redis adapter, which uses Redis pub/sub to propagate socket events across backend instances, enabling horizontal scaling."

# Redis Adapter Internals (How It Actually Works)

## First confusion to clear

There are TWO Redis usages in our app.

### 1. Redis Presence Tracking (our custom logic)

This is OUR code.

Example:

```js
await redis.sadd(`presence:${userId}`, socket.id);
```

Stores:

```text
presence:user123
   socketABC
   socketXYZ
```

Purpose:

```text
Online/offline tracking
Multi-device presence
Last seen
```

We manually manage this.

---

### 2. Redis Adapter (Socket.IO internal scaling)

This is NOT manual user storage.

Socket.IO adapter manages this internally.

Purpose:

```text
Cross-server socket communication
```

---

# Redis Adapter Setup

Code:

```js
const { createAdapter } = require("@socket.io/redis-adapter");
```

Create Redis clients:

```js
const pubClient = redis.duplicate();
const subClient = redis.duplicate();
```

Attach adapter:

```js
io.adapter(createAdapter(pubClient, subClient));
```

Meaning:

```text
Use Redis as communication layer between backend servers
```

---

# Example servers

Suppose:

```text
Server A
Server B
```

Users:

```text
Manikanta → Server A
Rohith    → Server B
```

---

# Socket connection happens

Frontend:

```js
const socket = io("http://localhost:5001");
```

Server B gets:

```js
io.on("connection", (socket) => {
```

Then setup:

```js
socket.on("setup", (userData) => {
  socket.join(userData._id);
});
```

Example:

```js
socket.join("user456");
```

This creates room:

```text
user456
```

on Server B.

---

# Important question:
Do WE store this in Redis manually?

No.

This:

```js
socket.join("user456");
```

is intercepted by Socket.IO Redis adapter internally.

Adapter synchronizes room metadata between servers.

Conceptually:

```text
Server B tells Redis:
"I have room user456"
```

Not exact user data storage like our presence logic, but adapter metadata.

Managed internally.

---

# What happens when Server A emits?

Server A:

```js
io.to("user456").emit("message received", msg);
```

Question:

How does Server A know Rohith is on Server B?

---

Without adapter:

Server A checks LOCAL memory only:

```text
Do I have room user456?
```

Answer:

```text
No
```

Event dies.

---

With adapter:

Server A asks adapter layer.

Conceptually:

```text
Who owns room user456?
```

Redis adapter knows:

```text
Server B
```

So event forwarded.

---

# Conceptual internal flow

Not exact implementation, but mental model:

Server B room creation:

```text
socket.join("user456")
```

Adapter sync:

```text
Redis:
room:user456 → Server B
```

---

Server A emit:

```js
io.to("user456").emit(...)
```

Adapter lookup:

```text
room:user456 ?
```

Find:

```text
Server B
```

Publish:

```text
deliver event to Server B
```

Server B receives:

```text
emit locally to actual socket
```

---

# Visual flow

Connection:

```text
Rohith frontend
    ↓
Server B
    ↓
socket.join("user456")
    ↓
Adapter sync metadata
```

Later:

```text
Manikanta sends message
    ↓
Server A
    ↓
io.to("user456").emit(...)
    ↓
Redis adapter routes
    ↓
Server B
    ↓
Rohith socket
```

---

# pubClient vs subClient

We create:

```js
const pubClient = redis.duplicate();
const subClient = redis.duplicate();
```

Why two?

Because Redis pub/sub uses separate roles.

### Publisher

Sends events:

```text
Server A publishes:
"deliver message to user456"
```

---

### Subscriber

Listens:

```text
Server B listens:
"Any event for me?"
```

So:

```js
pubClient
```

for sending

and

```js
subClient
```

for receiving

---

# Are socket IDs stored in Redis adapter?

Internally yes.

But NOT through our custom code.

Socket.IO adapter handles:

- socket membership
- room mapping
- server synchronization

Automatically.

We only configure adapter.

---

# Difference from presence Redis

Presence Redis:

WE write:

```js
redis.sadd(...)
redis.srem(...)
redis.scard(...)
```

Explicit business logic.

---

Redis adapter:

WE only configure:

```js
io.adapter(createAdapter(...))
```

Socket.IO handles the rest.

---

# Interview explanation

"We use Redis in two ways. First, custom Redis presence tracking stores active socket IDs per user for online/offline logic. Second, Socket.IO Redis adapter handles cross-server socket event routing automatically by synchronizing socket room metadata across backend instances via Redis pub/sub."

# Notifications Flow (Database + Socket.IO)

## Goal

When someone sends a message:

Recipient should see:

```text
🔔 New notification
```

even if they are NOT currently inside that chat.

Example:

Rohith is viewing:

```text
Chat with Ajay
```

Manikanta sends message in:

```text
Chat with Rohith
```

Rohith should get notification badge.

---

# Why not socket only?

Suppose backend only does:

```js
io.to("user456").emit("notification received");
```

Realtime works.

BUT:

If Rohith refreshes page:

```text
notification disappears
```

Because nothing saved.

Bad.

---

# Why not database only?

Backend saves notification:

```js
Notification.create(...)
```

But Rohith sees it only after refresh.

Not realtime.

Bad.

---

# Correct design

Use BOTH:

```text
Database persistence
+
Realtime socket delivery
```

Best of both.

---

# Step 1: Message sent

Frontend:

```js
await API.post("/api/message", {
  content: "Hi Rohith",
  chatId: "chat123",
});
```

Backend receives.

---

# Step 2: Save message

```js
const message = await Message.create({
  sender: req.user._id,
  content: req.body.content,
  chat: req.body.chatId,
});
```

---

# Step 3: Find recipients

Chat users:

```js
[
  user123, // sender
  user456  // Rohith
]
```

Loop:

```js
chat.users.forEach((user) => {
```

Skip sender:

```js
if (user._id.toString() === req.user._id.toString()) {
  return;
}
```

Remaining:

```text
Rohith
```

---

# Step 4: Create notification in DB

Backend:

```js
await Notification.create({
  recipient: user._id,
  actor: req.user._id,
  chat: chat._id,
  message: message._id,
  type: "message",
  preview: message.content,
});
```

Meaning:

Store notification permanently.

Mongo:

```js
{
  recipient: "user456",
  actor: "user123",
  type: "message",
  preview: "Hi Rohith"
}
```

Now refresh won't lose it.

---

# Step 5: Realtime socket event

Backend:

```js
io.to(user._id.toString()).emit(
  "notification received",
  notification
);
```

Suppose:

```js
user._id = "user456"
```

This becomes:

```js
io.to("user456").emit(...)
```

Meaning:

```text
Deliver notification instantly to Rohith's room
```

---

# Step 6: Frontend listens

Rohith frontend:

```js
socket.on(
  "notification received",
  (incomingNotification) => {
```

Meaning:

```text
When backend sends notification,
run this code
```

---

# Step 7: Avoid duplicate notifications

Suppose Rohith is already viewing that same chat.

Then notification is pointless.

Check:

```js
const incomingChatId =
  incomingNotification?.chat?._id ||
  incomingNotification?.chat;

const activeChatId = selectedChat?._id;
```

Compare:

```js
if (
  incomingChatId &&
  activeChatId &&
  incomingChatId.toString() === activeChatId.toString()
) {
  return;
}
```

Meaning:

```text
If user is already in that chat,
ignore notification
```

Good UX.

---

# Step 8: Update notification UI

Frontend:

```js
fetchNotifications();
```

Backend API:

```js
GET /api/notification
```

Returns:

```js
[
  {
    preview: "Hi Rohith"
  }
]
```

Frontend updates badge.

---

# Why fetch instead of directly appending?

Possible:

```js
setNotification(prev => [...prev, incoming])
```

But fetching is safer because:

- server remains source of truth
- avoids duplicate state bugs
- ensures latest unread count

---

# Full Flow

```text
User sends message
    ↓
Backend saves message
    ↓
Backend creates notification in DB
    ↓
Backend emits socket notification
    ↓
Recipient frontend listens
    ↓
If chat already open → ignore
Else fetch notifications
    ↓
UI badge updates
```

---

# Difference from realtime message

Realtime message:

```text
message content delivery
```

Notification:

```text
attention alert
```

Different purpose.

---

# Why DB + socket is strong design

DB:

```text
persistent
survives refresh
source of truth
```

Socket:

```text
instant delivery
realtime UX
```

Together:

```text
best architecture
```

---

# Interview Explanation

"Notifications use a hybrid approach. We persist notifications in MongoDB so they survive refresh and act as a source of truth, while Socket.IO delivers realtime notification events to recipient-specific rooms for instant UI updates. Frontend suppresses notifications when the user is already viewing the active chat."

# Read Receipts / Seen Messages

## Goal

When Rohith opens the chat and reads Manikanta’s message:

Manikanta should see:

```text
✓✓ Seen
```

in realtime.

---

# Basic Idea

When recipient opens chat:

```text
mark messages as seen
```

Then notify sender instantly.

This is NOT purely socket-based.

Why?

Because "seen" state must persist.

If refresh happens:

```text
seen status should remain
```

So database is required.

Sockets are only for realtime updates.

---

# Step 1: Recipient opens chat

Frontend:

```js
setSelectedChat(chat);
```

Then API call:

```js
await API.put(`/api/chat/read-state/${chat._id}`, {
  forceUnread: false,
});
```

Meaning:

```text
Backend, user has opened this chat
mark messages as read
```

---

# Why API instead of socket only?

If socket only:

```js
socket.emit("message seen");
```

Realtime works.

But refresh:

```text
seen status lost
```

Because nothing saved.

So DB update required.

---

# Step 2: Backend receives request

Controller:

```js
const updateReadState = asyncHandler(async (req, res) => {
```

Request:

```js
chatId = req.params.chatId
```

Authenticated user:

```js
req.user._id
```

Backend knows:

```text
which user opened which chat
```

---

# Step 3: Load chat

```js
const chat = await Chat.findById(chatId)
  .populate("latestMessage");
```

Now backend gets:

```js
chat.latestMessage
```

Example:

```js
{
  sender: "user123",
  content: "Hi Rohith"
}
```

---

# Step 4: Prevent self-seen updates

Check:

```js
if (
  latestMessage &&
  latestMessage.sender.toString() !== req.user._id.toString()
)
```

Meaning:

```text
Only recipient can mark seen
sender cannot mark own message seen
```

Example:

Manikanta sent message.

Rohith opens chat.

Valid.

But if Manikanta opens own chat:

```text
ignore
```

---

# Step 5: Update DB

Check already seen:

```js
const alreadySeen = latestMessage.seenBy.some(
  (id) => id.toString() === req.user._id.toString()
);
```

If not seen:

```js
latestMessage.seenBy.push(req.user._id);

latestMessage.seen = true;

latestMessage.seenAt = new Date();
```

Save:

```js
await latestMessage.save();
```

---

# Database example

Before:

```js
{
  content: "Hi Rohith",
  seenBy: [],
  seen: false
}
```

After:

```js
{
  content: "Hi Rohith",
  seenBy: ["user456"],
  seen: true,
  seenAt: "10:45 PM"
}
```

Persistent.

Refresh safe.

---

# Why seenBy array?

Future-proof.

One-to-one:

```text
1 recipient
```

Group chat:

```text
multiple recipients
```

Example:

```js
seenBy: [
  user456,
  user789,
  user999
]
```

Flexible design.

---

# Step 6: Notify sender in realtime

After DB update:

Backend:

```js
io.to(senderId).emit("messages seen", {
  chatId,
  messageIds: [latestMessage._id],
  message: latestMessage,
});
```

Meaning:

```text
Tell sender message was seen
```

---

# Why socket here?

Without socket:

Sender sees seen tick only after refresh.

Bad UX.

Socket makes it instant.

---

# Step 7: Sender frontend listens

Frontend:

```js
socket.on("messages seen", (data) => {
```

Meaning:

```text
When backend says messages were seen,
update UI
```

---

# Step 8: Update frontend state

Example:

```js
setMessages((prev) =>
  prev.map((msg) =>
    msg._id === data.message._id
      ? data.message
      : msg
  )
);
```

Before:

```js
seen = false
```

After:

```js
seen = true
```

React rerenders.

UI:

```text
✓✓ Seen
```

instantly.

---

# Full Flow

```text
Recipient opens chat
    ↓
Frontend API call
    ↓
Backend loads latest message
    ↓
Check sender != current user
    ↓
Update seenBy + seen + seenAt
    ↓
Save in MongoDB
    ↓
Socket emit to sender
    ↓
Sender frontend listens
    ↓
UI updates instantly
```

---

# Force Unread Feature

Your app also supports:

```text
Mark as unread
```

Frontend:

```js
await API.put(`/api/chat/read-state/${chatId}`, {
  forceUnread: true,
});
```

Backend:

Remove user from:

```js
seenBy
```

Set:

```js
seen = false
allSeen = false
```

Then emit socket update.

This allows manual unread behavior.

---

# Why DB + Socket together?

DB:

```text
persistent seen state
refresh safe
source of truth
```

Socket:

```text
instant sender update
better UX
```

Best combination.

---

# Interview Explanation

"Read receipts are implemented using a hybrid API plus Socket.IO approach. When a recipient opens a chat, frontend calls a protected API to persist seen state in MongoDB by updating seenBy, seen, and seenAt fields. After persistence, the backend emits a realtime socket event to the sender so the UI reflects seen status immediately without requiring refresh."

# Authentication Flow (Access Token + Refresh Token)

## Goal

Secure user authentication so that:

- users login securely
- protected APIs are accessible only to authenticated users
- users remain logged in without frequent login prompts
- stolen tokens have limited risk

---

# Basic Problem

Suppose login works like this:

Frontend:

```js
await API.post("/api/user/login", {
  email,
  password,
});
```

Backend verifies credentials.

Returns token:

```js
{
  token: "abc123"
}
```

Frontend stores:

```js
localStorage.setItem("token", token);
```

Then every API:

```js
Authorization: Bearer abc123
```

Works.

---

# Problem with single token

Suppose token expires in:

```text
15 minutes
```

After 15 minutes:

```text
401 Unauthorized
```

User gets logged out constantly.

Bad UX.

---

Suppose token expires in:

```text
30 days
```

If stolen:

```text
attacker gets 30 days access
```

Bad security.

---

# Solution

Use TWO tokens:

1. Access Token
2. Refresh Token

---

# Access Token

Short-lived.

Example:

```text
15 minutes
```

Used for:

```text
normal protected API requests
```

Example:

```js
Authorization: Bearer accessToken
```

Purpose:

```text
fast auth verification
low security risk if stolen
```

---

# Refresh Token

Long-lived.

Example:

```text
7 days
```

Used ONLY to get new access token.

Not for normal APIs.

Purpose:

```text
keep user logged in smoothly
```

---

# Login Flow

Frontend:

```js
await API.post("/api/user/login", {
  email,
  password,
});
```

---

# Step 1: Backend verifies user

```js
const user = await User.findOne({
  email
});
```

Check password:

```js
const valid = await bcrypt.compare(
  password,
  user.password
);
```

If valid:

continue.

---

# Step 2: Create Access Token

```js
const accessToken = jwt.sign(
  {
    id: user._id
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "15m"
  }
);
```

Meaning:

Create JWT containing:

```js
{
  id: user123
}
```

Signed securely.

Valid for:

```text
15 minutes
```

---

# Step 3: Create Refresh Token

```js
const refreshToken = jwt.sign(
  {
    id: user._id
  },
  process.env.REFRESH_SECRET,
  {
    expiresIn: "7d"
  }
);
```

Longer expiry:

```text
7 days
```

Separate secret.

---

# Why separate secret?

Better isolation.

If access secret leaks:

```text
refresh tokens still safe
```

Good security.

---

# Step 4: Store Refresh Token

DB:

```js
user.refreshToken = refreshToken;
await user.save();
```

Why store?

To validate later.

If token not stored:

any valid signed refresh token works forever.

Bad.

---

# Step 5: Send Refresh Token as Cookie

```js
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: true,
});
```

---

# Why cookie?

Because refresh token is sensitive.

Avoid exposing to frontend JS.

---

# Why httpOnly?

If:

```text
XSS attack
```

malicious JS runs:

```js
localStorage.getItem("token")
```

Can steal token.

But:

```text
httpOnly cookie
```

JavaScript cannot read.

Safer.

---

# Step 6: Send Access Token in Response

Response:

```js
res.json({
  user,
  accessToken
});
```

Frontend stores:

```js
localStorage.setItem("userInfo", ...);
```

---

# Protected API Flow

Frontend request:

```js
Authorization: Bearer accessToken
```

Example:

```js
await API.get("/api/chat");
```

---

# Backend auth middleware

```js
const token = req.headers.authorization
```

Extract:

```text
Bearer token
```

Verify:

```js
jwt.verify(token, JWT_SECRET);
```

If valid:

```js
req.user = decodedUser;
next();
```

Now controller knows authenticated user.

---

# What if access token expires?

Backend:

```text
401 Unauthorized
```

---

# Frontend interceptor catches

Example:

```js
API.interceptors.response.use(
  success,
  async (error) => {
```

Check:

```js
if (error.response.status === 401)
```

Meaning:

```text
access token expired
```

---

# Refresh flow

Frontend automatically calls:

```js
await API.post("/api/user/refresh");
```

Cookie automatically sent by browser:

```text
refreshToken cookie
```

Frontend does NOT manually attach it.

---

# Backend refresh endpoint

Read cookie:

```js
req.cookies.refreshToken
```

Verify:

```js
jwt.verify(refreshToken, REFRESH_SECRET);
```

---

# DB validation

Find user:

```js
const user = await User.findById(decoded.id);
```

Compare:

```js
user.refreshToken === incomingRefreshToken
```

Why?

If token was revoked:

reject.

Important security layer.

---

# Create new access token

```js
const newAccessToken = jwt.sign(...);
```

Return:

```js
res.json({
  accessToken: newAccessToken
});
```

---

# Retry original request

Frontend interceptor:

Replace token.

Retry failed API.

User sees:

```text
nothing
```

Smooth experience.

---

# Logout flow

Frontend:

```js
await API.post("/api/user/logout");
```

Backend:

Clear DB:

```js
user.refreshToken = null;
```

Clear cookie:

```js
res.clearCookie("refreshToken");
```

Now:

even old refresh token becomes useless.

---

# Full Flow

## Login

```text
Frontend login request
    ↓
Backend validates password
    ↓
Create access token
    ↓
Create refresh token
    ↓
Store refresh token in DB
    ↓
Set refresh cookie
    ↓
Return access token
```

---

## Protected API

```text
Frontend sends access token
    ↓
Backend verifies JWT
    ↓
Allow request
```

---

## Expired access token

```text
API fails with 401
    ↓
Frontend interceptor catches
    ↓
Call refresh endpoint
    ↓
Backend validates refresh token
    ↓
Issue new access token
    ↓
Retry original request
```

---

## Logout

```text
Clear DB refresh token
    ↓
Clear cookie
    ↓
session fully invalidated
```

---

# Why this architecture is strong

Access token:

```text
short-lived
safer if stolen
```

Refresh token:

```text
smooth user experience
long session support
```

Cookie:

```text
protect sensitive refresh token
```

DB storage:

```text
revocation support
logout invalidation
```

---

# Interview Explanation

"We use JWT-based authentication with short-lived access tokens and long-lived refresh tokens. Access tokens secure protected APIs, while refresh tokens stored in httpOnly cookies allow seamless session renewal. Refresh tokens are also persisted in the database for validation and revocation, improving logout security."

# Validation Middleware + Security Hardening

## Why this matters

A project working locally is NOT enough.

Production apps must handle:

- invalid inputs
- brute force attacks
- malicious payloads
- XSS
- clickjacking
- NoSQL injection

That’s why we added security layers.

---

# 1. Validation Middleware

## Problem before validation

Suppose frontend sends:

```js
{
  email: "",
  password: ""
}
```

Or:

```js
{
  email: "abc"
}
```

Or:

```js
{
  chatId: "wrong-id"
}
```

Without validation:

controller receives bad data.

Then:

- DB errors
- crashes
- unexpected bugs
- unclear responses

Bad architecture.

---

# Solution

Validate requests BEFORE controller.

Flow:

```text
Request
   ↓
Validation middleware
   ↓
If valid → controller
If invalid → reject immediately
```

---

# Example login validation

Route:

```js
router.post(
  "/login",
  validateLogin,
  loginUser
);
```

---

Validation middleware:

```js
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password required"
    });
  }

  next();
};
```

---

# Flow

Frontend:

```js
POST /login
```

Bad payload:

```js
{
  email: ""
}
```

Validation catches:

```text
missing password
```

Response:

```text
400 Bad Request
```

Controller never runs.

---

# ObjectId validation

Example:

```js
GET /chat/abc123wrong
```

Mongo expects:

valid ObjectId.

Without validation:

```text
CastError
```

Ugly backend errors.

---

Validation:

```js
mongoose.Types.ObjectId.isValid(chatId)
```

If invalid:

```js
return res.status(400).json({
  message: "Invalid chat ID"
});
```

Cleaner.

---

# Why middleware?

Instead of writing checks in every controller:

```js
if (!email)
if (!password)
if (!chatId)
```

messy duplication.

Middleware keeps controllers clean.

---

# Interview explanation

"Validation middleware ensures malformed requests are rejected before reaching business logic, improving code cleanliness, reliability, and API consistency."

---

# 2. Rate Limiting

## Problem

Attack:

Brute force login.

Attacker tries:

```text
password1
password2
password3
password4
...
```

Thousands of attempts.

Without limits:

eventually password may be guessed.

---

# Solution

Rate limiter.

Example:

```js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});
```

Meaning:

```text
20 requests allowed
per 15 minutes
per IP
```

---

Apply:

```js
app.use("/api/user/login", limiter);
```

---

# Flow

Normal user:

few login attempts.

Allowed.

---

Attacker:

attempt 21:

Response:

```text
429 Too Many Requests
```

Blocked.

---

# Why useful?

Protects:

- login endpoints
- password reset
- OTP verification
- spam APIs

---

# Interview explanation

"Rate limiting protects sensitive endpoints like login from brute force attacks by restricting request frequency per client."

---

# 3. Helmet Security Headers

## Problem

Browsers can be tricked.

Example attacks:

- clickjacking
- MIME sniffing
- some XSS vectors

---

# Solution

Helmet middleware:

```js
app.use(helmet());
```

Adds security headers automatically.

---

# Example headers

Response includes:

```text
X-Frame-Options
```

Protects against:

```text
clickjacking
```

---

Another:

```text
X-Content-Type-Options
```

Prevents MIME confusion.

---

Another:

```text
Content-Security-Policy
```

Helps reduce XSS risk.

---

# Clickjacking example

Attacker creates hidden iframe:

```html
<iframe src="yourapp.com"></iframe>
```

Tricks user into clicking hidden buttons.

Helmet blocks this.

---

# Why useful?

Easy protection with minimal code.

---

# Interview explanation

"Helmet adds secure HTTP headers to mitigate browser-level attacks such as clickjacking and MIME sniffing."

---

# 4. Mongo Sanitization (NoSQL Injection Protection)

## Problem

Mongo queries accept objects.

Normal login:

```js
{
  email: "test@gmail.com"
}
```

Query:

```js
User.findOne({ email })
```

---

Malicious payload:

```js
{
  email: {
    "$gt": ""
  }
}
```

Meaning:

```text
find any email greater than empty string
```

Potentially bypasses logic.

Dangerous.

---

# Another example

```js
{
  password: {
    "$ne": null
  }
}
```

Meaning:

```text
password not equal null
```

Malicious query behavior.

---

# Solution

Mongo sanitize middleware.

Example:

```js
app.use(mongoSanitize());
```

It removes dangerous operators:

```text
$gt
$ne
$or
$where
```

Payload becomes safe.

---

# Why useful?

Protects Mongo query logic from injection attacks.

---

# Interview explanation

"Mongo sanitization strips malicious query operators from request payloads to prevent NoSQL injection attacks."

---

# 5. Why all layers together?

Each solves different risk.

Validation:

```text
bad input
```

Rate limiting:

```text
abuse / brute force
```

Helmet:

```text
browser attacks
```

Mongo sanitize:

```text
database injection
```

Together:

production-grade backend hardening.

---

# Final Request Flow

```text
Incoming Request
      ↓
Helmet headers
      ↓
Rate limit check
      ↓
Mongo sanitization
      ↓
Validation middleware
      ↓
Auth middleware (if protected)
      ↓
Controller logic
```

---

# Interview Summary

"We hardened the backend with layered security. Validation middleware rejects malformed payloads early, rate limiting protects sensitive endpoints from abuse, Helmet adds secure HTTP headers, and Mongo sanitization prevents NoSQL injection. This makes the API more production-ready beyond just functional correctness."

# Scheduled Messages + BullMQ Worker Architecture

## Goal

User should be able to send:

```text
"Send this message tomorrow at 10 AM"
```

The message should:

- NOT appear immediately
- automatically send at exact scheduled time
- survive backend restarts
- work reliably

---

# Problem with naive approach

A beginner approach:

```js
setTimeout(() => {
  sendMessage();
}, delay);
```

Example:

```js
setTimeout(() => {
  deliverMessage(msg);
}, 86400000);
```

(24 hours)

---

# Why this is bad

## Problem 1: Backend restart

Suppose:

```text
Message scheduled for tomorrow
```

Backend restarts tonight.

Memory clears.

Timer gone.

Message never sends.

Bad.

---

## Problem 2: Multiple scheduled messages

Suppose:

```text
1000 scheduled messages
```

That means:

```text
1000 active timers in Node memory
```

Heavy.

Bad scalability.

---

## Problem 3: Server crash

If Node crashes:

```text
all timers lost
```

Messages gone.

---

# Better solution: Queue system

Use background job queue.

Your app uses:

```text
BullMQ + Redis
```

---

# Architecture

```text
Frontend
   ↓
Backend API
   ↓
MongoDB (message stored)
   ↓
BullMQ Queue (delayed job)
   ↓
Worker process
   ↓
Socket realtime delivery
```

---

# Why queue?

Queue stores jobs safely.

Even if backend restarts:

```text
job remains in Redis
```

Reliable.

---

# Step 1: User schedules message

Frontend:

```js
await API.post("/api/message", {
  content: "Happy Birthday!",
  chatId: "chat123",
  isScheduled: true,
  scheduledFor: "2026-05-20T10:00:00Z"
});
```

Meaning:

```text
Create message, but deliver later
```

---

# Step 2: Backend saves message in MongoDB

Controller:

```js
const message = await Message.create({
  sender: req.user._id,
  content,
  chat: chatId,
  isScheduled: true,
  scheduledFor,
  scheduledSent: false
});
```

Mongo:

```js
{
  content: "Happy Birthday!",
  isScheduled: true,
  scheduledSent: false
}
```

Important:

```text
Message exists in DB
but not yet delivered
```

---

# Why save immediately?

If backend crashes:

message data survives.

If queue retries:

message still exists.

DB is source of truth.

---

# Step 3: Add delayed queue job

Queue:

```js
await scheduledMessageQueue.add(
  "deliver-message",
  {
    messageId: message._id
  },
  {
    delay: scheduledTime - Date.now()
  }
);
```

---

# What does this mean?

Suppose:

Current time:

```text
9:00 AM
```

Scheduled:

```text
10:00 AM
```

Delay:

```js
3600000 ms
```

BullMQ stores:

```text
Run this job after 1 hour
```

---

# Where is queue stored?

In Redis.

NOT Node memory.

That is critical.

Redis stores:

```text
Delayed job metadata
```

So backend restart doesn't lose jobs.

---

# Why Redis?

BullMQ uses Redis internally because Redis is:

- fast
- in-memory
- persistent enough for queues
- supports delayed jobs efficiently

---

# Step 4: Worker process

Separate worker:

```js
new Worker(
  "scheduled-messages",
  async (job) => {
```

This continuously listens to queue.

Think:

```text
Background employee watching queue
```

---

# Worker waits automatically

No polling code needed.

BullMQ handles timing.

At scheduled time:

worker receives:

```js
job.data = {
  messageId: "msg001"
}
```

---

# Step 5: Load message

Worker:

```js
const message = await Message.findById(
  job.data.messageId
);
```

Why DB fetch?

Because queue stores minimal job data.

Mongo stores full message.

---

# Step 6: Mark delivered

Worker:

```js
message.scheduledSent = true;
await message.save();
```

Before:

```js
scheduledSent = false
```

After:

```js
scheduledSent = true
```

Meaning:

```text
Now officially delivered
```

---

# Why this flag?

Frontend must hide future scheduled messages.

Only show:

```text
scheduledSent = true
```

for recipients.

---

# Step 7: Update chat latest message

Worker:

```js
await Chat.findByIdAndUpdate(
  message.chat,
  {
    latestMessage: message._id
  }
);
```

Why?

Sidebar preview should show delivered message.

---

# Step 8: Create notifications

Recipients should know message arrived.

Worker:

```js
await Notification.create({
  recipient,
  actor,
  chat,
  message,
  type: "message"
});
```

---

# Step 9: Realtime delivery

Worker emits:

```js
io.to(recipientId).emit(
  "message received",
  message
);
```

Meaning:

```text
Deliver instantly when schedule time arrives
```

---

# Step 10: Frontend receives

Recipient frontend:

```js
socket.on("message received", (msg) => {
  setMessages(prev => [...prev, msg]);
});
```

UI updates instantly.

---

# Full Flow

```text
User schedules message
    ↓
Frontend API request
    ↓
Backend saves message in Mongo
    ↓
scheduledSent = false
    ↓
Backend adds delayed BullMQ job
    ↓
Redis stores delayed job
    ↓
Worker waits
    ↓
Scheduled time reached
    ↓
Worker loads message
    ↓
Marks scheduledSent = true
    ↓
Updates latestMessage
    ↓
Creates notifications
    ↓
Socket emits realtime delivery
    ↓
Recipient frontend receives
    ↓
UI updates
```

---

# Why worker separate from backend?

Because API server handles:

```text
requests/responses
```

Worker handles:

```text
background jobs
```

Separation improves scalability.

---

# Example

Backend:

```text
Restaurant cashier
```

Worker:

```text
Kitchen chef
```

Cashier takes order.

Chef cooks later.

Same idea.

---

# Why better than setTimeout?

setTimeout:

```text
memory based
lost on restart
poor scaling
```

BullMQ:

```text
Redis backed
persistent
retryable
scalable
production-ready
```

---

# Interview Explanation

"Scheduled messaging is implemented using BullMQ with Redis-backed delayed jobs instead of in-memory timers. Messages are persisted immediately in MongoDB with scheduled metadata, and a worker process executes delivery at the correct time, updating message state, notifications, and realtime socket delivery. This design survives server restarts and scales much better than setTimeout."

# How Worker Receives Scheduled Job at Exact Time

## Main confusion

Question:

```text
How does worker know exactly when it's 10 AM?
```

Does worker keep checking:

"Is it 10?"
"Is it 10?"
"Is it 10?"

No.

YOU do not write polling code.

BullMQ + Redis handle this internally.

---

# Mental model

Think:

Redis = job storage
Worker = employee waiting for work

---

# Step 1: User schedules message

Suppose current time:

```text
9:00 AM
```

User schedules:

```text
10:00 AM
```

Frontend:

```js
await API.post("/api/message", {
  content: "Happy Birthday",
  scheduledFor: "10:00 AM"
});
```

---

# Step 2: Backend calculates delay

Code:

```js
const delay = scheduledTime - Date.now();
```

Example:

Current:

```text
9:00 AM
```

Scheduled:

```text
10:00 AM
```

Difference:

```text
1 hour
```

In milliseconds:

```js
3600000
```

---

# Step 3: Add BullMQ job

Code:

```js
await scheduledQueue.add(
  "deliver-message",
  {
    messageId: "msg123"
  },
  {
    delay: 3600000
  }
);
```

Meaning:

```text
BullMQ, run this job after 1 hour
```

---

# What happens internally?

BullMQ stores this in Redis.

Conceptually:

Redis:

```text
Delayed Jobs
--------------------------------
Job Name: deliver-message
Message ID: msg123
Run At: 10:00 AM
Status: delayed
```

Important:

This is NOT Node memory.

It lives in Redis server.

---

# Why Redis?

Because Redis survives:

```text
backend restart
server crash
multiple servers
```

Job stays safe.

---

# Step 4: Worker starts

Code:

```js
new Worker(
  "scheduled-messages",
  async (job) => {
    console.log("Job received");
  }
);
```

Question:

Does this worker check DB every second?

No.

---

# What worker actually does

Worker connects to Redis.

Like:

```text
"Hey Redis, tell me when jobs are ready."
```

So worker is subscribed/listening.

Not manually polling in your code.

---

# Analogy

Restaurant:

Chef says:

```text
Tell me when next order is ready
```

Chef waits.

Chef does NOT ask every second:

Any order?
Any order?
Any order?

Kitchen bell rings when needed.

Same idea.

---

# At scheduled time

At:

```text
10:00 AM
```

BullMQ internal scheduler sees:

```text
Delayed job time reached
```

It moves job:

FROM:

```text
Delayed queue
```

TO:

```text
Ready queue
```

Conceptually:

Before:

```text
Redis delayed jobs:
msg123
run at 10:00
```

After:

```text
Redis ready jobs:
msg123
```

---

# Worker receives it

Worker already listening:

```js
new Worker(...)
```

Redis says:

```text
Job ready
```

Worker gets:

```js
job = {
  data: {
    messageId: "msg123"
  }
}
```

Then your code runs:

```js
async (job) => {
```

---

# Your worker logic now executes

Example:

```js
const message = await Message.findById(
  job.data.messageId
);
```

Then:

```js
message.scheduledSent = true;
await message.save();
```

Then:

```js
io.to(userId).emit("message received");
```

Done.

---

# Timeline

9:00 AM:

Backend:

```js
queue.add(delay=3600000)
```

Redis:

```text
stores delayed job
```

Worker:

```text
waiting
```

---

9:30 AM:

Worker:

```text
still waiting
```

No code runs.

---

10:00 AM:

BullMQ internal scheduler:

```text
job ready
```

Moves job.

Redis notifies worker.

Worker:

```text
executes your callback
```

Message sent.

---

# Important distinction

YOU wrote:

```js
new Worker(...)
```

But YOU did NOT write:

```js
setInterval(() => {
  check jobs
}, 1000);
```

BullMQ handles scheduling internally.

---

# Backend restart case

Suppose:

9:30 AM backend crashes.

Problem with setTimeout:

```text
timer lost
job gone
```

BullMQ:

Job still in Redis:

```text
msg123 delayed until 10:00
```

Backend restarts.

Worker reconnects.

At 10:00:

job still executes.

Reliable.

---

# Multi-worker scaling

Suppose:

```text
Worker A
Worker B
```

Both connected.

Redis ensures:

ONLY ONE worker gets job.

No duplicate sends.

---

# Real architecture

```text
Frontend
   ↓
Backend API
   ↓
BullMQ queue.add()
   ↓
Redis stores delayed job
   ↓
Worker connected to Redis
   ↓
BullMQ releases job at scheduled time
   ↓
Worker executes callback
   ↓
Message delivered
```

---

# Interview explanation

"Scheduled jobs are stored in Redis by BullMQ with a delayed execution timestamp. Worker processes stay connected to Redis and listen for ready jobs. When the scheduled time arrives, BullMQ internally promotes the delayed job to the active queue and the worker automatically receives it, without us writing polling logic."

# Media Support (Images / Files / Voice Messages)

## Goal

Allow users to send:

- images
- documents
- voice notes
- other attachments

Just like WhatsApp.

---

# High-level flow

```text
User selects file
    ↓
Frontend uploads file
    ↓
Backend receives multipart data
    ↓
Upload file to cloud storage
    ↓
Save file URL in message DB
    ↓
Emit realtime socket message
    ↓
Recipient receives instantly
```

---

# Why not store actual file in MongoDB?

Bad idea.

Example:

```text
50 MB video
```

If stored in Mongo:

Problems:

- DB becomes huge
- slow queries
- expensive backups
- poor performance

Mongo should store metadata, not large binaries.

---

# Correct design

Store actual file in cloud storage.

Store only metadata in DB.

Example:

Mongo:

```js
{
  content: "",
  fileUrl: "https://cloud.com/file123.pdf",
  fileName: "resume.pdf",
  fileType: "application/pdf"
}
```

---

# Step 1: User selects file

Frontend:

```js
<input type="file" />
```

User chooses:

```text
resume.pdf
```

React gets:

```js
event.target.files[0]
```

Example:

```js
{
  name: "resume.pdf",
  type: "application/pdf",
  size: 234567
}
```

This is browser File object.

---

# Step 2: Create FormData

Cannot send file as JSON.

Wrong:

```js
{
  file: fileObject
}
```

Use:

```js
const formData = new FormData();
```

Append:

```js
formData.append("file", selectedFile);
formData.append("chatId", selectedChat._id);
```

---

# Why FormData?

Because file upload uses:

```text
multipart/form-data
```

instead of JSON.

Browser handles binary encoding.

---

# Step 3: Frontend API upload

Example:

```js
await API.post(
  "/api/message/upload",
  formData
);
```

Request becomes:

```text
multipart/form-data
```

Containing:

- file bytes
- chatId
- metadata

---

# Step 4: Backend parses file

Express cannot parse file automatically.

Need middleware:

Example:

```js
multer
```

Route:

```js
router.post(
  "/upload",
  upload.single("file"),
  sendMediaMessage
);
```

Meaning:

```text
Extract uploaded file from multipart request
```

Now backend gets:

```js
req.file
```

Example:

```js
{
  originalname: "resume.pdf",
  mimetype: "application/pdf",
  path: "/tmp/abc"
}
```

---

# Step 5: Upload to cloud storage

Backend should NOT permanently keep local files.

Upload to:

Example:

```text
Cloudinary / S3
```

Example:

```js
const uploaded = await cloudinary.uploader.upload(
  req.file.path
);
```

Returns:

```js
{
  secure_url: "https://cloudinary.com/file123"
}
```

---

# Why cloud storage?

Because:

- scalable
- CDN delivery
- cheaper
- persistent
- optimized for files

---

# Step 6: Save message in Mongo

Message:

```js
const message = await Message.create({
  sender: req.user._id,
  chat: req.body.chatId,
  content: "",
  fileUrl: uploaded.secure_url,
  fileName: req.file.originalname,
  fileType: req.file.mimetype
});
```

Example:

```js
{
  sender: "user123",
  fileUrl: "https://cloud.com/resume.pdf",
  fileName: "resume.pdf",
  fileType: "application/pdf"
}
```

Mongo stores metadata only.

---

# Step 7: Update latest chat

```js
await Chat.findByIdAndUpdate(chatId, {
  latestMessage: message._id
});
```

Sidebar preview:

```text
📎 resume.pdf
```

---

# Step 8: Realtime socket delivery

Backend:

```js
io.to(recipientId).emit(
  "message received",
  message
);
```

Message contains:

```js
fileUrl
fileName
fileType
```

---

# Step 9: Recipient frontend renders correctly

Frontend receives:

```js
socket.on("message received", (msg) => {
```

Check type:

---

## Image

```js
if (msg.fileType.startsWith("image/"))
```

Render:

```jsx
<img src={msg.fileUrl} />
```

---

## PDF / docs

Render:

```jsx
<a href={msg.fileUrl}>
  resume.pdf
</a>
```

---

## Voice

Render:

```jsx
<audio controls src={msg.fileUrl} />
```

---

# Voice notes

Same architecture.

Difference:

Frontend records audio.

Browser:

```js
MediaRecorder
```

Creates:

```text
audio blob
```

Convert:

```js
new File(...)
```

Then upload exactly same way.

---

# Full Flow

```text
User selects file
    ↓
Frontend creates FormData
    ↓
Multipart API request
    ↓
Backend multer parses file
    ↓
Upload to cloud storage
    ↓
Get public URL
    ↓
Save metadata in Mongo
    ↓
Update latestMessage
    ↓
Socket emit realtime delivery
    ↓
Recipient renders based on file type
```

---

# Security considerations

Validate:

File size:

```text
max 10MB
```

File type:

```text
images/pdf/audio only
```

Prevent malicious uploads.

---

# Interview Explanation

"Media messages use multipart uploads instead of JSON payloads. The backend parses uploaded files using middleware like Multer, uploads them to cloud storage, and stores only metadata plus public URLs in MongoDB. The resulting message is then delivered through Socket.IO like normal text messages, with frontend rendering based on MIME type."

# Poll Feature

## Goal

Allow users to create polls in chat.

Example:

```text
Where should we go?

○ Goa
○ Ooty
○ Coorg
```

Users vote:

```text
Goa   3 votes
Ooty  1 vote
Coorg 0 votes
```

Updates should appear instantly.

---

# Important design question

Should poll be separate collection?

Example:

```js
Poll
```

Possible.

But in chat apps, easier to keep poll as message type.

Because poll behaves like message.

It needs:

- sender
- chat
- timestamp
- realtime delivery
- notifications

So poll can be a specialized message.

---

# Message schema design

Example:

```js
{
  sender: user123,
  chat: chat123,
  type: "poll",
  content: "Where should we go?",
  pollOptions: [
    {
      text: "Goa",
      votes: []
    },
    {
      text: "Ooty",
      votes: []
    },
    {
      text: "Coorg",
      votes: []
    }
  ]
}
```

---

# Why votes array?

Need to know:

- who voted
- vote counts
- prevent duplicate voting

Example:

```js
votes: [
  user456,
  user789
]
```

Count:

```js
votes.length
```

---

# Step 1: Create poll

Frontend:

User enters:

Question:

```text
Where should we go?
```

Options:

```text
Goa
Ooty
Coorg
```

API:

```js
await API.post("/api/message/poll", {
  chatId,
  question: "Where should we go?",
  options: [
    "Goa",
    "Ooty",
    "Coorg"
  ]
});
```

---

# Backend save

```js
const pollMessage = await Message.create({
  sender: req.user._id,
  chat: chatId,
  type: "poll",
  content: question,
  pollOptions: options.map(option => ({
    text: option,
    votes: []
  }))
});
```

Mongo:

```js
{
  type: "poll",
  content: "Where should we go?",
  pollOptions: [...]
}
```

---

# Why message type?

Frontend rendering becomes easy.

Normal message:

```js
type: "text"
```

Poll:

```js
type: "poll"
```

UI decides rendering.

---

# Step 2: Update latest chat

Like normal message:

```js
await Chat.findByIdAndUpdate(chatId, {
  latestMessage: pollMessage._id
});
```

Sidebar:

```text
📊 Poll created
```

---

# Step 3: Realtime delivery

Backend:

```js
io.to(userId).emit(
  "message received",
  pollMessage
);
```

Poll appears instantly.

---

# Step 4: Voting

Frontend user clicks:

```text
Goa
```

API:

```js
await API.put(
  `/api/message/poll-vote/${messageId}`,
  {
    optionIndex: 0
  }
);
```

Meaning:

Vote for first option.

---

# Backend loads poll

```js
const poll = await Message.findById(messageId);
```

---

# Find previous vote

Need one vote per user.

Loop:

```js
poll.pollOptions.forEach(option => {
```

Remove user from all options:

```js
option.votes = option.votes.filter(
  id => id.toString() !== req.user._id.toString()
);
```

Why?

If user changes vote.

---

# Add new vote

Selected option:

```js
poll.pollOptions[optionIndex].votes.push(
  req.user._id
);
```

Save:

```js
await poll.save();
```

---

# Example

Before:

```js
Goa: [user456]
Ooty: []
Coorg: []
```

User789 votes Goa:

After:

```js
Goa: [user456, user789]
```

---

# Vote change example

User789 changes to Ooty.

Remove from all:

```js
Goa: [user456]
Ooty: []
```

Then add:

```js
Ooty: [user789]
```

Final:

```js
Goa: [user456]
Ooty: [user789]
```

Correct.

---

# Why remove first?

Prevents:

```text
multiple votes from same user
```

Clean logic.

---

# Step 5: Realtime sync

Backend:

```js
io.to(chatId).emit(
  "poll updated",
  poll
);
```

Meaning:

```text
Everyone in chat gets latest poll state
```

---

# Frontend listens

```js
socket.on("poll updated", (updatedPoll) => {
```

Update message list:

```js
setMessages(prev =>
  prev.map(msg =>
    msg._id === updatedPoll._id
      ? updatedPoll
      : msg
  )
);
```

---

# UI vote count

Render:

```js
option.votes.length
```

Example:

```text
Goa (3)
```

---

# Full Flow

## Create poll

```text
User creates poll
    ↓
Frontend API request
    ↓
Backend saves poll as message
    ↓
Update latestMessage
    ↓
Socket emit
    ↓
Chat participants receive poll
```

---

## Vote

```text
User clicks option
    ↓
Frontend API request
    ↓
Backend removes previous vote
    ↓
Adds new vote
    ↓
Save Mongo
    ↓
Socket emit updated poll
    ↓
All frontends update instantly
```

---

# Why API + socket?

API:

```text
persistent voting state
```

Socket:

```text
realtime UI sync
```

Together:

best UX.

---

# Concurrency concern

Suppose:

10 users vote same time.

Mongo handles updates.

If stronger guarantees needed:

```text
atomic update operators / transactions
```

But current design is acceptable for chat app scale.

---

# Interview Explanation

"Polls are implemented as specialized message types rather than separate entities, which allows reuse of existing chat delivery infrastructure. Voting updates poll option vote arrays in MongoDB, enforcing one vote per user by removing previous votes before adding the new one, and Socket.IO synchronizes updated poll state across participants in realtime."