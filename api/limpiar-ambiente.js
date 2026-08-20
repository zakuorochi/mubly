import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;

    if (!RUNWARE_API_KEY) {
        return res.status(500).json({ error: 'La API Key de Runware no está configurada en el servidor' });
    }

    try {
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'No se envió ninguna imagen' });
        }

        // Prompts directivos para Qwen-Image-Edit
        const positivePrompt = "Remove the arcade machine, remove all cables, and remove all furniture. Erase these objects perfectly to leave the room completely empty, exposing the bare white wall and wooden floor behind them.";
        const negativePrompt = "Do not alter the architecture, do not change the perspective, do not modify the hallway, do not add any new objects, do not distort lines.";
        
        const taskUUID = crypto.randomUUID();

        // Estructura limpia y corregida con width y height integrados
        const requestBody = [
            {
                "taskType": "imageInference",
                "taskUUID": taskUUID,
                "model": "runware:108@20",
                "positivePrompt": positivePrompt,
                "negativePrompt": negativePrompt,
                "width": 1024,
                "height": 1024,
                "inputs": {
                    "referenceImages": [imageBase64]
                },
                "steps": 8,
                "CFGScale": 7,
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
            const resultTask = responseData.data[0];
            const resultImage = resultTask.imageURL || resultTask.dataURI || resultTask.base64Data;
            
            return res.status(200).json({ imageUrl: resultImage });
        } else {
            throw new Error("No se recibió imagen de Runware");
        }

    } catch (error) {
        console.error("Error en el backend:", error);
        return res.status(500).json({ error: error.message });
    }
}
