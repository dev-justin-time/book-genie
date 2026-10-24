// genre-manager.js
export async function detectGenre(text) {
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Detect the genre of the following text. Respond directly with JSON, following this JSON schema, and no other text.
                        {
                            "genre": string
                        }`,
                },
                {
                    role: "user",
                    content: text,
                },
            ],
            json: true,
        });

        const result = JSON.parse(completion.content);
        return result.genre;

    } catch (error) {
        console.warn("Error detecting genre:", error);
        return null;
    }
}