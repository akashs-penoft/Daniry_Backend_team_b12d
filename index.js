import express from "express";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { db } from './src/configs/db.js';
import contactRoutes from './src/routes/contactRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import testimonialRoutes from './src/routes/testimonialRoutes.js';
import faqRoutes from './src/routes/faqRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import newsletterRoutes from './src/routes/newsletterRoutes.js';
import partnershipRoutes from './src/routes/partnershipRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import ecommerceRoutes from './src/routes/ecommerceRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import roleRoutes from './src/routes/roleRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';
import { errorHandler } from './src/middlewares/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

// Security Middleware
// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "*"], // Allow images from any source for now
      connectSrc: ["'self'", "*"],
    },
  },
}));
app.use(hpp());
app.use(cors(
  {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
));

// Performance Middleware
app.use(compression());

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Parsing Middleware
app.use(express.json());
app.use(cookieParser());

// Test Route
app.get('/', (req, res) => {
  res.send('Daniry Backend Running!');
});

//-----------api routes---------------
// contact form routes
app.use('/api/contact', contactRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Testimonial routes
app.use('/api/testimonials', testimonialRoutes);

// FAQ routes
app.use('/api/faqs', faqRoutes);

// Settings routes
app.use('/api/settings', settingsRoutes);

// Newsletter routes
app.use('/api/newsletter', newsletterRoutes);

// Partnership routes
app.use('/api/partnership', partnershipRoutes);

// Product routes
app.use('/api/products', productRoutes);

// Ecommerce Platform routes
app.use('/api/ecommerce-platforms', ecommerceRoutes);

// User Management routes (RBAC)
app.use('/api/users', userRoutes);

// Role Management routes (RBAC)
app.use('/api/roles', roleRoutes);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error Handling Middleware
app.use(errorHandler);

// run server
app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});