import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

/**
 * Test if a specific Gemini model is available
 * @param apiKey API key to use
 * @param modelName Name of the model to test
 * @returns Promise resolving to a boolean indicating if the model is available
 */
export async function testModel(apiKey: string, modelName: string): Promise<boolean> {
  try {
    console.log(`Testing model: ${modelName}...`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Try a simple generation to verify the model works
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hello, are you available?' }] }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 100,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        }
      ]
    });

    const response = result.response;
    const text = response.text();

    console.log(`Model ${modelName} is available. Response: "${text.substring(0, 50)}..."`);
    return true;
  } catch (error: any) {
    console.error(`Error testing model ${modelName}:`, error.message || error);
    return false;
  }
}

/**
 * Test all available models and return the first one that works
 * @param apiKey API key to use
 * @returns Promise resolving to the name of the first available model, or null if none are available
 */
export async function findAvailableModel(apiKey: string): Promise<string | null> {
  const modelOptions = [
    'gemini-2.5-pro-preview-03-25', // Try with updated API key
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-pro-latest'
  ];

  for (const modelName of modelOptions) {
    const isAvailable = await testModel(apiKey, modelName);
    if (isAvailable) {
      return modelName;
    }
  }

  return null;
}
