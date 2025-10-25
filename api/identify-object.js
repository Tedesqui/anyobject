import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(request, response) {
    try {
        if (request.method !== 'POST') {
            return response.status(405).json({ error: 'Method Not Allowed' });
        }

        // --- MODIFICADO: 'contexto' removido ---
        const { image } = request.body;
        if (!image) {
            return response.status(400).json({ error: 'A imagem é obrigatória.' });
        }

        // --- MODIFICADO: PROMPT ATUALIZADO (seção de contexto removida) ---
        let promptText = `
        Você é um "Identificador Universal de Produtos" e especialista em e-commerce. Sua tarefa é analisar a imagem de um objeto e identificá-lo com o máximo de precisão possível para fins de compra.

        Responda estritamente como um único objeto JSON. O objeto deve conter uma chave "identification", que é um objeto com a seguinte estrutura:
        {
          "identification": {
            "name": "Nome exato do produto (inclua Marca e Modelo, se visível. Ex: 'Tênis Nike Air Force 1 07 Branco', 'Caneca de cerâmica azul', 'iPhone 15 Pro Max Titâ
nio Natural')",
            "description": "Uma breve descrição (1-2 frases) do objeto, sua função ou características principais.",
            "search_query": "Um termo de busca curto e otimizado, ideal para o Google Shopping. (Ex: 'Nike Air Force 1 07 white', 'caneca cerâmica azul', 'iPhone 15 Pro Max 256GB natural titanium')"
          }
        }

        REGRAS IMPORTANTES:
        1.  **Seja Preciso:** Identifique a marca, o modelo, a cor ou qualquer detalhe relevante.
        2.  **Seja Realista:** Se for um objeto genérico (ex: "uma maçã", "um lápis"), apenas o identifique. O termo de busca será simples (ex: "maçã vermelha").
        3.  **Termo de Busca:** O 'search_query' é a parte mais importante. Deve ser o que uma pessoa digitaria no Google para COMPRAR este item exato.
        4.  **Recusa (Pessoas/etc):** Se a imagem for de uma pessoa, animal de estimação ou algo que não pode ser "comprado", responda:
            {
              "identification": {
                "name": "Não é um produto",
                "description": "O objeto na imagem (ex: pessoa, paisagem) não é um produto que possa ser comprado.",
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
