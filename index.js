import express from "express";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { db } from './src/configs/db.js';
import contactRoutes from './src/routes/contactRoutes.js';
dotenv.config();

// Test DB Connection
db.getConnection()
  .then((connection) => {
    console.log("Database connected successfully");
    connection.release();
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cookieParser());
app.use(express.json());

app.use(cors(
  {
    origin: 'http://localhost:5173',
    credentials: true
  }
));

// Test Route
app.get('/', (req, res) => {
  res.send('Daniry Backend Running!');
});



// api routes

// contact form routes
app.use('/api/contact', contactRoutes);






// run server
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});