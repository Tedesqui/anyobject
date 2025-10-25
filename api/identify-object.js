import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(request, response) {
    try {
        if (request.method !== 'POST') {
            return response.status(405).json({ error: 'Method Not Allowed' });
        }

        const { image } = request.body;
        if (!image) {
            return response.status(400).json({ error: 'A imagem é obrigatória.' });
        }

        // --- PROMPT MODIFICADO: FOCO NA PRECISÃO E ANTI-ALUCINAÇÃO ---
        let promptText = `
        Você é um "Identificador Universal de Produtos". Sua tarefa é analisar a imagem de um objeto e identificá-lo com a MAIOR PRECISÃO POSSÍVEL.

        Responda estritamente como um único objeto JSON. O objeto deve conter uma chave "identification", que é um objeto com a seguinte estrutura:
        {
          "identification": {
            "name": "Nome do produto",
            "description": "Uma breve descrição (1-2 frases) do objeto.",
            "search_query": "Um termo de busca curto e otimizado para o Google Shopping."
          }
        }

        REGRAS DE OURO PARA IDENTIFICAÇÃO:
        1.  **PRE precisão DA MARCA/MODELO:** Identifique a Marca e o Modelo APENAS se o logo, o nome ou o design 100% inconfundível estiverem CLARAMENTE VISÍVEIS na imagem.
        2.  **NÃO INVENTE (REGRA MAIS IMPORTANTE):** Se a marca ou o modelo não forem visíveis ou estiverem borrados, NÃO ADIVINHE. Identifique o objeto de forma genérica (ex: "Mouse sem fio preto", "Tênis de corrida azul", "Garrafa de água de aço inoxidável").
        3.  **USE A DESCRIÇÃO PARA EXPLICAR:** Se você identificar como genérico, use o campo "description" para explicar o porquê (ex: "Um mouse sem fio. A marca não está visível na imagem, por isso não é possível identificar o modelo exato.").
        4.  **TERMO DE BUSCA:** O "search_query" deve refletir o "name". Se o nome for "iPhone 15 Pro", a busca é "iPhone 15 Pro". Se o nome for "Mouse sem fio preto", a busca é "mouse sem fio preto".
        5.  **RECUSA (NÃO-PRODUTOS):** Se a imagem for de uma pessoa, animal, paisagem, etc., responda:
            {
              "identification": {
                "name": "Não é um produto",
                "description": "A imagem mostra algo que não é um produto (ex: pessoa, animal, paisagem).",
                "search_query": null
              }
            }
        `;
        // --- FIM DO PROMPT ---

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: promptText },
                        { type: "image_url", image_url: { "url": image } },
                    ],
                },
            ],
            max_tokens: 1500,
        });

        const aiResultString = completion.choices[0].message.content;
        const parsedResult = JSON.parse(aiResultString);

        return response.status(200).json(parsedResult);

    } catch (error) {
        console.error('Erro geral na função da API:', error);
        return response.status(500).json({ error: 'Falha interna do servidor.', details: error.message });
    }
}
