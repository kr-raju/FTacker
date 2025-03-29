import { FoodAnalysisResult } from '../../types/ai';

const GEMINI_API_KEY = 'AIzaSyC17W8ugwr0BnQqVm6OhrXFrel5gg2LNgA';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Analyzes a food image and returns detailed nutritional information
 * @param imageBase64 Base64 encoded image data
 * @returns Nutritional information about the food
 */
export const analyzeFoodImage = async (imageBase64: string): Promise<FoodAnalysisResult> => {
  try {
    // Create prompt with detailed instructions for the AI
    const prompt = `
      You are a professional nutritionist and food expert. Analyze this food image and provide the following information:
      
      1. Identify the main food items visible in the image
      2. Estimate the calories for each identified item
      3. Identify any drinks visible (water, coffee, soda, etc.)
      4. Estimate portion sizes where possible
      5. Identify any side dishes
      
      Format your response as a valid JSON object with the following structure:
      {
        "items": [
          {
            "name": "item name",
            "calories": estimated calories (number),
            "portion": "estimated portion size (e.g., '1 cup', '250g', etc.)",
            "type": "breakfast/lunch/dinner/snacks/coffee/custom"
          }
        ],
        "totalCalories": sum of all calories,
        "mealType": "best guess for meal type (breakfast/lunch/dinner/snacks/coffee/custom)",
        "waterIntake": estimated water intake in ml (if visible, otherwise 0),
        "description": "brief description of the overall meal"
      }
      
      Be precise with your analysis and provide realistic calorie estimates.
    `;

    // Format the request body for Gemini API
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40
      }
    };

    // Make the API request
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    
    // Extract and parse the JSON response from the AI
    const textResponse = responseData.candidates[0].content.parts
      .filter((part: any) => part.text)
      .map((part: any) => part.text)
      .join('');
    
    // Find and extract the JSON object from the response
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }
    
    const parsedResult = JSON.parse(jsonMatch[0]) as FoodAnalysisResult;
    
    return parsedResult;
  } catch (error) {
    console.error('Error analyzing food image:', error);
    throw error;
  }
}; 