import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;

    if (!RUNWARE_API_KEY) {
        return res.status(500).json({ error: 'La API Key de Runware não está configurada en el servidor' });
    }

    try {
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'No se envió ninguna imagen' });
        }

        const positivePrompt = "Preserve the exact same room structure, identical perspective, and original lighting. Remove the arcade machine, remove cables, and remove all furniture. Leave a completely bare white wall and plain wooden floor. Do not alter the architecture or the hallway.";
        
        const taskUUID = crypto.randomUUID();

        // Estructura actualizada para FLUX.2 [klein] 4B según el nuevo esquema
        const requestBody = [
            {
                "taskType": "imageInference",
                "taskUUID": taskUUID,
                "model": "runware:400@4", // ID exacto de FLUX.2 Klein 4B
                "positivePrompt": positivePrompt,
                "inputs": {
                    "referenceImages": [imageBase64]
                },
                "steps": 4,             // Óptimo para este modelo destilado de 4 pasos
                "CFGScale": 3.5,        // Escala de guía recomendada
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
