const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http').createServer(app);

const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

const ROLES = {
  SUPER_ADMIN: 5,  
  ADMIN: 4,        
  SUPER_MOD: 3,    
  MODERATOR: 2,    
  MEMBER: 1,       
  GUEST: 0         
};

let rooms = {
  "Main-Room": {
    name: "غرفة DARK CHAT الرئيسية",
    maxMics: 2,       
    activeMics: [],   
    users: []         
  },
  "Management-Room": {
    name: "غرفة الإدارة والمراقبين",
    maxMics: 2,
    activeMics: [],
    users: []
  }
};

app.get('/', (req, res) => {
  res.send('<h1>DARK CHAT Server is Running Successfully!</h1>');
});

io.on('connection', (socket) => {
  const userIp = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
  console.log(`مستخدم جديد متصل: ${socket.id}`);

  socket.on('join_room', ({ username, role, roomName }) => {
    if (!rooms[roomName]) return;
    socket.join(roomName);
    rooms[roomName].users.push({ 
      id: socket.id, 
      username: username || "زائر جديد", 
      role: role !== undefined ? role : ROLES.GUEST,
      ip: userIp
    });
    io.to(roomName).emit('room_data', rooms[roomName]);
  });

  socket.on('request_mic', ({ roomName, userRole }) => {
    const room = rooms[roomName];
    if (!room) return;
    if (room.activeMics.length < room.maxMics) {
      room.activeMics.push({ id: socket.id, role: userRole });
      io.to(roomName).emit('room_data', room);
      socket.emit('mic_status', { success: true });
    } else {
      socket.emit('mic_status', { success: false });
    }
  });

  socket.on('leave_mic', ({ roomName }) => {
    const room = rooms[roomName];
    if (!room) return;
    room.activeMics = room.activeMics.filter(mic => mic.id !== socket.id);
    io.to(roomName).emit('room_data', room);
  });

  socket.on('disconnect', () => {
    for (let roomName in rooms) {
      rooms[roomName].activeMics = rooms[roomName].activeMics.filter(mic => mic.id !== socket.id);
      rooms[roomName].users = rooms[roomName].users.filter(user => user.id !== socket.id);
      io.to(roomName).emit('room_data', rooms[roomName]);
    }
  });
});

const PORT = process.env.PORT || 10000;
http.listen(PORT, () => {
  console.log(`سيرفر DARK CHAT يعمل على المنفذ: ${PORT}`);
});
