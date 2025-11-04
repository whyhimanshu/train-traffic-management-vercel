declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(opts: { apiKey: string })
    models: {
      generateContent(opts: { model: string; contents: string }): Promise<{ text: string }>
      listModels?(): Promise<any>
    }
  }
  export default GoogleGenAI
}
