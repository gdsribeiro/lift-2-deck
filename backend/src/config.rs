use std::env;

pub struct Config {
    pub database_url: String,
    pub supabase_url: String,
    pub supabase_service_key: String,
    pub jwt_secret: String,
    pub groq_api_key: String,
    pub frontend_origin: String,
    pub server_host: String,
    pub server_port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            supabase_url: env::var("SUPABASE_URL").expect("SUPABASE_URL must be set"),
            supabase_service_key: env::var("SUPABASE_SERVICE_KEY")
                .expect("SUPABASE_SERVICE_KEY must be set"),
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
            groq_api_key: env::var("GROQ_API_KEY").unwrap_or_default(),
            frontend_origin: env::var("FRONTEND_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("SERVER_PORT must be a valid port"),
        }
    }
}
