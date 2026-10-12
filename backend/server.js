import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "7mb" }));

const products = [
    {
        id: 1,
        name: "Samsung Galaxy S24 Ultra",
        brand: "Samsung",
        price: 2899,
        category: "Smartphone",
        stock: 5
    },
    {
        id: 2,
        name: "iPhone 15 Pro Max",
        brand: "Apple",
        price: 3999,
        category: "Smartphone",
        stock: 3
    },
    {
        id: 3,
        name: "Xiaomi Redmi Note 13 Pro",
        brand: "Xiaomi",
        price: 999,
        category: "Smartphone",
        stock: 10
    }
];

var conversation = [];

app.post("/chat", async (req, res) => {
    try {
        const { messages } = req.body;

        conversation = messages

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "openrouter/free",
                    messages: [
                        {
                            role: "system",
                            content: `
Tu es un assistant commercial.

Tu dois répondre uniquement à partir des produits disponibles
dans la liste ci-dessous.

Si le produit demandé existe, donne ses informations.

Si le produit n'existe pas dans la liste, dis clairement
qu'il n'est pas disponible.

Ne crée jamais de produit, prix, stock ou information qui
n'existe pas dans la liste.

L'unité des prix est le dinar tunisien (DT).

Produits disponibles:
${JSON.stringify(products)}
`
                        },
                        ...conversation
                    ]
                })
            }
        );

        const result = await response.json()

        if (!response.ok) {
            return res.status(response.status).json(result);
        }

        const assistantMessage =
            result.choices?.[0]?.message?.content || "";

        const markdown = assistantMessage

        const rawHtml = await marked.parse(markdown);

        const cleanHtml = sanitizeHtml(rawHtml, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([
                'h1', 'h2', 'img'
            ]),
            allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,
                img: ['src', 'alt', 'width', 'height']
            }
        });

        res.json({
            message: cleanHtml + ""
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "AI request failed"
        });
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});