import crypto from 'crypto';

export default async function handler(req, res) {
    // Solo permitimos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    // Obtenemos la API Key de las Variables de Entorno de Vercel
    const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;

    if (!RUNWARE_API_KEY) {
        return res.status(500).json({ error: 'La API Key de Runware no está configurada en el servidor' });
    }

    try {
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'No se envió ninguna imagen' });
        }

        // PROMPT POSITIVO: Al ser un modelo "Instruction-based", le damos órdenes directas.
        const positivePrompt = "Remove the arcade machine, remove all cables, and remove all furniture. Erase these objects perfectly to leave the room completely empty, exposing the bare white wall and wooden floor behind them.";
        
        // PROMPT NEGATIVO: Lo que no debe tocar.
        const negativePrompt = "Do not alter the architecture, do not change the perspective, do not modify the hallway, do not add any new objects, do not distort lines.";
        
        // Generar UUID
        const taskUUID = crypto.randomUUID();

        // Estructura actualizada para Qwen-Image-Edit según el esquema
        const requestBody = [
            {
                "taskType": "imageInference",
                "taskUUID": taskUUID,
                "model": "runware:108@20", // ID exacto de Qwen-Image-Edit
                "positivePrompt": positivePrompt,
                "negativePrompt": negativePrompt,
                "inputs": {
                    "referenceImages": [imageBase64]
                },
                "steps": 8,             // Recomendado para Qwen (según la documentación de precios)
                "CFGScale": 7,          // Nivel de obediencia estándar para modelos de edición
                "outputType": "URL",
                "outputFormat": "JPG",
                "outputQuality": 95,
                "numberResults": 1
            }
        ];

        // Llamada a Runware desde el servidor
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

        // Extraer la imagen del resultado
        if (responseData.data && responseData.data.length > 0) {
            const resultTask = responseData.data[0];
            const resultImage = resultTask.imageURL || resultTask.dataURI || resultTask.base64Data;
            
            // Devolver la imagen al frontend de Mubly
            return res.status(200).json({ imageUrl: resultImage });
        } else {
            throw new Error("No se recibió imagen de Runware");
        }

    } catch (error) {
        console.error("Error en el backend:", error);
        return res.status(500).json({ error: error.message });
    }
}
