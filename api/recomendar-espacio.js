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
        // Ahora recibimos la lista de nombres Y TAMBIÉN las imágenes de los muebles
        const { imageBase64, mueblesSeleccionados, imagenesMuebles } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'No se envió la imagen del ambiente' });
        }

        const listaNombres = mueblesSeleccionados && mueblesSeleccionados.length > 0 
            ? mueblesSeleccionados.join(', ') 
            : 'modern interior furniture pieces';

        // PROMPT SÚPER ESTRICTO
        const positivePrompt = `As an expert interior designer, generate a photorealistic interior design render of this exact room. You MUST strictly design using ONLY these specific items: ${listaNombres}. Arrange them professionally with optimal spacing and natural perspective. Maintain the EXACT original background walls, windows, and floor structure. DO NOT invent or add any extra furniture.`;
        
        const negativePrompt = "Do not add unrequested furniture, do not hallucinate objects, cluttered layout, distorted furniture, floating objects, altering room architecture, completely blank image.";

        const taskUUID = crypto.randomUUID();

        // Juntamos la foto de la habitación con las fotos de los muebles (Máximo 4 imágenes en FLUX)
        let referenceImages = [imageBase64];
        if (imagenesMuebles && imagenesMuebles.length > 0) {
            // Tomamos hasta 3 muebles + 1 de la habitación = 4 imágenes permitidas
            const miniaturasPermitidas = imagenesMuebles.slice(0, 3);
            referenceImages = referenceImages.concat(miniaturasPermitidas);
        }

        const requestBody = [
            {
                "taskType": "imageInference",
                "taskUUID": taskUUID,
                "model": "runware:400@4", 
                "positivePrompt": positivePrompt,
                "negativePrompt": negativePrompt,
                "width": 1024,
                "height": 1024,
                "inputs": {
                    "referenceImages": referenceImages
                },
                "steps": 4,
                "CFGScale": 6.5, // Subimos a 6.5 para obligar a la IA a seguir las reglas estrictamente
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
