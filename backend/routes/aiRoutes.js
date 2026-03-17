const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParseModule = require("pdf-parse");
const PDFParser = require("pdf2json");
const Tesseract = require("tesseract.js");
const { createCanvas } = require("@napi-rs/canvas");

const pdfParse = typeof pdfParseModule === "function" ? pdfParseModule : pdfParseModule.default;

const OPENAI_COMPATIBLE_PROVIDERS = [
    {
        name: "groq",
        apiKeyEnv: "GROQ_API_KEY",
        baseUrl: "https://api.groq.com/openai/v1/chat/completions",
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        supportsImages: false,
        extraHeaders: {},
    },
    {
        name: "openrouter",
        apiKeyEnv: "OPENROUTER_API_KEY",
        baseUrl: "https://openrouter.ai/api/v1/chat/completions",
        model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.2-11b-vision-instruct:free",
        supportsImages: true,
        extraHeaders: {
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
            "X-Title": process.env.OPENROUTER_APP_NAME || "Health AI",
        },
    },
    {
        name: "openai",
        apiKeyEnv: "OPENAI_API_KEY",
        baseUrl: "https://api.openai.com/v1/chat/completions",
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        supportsImages: true,
        extraHeaders: {},
    },
];

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const SYSTEM_INSTRUCTION = `You are Health AI, a highly capable, warm, and intelligent medical assistant built into a patient healthcare portal. You behave like a knowledgeable doctor-friend who gives real, helpful answers.

Your capabilities:
- Answer any health, medical, wellness, nutrition, fitness, mental health, or medication questions
- Analyze uploaded medical images, lab reports, prescriptions, and diagnostic documents
- Explain complex medical terms and lab values in simple, patient-friendly language
- Give practical guidance on symptoms, medications, diet, exercise, sleep, and preventive care
- Handle casual conversation, greetings, and follow-up questions naturally

Your communication style:
- Be conversational, warm, empathetic, and supportive
- Structure answers clearly with headings, bullet points, or numbered lists when helpful
- Use simple language non-medical users can understand
- Give comprehensive but focused responses — enough detail to be genuinely useful
- Use markdown formatting: **bold** for key terms, bullet lists for multiple points, numbered steps for procedures

Important guidelines:
- Always recommend consulting a licensed healthcare provider for diagnosis or treatment decisions
- For emergency symptoms (chest pain, stroke signs, severe breathing difficulty), immediately advise calling emergency services
- Never prescribe medications or recommend dosage changes without mentioning doctor supervision
- Be honest: "I'm an AI — please confirm important decisions with your doctor"
- You CAN analyze uploaded prescriptions, blood reports, X-rays, and medical documents in detail`;

function isQuotaError(err) {
    const msg = (err && err.message ? err.message : "").toLowerCase();
    return msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("429");
}

function isModelNotFoundError(err) {
    const msg = (err && err.message ? err.message : "").toLowerCase();
    return msg.includes("not found") || msg.includes("404") || msg.includes("unsupported");
}

function getConfiguredProviders() {
    return OPENAI_COMPATIBLE_PROVIDERS
        .filter((item) => process.env[item.apiKeyEnv])
        .map((item) => ({
            ...item,
            apiKey: process.env[item.apiKeyEnv],
        }));
}

function buildOpenAICompatibleMessages(message, history, fileData) {
    const messages = [{ role: "system", content: SYSTEM_INSTRUCTION }];

    for (const entry of history.slice(-12)) {
        if (!entry?.content) {
            continue;
        }
        messages.push({
            role: entry.role === "user" ? "user" : "assistant",
            content: entry.content,
        });
    }

    if (fileData?.mimeType?.startsWith("image/")) {
        messages.push({
            role: "user",
            content: [
                {
                    type: "text",
                    text: message?.trim() || "Please analyze this medical image and explain the findings in simple patient-friendly language.",
                },
                {
                    type: "image_url",
                    image_url: {
                        url: `data:${fileData.mimeType};base64,${fileData.data}`,
                    },
                },
            ],
        });
        return messages;
    }

    if (fileData?.mimeType === "text/plain") {
        const decodedText = Buffer.from(fileData.data, "base64").toString("utf8");
        messages.push({
            role: "user",
            content: `${message?.trim() || "Please analyze this medical document."}\n\nDocument content:\n${decodedText.slice(0, 20000)}`,
        });
        return messages;
    }

    if (fileData) {
        messages.push({
            role: "user",
            content: `${message?.trim() || "Please help with this medical file."}\n\nThe uploaded file type is ${fileData.mimeType}. Direct binary PDF analysis is not enabled for the current AI provider. Please upload screenshots/images or a text-based document for analysis.`,
        });
        return messages;
    }

    messages.push({ role: "user", content: message?.trim() || "Hello" });
    return messages;
}

async function normalizeFileDataForTextProviders(fileData) {
    if (!fileData) {
        return null;
    }

    // Convert PDF binaries into plain text so OpenAI-compatible providers can analyze them.
    if (fileData.mimeType === "application/pdf" && fileData.data) {
        try {
            const buffer = Buffer.from(fileData.data, "base64");
            const parsed = await pdfParse(buffer);
            const extractedText = (parsed.text || "").trim();

            if (extractedText) {
                return {
                    mimeType: "text/plain",
                    data: Buffer.from(extractedText, "utf8").toString("base64"),
                };
            }
        } catch (err) {
            console.warn("PDF parse failed, continuing with original file data:", err.message);
        }

        // Fallback parser based on PDF.js (handles many PDFs that pdf-parse misses).
        try {
            const buffer = Buffer.from(fileData.data, "base64");
            const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer), disableWorker: true });
            const pdfDocument = await loadingTask.promise;
            const pageTexts = [];

            for (let i = 1; i <= pdfDocument.numPages; i += 1) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item) => (item && typeof item.str === "string" ? item.str : ""))
                    .join(" ")
                    .trim();
                if (pageText) {
                    pageTexts.push(pageText);
                }
            }

            const extractedText = pageTexts.join("\n\n").trim();
            if (extractedText) {
                return {
                    mimeType: "text/plain",
                    data: Buffer.from(extractedText, "utf8").toString("base64"),
                };
            }
        } catch (err) {
            console.warn("pdfjs-dist fallback failed:", err.message);
        }

        // Fallback parser for PDFs where pdf-parse fails or returns empty text.
        try {
            const buffer = Buffer.from(fileData.data, "base64");
            const extractedText = await new Promise((resolve, reject) => {
                const parser = new PDFParser(undefined, 1);
                parser.on("pdfParser_dataError", (errorData) => reject(new Error(errorData?.parserError || "pdf2json parse error")));
                parser.on("pdfParser_dataReady", (pdfData) => {
                    try {
                        const pages = pdfData?.Pages || [];
                        const text = pages
                            .flatMap((page) => page.Texts || [])
                            .flatMap((chunk) => chunk.R || [])
                            .map((part) => decodeURIComponent(part.T || ""))
                            .join(" ")
                            .trim();
                        resolve(text);
                    } catch (parseErr) {
                        reject(parseErr);
                    }
                });
                parser.parseBuffer(buffer);
            });

            if (extractedText) {
                return {
                    mimeType: "text/plain",
                    data: Buffer.from(extractedText, "utf8").toString("base64"),
                };
            }
        } catch (err) {
            console.warn("pdf2json fallback failed:", err.message);
        }

        // OCR fallback for scanned/image-only PDFs.
        try {
            const buffer = Buffer.from(fileData.data, "base64");
            const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer), disableWorker: true });
            const pdfDocument = await loadingTask.promise;

            const maxPages = Math.min(Number(process.env.OCR_MAX_PDF_PAGES || 2), pdfDocument.numPages);
            const ocrChunks = [];

            for (let i = 1; i <= maxPages; i += 1) {
                const page = await pdfDocument.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
                const canvasContext = canvas.getContext("2d");

                await page.render({ canvasContext, viewport }).promise;
                const imageBuffer = canvas.toBuffer("image/png");

                const ocrResult = await Tesseract.recognize(imageBuffer, "eng", {
                    logger: () => {},
                });

                const pageText = (ocrResult?.data?.text || "").trim();
                if (pageText) {
                    ocrChunks.push(pageText);
                }
            }

            const extractedText = ocrChunks.join("\n\n").trim();
            if (extractedText) {
                return {
                    mimeType: "text/plain",
                    data: Buffer.from(extractedText, "utf8").toString("base64"),
                };
            }
        } catch (err) {
            console.warn("OCR fallback for scanned PDF failed:", err.message);
        }
    }

    return fileData;
}

async function runOpenAICompatibleChat(provider, message, history, fileData) {
    const messages = buildOpenAICompatibleMessages(message, history, fileData);

    if (fileData?.mimeType?.startsWith("image/") && !provider.supportsImages) {
        const err = new Error(`${provider.name} does not support image inputs with the configured model`);
        err.status = 400;
        throw err;
    }

    const response = await fetch(provider.baseUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
            ...provider.extraHeaders,
        },
        body: JSON.stringify({
            model: provider.model,
            messages,
            temperature: 0.7,
            max_tokens: 1200,
        }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err = new Error(data.error?.message || data.message || `AI provider request failed with status ${response.status}`);
        err.status = response.status;
        throw err;
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
        throw new Error("AI provider returned an empty response");
    }

    return {
        reply,
        provider: provider.name,
        model: provider.model,
    };
}

async function runConfiguredProviders(providers, message, history, fileData) {
    let lastErr = null;
    const normalizedFileData = await normalizeFileDataForTextProviders(fileData);

    // If PDF is still binary after normalization, text extraction failed.
    // Do not send unsupported binary PDF to text-only providers.
    if (normalizedFileData?.mimeType === "application/pdf") {
        const err = new Error("Could not extract readable text from this PDF. Please upload a text-based PDF, screenshot images, or enable GEMINI_API_KEY for direct PDF analysis.");
        err.status = 400;
        throw err;
    }

    for (const provider of providers) {
        if (normalizedFileData?.mimeType?.startsWith("image/") && !provider.supportsImages) {
            continue;
        }

        try {
            return await runOpenAICompatibleChat(provider, message, history, normalizedFileData);
        } catch (err) {
            lastErr = err;

            // Try the next configured provider when the current one is unavailable,
            // rate-limited, misconfigured, or doesn't support the requested model.
            if (isQuotaError(err) || isModelNotFoundError(err) || err.status === 401 || err.status === 402 || err.status === 429) {
                continue;
            }

            // For 400-level issues caused by provider capability mismatches, keep trying.
            if (err.status === 400) {
                continue;
            }

            throw err;
        }
    }

    throw lastErr || new Error("No working AI provider is configured");
}

async function runGeminiChat(apiKey, message, history, fileData) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM_INSTRUCTION,
    });
    const generationConfig = {
        maxOutputTokens: 1500,
        temperature: 0.7,
        topP: 0.9,
    };

    if (fileData) {
        const parts = [
            {
                text: message?.trim() || "Please analyze this medical file and explain it clearly.",
            },
            {
                inlineData: { data: fileData.data, mimeType: fileData.mimeType },
            },
        ];
        const result = await model.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig,
        });
        return {
            reply: result.response.text(),
            provider: "gemini",
            model: GEMINI_MODEL,
        };
    }

    const formattedHistory = history.slice(-20).map((item) => ({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.content || "" }],
    }));
    const chat = model.startChat({ history: formattedHistory, generationConfig });
    const result = await chat.sendMessage(message?.trim() || "Hello");
    return {
        reply: result.response.text(),
        provider: "gemini",
        model: GEMINI_MODEL,
    };
}

router.post("/chat", async (req, res) => {
    try {
        const { message, history = [], fileData = null } = req.body;

        const providers = getConfiguredProviders();
        const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!providers.length && !geminiApiKey) {
            return res.status(503).json({
                message: "AI service not configured. Add OPENAI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY to backend/.env.",
            });
        }

        const normalizedFileData = await normalizeFileDataForTextProviders(fileData);

        if (providers.length) {
            try {
                const result = await runConfiguredProviders(providers, message, history, normalizedFileData);
                return res.json(result);
            } catch (providerErr) {
                if (geminiApiKey) {
                    const geminiResult = await runGeminiChat(geminiApiKey, message, history, fileData);
                    return res.json(geminiResult);
                }
                throw providerErr;
            }
        }

        const result = await runGeminiChat(geminiApiKey, message, history, fileData);
        return res.json(result);

    } catch (err) {
        console.error("AI provider error:", err);

        let message = "An error occurred while communicating with AI";
        if (err.message?.includes("API_KEY_INVALID") || err.message?.includes("API key not valid")) {
            message = "Invalid AI API key. Please check backend/.env";
        } else if (isQuotaError(err)) {
            message = "AI quota reached for now. Please wait about 60 seconds, then retry.";
            return res.status(429).json({
                message,
                retryAfterSeconds: 60,
            });
        } else if (err.status === 400) {
            message = err.message;
            return res.status(400).json({ message });
        } else if (err.message?.includes("SAFETY")) {
            message = "The AI could not respond due to safety filters. Please rephrase your question.";
        } else if (isModelNotFoundError(err)) {
            message = "Configured AI model is unavailable. Update the provider model name in backend/.env or use a different provider key.";
        } else if (err.message) {
            message = err.message;
        }

        res.status(500).json({ message });
    }
});

module.exports = router;
