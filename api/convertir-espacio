import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;

    if (!RUNWARE_API_KEY) {
        return res.status(500).json({ error: 'La API Key de Runware no está configurada' });
    }

    try {
        // Recibimos la imagen compuesta (habitación + stickers en sus posiciones)
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'No se envió la imagen del lienzo' });
        }

        const positivePrompt = "A professional interior design photorealistic render. Transform the overlaid draft furniture stickers into high-end, realistic furniture matching their exact positions, perspective, shadows, and room lighting. Maintain the original background room structure perfectly.";
        const negativePrompt = "Do not change room layout, do not alter background walls, do not move objects from their general positions, distorted furniture, low quality.";

        const taskUUID = crypto.randomUUID();

        const requestBody = [
            {
                "taskType": "imageInference",
                "taskUUID": taskUUID,
                "model": "runware:400@4", // FLUX.2 o el modelo rápido de tu elección
                "positivePrompt": positivePrompt,
                "negativePrompt": negativePrompt,
                "inputs": {
                    "referenceImages": [imageBase64]
                },
                "steps": 4,
                "CFGScale": 4.0,
                "outputType": "URL",
                "outputFormat": "JPG",
                "outputQuality": 95,
                "numberResults": 1
            }
        ];

        const runwareResponse = await fetch('https://api.runware.ai/v1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RUNWARE_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!runwareResponse.ok) {
            const errorData = await runwareResponse.json();
            throw new Error(errorData.errors?.[0]?.message || 'Error en la API de Runware');
        }

        const responseData = await runwareResponse.json();

        if (responseData.data && responseData.data.length > 0) {
            const resultImage = responseData.data[0].imageURL;
            return res.status(200).json({ imageUrl: resultImage });
        } else {
            throw new Error("No se recibió imagen generada");
        }

    } catch (error) {
        console.error("Error en convertir-espacio:", error);
        return res.status(500).json({ error: error.message });
    }
}
