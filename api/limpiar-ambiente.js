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

        // PROMPT POSITIVO: Enfocado en mantener la base y solo "limpiar"
        const positivePrompt = "A high fidelity edit of the original room. Preserve the exact same architectural structure, identical perspective, original shadows, hallway, and original lighting. Remove the arcade machine, remove all cables, and remove any furniture. Leave only a completely bare white wall and a clean, empty wooden floor.";
        
        // PROMPT NEGATIVO: Lo que la IA tiene PROHIBIDO hacer
        const negativePrompt = "Do not alter architecture, do not change perspective, do not modify the hallway, do not change the floor texture, do not add new objects, do not change lighting, do not distort walls, no hallucinated furniture.";
        
        const taskUUID = crypto.randomUUID();

        const requestBody = [
            {
                "taskType": "imageInference",
                "taskUUID": taskUUID,
                "model": "runware:400@4", 
                "positivePrompt": positivePrompt,
                "negativePrompt": negativePrompt, // Añadido para controlar a FLUX
                "inputs": {
                    "referenceImages": [imageBase64]
                },
                "steps": 4,             
                "CFGScale": 4.5,        // Ligeramente más alto para que obedezca el prompt negativo con más fuerza
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
