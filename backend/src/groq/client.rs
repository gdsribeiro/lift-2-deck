use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::errors::AppError;

#[derive(Clone)]
pub struct GroqClient {
    http: Client,
    api_key: String,
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Deserialize)]
struct ResponseMessage {
    content: String,
}

impl GroqClient {
    pub fn new(api_key: String) -> Self {
        Self {
            http: Client::new(),
            api_key,
        }
    }

    pub async fn generate_workout_feedback(
        &self,
        session_summary: &str,
        recent_history: &str,
    ) -> Result<String, AppError> {
        let system_prompt = "\
Você é um personal trainer direto e motivador. \
Dê um feedback de no máximo 2 frases sobre o treino: \
uma observação objetiva e uma dica curta. \
Se houver histórico, compare brevemente. \
Português brasileiro, sem markdown, sem emojis.";

        let user_content = if recent_history.is_empty() {
            format!("Treino finalizado:\n{session_summary}")
        } else {
            format!(
                "Treino finalizado:\n{session_summary}\n\nHistórico recente (últimas sessões):\n{recent_history}"
            )
        };

        let request = ChatRequest {
            model: "llama-3.3-70b-versatile".to_string(),
            messages: vec![
                Message {
                    role: "system".to_string(),
                    content: system_prompt.to_string(),
                },
                Message {
                    role: "user".to_string(),
                    content: user_content,
                },
            ],
            temperature: 0.5,
            max_tokens: 150,
        };

        let response = self
            .http
            .post("https://api.groq.com/openai/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await
            .map_err(|e| AppError::ExternalServiceError(format!("Groq request failed: {e}")))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::ExternalServiceError(format!(
                "Groq API error: {body}"
            )));
        }

        let body: ChatResponse = response
            .json()
            .await
            .map_err(|e| AppError::ExternalServiceError(format!("Groq parse error: {e}")))?;

        body.choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or_else(|| AppError::ExternalServiceError("Groq returned no choices".to_string()))
    }
}
