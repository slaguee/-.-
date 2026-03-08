// api/review.js — Fonction Vercel serverless
// Le bot Discord appelle cette URL quand un modérateur accepte/refuse un avis

const JSONBIN_BIN_ID  = "69a5b655d0ea881f40e7dc36";
const JSONBIN_API_KEY = "$2a$10$1qqHM.zqS7xi5/SEUTeaeuVHOQtWAVOwtP7i6KDVfTj1IM3.pShNm/";
const BOT_SECRET      = "astermaker_secret_2025"; // Clé secrète pour sécuriser l'API

export default async function handler(req, res) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST")    return res.status(405).json({ error: "Méthode non autorisée" });

    // Vérification clé secrète
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${BOT_SECRET}`) {
        return res.status(401).json({ error: "Non autorisé" });
    }

    const { action, review } = req.body;

    if (!action || !review) {
        return res.status(400).json({ error: "Données manquantes" });
    }

    try {
        // Récupérer les avis existants depuis JSONBin
        const getRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: { "X-Master-Key": JSONBIN_API_KEY }
        });
        const getData = await getRes.json();
        let reviews = getData?.record?.reviews || [];

        if (action === "approve") {
            // Ajouter l'avis approuvé
            const exists = reviews.find(r => r.id === review.id);
            if (!exists) {
                reviews.push({
                    id:      review.id,
                    nom:     review.nom,
                    message: review.message,
                    rating:  review.rating || 5,
                    date:    review.date,
                    status:  "approved"
                });
            } else {
                // Mettre à jour le statut si déjà présent
                exists.status = "approved";
            }
        } else if (action === "delete") {
            // Supprimer l'avis
            reviews = reviews.filter(r => r.id !== review.id);
        } else if (action === "update") {
            // Modifier l'avis
            const target = reviews.find(r => r.id === review.id);
            if (target) {
                target.nom     = review.nom;
                target.message = review.message;
            }
        }

        // Sauvegarder dans JSONBin
        await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method:  "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": JSONBIN_API_KEY
            },
            body: JSON.stringify({ reviews })
        });

        return res.status(200).json({ success: true, action, reviewId: review.id });

    } catch (err) {
        console.error("Erreur API review:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
