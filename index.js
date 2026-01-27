import express from "express";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import cors from 'cors';

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



// run server
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});