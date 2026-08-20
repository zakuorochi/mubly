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
        // Recibimos la foto de la habitación limpia y la lista de muebles que eligió el usuario
        const { imageBase64, mueblesSeleccionados } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'No se envió la imagen del ambiente' });
        }

        // Construimos un texto dinámico basado en los muebles que el usuario seleccionó del catálogo
        const listaNombres = mueblesSeleccionados && mueblesSeleccionados.length > 0 
            ? mueblesSeleccionados.join(', ') 
            : 'modern interior furniture pieces';

        const positivePrompt = `As an expert interior designer, generate a photorealistic interior design render of this exact empty room. Harmoniously integrate the following items: ${listaNombres}. Arrange them professionally following interior design principles, optimal spacing, natural perspective, correct shadows, and matching room lighting. Maintain the original background walls and floor structure.`;
        
        const negativePrompt = "Cluttered layout, distorted furniture, low quality, bad perspective, floating objects, mismatched lighting, altering room architecture drastically.";

        const taskUUID = crypto.randomUUID();

        const requestBody = [
            {
                "taskType": "imageInference",
                "taskUUID": taskUUID,
                "model": "runware:400@4", // FLUX.2 u otro modelo optimizado para generación experta
                "positivePrompt": positivePrompt,
                "negativePrompt": negativePrompt,
                "inputs": {
                    "referenceImages": [imageBase64]
                },
                "steps": 4,
                "CFGScale": 4.5, // Un poco más alto para que respete rigurosamente la lista de muebles y el rol de experto
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
            throw new Error("No se recibió imagen recomendada de la IA");
        }

    } catch (error) {
        console.error("Error en recomendar-espacio:", error);
        return res.status(500).json({ error: error.message });
    }
}
