# 🎓 CourseHub API - The Brain Behind the Platform

This repository contains the **Backend Services** for **CourseHub**, powering the user authentication, course management, enrollments, and the revolutionary AI Chatbot integrating Google's Gemini AI.

🔗 **Frontend Repository**: [CourseHub Frontend App (Angular 19)](https://github.com/almas200/cp-frontend)

## ✨ Key Features
- **AI Integration:** Direct integration with Google's `Gemini API` for the interactive student Chatbot module.
- **Robust Authentication:** Secure JWT-based authentication combined with Google OAuth capabilities.
- **RESTful Architecture:** Clean API endpoints controlling courses, enrollments, and reviews.
- **Data Modeling:** Powerful MongoDB schemas for managing students and courses.

## 🛠️ Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas (Mongoose)
- **AI API:** Google Gemini AI
- **Security:** bcryptjs, jsonwebtoken

## 🚀 Getting Started
```bash
# Clone the repository
git clone https://github.com/almas200/cp-backend.git

# Install dependencies
npm install

# Run the server
npm run dev
```

*(Note: You will need to set up your own `.env` file containing `MONGO_URI`, `JWT_SECRET`, and `GEMINI_API_KEY` to run this locally).*
