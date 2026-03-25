const { GoogleGenerativeAI } = require("@google/generative-ai");

// In a real production app, keep the Gemini API key in process.env.GEMINI_API_KEY
// Assuming it might not be set in local .env yet, we add a fallback check.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_FALLBACK_API_KEY_HERE");

const SYSTEM_PROMPT = `
You are a highly intelligent, professional, and expert AI tutor for an e-learning platform called "KAVI CourseHub". 
You are talking to IT students and learners from India. 

YOUR KEY CAPABILITIES & RULES:
1. MANDATORY LANGUAGE: You MUST ALWAYS reply in "Hinglish". Use a mix of clear Hindi and English written in Latin script.
2. TONE: Be professional, respectful, and helpful. Do NOT use overly casual slang like "bro", "bhai", "yaar", or "ekdum mast". Use respectful or polite phrasing. Example: "Main aapki isme madad kar sakta hu."
3. If the user asks technical questions, explain things clearly and professionally using real-life relatable examples.
4. Keep your responses concise, well-formatted, and encouraging. Never be rude.
5. Use emojis sparingly to maintain a professional look.
6. Example response: "Namaste! Ye concept samajhna aasan hai. Dekhiye jab aap code likhte hain..."
`;

exports.chatWithAI = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: "Chat message is required" });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.log("⚠️ Warning: GEMINI_API_KEY is not set in environment variables. Add it for AI to work.");
            // return res.status(500).json({ success: false, message: "AI API Key is missing on the server." });
            // For dev purposes, if key is missing, we might mock it to avoid crashing the project demo immediately if the user forgot it.
            // But assuming the user will add it based on instructions.
        }

        // Use Gemini 2.5 Flash for fast conversational text
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT
        });

        // Gemini strictly requires: Starts with user, alternates, ends with model (before next user message)
        let validHistory = [];
        const safeHistory = history || [];

        // Construct valid history by processing from the end to ensure it ends with 'model'
        let expectedRole = 'model';
        for (let i = safeHistory.length - 1; i >= 0; i--) {
            let role = (safeHistory[i].role === 'ai' || safeHistory[i].role === 'model') ? 'model' : 'user';
            if (role === expectedRole) {
                validHistory.unshift({ role, parts: [{ text: safeHistory[i].text || "..." }] });
                expectedRole = (expectedRole === 'model') ? 'user' : 'model';
            }
        }

        // Gemini history MUST start with 'user'
        if (validHistory.length > 0 && validHistory[0].role !== 'user') {
            validHistory.shift();
        }

        const chat = model.startChat({
            history: validHistory,
            generationConfig: {
                maxOutputTokens: 500, // keep responses concise
            }
        });

        const result = await chat.sendMessage(message);
        const aiResponse = result.response.text();

        res.json({
            success: true,
            data: {
                reply: aiResponse
            }
        });

    } catch (err) {
        console.error("AI Chat Error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to communicate with AI Tutor. Please check server logs."
        });
    }
};

exports.generateCourseSummary = async (req, res) => {
    try {
        const { courseTitle, courseDescription } = req.body;

        if (!courseTitle || !courseDescription) {
            return res.status(400).json({ success: false, message: "Course title and description are required" });
        }

        const prompt = `Act as an expert educational summarizer. I have a course titled "${courseTitle}". Here is the full description/content:\n\n${courseDescription}\n\nPlease generate a concise, engaging, and easy-to-read summary of this course in 3-4 bullet points. Focus on what the student will learn and the key outcomes. Output format: simple bullet points without any complex markdown other than simple list items. Do not include introductory text like "Here is the summary". Use Hindi/English mix commonly spoken in India (Hinglish) appropriately to sound natural but professional.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const summary = result.response.text();

        res.json({ success: true, summary });
    } catch (err) {
        console.error("AI Course Summary Error:", err);
        res.status(500).json({ success: false, message: "Failed to generate course summary." });
    }
};

exports.generateLessonQuiz = async (req, res) => {
    try {
        const { courseTitle, lessonTitle } = req.body;

        if (!lessonTitle) {
            return res.status(400).json({ success: false, message: "Lesson title is required" });
        }

        const prompt = `Act as an expert quiz generator for an e-learning platform. The course is "${courseTitle || "Programming"}". The current lesson is "${lessonTitle}". Based on this topic, generate 3 multiple-choice questions to test the student's knowledge.
Output the response EXACTLY in the following JSON array format, and NOTHING ELSE. Do not include markdown code blocks like \`\`\`json. Just the raw JSON.
[
  {
    "question": "Question text here (in Hinglish)",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Short explanation of correct answer (in Hinglish)"
  }
]`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let quizText = result.response.text().trim();

        // Sanitize response in case the model adds markdown
        if (quizText.startsWith('\`\`\`json')) {
            quizText = quizText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        } else if (quizText.startsWith('\`\`\`')) {
            quizText = quizText.replace(/\`\`\`/g, '').trim();
        }

        const quizData = JSON.parse(quizText);

        res.json({ success: true, quiz: quizData });
    } catch (err) {
        console.error("AI Lesson Quiz Error:", err);
        res.status(500).json({ success: false, message: "Failed to generate lesson quiz." });
    }
};

exports.generateCourseOutline = async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic) {
            return res.status(400).json({ success: false, message: "Topic is required" });
        }

        const prompt = `Act as an expert course architect. Generate a logical curriculum/lesson structure for a course on the topic: "${topic}".
Output MUST be a JSON array of lesson objects exactly like this, and NOTHING ELSE. No markdown, no intro.
[
  {
    "title": "Lesson Title (English)",
    "description": "Short description of what students will learn in this lesson (Hinglish)",
    "lessonType": "video",
    "duration": "10"
  }
]
Generate 5-7 high-quality lessons. Duration should be a string representing minutes.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let outlineText = result.response.text().trim();

        if (outlineText.startsWith('\`\`\`json')) {
            outlineText = outlineText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        } else if (outlineText.startsWith('\`\`\`')) {
            outlineText = outlineText.replace(/\`\`\`/g, '').trim();
        }

        const outlineData = JSON.parse(outlineText);
        res.json({ success: true, outline: outlineData });
    } catch (err) {
        console.error("AI Outline Generator Error:", err);
        res.status(500).json({ success: false, message: "Failed to generate course outline." });
    }
};
